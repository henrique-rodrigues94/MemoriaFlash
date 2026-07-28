import cron from 'node-cron';
import { getAdminFirestore } from './firebaseAdmin';
import { runDailyReminderJob } from './notifications/reminderJob';

/**
 * Agenda o job de lembretes para rodar a cada hora cheia. Só inicia se o
 * Firebase Admin SDK estiver configurado (sem isso não há como consultar
 * decks/enviar push). Em deployments com múltiplas instâncias do servidor,
 * troque por um scheduler externo com lock (ex: Cloud Scheduler chamando um
 * endpoint protegido, ou um lock distribuído via Redis) para não duplicar
 * o job.
 */
export function startCronJobs() {
  if (!getAdminFirestore()) {
    console.log('[cron] Firebase Admin SDK não configurado — job de lembretes diários desativado.');
    return;
  }

  cron.schedule('0 * * * *', async () => {
    try {
      const result = await runDailyReminderJob();
      if (result.usersChecked > 0) {
        console.log(
          `[cron] Lembretes diários: ${result.usersChecked} usuários verificados, ${result.notificationsSent} notificações enviadas, ${result.errors} erros.`
        );
      }
    } catch (err) {
      console.error('[cron] Falha ao rodar o job de lembretes diários:', err);
    }
  });

  console.log('[cron] Job de lembretes diários agendado (a cada hora cheia).');
}
