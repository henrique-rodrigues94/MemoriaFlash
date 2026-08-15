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

const DEFAULT_PREFS: NotificationPrefs = { tokens: [], dailyReminderEnabled: false, streakReminderEnabled: true, reminderHourLocal: 19, reminderHourUTC: 22, updatedAt: 0 };
const NATIVE_DAILY_REMINDER_ID = 42001;
const NATIVE_TEST_NOTIFICATION_ID = 42002;

function prefsDocRef(uid: string) { return doc(db, 'notificationPrefs', uid); }
function isNativeApp(): boolean { return Capacitor.isNativePlatform(); }

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const user = await ensureAuthenticated();
  try {
    const snap = await getDoc(prefsDocRef(user.uid));
    if (snap.exists()) return { ...DEFAULT_PREFS, ...(snap.data() as Partial<NotificationPrefs>) };
  } catch (err) { console.warn('Falha ao carregar preferências de notificação:', err); }
  return DEFAULT_PREFS;
}

function normalizeHour(hour: number): number { return Math.min(23, Math.max(0, Math.round(Number(hour) || 0))); }
function localHourToUTCHour(localHour: number): number {
  const offsetMinutes = new Date().getTimezoneOffset();
  return ((normalizeHour(localHour) + Math.round(offsetMinutes / 60)) % 24 + 24) % 24;
}

export async function isPushSupported(): Promise<boolean> {
  if (isNativeApp()) return true;
  try { return await isSupported(); } catch { return false; }
}

let messagingInstance: Messaging | null = null;
async function getMessagingSafe(): Promise<Messaging | null> {
  if (isNativeApp() || !(await isPushSupported())) return null;
  if (!messagingInstance) messagingInstance = getMessaging(app);
  return messagingInstance;
}

async function ensureNativeNotificationPermission(): Promise<boolean> {
  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') return true;
  const requested = await LocalNotifications.requestPermissions();
  return requested.display === 'granted';
}

export interface EnablePushResult { success: boolean; message: string; }

async function scheduleNativeDailyReminder(reminderHourLocal: number): Promise<EnablePushResult> {
  const granted = await ensureNativeNotificationPermission();
  if (!granted) return { success: false, message: 'Permissão de notificações negada. Ative as notificações do MemoriaFlash nas configurações do Android.' };
  const hour = normalizeHour(reminderHourLocal);
  await LocalNotifications.cancel({ notifications: [{ id: NATIVE_DAILY_REMINDER_ID }] });
  await LocalNotifications.schedule({ notifications: [{
    id: NATIVE_DAILY_REMINDER_ID,
    title: 'Lembretes de Revisão',
    body: 'Você tem cartões para revisar. Não deixe seus estudos acumularem.',
    schedule: { on: { hour, minute: 0 } },
    extra: { type: 'daily-review' },
  }] });
  return { success: true, message: `Lembrete diário configurado para ${String(hour).padStart(2, '0')}:00 neste celular.` };
}

async function disableNativeDailyReminder(): Promise<void> {
  await LocalNotifications.cancel({ notifications: [{ id: NATIVE_DAILY_REMINDER_ID }] });
}

/** Ativa ou reprograma o lembrete diário. É seguro chamar novamente para trocar o horário. */
export async function enableDailyReminders(reminderHourLocal: number): Promise<EnablePushResult> {
  const hour = normalizeHour(reminderHourLocal);
  if (isNativeApp()) {
    try {
      const result = await scheduleNativeDailyReminder(hour);
      if (!result.success) return result;
      const user = await ensureAuthenticated();
      const existing = await getNotificationPrefs();
      await setDoc(prefsDocRef(user.uid), { ...existing, dailyReminderEnabled: true, reminderHourLocal: hour, reminderHourUTC: localHourToUTCHour(hour), updatedAt: Date.now() }, { merge: true });
      return result;
    } catch (err: any) {
      console.error('Erro ao ativar notificações nativas:', err);
      return { success: false, message: err?.message || 'Erro ao ativar notificações nativas.' };
    }
  }

  const messaging = await getMessagingSafe();
  if (!messaging) return { success: false, message: 'Notificações push não são suportadas neste navegador.' };
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) return { success: false, message: 'VITE_FIREBASE_VAPID_KEY não configurada. Veja a documentação de notificações.' };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { success: false, message: 'Permissão de notificação negada pelo usuário.' };
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return { success: false, message: 'Não foi possível obter o token de notificação.' };
    const user = await ensureAuthenticated();
    const existing = await getNotificationPrefs();
    const tokens = Array.from(new Set([...existing.tokens, token]));
    await setDoc(prefsDocRef(user.uid), { ...existing, tokens, dailyReminderEnabled: true, reminderHourLocal: hour, reminderHourUTC: localHourToUTCHour(hour), updatedAt: Date.now() }, { merge: true });
    return { success: true, message: `Lembretes diários ativados para ${String(hour).padStart(2, '0')}:00.` };
  } catch (err: any) {
    console.error('Erro ao ativar notificações:', err);
    return { success: false, message: err?.message || 'Erro ao ativar notificações.' };
  }
}

export async function disableDailyReminders(): Promise<EnablePushResult> {
  try {
    if (isNativeApp()) await disableNativeDailyReminder();
    const user = await ensureAuthenticated();
    const existing = await getNotificationPrefs();
    await setDoc(prefsDocRef(user.uid), { ...existing, dailyReminderEnabled: false, updatedAt: Date.now() }, { merge: true });
    return { success: true, message: 'Lembretes diários desativados.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Não foi possível desativar os lembretes.' };
  }
}

export async function updateStreakReminderPref(enabled: boolean): Promise<EnablePushResult> {
  try {
    const user = await ensureAuthenticated();
    const existing = await getNotificationPrefs();
    await setDoc(prefsDocRef(user.uid), { ...existing, streakReminderEnabled: enabled, updatedAt: Date.now() }, { merge: true });
    return { success: true, message: enabled ? 'Aviso de sequência em risco ativado.' : 'Aviso de sequência em risco desativado.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Não foi possível atualizar o aviso de sequência.' };
  }
}

export async function sendTestNotification(): Promise<EnablePushResult> {
  if (isNativeApp()) {
    try {
      const granted = await ensureNativeNotificationPermission();
      if (!granted) return { success: false, message: 'Permissão de notificação negada. Ative as notificações do MemoriaFlash nas configurações do Android.' };
      await LocalNotifications.schedule({ notifications: [{ id: NATIVE_TEST_NOTIFICATION_ID, title: 'MemoriaFlash', body: 'Notificação funcionando! Seus lembretes estão configurados.', schedule: { at: new Date(Date.now() + 3000) }, extra: { type: 'notification-test' } }] });
      return { success: true, message: 'Notificação de teste agendada para 3 segundos.' };
    } catch (err: any) { return { success: false, message: err?.message || 'Falha ao testar a notificação.' }; }
  }

  const user = auth.currentUser;
  if (!user || typeof (user as any).getIdToken !== 'function') return { success: false, message: 'Faça login para testar as notificações.' };
  try {
    const idToken = await (user as any).getIdToken();
    const res = await fetch('/api/notifications/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
    const data = await res.json();
    return { success: res.ok, message: data.message || data.error || 'Notificação de teste enviada.' };
  } catch (err: any) { return { success: false, message: err?.message || 'Falha ao enviar notificação de teste.' }; }
}
