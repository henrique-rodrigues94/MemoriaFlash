import admin from 'firebase-admin';
import { getAdminFirestore } from '../firebaseAdmin';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushResult {
  successCount: number;
  failureCount: number;
}

/**
 * Envia uma notificação para todos os tokens de um usuário e remove
 * automaticamente tokens inválidos/expirados (dispositivo desinstalou o
 * app, permissão revogada, etc.) — manutenção padrão recomendada pelo FCM.
 */
export async function sendPushToUser(uid: string, payload: PushPayload): Promise<PushResult> {
  const db = getAdminFirestore();
  if (!db) return { successCount: 0, failureCount: 0 };

  const prefsSnap = await db.collection('notificationPrefs').doc(uid).get();
  if (!prefsSnap.exists) return { successCount: 0, failureCount: 0 };

  const tokens: string[] = prefsSnap.data()?.tokens || [];
  if (tokens.length === 0) return { successCount: 0, failureCount: 0 };

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.data || {},
    webpush: {
      fcmOptions: { link: '/' },
      notification: { icon: '/icon-192.png' },
    },
  });

  // Remove tokens que o FCM reportou como inválidos/não registrados.
  const invalidTokens: string[] = [];
  response.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code || '';
      if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
        invalidTokens.push(tokens[i]);
      }
    }
  });

  if (invalidTokens.length > 0) {
    const remaining = tokens.filter((t) => !invalidTokens.includes(t));
    await prefsSnap.ref.set({ tokens: remaining }, { merge: true }).catch(() => {});
  }

  return { successCount: response.successCount, failureCount: response.failureCount };
}
