import { Router } from 'express';
import { z } from 'zod';
import type { Firestore, Query } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminFirestore } from '../firebaseAdmin';
import {
  verifySubscriptionPurchase,
  acknowledgeSubscriptionPurchase,
  getAndroidPackageName,
} from '../billing/googlePlayClient';

export const billingRouter = Router();

async function verifyRequestUser(idToken: string) {
  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    throw Object.assign(new Error('Backend sem credenciais do Firebase Admin configuradas.'), { httpStatus: 503 });
  }
  return adminAuth.verifyIdToken(idToken);
}

async function deleteQueryInBatches(db: Firestore, query: Query) {
  while (true) {
    const snapshot = await query.limit(400).get();
    if (snapshot.empty) return;
    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    if (snapshot.size < 400) return;
  }
}

async function deleteAccountData(uid: string) {
  const db = getAdminFirestore();
  const adminAuth = getAdminAuth();
  if (!db || !adminAuth) {
    throw Object.assign(new Error('Backend sem Firebase Admin configurado.'), { httpStatus: 503 });
  }

  await deleteQueryInBatches(db, db.collection('decks').where('userId', '==', uid));
  await deleteQueryInBatches(db, db.collection('referrals').where('uid', '==', uid));
  await deleteQueryInBatches(db, db.collection('notificationPrefs').where('uid', '==', uid));
  await deleteQueryInBatches(db, db.collection('userStats').where('uid', '==', uid));
  await deleteQueryInBatches(db, db.collection('cardFeedback').where('userId', '==', uid));

  const contentRequests = await db.collection('contentRequests').where('requestedBy', '==', uid).get();
  for (const request of contentRequests.docs) {
    await deleteQueryInBatches(db, request.ref.collection('sourceChunks'));
    await request.ref.delete();
  }

  // The authenticated user's stats/preferences may be stored as singleton docs.
  await db.collection('userStats').doc(uid).delete().catch(() => undefined);
  await db.collection('notificationPrefs').doc(uid).delete().catch(() => undefined);
  await db.collection('referrals').doc(uid).delete().catch(() => undefined);

  // Remove the Firebase identity last, after all user-owned data is gone.
  await adminAuth.deleteUser(uid);
}

billingRouter.delete('/account', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Autenticação necessária.' });
    }
    const decoded = await verifyRequestUser(header.slice('Bearer '.length).trim());
    await deleteAccountData(decoded.uid);
    return res.json({ ok: true, deleted: true });
  } catch (error: any) {
    console.error('[billing/account] Erro ao excluir conta:', error);
    return res.status(error?.httpStatus || 500).json({ error: error?.message || 'Não foi possível excluir a conta.' });
  }
});

const publicDeletionRequestSchema = z.object({
  email: z.string().trim().email().max(320),
  confirmation: z.literal('EXCLUIR MINHA CONTA'),
});

/**
 * Public fallback required by Google Play: users can request account/data
 * deletion even when they no longer have the app installed. The endpoint
 * intentionally does not reveal whether the email belongs to an account.
 */
