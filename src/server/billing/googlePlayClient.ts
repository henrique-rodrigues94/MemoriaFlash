// 📁 flashmind-ai/src/server/billing/googlePlayClient.ts
//
// Cliente da Android Publisher API (Google Play Developer API), usado para
// VERIFICAR do lado do servidor se uma compra/assinatura reportada pelo app
// Android é legítima — nunca confiamos apenas no que o cliente diz.
//
// ── Como configurar (Google Play Console + Google Cloud) ───────────────────
// 1. No Play Console: Configurações > Acesso à API > vincule o projeto ao
//    Google Cloud (ou crie um novo).
// 2. No Google Cloud Console do projeto vinculado: IAM e Admin > Contas de
//    serviço > Criar conta de serviço (ex: "play-billing-verifier").
// 3. Gere uma chave JSON para essa conta de serviço.
// 4. De volta no Play Console: Configurações > Acesso à API > na conta de
//    serviço criada, clique em "Conceder acesso" e dê a permissão
//    "Ver dados financeiros" + "Gerenciar pedidos e assinaturas".
// 5. Ative a "Google Play Android Developer API" no Google Cloud Console
//    (APIs e serviços > Ativar APIs e serviços).
// 6. Cole o conteúdo do JSON da chave na env var GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
//    (ou aponte GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_FILE para o caminho do arquivo).
// 7. Defina ANDROID_PACKAGE_NAME com o applicationId do app (ex: com.memoriaflash.app).
//
// Sem essas variáveis, os endpoints de billing ficam desativados com um
// aviso — o servidor nunca crasha por causa disso (mesmo padrão do
// firebaseAdmin.ts).

import { google, androidpublisher_v3 } from 'googleapis';
import fs from 'fs';

let publisherClient: androidpublisher_v3.Androidpublisher | null = null;
let initTried = false;

function loadCredentials(): { client_email: string; private_key: string } | null {
  const inlineJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  const keyFilePath = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_FILE;

  try {
    if (inlineJson) {
      const parsed = JSON.parse(inlineJson);
      return { client_email: parsed.client_email, private_key: parsed.private_key };
    }
    if (keyFilePath && fs.existsSync(keyFilePath)) {
      const parsed = JSON.parse(fs.readFileSync(keyFilePath, 'utf-8'));
      return { client_email: parsed.client_email, private_key: parsed.private_key };
    }
  } catch (err: any) {
    console.error('[googlePlayClient] ❌ Falha ao ler credenciais da service account:', err?.message || err);
  }
  return null;
}

export function getAndroidPackageName(): string | null {
  return process.env.ANDROID_PACKAGE_NAME || null;
}

export function getPlayPublisherClient(): androidpublisher_v3.Androidpublisher | null {
  if (publisherClient) return publisherClient;
  if (initTried) return null;
  initTried = true;

  const creds = loadCredentials();
  const packageName = getAndroidPackageName();

  if (!creds || !creds.client_email || !creds.private_key || !packageName) {
    console.warn(
      '[googlePlayClient] ⚠️  Credenciais do Google Play Billing ausentes.\n' +
      '  Verificação de compras ficará desativada.\n' +
      '  Configure GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (ou _KEY_FILE) e ANDROID_PACKAGE_NAME no .env.\n' +
      '  Veja o cabeçalho de src/server/billing/googlePlayClient.ts para o passo a passo.'
    );
    return null;
  }

  try {
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
    publisherClient = google.androidpublisher({ version: 'v3', auth });
    console.log('[googlePlayClient] ✅ Cliente da Google Play Developer API inicializado.');
    return publisherClient;
  } catch (err: any) {
    console.error('[googlePlayClient] ❌ Falha ao inicializar cliente da Play Developer API:', err?.message || err);
    return null;
  }
}

export interface SubscriptionVerificationResult {
  isActive: boolean;
  /** ISO date string de quando a assinatura expira/expirou. */
  expiryTimeIso: string | null;
  /** 'monthly' | 'annual' — inferido a partir do productId/basePlanId retornado pela API. */
  planType: 'monthly' | 'annual' | null;
  /** true quando a assinatura ainda não foi confirmada (precisa chamar acknowledge). */
  needsAcknowledgement: boolean;
  raw: androidpublisher_v3.Schema$SubscriptionPurchaseV2 | null;
}

/**
 * Verifica uma assinatura junto ao Google Play usando o purchaseToken que o
 * app Android recebeu do Billing Library após a compra. NUNCA confie no
 * productId/planType que o cliente diz ter comprado — os dados usados para
 * liberar o PRO devem vir sempre da resposta desta chamada.
 */
export async function verifySubscriptionPurchase(purchaseToken: string): Promise<SubscriptionVerificationResult> {
  const client = getPlayPublisherClient();
  const packageName = getAndroidPackageName();
  if (!client || !packageName) {
    throw Object.assign(new Error('Backend sem credenciais do Google Play Billing configuradas.'), { httpStatus: 503 });
  }

  // subscriptionsv2.get é a versão atual da API (substituiu purchases.subscriptions,
  // deprecated). Retorna o estado real da assinatura (ACTIVE, CANCELED, EXPIRED,
  // ON_HOLD, PAUSED...) e a linha de itens comprados (lineItems).
  const { data } = await client.purchases.subscriptionsv2.get({
    packageName,
    token: purchaseToken,
  });

  const lineItem = data.lineItems?.[0];
  const expiryTimeIso = lineItem?.expiryTime || null;
  const state = data.subscriptionState || '';
  const isActive = state === 'SUBSCRIPTION_STATE_ACTIVE' || state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD';

  const basePlanId = lineItem?.offerDetails?.basePlanId || '';
  const planType: 'monthly' | 'annual' | null =
    basePlanId.includes('annual') || basePlanId.includes('anual') ? 'annual' :
    basePlanId.includes('monthly') || basePlanId.includes('mensal') ? 'monthly' :
    null;

  const needsAcknowledgement = data.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING';

  return { isActive, expiryTimeIso, planType, needsAcknowledgement, raw: data };
}

/**
 * Confirma (acknowledge) a compra junto ao Google. OBRIGATÓRIO: o Google
 * estorna automaticamente qualquer compra de assinatura não confirmada em
 * até 3 dias. Deve ser chamado uma vez, logo após a primeira verificação
 * bem-sucedida de uma nova assinatura.
 */
export async function acknowledgeSubscriptionPurchase(purchaseToken: string, subscriptionId: string): Promise<void> {
  const client = getPlayPublisherClient();
  const packageName = getAndroidPackageName();
  if (!client || !packageName) return;

  await client.purchases.subscriptions.acknowledge({
    packageName,
    subscriptionId,
    token: purchaseToken,
    requestBody: {},
  });
}
