import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { auth } from '../../lib/firebase';

export type PlayPlanType = 'monthly' | 'annual';

const PLAN_CONFIG: Record<PlayPlanType, { productId: string; basePlanId: string }> = {
  monthly: {
    productId: import.meta.env.VITE_PLAY_MONTHLY_PRODUCT_ID || '',
    basePlanId: import.meta.env.VITE_PLAY_MONTHLY_BASE_PLAN_ID || '',
  },
  annual: {
    productId: import.meta.env.VITE_PLAY_ANNUAL_PRODUCT_ID || '',
    basePlanId: import.meta.env.VITE_PLAY_ANNUAL_BASE_PLAN_ID || '',
  },
};

function assertAndroidBillingConfig(planType: PlayPlanType) {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error('Google Play Billing está disponível somente no Android.');
  }

  const config = PLAN_CONFIG[planType];
  if (!config.productId || !config.basePlanId) {
    throw new Error(`Google Play Billing ainda não configurado para o plano ${planType}.`);
  }
  return config;
}

async function getFirebaseIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login antes de assinar o PRO.');
  return user.getIdToken(true);
}

/**
 * Busca preço/título diretamente do Google Play. Nunca hardcode o preço na UI.
 */
export async function getPlaySubscriptionProduct(planType: PlayPlanType) {
  const config = assertAndroidBillingConfig(planType);
  const { product } = await NativePurchases.getProduct({
    productIdentifier: config.productId,
    productType: PURCHASE_TYPE.SUBS,
  });
  return product;
}

/**
 * Compra uma assinatura e valida o purchaseToken no backend antes de considerar
 * a conta PRO. O cliente nunca grava isPro diretamente.
 */
export async function purchasePlaySubscription(planType: PlayPlanType): Promise<{
  isPro: boolean;
  proPlanType: 'monthly' | 'annual' | null;
  proExpiryDate: string | null;
}> {
  const config = assertAndroidBillingConfig(planType);
  const { isBillingSupported } = await NativePurchases.isBillingSupported();
  if (!isBillingSupported) throw new Error('Google Play Billing não está disponível neste dispositivo.');

  const transaction = await NativePurchases.purchaseProduct({
    productIdentifier: config.productId,
    productType: PURCHASE_TYPE.SUBS,
    planIdentifier: config.basePlanId,
    autoAcknowledgePurchases: false,
  });

  if (!transaction.purchaseToken) {
    throw new Error('O Google Play não retornou um purchaseToken válido.');
  }

  const idToken = await getFirebaseIdToken();
  const response = await fetch('/api/billing/verify-purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      idToken,
      purchaseToken: transaction.purchaseToken,
      productId: config.productId,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.isPro) {
    throw new Error(payload.error || 'Não foi possível validar a assinatura no Google Play.');
  }

  // O backend faz o acknowledge. Não marcar PRO localmente antes desta etapa.
  return {
    isPro: true,
    proPlanType: payload.proPlanType || null,
    proExpiryDate: payload.proExpiryDate || null,
  };
}

export async function restorePlaySubscription(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') return false;

  const { purchases } = await NativePurchases.getPurchases({
    productType: PURCHASE_TYPE.SUBS,
  });
  const idToken = await getFirebaseIdToken();

  for (const purchase of purchases) {
    if (!purchase.purchaseToken || purchase.purchaseState !== 'PURCHASED') continue;

    const response = await fetch('/api/billing/verify-purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        idToken,
        purchaseToken: purchase.purchaseToken,
        productId: purchase.productIdentifier,
      }),
    });

    if (response.ok) {
      const payload = await response.json();
      if (payload.isPro) return true;
    }
  }

  return false;
}

export async function managePlaySubscription(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  await NativePurchases.manageSubscriptions();
}
