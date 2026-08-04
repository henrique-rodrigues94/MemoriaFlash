import { getAdminFirestore } from '../firebaseAdmin';
import { sendPushToUser } from './pushService';
import { getDueCardCount } from '../../services/srsEngine';
import { Flashcard } from '../../types';

function todayKeyUTC(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD em UTC
}

export interface ReminderJobResult {
  usersChecked: number;
  notificationsSent: number;
  errors: number;
}

/**
 * Roda a cada hora (ver src/server/cron.ts). Para cada usuário com lembrete
 * diário ativado cujo horário preferido (`reminderHourUTC`) bate com a hora
 * UTC atual, calcula quantos cartões estão vencidos e envia um push — no
 * máximo 1 vez por dia por usuário (controlado por `lastNotifiedDateKey`).
 */
export async function runDailyReminderJob(): Promise<ReminderJobResult> {
  const db = getAdminFirestore();
  const result: ReminderJobResult = { usersChecked: 0, notificationsSent: 0, errors: 0 };
  if (!db) return result;

  const currentUTCHour = new Date().getUTCHours();
  const today = todayKeyUTC();

  const prefsSnap = await db.collection('notificationPrefs').where('dailyReminderEnabled', '==', true).get();

  for (const prefDoc of prefsSnap.docs) {
    const uid = prefDoc.id;
    const prefs = prefDoc.data();

    if (prefs.reminderHourUTC !== currentUTCHour) continue;
    if (prefs.lastNotifiedDateKey === today) continue; // já notificado hoje

    result.usersChecked++;

    try {
      const decksSnap = await db.collection('decks').where('userId', '==', uid).get();
      const allCards: Flashcard[] = decksSnap.docs.flatMap((d) => (d.data().cards as Flashcard[]) || []);
      const dueCount = getDueCardCount(allCards);

      if (dueCount === 0) {
        // Nada vencido — não incomoda o usuário à toa, mas marca o dia como
        // "verificado" para não checar de novo nas próximas horas.
        await prefDoc.ref.set({ lastNotifiedDateKey: today, lastCheckedAt: Date.now() }, { merge: true });
        continue;
      }

      let body = `Você tem ${dueCount} cartão${dueCount > 1 ? 's' : ''} esperando revisão. Bora manter a memória afiada?`;

      if (prefs.streakReminderEnabled) {
        const statsSnap = await db.collection('userStats').doc(uid).get();
        const streakDays = statsSnap.exists ? statsSnap.data()?.streakDays || 0 : 0;
        if (streakDays > 0) {
          body += ` 🔥 Sua sequência de ${streakDays} dias está esperando.`;
        }
      }

      const sendResult = await sendPushToUser(uid, {
        title: 'MemoriaFlash — Hora de revisar!',
        body,
        data: { url: '/', tag: 'daily-reminder' },
      });

      if (sendResult.successCount > 0) result.notificationsSent++;

      // CORREÇÃO: antes marcávamos `lastNotifiedDateKey` sempre que
      // `sendPushToUser` retornava sem lançar exceção — mas isso inclui o
      // caso em que TODOS os tokens existiam e falharam na entrega (ex:
      // instabilidade momentânea do FCM), não só o caso de "usuário sem
      // nenhum token registrado". No primeiro caso, o job roda de hora em
      // hora e poderia ter sucesso na tentativa seguinte — mas ao marcar o
      // dia como "concluído" mesmo com falha total, o usuário ficava sem
      // NENHUM lembrete naquele dia inteiro. Só marcamos como concluído
      // quando: (a) o envio teve sucesso em pelo menos 1 dispositivo, ou
      // (b) o usuário genuinamente não tem nenhum token — nesse caso não há
      // nada a reenviar, então checar de novo a cada hora seria inútil.
      const genuineFailure = sendResult.successCount === 0 && sendResult.failureCount > 0;
      if (!genuineFailure) {
        await prefDoc.ref.set({ lastNotifiedDateKey: today, lastCheckedAt: Date.now() }, { merge: true });
      } else {
        await prefDoc.ref.set({ lastCheckedAt: Date.now() }, { merge: true });
      }
    } catch (err) {
      result.errors++;
      console.error(`[reminderJob] Falha ao processar usuário ${uid}:`, err);
    }
  }

  return result;
}
