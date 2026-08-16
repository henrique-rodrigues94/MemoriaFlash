import { Router } from 'express';
import admin from 'firebase-admin';
import { getAdminAuth, getAdminFirestore } from '../firebaseAdmin';
import { deriveReferralCode } from '../../shared/referralCode';
import { ECONOMY } from '../../services/economy/economyConstants';

export const referralRouter = Router();

async function verifyRequestUser(idToken: string) {
  const adminAuth = getAdminAuth();
  if (!adminAuth) throw Object.assign(new Error('Backend sem credenciais do Firebase Admin configuradas.'), { httpStatus: 503 });
  return adminAuth.verifyIdToken(idToken);
}

function createRandomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = 'FM';
  for (let i = 0; i < 6; i += 1) value += alphabet[Math.floor(Math.random() * alphabet.length)];
  return value;
}

referralRouter.post('/ensure-code', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken é obrigatório' });
    const decoded = await verifyRequestUser(idToken);
    const code = deriveReferralCode(decoded.uid);
    const db = getAdminFirestore();
    if (!db) throw Object.assign(new Error('Firebase Admin não configurado.'), { httpStatus: 503 });
    await db.collection('referralCodes').doc(code).set({ uid: decoded.uid, active: true, createdAt: Date.now() }, { merge: true });
    return res.json({ code });
  } catch (error: any) {
    console.error('Error ensuring referral code:', error);
    return res.status(error.httpStatus || 500).json({ error: error.message || 'Falha ao registrar código de indicação' });
  }
});

/** Gera um novo código e desativa o anterior, evitando que o botão "Atualizar" mostre sempre o mesmo código. */
referralRouter.post('/rotate-code', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken é obrigatório' });
    const decoded = await verifyRequestUser(idToken);
    const db = getAdminFirestore();
    if (!db) throw Object.assign(new Error('Firebase Admin não configurado.'), { httpStatus: 503 });
    const deterministic = deriveReferralCode(decoded.uid);
    const code = await db.runTransaction(async tx => {
      const statsRef = db.collection('userStats').doc(decoded.uid);
      const statsDoc = await tx.get(statsRef);
      const currentCode = typeof statsDoc.data()?.referralCode === 'string' ? String(statsDoc.data()?.referralCode).toUpperCase() : deterministic;
      let next = createRandomCode();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const snap = await tx.get(db.collection('referralCodes').doc(next));
        if (!snap.exists) break;
        next = createRandomCode();
      }
      tx.set(db.collection('referralCodes').doc(currentCode), { active: false, deactivatedAt: Date.now() }, { merge: true });
      tx.set(db.collection('referralCodes').doc(next), { uid: decoded.uid, active: true, createdAt: Date.now(), rotatedFrom: currentCode }, { merge: true });
      tx.set(statsRef, { referralCode: next }, { merge: true });
      return next;
    });
    return res.json({ code });
  } catch (error: any) {
    console.error('Error rotating referral code:', error);
    return res.status(error.httpStatus || 500).json({ error: error.message || 'Falha ao atualizar código de indicação' });
  }
});

/** Ativa uma indicação de forma atômica e idempotente. */
referralRouter.post('/claim', async (req, res) => {
  try {
    const { idToken, referralCode } = req.body;
    if (!idToken || !referralCode) return res.status(400).json({ error: 'idToken e referralCode são obrigatórios' });
    const decoded = await verifyRequestUser(idToken);
    const referredUid = decoded.uid;
    const code = String(referralCode).toUpperCase().trim();
    const db = getAdminFirestore();
    if (!db) throw Object.assign(new Error('Firebase Admin não configurado.'), { httpStatus: 503 });

    const result = await db.runTransaction(async (tx) => {
      const codeDoc = await tx.get(db.collection('referralCodes').doc(code));
      if (!codeDoc.exists || codeDoc.data()?.active === false) throw Object.assign(new Error('Código de indicação inválido ou expirado.'), { httpStatus: 404 });
      const referrerUid = codeDoc.data()?.uid as string;
      if (!referrerUid || referrerUid === referredUid) throw Object.assign(new Error('Código de indicação inválido.'), { httpStatus: 400 });

      const claimRef = db.collection('referrals').doc(referredUid);
      const claimDoc = await tx.get(claimRef);
      if (claimDoc.exists) {
        const existing = claimDoc.data() || {};
        if (existing.referrerUid === referrerUid && existing.rewardedAt) return { alreadyRewarded: true, proExpiryDate: existing.proExpiryDate || null };
        throw Object.assign(new Error('Este usuário já utilizou uma indicação anteriormente.'), { httpStatus: 409 });
      }

      const referrerStatsRef = db.collection('userStats').doc(referrerUid);
      const referrerStatsDoc = await tx.get(referrerStatsRef);
      const current = referrerStatsDoc.exists ? referrerStatsDoc.data() || {} : {};
      const now = Date.now();
      const currentExpiry = typeof current.proExpiryDate === 'string' ? Date.parse(current.proExpiryDate) : NaN;
      const base = Number.isFinite(currentExpiry) && currentExpiry > now ? currentExpiry : now;
      const rewardExpiry = new Date(base + ECONOMY.REFERRAL_PRO_REWARD_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const resultingPlan = current.proPlanType === 'monthly' || current.proPlanType === 'annual' ? current.proPlanType : 'referral';

      tx.set(claimRef, { referrerUid, code, claimedAt: now, rewardedAt: now, rewardType: 'pro_days', rewardDays: ECONOMY.REFERRAL_PRO_REWARD_DAYS, proExpiryDate: rewardExpiry });
      tx.set(referrerStatsRef, { isPro: true, proPlanType: resultingPlan, proExpiryDate: rewardExpiry, referralCount: admin.firestore.FieldValue.increment(1), referralProDaysEarned: admin.firestore.FieldValue.increment(ECONOMY.REFERRAL_PRO_REWARD_DAYS) }, { merge: true });
      return { alreadyRewarded: false, proExpiryDate: rewardExpiry };
    });

    return res.json({ success: true, alreadyRewarded: result.alreadyRewarded, message: result.alreadyRewarded ? 'Esta indicação já foi registrada.' : `Indicação confirmada! O indicador recebeu ${ECONOMY.REFERRAL_PRO_REWARD_DAYS} dias de plano Pro.`, rewardDays: ECONOMY.REFERRAL_PRO_REWARD_DAYS });
  } catch (error: any) {
    console.error('Error claiming referral:', error);
    return res.status(error.httpStatus || 500).json({ error: error.message || 'Falha ao registrar indicação' });
  }
});
