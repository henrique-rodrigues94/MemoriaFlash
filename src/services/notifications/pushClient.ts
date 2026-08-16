import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getMessaging, getToken, isSupported, type Messaging } from 'firebase/messaging';
import { app, auth, db, doc, getDoc, setDoc, ensureAuthenticated } from '../../lib/firebase';

export interface NotificationPrefs {
  tokens: string[];
  dailyReminderEnabled: boolean;
  streakReminderEnabled: boolean;
  reminderHourLocal: number;
  reminderHourUTC: number;
  updatedAt: number;
}

// Novas instalações começam com os dois lembretes desligados. Preferências já
// salvas no Firestore continuam sendo respeitadas por getNotificationPrefs().
const DEFAULT_PREFS: NotificationPrefs = { tokens: [], dailyReminderEnabled: false, streakReminderEnabled: false, reminderHourLocal: 19, reminderHourUTC: 22, updatedAt: 0 };
const NATIVE_DAILY_REMINDER_ID = 42001;
const NATIVE_STREAK_REMINDER_ID = 42003;
const NATIVE_TEST_NOTIFICATION_ID = 42002;
const NATIVE_OPERATION_TIMEOUT_MS = 5000;

function prefsDocRef(uid: string) { return doc(db, 'notificationPrefs', uid); }
function isNativeApp() { return Capacitor.isNativePlatform(); }
function normalizeHour(hour: number) { return Math.min(23, Math.max(0, Math.round(Number(hour) || 0))); }
function localHourToUTCHour(localHour: number) { const offsetMinutes = new Date().getTimezoneOffset(); return ((normalizeHour(localHour) + Math.round(offsetMinutes / 60)) % 24 + 24) % 24; }

