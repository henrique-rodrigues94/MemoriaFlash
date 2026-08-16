// 📁 flashmind-ai/src/server/routes/billing.ts
import { Router } from 'express';
import { getAdminAuth, getAdminFirestore } from '../firebaseAdmin';
import { verifySubscriptionPurchase, acknowledgeSubscriptionPurchase, getAndroidPackageName } from '../billing/googlePlayClient';

export const billingRouter = Router();

async function verifyRequestUser(idToken: string) {
  const adminAuth = getAdminAuth();
  if (!adminAuth) throw Object.assign(new Error('Backend sem credenciais do Firebase Admin configuradas.'), { httpStatus: 503 });
  return adminAuth.verifyIdToken(idToken);
}

async function deleteAccountData(uid: string) {
  const db = getAdminFirestore();
  const adminAuth = getAdminAuth();
  if (!db || !adminAuth) throw Object.assign(new Error('Backend sem Firebase Admin configurado.'), { httpStatus: 503 });

  const ownedCollections = ['decks', 'notificationPrefs', 'userStats', 'referrals'];
  for (const collectionName of ownedCollections) {
    const snapshot = await db.collection(collectionName).where(collectionName === 'decks' || collectionName === 'referrals' ? (collectionName === 'decks' ? 'userId' : 'uid') : 'uid', '==', uid).get().catch(async () => db.collection(collectionName).where('userId', '==', uid).get());
    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach(document => batch.delete(document.ref));
      await batch.commit();
    }
  }

  await db.collection('userStats').doc(uid).delete().catch(() => undefined);
  await db.collection('notificationPrefs').doc(uid).delete().catch(() => undefined);
  await db.collection('referrals').doc(uid).delete().catch(() => undefined);

  const requests = await db.collection('contentRequests').where('requestedBy', '==', uid).get();
  for (const request of requests.docs) {
    const chunks = await request.ref.collection('sourceChunks').get();
    if (!chunks.empty) {
      const batch = db.batch();
      chunks.docs.forEach(chunk => batch.delete(chunk.ref));
      await batch.commit();
    }
    await request.ref.delete();
  }

  const feedback = await db.collection('cardFeedback').where('userId', '==', uid).get();
  if (!feedback.empty) {
    const batch = db.batch();
    feedback.docs.forEach(document => batch.delete(document.ref));
    await batch.commit();
  }

  await adminAuth.deleteUser(uid);
}

billingRouter.delete('/account', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Autenticação necessária.' });
    const decoded = await verifyRequestUser(header.slice('Bearer '.length).trim());
    await deleteAccountData(decoded.uid);
    return res.json({ ok: true, deleted: true });
  } catch (error: any) {
    console.error('[billing/account] Erro ao excluir conta:', error);
    return res.status(error?.httpStatus || 500).json({ error: error?.message || 'Não foi possível excluir a conta.' });
  }
});

async function applySubscriptionState(uid: string, purchaseToken: string, productId: string, result: Awaited<ReturnType<typeof verifySubscriptionPurchase>>) {
  const db = getAdminFirestore()!;
  await db.collection('userStats').doc(uid).set({ isPro: result.isActive, proPlanType: result.planType, proExpiryDate: result.expiryTimeIso, playPurchaseToken: purchaseToken, playProductId: productId, billingLastVerifiedAt: new Date().toISOString() }, { merge: true });
}

billingRouter.post('/verify-purchase', async (req, res) => {
  try {
    const { idToken, purchaseToken, productId } = req.body;
    if (!idToken || !purchaseToken || !productId) return res.status(400).json({ error: 'idToken, purchaseToken e productId são obrigatórios' });
    const decoded = await verifyRequestUser(idToken);
    const result = await verifySubscriptionPurchase(purchaseToken);
    if (!result.isActive) return res.status(402).json({ error: 'Assinatura não está ativa no Google Play.', state: result.raw?.subscriptionState });
    if (result.needsAcknowledgement) await acknowledgeSubscriptionPurchase(purchaseToken, productId);
    await applySubscriptionState(decoded.uid, purchaseToken, productId, result);
    return res.json({ isPro: result.isActive, proPlanType: result.planType, proExpiryDate: result.expiryTimeIso });
  } catch (error: any) {
    console.error('[billing] Erro ao verificar compra:', error);
    return res.status(error.httpStatus || 500).json({ error: error.message || 'Falha ao verificar compra' });
  }
});

billingRouter.post('/rtdn', async (req, res) => {
  try {
    const message = req.body?.message;
    if (!message?.data) return res.status(200).send();
    const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'));
    const subscriptionNotification = decoded.subscriptionNotification;
    if (!subscriptionNotification?.purchaseToken) return res.status(200).send();
    const result = await verifySubscriptionPurchase(subscriptionNotification.purchaseToken);
    const db = getAdminFirestore();
    if (db) {
      const snapshot = await db.collection('userStats').where('playPurchaseToken', '==', subscriptionNotification.purchaseToken).limit(1).get();
      if (!snapshot.empty) await snapshot.docs[0].ref.set({ isPro: result.isActive, proPlanType: result.planType, proExpiryDate: result.expiryTimeIso, billingLastVerifiedAt: new Date().toISOString() }, { merge: true });
    }
    return res.status(200).send();
  } catch (error: any) {
    console.error('[billing/rtdn] Erro ao processar notificação:', error);
    return res.status(200).send();
  }
});

billingRouter.get('/status', (_req, res) => {
  res.json({ configured: !!getAndroidPackageName() && (!!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || !!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_FILE) });
});
