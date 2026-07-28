import { Router } from 'express';
import { getAdminAuth } from '../firebaseAdmin';
import { sendPushToUser } from '../notifications/pushService';

export const notificationsRouter = Router();

notificationsRouter.post('/test', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken é obrigatório' });

    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return res.status(503).json({
        error: 'Backend sem credenciais do Firebase Admin configuradas (veja docs/FIREBASE_SETUP.md).',
      });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const result = await sendPushToUser(decoded.uid, {
      title: 'FlashMind AI 🔔',
      body: 'Notificação de teste — se você está vendo isso, os lembretes estão funcionando!',
      data: { url: '/', tag: 'test-notification' },
    });

    if (result.successCount === 0 && result.failureCount === 0) {
      return res.status(400).json({
        error: 'Nenhum token de notificação encontrado para este usuário. Ative os lembretes primeiro.',
      });
    }

    return res.json({
      success: result.successCount > 0,
      message:
        result.successCount > 0
          ? `Notificação enviada para ${result.successCount} dispositivo(s).`
          : 'Falha ao entregar a notificação de teste (token pode estar expirado).',
    });
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    return res.status(500).json({ error: error.message || 'Falha ao enviar notificação de teste' });
  }
});
