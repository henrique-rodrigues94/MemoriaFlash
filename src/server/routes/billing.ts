// 📁 flashmind-ai/src/server/routes/billing.ts
import { Router } from 'express';
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

/**
 * Aplica o resultado de uma verificação de assinatura ao documento
 * userStats/{uid} via Admin SDK — o único caminho autorizado a alterar os
 * campos de billing (ver firestore.rules: billingFieldsUntouched()).
 */
async function applySubscriptionState(
  uid: string,
  purchaseToken: string,
  productId: string,
  result: Awaited<ReturnType<typeof verifySubscriptionPurchase>>
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
    { merge: true }
  );
}

/**
 * Chamado pelo app Android logo após o usuário concluir uma compra via
 * Play Billing Library. Recebe o purchaseToken retornado pela biblioteca,
 * verifica junto ao Google (nunca confiando no que o cliente diz ter
 * comprado) e só então libera o PRO no Firestore.
 */
billingRouter.post('/verify-purchase', async (req, res) => {
  try {
    const { idToken, purchaseToken, productId } = req.body;
    if (!idToken || !purchaseToken || !productId) {
      return res.status(400).json({ error: 'idToken, purchaseToken e productId são obrigatórios' });
    }

    const decoded = await verifyRequestUser(idToken);
    const uid = decoded.uid;

    const result = await verifySubscriptionPurchase(purchaseToken);

    if (!result.isActive) {
      return res.status(402).json({ error: 'Assinatura não está ativa no Google Play.', state: result.raw?.subscriptionState });
    }

    if (result.needsAcknowledgement) {
      await acknowledgeSubscriptionPurchase(purchaseToken, productId);
    }

    await applySubscriptionState(uid, purchaseToken, productId, result);

    return res.json({
      isPro: result.isActive,
      proPlanType: result.planType,
      proExpiryDate: result.expiryTimeIso,
    });
  } catch (error: any) {
    console.error('[billing] Erro ao verificar compra:', error);
    return res.status(error.httpStatus || 500).json({ error: error.message || 'Falha ao verificar compra' });
  }
});

/**
 * Real-time Developer Notifications (RTDN): webhook chamado pelo Google via
 * Pub/Sub push subscription sempre que o estado de uma assinatura muda —
 * renovação, cancelamento, pausa, reembolso, recuperação após problema de
 * pagamento, etc. Sem isto, um usuário que cancela a assinatura no próprio
 * Google Play continuaria com PRO ativo no app até abrir o app de novo (e
 * mesmo assim só se o app reverificasse proativamente, o que ele não fazia).
 *
 * Configuração necessária no Play Console: Configurações > Notificações em
 * tempo real para desenvolvedores > URL do tópico Pub/Sub, apontando para um
 * tópico que tenha esta rota como push subscription endpoint (ex:
 * https://SEU_DOMINIO/api/billing/rtdn).
 */
billingRouter.post('/rtdn', async (req, res) => {
  try {
    const message = req.body?.message;
    if (!message?.data) {
      // Pub/Sub também envia pings de verificação sem payload — responde 200
      // sempre que a requisição não tem o formato esperado, para o Google
      // não ficar re-tentando indefinidamente.
      return res.status(200).send();
    }

    const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'));
    const subscriptionNotification = decoded.subscriptionNotification;

    // Notificações de outros tipos (ex: testes, one-time products) são
    // ignoradas — só nos interessa o ciclo de vida de assinaturas aqui.
    if (!subscriptionNotification?.purchaseToken) {
      return res.status(200).send();
    }

    const purchaseToken = subscriptionNotification.purchaseToken;
    const result = await verifySubscriptionPurchase(purchaseToken);

    // O RTDN não informa o uid do usuário — por isso persistimos
    // playPurchaseToken no verify-purchase inicial e localizamos o
    // documento correspondente por ele.
    const db = getAdminFirestore();
    if (db) {
      const snapshot = await db.collection('userStats').where('playPurchaseToken', '==', purchaseToken).limit(1).get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        await doc.ref.set(
          {
            isPro: result.isActive,
            proPlanType: result.planType,
            proExpiryDate: result.expiryTimeIso,
            billingLastVerifiedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } else {
        console.warn('[billing/rtdn] Nenhum usuário encontrado para o purchaseToken recebido — notificação ignorada.');
      }
    }

    return res.status(200).send();
  } catch (error: any) {
    console.error('[billing/rtdn] Erro ao processar notificação:', error);
    // Retorna 200 mesmo em erro interno para não entrar em loop de retry do
    // Pub/Sub por um purchaseToken problemático — o erro já foi logado.
    return res.status(200).send();
  }
});

/** Diagnóstico simples: confirma se as credenciais de billing estão configuradas. */
billingRouter.get('/status', (_req, res) => {
  res.json({
    configured: !!getAndroidPackageName() && (!!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || !!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_FILE),
  });
});
