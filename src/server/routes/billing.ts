import { Router } from 'express';
import { z } from 'zod';
import type { Firestore, Query } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminFirestore } from '../firebaseAdmin';
import { verifySubscriptionPurchase, acknowledgeSubscriptionPurchase, getAndroidPackageName } from '../billing/googlePlayClient';

export const billingRouter = Router();

async function verifyRequestUser(idToken: string) {
  const adminAuth = getAdminAuth();
  if (!adminAuth) throw Object.assign(new Error('Backend sem credenciais do Firebase Admin configuradas.'), { httpStatus: 503 });
  return adminAuth.verifyIdToken(idToken);
}

function assertAdminToken(req: any) {
  const configured = process.env.ADMIN_TOKEN;
  const supplied = req.headers['x-admin-token'];
  if (!configured || typeof supplied !== 'string' || supplied !== configured) throw Object.assign(new Error('Não autorizado.'), { httpStatus: 401 });
}

async function deleteQueryInBatches(db: Firestore, query: Query) {
  while (true) {
    const snapshot = await query.limit(400).get();
    if (snapshot.empty) return;
    const batch = db.batch();
    snapshot.docs.forEach(document => batch.delete(document.ref));
    await batch.commit();
    if (snapshot.size < 400) return;
  }
}

async function deleteAccountData(uid: string) {
  const db = getAdminFirestore();
  const adminAuth = getAdminAuth();
  if (!db || !adminAuth) throw Object.assign(new Error('Backend sem Firebase Admin configurado.'), { httpStatus: 503 });

  // Dados privados e documentos de suporte diretamente vinculados ao UID.
  await deleteQueryInBatches(db, db.collection('decks').where('userId', '==', uid));
  await deleteQueryInBatches(db, db.collection('referrals').where('uid', '==', uid));
  await deleteQueryInBatches(db, db.collection('notificationPrefs').where('uid', '==', uid));
  await deleteQueryInBatches(db, db.collection('userStats').where('uid', '==', uid));
  await deleteQueryInBatches(db, db.collection('cardFeedback').where('userId', '==', uid));
  await deleteQueryInBatches(db, db.collection('classes').where('teacherId', '==', uid));
  await deleteQueryInBatches(db, db.collection('referralCodes').where('uid', '==', uid));

  const contentRequests = await db.collection('contentRequests').where('requestedBy', '==', uid).get();
  for (const request of contentRequests.docs) {
    await deleteQueryInBatches(db, request.ref.collection('sourceChunks'));
    await request.ref.delete();
  }

  // Alguns documentos são criados com o UID como ID, então a limpeza por
  // consulta acima não é suficiente para esses casos.
  await db.collection('userStats').doc(uid).delete().catch(() => undefined);
  await db.collection('notificationPrefs').doc(uid).delete().catch(() => undefined);
  await db.collection('referrals').doc(uid).delete().catch(() => undefined);

  // A conta Firebase só é removida depois que os dados vinculados foram
  // apagados, evitando deixar uma conta órfã no Authentication.
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

const publicDeletionRequestSchema = z.object({ email: z.string().trim().email().max(320), confirmation: z.literal('EXCLUIR MINHA CONTA') });

billingRouter.post('/account-deletion/request', async (req, res) => {
  const parsed = publicDeletionRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Informe um e-mail válido e confirme a exclusão da conta.' });
  try {
    const db = getAdminFirestore();
    if (!db) return res.status(503).json({ ok: false, error: 'Serviço de exclusão temporariamente indisponível.' });
    await db.collection('accountDeletionRequests').add({ email: parsed.data.email.toLowerCase(), source: 'public-web', status: 'pending', createdAt: new Date().toISOString() });
    return res.json({ ok: true, message: 'Solicitação recebida. A exclusão será processada após a validação da conta.' });
  } catch (error) {
    console.error('[billing/account-deletion] Erro ao registrar solicitação:', error);
    return res.status(500).json({ ok: false, error: 'Não foi possível registrar a solicitação.' });
  }
});

billingRouter.get('/account-deletion/requests', async (req, res) => {
  try {
    assertAdminToken(req);
    const db = getAdminFirestore();
    if (!db) return res.status(503).json({ error: 'Firebase Admin não configurado.' });
    const snapshot = await db.collection('accountDeletionRequests').where('status', '==', 'pending').limit(50).get();
    return res.json({ requests: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
  } catch (error: any) { return res.status(error?.httpStatus || 500).json({ error: error?.message || 'Falha ao listar solicitações.' }); }
});

billingRouter.post('/account-deletion/process', async (req, res) => {
  try {
    assertAdminToken(req);
    const requestId = z.string().min(1).safeParse(req.body?.requestId);
    if (!requestId.success) return res.status(400).json({ error: 'requestId é obrigatório.' });
    const db = getAdminFirestore();
    const adminAuth = getAdminAuth();
    if (!db || !adminAuth) return res.status(503).json({ error: 'Firebase Admin não configurado.' });
    const requestRef = db.collection('accountDeletionRequests').doc(requestId.data);
    const requestSnapshot = await requestRef.get();
    if (!requestSnapshot.exists) return res.status(404).json({ error: 'Solicitação não encontrada.' });
    const requestData = requestSnapshot.data() || {};
    if (requestData.status !== 'pending') return res.status(409).json({ error: 'Solicitação já processada.' });
    const email = typeof requestData.email === 'string' ? requestData.email : '';
    if (!email) return res.status(422).json({ error: 'Solicitação sem e-mail válido.' });

    let user;
    try { user = await adminAuth.getUserByEmail(email); }
    catch (error: any) {
      if (error?.code === 'auth/user-not-found') { await requestRef.set({ status: 'not_found', processedAt: new Date().toISOString() }, { merge: true }); return res.json({ ok: true, status: 'not_found' }); }
      throw error;
    }
    await deleteAccountData(user.uid);
    await requestRef.set({ status: 'processed', processedAt: new Date().toISOString() }, { merge: true });
    return res.json({ ok: true, status: 'processed' });
  } catch (error: any) {
    console.error('[billing/account-deletion/process] Erro:', error);
    return res.status(error?.httpStatus || 500).json({ error: error?.message || 'Falha ao processar solicitação.' });
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
    const verifiedProductId = result.raw?.lineItems?.[0]?.productId || null;
    if (!verifiedProductId || verifiedProductId !== productId) return res.status(403).json({ error: 'O produto da compra não corresponde ao produto solicitado.' });
    if (!result.isActive) return res.status(402).json({ error: 'Assinatura não está ativa no Google Play.', state: result.raw?.subscriptionState });
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
  if (typeof suppliedToken !== 'string' || suppliedToken !== configuredToken) return res.status(401).json({ error: 'RTDN não autorizado.' });
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
    if (!subscriptionNotification?.purchaseToken) { await eventRef.set({ processedAt: new Date().toISOString(), type: 'ignored' }); return res.status(204).send(); }
    const result = await verifySubscriptionPurchase(subscriptionNotification.purchaseToken);
    const snapshot = await db.collection('userStats').where('playPurchaseToken', '==', subscriptionNotification.purchaseToken).limit(1).get();
    if (!snapshot.empty) await snapshot.docs[0].ref.set({ isPro: result.isActive, proPlanType: result.planType, proExpiryDate: result.expiryTimeIso, billingLastVerifiedAt: new Date().toISOString() }, { merge: true });
    await eventRef.set({ processedAt: new Date().toISOString(), type: 'subscription', tokenSuffix: subscriptionNotification.purchaseToken.slice(-8) });
    return res.status(204).send();
  } catch (error) { console.error('[billing/rtdn] Erro ao processar notificação:', error); return res.status(500).send(); }
});

billingRouter.get('/status', (_req, res) => {
  res.json({ configured: !!getAndroidPackageName() && (!!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || !!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_FILE), rtdnConfigured: Boolean(process.env.GOOGLE_PLAY_RTDN_TOKEN) });
});