async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = NATIVE_OPERATION_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([promise, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} demorou. Verifique as permissões do Android e tente novamente.`)), timeoutMs); })]).finally(() => { if (timer) clearTimeout(timer); });
}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const user = await withTimeout(ensureAuthenticated(), 'Autenticação');
  try {
    const snap = await withTimeout(getDoc(prefsDocRef(user.uid)), 'Carregamento dos lembretes');
    return snap.exists() ? { ...DEFAULT_PREFS, ...(snap.data() as Partial<NotificationPrefs>) } : { ...DEFAULT_PREFS };
  } catch (err) {
    console.warn('Falha ao carregar preferências de notificação:', err);
    return { ...DEFAULT_PREFS };
  }
}

export async function isPushSupported(): Promise<boolean> { if (isNativeApp()) return true; try { return await isSupported(); } catch { return false; } }
let messagingInstance: Messaging | null = null;
async function getMessagingSafe(): Promise<Messaging | null> { if (isNativeApp() || !(await isPushSupported())) return null; if (!messagingInstance) messagingInstance = getMessaging(app); return messagingInstance; }

async function ensureNativeNotificationPermission(): Promise<boolean> {
  const current = await withTimeout(LocalNotifications.checkPermissions(), 'Verificação da permissão');
  if (current.display === 'granted') return true;
  const requested = await withTimeout(LocalNotifications.requestPermissions(), 'Solicitação da permissão');
  return requested.display === 'granted';
}
async function cancelNativeNotifications(ids: number[]) { try { await withTimeout(LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) }), 'Cancelamento dos lembretes'); } catch (err) { console.warn('[Notifications] cancel failed', err); } }

async function scheduleNativeDailyReminder(hour: number): Promise<EnablePushResult> {
  if (!(await ensureNativeNotificationPermission())) return { success: false, message: 'Permissão de notificações negada. Ative as notificações do MemoriaFlash nas configurações do Android.' };
  await cancelNativeNotifications([NATIVE_DAILY_REMINDER_ID]);
  await withTimeout(LocalNotifications.schedule({ notifications: [{ id: NATIVE_DAILY_REMINDER_ID, title: 'Lembretes de Revisão', body: 'Você tem cartões para revisar. Reserve alguns minutos para manter sua memória em dia.', schedule: { on: { hour, minute: 0 }, repeats: true }, extra: { type: 'daily-review' } }] }), 'Agendamento do lembrete diário');
  return { success: true, message: `Lembrete diário configurado para ${String(hour).padStart(2, '0')}:00 neste celular.` };
}
async function scheduleNativeStreakReminder(baseHour: number) { await cancelNativeNotifications([NATIVE_STREAK_REMINDER_ID]); const hour = (normalizeHour(baseHour) + 1) % 24; await withTimeout(LocalNotifications.schedule({ notifications: [{ id: NATIVE_STREAK_REMINDER_ID, title: 'Sua sequência de estudos está em risco 🔥', body: 'Faça uma revisão hoje para manter sua sequência no MemoriaFlash.', schedule: { on: { hour, minute: 0 }, repeats: true }, extra: { type: 'streak-risk' } }] }), 'Agendamento do aviso de sequência'); }

export interface EnablePushResult { success: boolean; message: string; }

export async function enableDailyReminders(reminderHourLocal: number): Promise<EnablePushResult> {
  const hour = normalizeHour(reminderHourLocal);
  try {
    if (isNativeApp()) {
      const result = await scheduleNativeDailyReminder(hour); if (!result.success) return result;
      const user = await withTimeout(ensureAuthenticated(), 'Autenticação'); const existing = await getNotificationPrefs();
      if (existing.streakReminderEnabled) { try { await scheduleNativeStreakReminder(hour); } catch (err) { console.warn('[Notifications] streak schedule failed', err); } }
      try { await withTimeout(setDoc(prefsDocRef(user.uid), { ...existing, dailyReminderEnabled: true, reminderHourLocal: hour, reminderHourUTC: localHourToUTCHour(hour), updatedAt: Date.now() }, { merge: true }), 'Salvamento das preferências'); } catch (err) { console.warn('[Notifications] prefs save failed', err); }
      return result;
    }
    const messaging = await getMessagingSafe(); if (!messaging) return { success: false, message: 'Notificações push não são suportadas neste navegador.' };
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY; if (!vapidKey) return { success: false, message: 'VITE_FIREBASE_VAPID_KEY não configurada.' };
    const permission = await Notification.requestPermission(); if (permission !== 'granted') return { success: false, message: 'Permissão de notificação negada pelo usuário.' };
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js'); const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration }); if (!token) return { success: false, message: 'Não foi possível obter o token de notificação.' };
    const user = await withTimeout(ensureAuthenticated(), 'Autenticação'); const existing = await getNotificationPrefs();
    await setDoc(prefsDocRef(user.uid), { ...existing, tokens: Array.from(new Set([...existing.tokens, token])), dailyReminderEnabled: true, reminderHourLocal: hour, reminderHourUTC: localHourToUTCHour(hour), updatedAt: Date.now() }, { merge: true });
    return { success: true, message: `Lembretes diários ativados para ${String(hour).padStart(2, '0')}:00.` };
  } catch (err: any) { console.error('Erro ao ativar notificações:', err); return { success: false, message: err?.message || 'Erro ao ativar notificações.' }; }
}

export async function disableDailyReminders(): Promise<EnablePushResult> {
  try { if (isNativeApp()) await cancelNativeNotifications([NATIVE_DAILY_REMINDER_ID]); const user = await withTimeout(ensureAuthenticated(), 'Autenticação'); const existing = await getNotificationPrefs(); await withTimeout(setDoc(prefsDocRef(user.uid), { ...existing, dailyReminderEnabled: false, updatedAt: Date.now() }, { merge: true }), 'Salvamento das preferências'); return { success: true, message: 'Lembretes diários desativados.' }; }
  catch (err: any) { return { success: false, message: err?.message || 'Não foi possível desativar os lembretes.' }; }
}

export async function updateStreakReminderPref(enabled: boolean): Promise<EnablePushResult> {
  try {
    const user = await withTimeout(ensureAuthenticated(), 'Autenticação'); const existing = await getNotificationPrefs();
    if (isNativeApp()) {
      if (enabled) { if (!(await ensureNativeNotificationPermission())) return { success: false, message: 'Permissão de notificações negada. Ative as notificações do MemoriaFlash nas configurações do Android.' }; await scheduleNativeStreakReminder(existing.reminderHourLocal); }
      else await cancelNativeNotifications([NATIVE_STREAK_REMINDER_ID]);
    }
    await withTimeout(setDoc(prefsDocRef(user.uid), { ...existing, streakReminderEnabled: enabled, updatedAt: Date.now() }, { merge: true }), 'Salvamento das preferências');
    return { success: true, message: enabled ? 'Aviso de sequência em risco ativado.' : 'Aviso de sequência em risco desativado.' };
  } catch (err: any) { return { success: false, message: err?.message || 'Não foi possível atualizar o aviso de sequência.' }; }
}

export async function sendTestNotification(): Promise<EnablePushResult> {
  if (isNativeApp()) {
    try { if (!(await ensureNativeNotificationPermission())) return { success: false, message: 'Permissão de notificação negada. Ative as notificações do MemoriaFlash nas configurações do Android.' }; await withTimeout(LocalNotifications.schedule({ notifications: [{ id: NATIVE_TEST_NOTIFICATION_ID, title: 'MemoriaFlash', body: 'Notificação funcionando! Seus lembretes estão configurados.', schedule: { at: new Date(Date.now() + 3000) }, extra: { type: 'notification-test' } }] }), 'Agendamento da notificação de teste'); return { success: true, message: 'Notificação de teste agendada para 3 segundos.' }; }
    catch (err: any) { return { success: false, message: err?.message || 'Falha ao testar a notificação.' }; }
  }
  const user = auth.currentUser; if (!user || typeof (user as any).getIdToken !== 'function') return { success: false, message: 'Faça login para testar as notificações.' };
  try { const idToken = await (user as any).getIdToken(); const res = await fetch('/api/notifications/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }); const data = await res.json(); return { success: res.ok, message: data.message || data.error || 'Notificação de teste enviada.' }; }
  catch (err: any) { return { success: false, message: err?.message || 'Falha ao enviar notificação de teste.' }; }
}