billingRouter.post('/account-deletion/request', async (req, res) => {
  const parsed = publicDeletionRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Informe um e-mail válido e confirme a exclusão da conta.' });
  }

  try {
    const db = getAdminFirestore();
    if (!db) return res.status(503).json({ ok: false, error: 'Serviço de exclusão temporariamente indisponível.' });

    await db.collection('accountDeletionRequests').add({
      email: parsed.data.email.toLowerCase(),
      source: 'public-web',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    return res.json({ ok: true, message: 'Solicitação recebida. A exclusão será processada após a validação da conta.' });
  } catch (error) {
    console.error('[billing/account-deletion] Erro ao registrar solicitação:', error);
    return res.status(500).json({ ok: false, error: 'Não foi possível registrar a solicitação.' });
  }
});

async function applySubscriptionState(
  uid: string,
  purchaseToken: string,
  productId: string,
  result: Awaited<ReturnType<typeof verifySubscriptionPurchase>>,
) {
  const db = getAdminFirestore()!;
  await db.collection('userStats').doc(uid).set(
    {
      isPro: result.isActive,
      proPlanType: result.planType,
      proExpiryDate: result.expiryTimeIso,
      playPurchaseToken: purchaseToken,
      playProductId: productId,
      billingLastVerifiedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

billingRouter.post('/verify-purchase', async (req, res) => {
  try {
    const { idToken, purchaseToken, productId } = req.body;
    if (!idToken || !purchaseToken || !productId) {
      return res.status(400).json({ error: 'idToken, purchaseToken e productId são obrigatórios' });
    }

    const decoded = await verifyRequestUser(idToken);
    const result = await verifySubscriptionPurchase(purchaseToken);
    const verifiedProductId = result.raw?.lineItems?.[0]?.productId || null;
    if (!verifiedProductId || verifiedProductId !== productId) {
      return res.status(403).json({ error: 'O produto da compra não corresponde ao produto solicitado.' });
    }
    if (!result.isActive) {
      return res.status(402).json({
        error: 'Assinatura não está ativa no Google Play.',
        state: result.raw?.subscriptionState,
      });
    }

    if (result.needsAcknowledgement) await acknowledgeSubscriptionPurchase(purchaseToken, verifiedProductId);
    await applySubscriptionState(decoded.uid, purchaseToken, verifiedProductId, result);
    return res.json({ isPro: result.isActive, proPlanType: result.planType, proExpiryDate: result.expiryTimeIso });
  } catch (error: any) {
    console.error('[billing] Erro ao verificar compra:', error);
    return res.status(error?.httpStatus || 500).json({ error: error?.message || 'Falha ao verificar compra' });
  }
});

billingRouter.post('/rtdn', async (req, res) => {
  const configuredToken = process.env.GOOGLE_PLAY_RTDN_TOKEN;
  if (!configuredToken) return res.status(503).json({ error: 'RTDN não configurado.' });

  const suppliedToken = typeof req.query.token === 'string' ? req.query.token : req.headers['x-rtdn-token'];
  if (typeof suppliedToken !== 'string' || suppliedToken !== configuredToken) {
    return res.status(401).json({ error: 'RTDN não autorizado.' });
  }

  try {
    const message = req.body?.message;
    const messageId = typeof message?.messageId === 'string' ? message.messageId : null;
    if (!message?.data || !messageId) return res.status(400).send();

    const db = getAdminFirestore();
    if (!db) return res.status(503).send();

    const eventRef = db.collection('billingRtdnEvents').doc(messageId);
    const existing = await eventRef.get();
    if (existing.exists) return res.status(204).send();

    const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'));
    const subscriptionNotification = decoded.subscriptionNotification;
    if (!subscriptionNotification?.purchaseToken) {
      await eventRef.set({ processedAt: new Date().toISOString(), type: 'ignored' });
      return res.status(204).send();
    }

    const result = await verifySubscriptionPurchase(subscriptionNotification.purchaseToken);
    const snapshot = await db
      .collection('userStats')
      .where('playPurchaseToken', '==', subscriptionNotification.purchaseToken)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.set(
        {
          isPro: result.isActive,
          proPlanType: result.planType,
          proExpiryDate: result.expiryTimeIso,
          billingLastVerifiedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    }

    await eventRef.set({ processedAt: new Date().toISOString(), type: 'subscription', tokenSuffix: subscriptionNotification.purchaseToken.slice(-8) });
    return res.status(204).send();
  } catch (error) {
    console.error('[billing/rtdn] Erro ao processar notificação:', error);
    return res.status(500).send();
  }
});

billingRouter.get('/status', (_req, res) => {
  res.json({
    configured:
      !!getAndroidPackageName() &&
      (!!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || !!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_FILE),
    rtdnConfigured: Boolean(process.env.GOOGLE_PLAY_RTDN_TOKEN),
  });
});
