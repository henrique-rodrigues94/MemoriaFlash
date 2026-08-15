import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getMessaging, getToken, isSupported, type Messaging } from 'firebase/messaging';
import { app, auth, db, doc, getDoc, setDoc, ensureAuthenticated } from '../../lib/firebase';

export interface NotificationPrefs {
  tokens: string[];
  dailyReminderEnabled: boolean;
  streakReminderEnabled: boolean;
  /** Hora do dia (0-23) no fuso horário LOCAL do usuário em que ele quer ser lembrado. */
  reminderHourLocal: number;
  /** Mesma hora já convertida para UTC — é o que o job no servidor efetivamente usa. */
  reminderHourUTC: number;
  updatedAt: number;
}

const DEFAULT_PREFS: NotificationPrefs = {
  tokens: [],
  dailyReminderEnabled: false,
  streakReminderEnabled: true,
  reminderHourLocal: 19,
  reminderHourUTC: 22,
  updatedAt: 0,
};

const NATIVE_DAILY_REMINDER_ID = 42001;
const NATIVE_TEST_NOTIFICATION_ID = 42002;

function prefsDocRef(uid: string) {
  return doc(db, 'notificationPrefs', uid);
}

function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const user = await ensureAuthenticated();
  try {
    const snap = await getDoc(prefsDocRef(user.uid));
    if (snap.exists()) return { ...DEFAULT_PREFS, ...(snap.data() as Partial<NotificationPrefs>) };
  } catch (err) {
    console.warn('Falha ao carregar preferências de notificação:', err);
  }
  return DEFAULT_PREFS;
}

function localHourToUTCHour(localHour: number): number {
  const offsetMinutes = new Date().getTimezoneOffset();
  return ((localHour + Math.round(offsetMinutes / 60)) % 24 + 24) % 24;
}

export async function isPushSupported(): Promise<boolean> {
  if (isNativeApp()) return true;
  try {
    return await isSupported();
  } catch {
    return false;
  }
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

async function scheduleNativeDailyReminder(reminderHourLocal: number): Promise<EnablePushResult> {
  const granted = await ensureNativeNotificationPermission();
  if (!granted) {
    return { success: false, message: 'Permissão de notificações negada. Ative as notificações do MemoriaFlash nas configurações do Android.' };
  }

  await LocalNotifications.cancel({ notifications: [{ id: NATIVE_DAILY_REMINDER_ID }] });
  await LocalNotifications.schedule({
    notifications: [
      {
        id: NATIVE_DAILY_REMINDER_ID,
        title: 'Lembretes de Revisão',
        body: 'Você tem cartões para revisar. Não deixe seus estudos acumularem.',
        schedule: {
          on: { hour: reminderHourLocal, minute: 0 },
        },
        extra: { type: 'daily-review' },
      },
    ],
  });

  return { success: true, message: 'Lembretes diários ativados neste celular!' };
}

async function disableNativeDailyReminder(): Promise<void> {
  await LocalNotifications.cancel({ notifications: [{ id: NATIVE_DAILY_REMINDER_ID }] });
}

export interface EnablePushResult {
  success: boolean;
  message: string;
}

/**
 * Android/iOS Capacitor: usa notificações locais nativas.
 * Navegador: mantém Firebase Cloud Messaging/Web Push.
 */
export async function enableDailyReminders(reminderHourLocal: number): Promise<EnablePushResult> {
  if (isNativeApp()) {
    try {
      const result = await scheduleNativeDailyReminder(reminderHourLocal);
      if (!result.success) return result;

      const user = await ensureAuthenticated();
      const existing = await getNotificationPrefs();
      const prefs: NotificationPrefs = {
        ...existing,
        dailyReminderEnabled: true,
        reminderHourLocal,
        reminderHourUTC: localHourToUTCHour(reminderHourLocal),
        updatedAt: Date.now(),
      };
      await setDoc(prefsDocRef(user.uid), prefs, { merge: true });
      return result;
    } catch (err: any) {
      console.error('Erro ao ativar notificações nativas:', err);
      return { success: false, message: err?.message || 'Erro ao ativar notificações nativas.' };
    }
  }

  const messaging = await getMessagingSafe();
  if (!messaging) {
    return { success: false, message: 'Notificações push não são suportadas neste navegador.' };
  }

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    return {
      success: false,
      message: 'VITE_FIREBASE_VAPID_KEY não configurada. Veja docs/PUSH_NOTIFICATIONS.md.',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'Permissão de notificação negada pelo usuário.' };
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) {
      return { success: false, message: 'Não foi possível obter o token de notificação.' };
    }

    const user = await ensureAuthenticated();
    const existing = await getNotificationPrefs();
    const tokens = Array.from(new Set([...existing.tokens, token]));
    const prefs: NotificationPrefs = {
      ...existing,
      tokens,
      dailyReminderEnabled: true,
      reminderHourLocal,
      reminderHourUTC: localHourToUTCHour(reminderHourLocal),
      updatedAt: Date.now(),
    };

    await setDoc(prefsDocRef(user.uid), prefs, { merge: true });
    return { success: true, message: 'Lembretes diários ativados! Vamos te avisar quando tiver revisão pendente.' };
  } catch (err: any) {
    console.error('Erro ao ativar notificações:', err);
    return { success: false, message: err?.message || 'Erro ao ativar notificações.' };
  }
}

export async function disableDailyReminders(): Promise<void> {
  if (isNativeApp()) await disableNativeDailyReminder();

  const user = await ensureAuthenticated();
  const existing = await getNotificationPrefs();
  await setDoc(
    prefsDocRef(user.uid),
    { ...existing, dailyReminderEnabled: false, updatedAt: Date.now() },
    { merge: true }
  );
}

export async function updateStreakReminderPref(enabled: boolean): Promise<void> {
  const user = await ensureAuthenticated();
  const existing = await getNotificationPrefs();
  await setDoc(
    prefsDocRef(user.uid),
    { ...existing, streakReminderEnabled: enabled, updatedAt: Date.now() },
    { merge: true }
  );
}

/** Envia uma notificação de teste imediata no dispositivo ou via backend no navegador. */
export async function sendTestNotification(): Promise<EnablePushResult> {
  if (isNativeApp()) {
    try {
      const granted = await ensureNativeNotificationPermission();
      if (!granted) {
        return { success: false, message: 'Permissão de notificações negada. Ative as notificações do MemoriaFlash nas configurações do Android.' };
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: NATIVE_TEST_NOTIFICATION_ID,
            title: 'MemoriaFlash',
            body: 'Notificação funcionando! Seus lembretes de revisão estão configurados.',
            schedule: { at: new Date(Date.now() + 3000) },
            extra: { type: 'notification-test' },
          },
        ],
      });
      return { success: true, message: 'Notificação de teste agendada para este celular.' };
    } catch (err: any) {
      console.error('Erro ao enviar notificação nativa de teste:', err);
      return { success: false, message: err?.message || 'Falha ao enviar notificação de teste.' };
    }
  }

  const user = auth.currentUser;
  if (!user || typeof (user as any).getIdToken !== 'function') {
    return { success: false, message: 'Faça login para testar as notificações.' };
  }
  try {
    const idToken = await (user as any).getIdToken();
    const res = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json();
    return { success: res.ok, message: data.message || data.error || 'Notificação de teste enviada.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Falha ao enviar notificação de teste.' };
  }
}
