import { Router } from 'express';
import { z } from 'zod';
import { getAdminFirestore } from '../firebaseAdmin';

const requestSchema = z.object({
  email: z.string().trim().email().max(320),
  confirmation: z.literal('EXCLUIR MINHA CONTA'),
});

export const accountDeletionRouter = Router();

/**
 * Public fallback required by Google Play for users who need to request
 * account/data deletion outside the installed app. The endpoint intentionally
 * does not reveal whether an account exists; the request is queued for the
 * authenticated support/deletion workflow.
 */
accountDeletionRouter.post('/request', async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: 'Informe um e-mail válido e confirme a exclusão da conta.',
    });
  }

  try {
    const db = getAdminFirestore();
    if (!db) {
      return res.status(503).json({ ok: false, error: 'Serviço de exclusão temporariamente indisponível.' });
    }

    const email = parsed.data.email.toLowerCase();
    await db.collection('accountDeletionRequests').add({
      email,
      source: 'public-web',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    return res.json({
      ok: true,
      message: 'Solicitação recebida. A exclusão será processada após a validação da conta.',
    });
  } catch (error) {
    console.error('[account-deletion] erro ao registrar solicitação:', error);
    return res.status(500).json({ ok: false, error: 'Não foi possível registrar a solicitação.' });
  }
});
