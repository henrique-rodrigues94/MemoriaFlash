import { Router } from 'express';
import admin from 'firebase-admin';
import { getAdminAuth, getAdminFirestore } from '../firebaseAdmin';
import { deriveReferralCode } from '../../shared/referralCode';
import { ECONOMY } from '../../services/economy/economyConstants';

export const referralRouter = Router();

async function verifyRequestUser(idToken: string) {
  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    throw Object.assign(new Error('Backend sem credenciais do Firebase Admin configuradas (veja FIREBASE_SETUP.md).'), {
      httpStatus: 503,
    });
  }
  return adminAuth.verifyIdToken(idToken);
}

// Garante que existe o mapeamento código -> uid deste usuário no Firestore,
// para que amigos consigam resgatar o código dele. Idempotente.
referralRouter.post('/ensure-code', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken é obrigatório' });

    const decoded = await verifyRequestUser(idToken);
    const uid = decoded.uid;
    const code = deriveReferralCode(uid);

    const db = getAdminFirestore()!;
    await db.collection('referralCodes').doc(code).set({ uid, createdAt: Date.now() }, { merge: true });

    return res.json({ code });
  } catch (error: any) {
    console.error('Error ensuring referral code:', error);
    return res.status(error.httpStatus || 500).json({ error: error.message || 'Falha ao registrar código de indicação' });
  }
});

// Resgata um código de indicação: credita o indicado (welcome bonus) e o
// indicador (referrer bonus), de forma atômica e à prova de fraude (o
// próprio cliente NÃO consegue creditar diretamente o Firestore — apenas o
// Admin SDK do servidor tem permissão de escrita nesses documentos).
referralRouter.post('/claim', async (req, res) => {
  try {
    const { idToken, referralCode } = req.body;
    if (!idToken || !referralCode) {
      return res.status(400).json({ error: 'idToken e referralCode são obrigatórios' });
    }

    const decoded = await verifyRequestUser(idToken);
    const referredUid = decoded.uid;
    const code = String(referralCode).toUpperCase().trim();

    const db = getAdminFirestore()!;

    const result = await db.runTransaction(async (tx) => {
      const codeDoc = await tx.get(db.collection('referralCodes').doc(code));
      if (!codeDoc.exists) {
        throw Object.assign(new Error('Código de indicação inválido ou não encontrado.'), { httpStatus: 404 });
      }
      const referrerUid = codeDoc.data()!.uid as string;

      if (referrerUid === referredUid) {
        throw Object.assign(new Error('Você não pode usar seu próprio código de indicação.'), { httpStatus: 400 });
      }

      const claimRef = db.collection('referrals').doc(referredUid);
      const claimDoc = await tx.get(claimRef);
      if (claimDoc.exists) {
        throw Object.assign(new Error('Este usuário já resgatou um código de indicação anteriormente.'), {
          httpStatus: 409,
        });
      }

      const referredStatsRef = db.collection('userStats').doc(referredUid);
      const referrerStatsRef = db.collection('userStats').doc(referrerUid);

      tx.set(
        claimRef,
        { referrerUid, code, createdAt: Date.now() },
        { merge: false }
      );
      tx.set(
        referredStatsRef,
        { aiCredits: admin.firestore.FieldValue.increment(ECONOMY.REFERRAL_WELCOME_BONUS), referredByCode: code },
        { merge: true }
      );
      tx.set(
        referrerStatsRef,
        {
          aiCredits: admin.firestore.FieldValue.increment(ECONOMY.REFERRAL_REFERRER_BONUS),
          referralCount: admin.firestore.FieldValue.increment(1),
          referralCreditsEarned: admin.firestore.FieldValue.increment(ECONOMY.REFERRAL_REFERRER_BONUS),
        },
        { merge: true }
      );

      return { welcomeBonus: ECONOMY.REFERRAL_WELCOME_BONUS };
    });

    return res.json({
      success: true,
      message: `Código aplicado! Você ganhou +${result.welcomeBonus} créditos de IA.`,
      welcomeBonus: result.welcomeBonus,
    });
  } catch (error: any) {
    console.error('Error claiming referral:', error);
    return res.status(error.httpStatus || 500).json({ error: error.message || 'Falha ao resgatar indicação' });
  }
});
