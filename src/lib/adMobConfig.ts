import { Capacitor } from '@capacitor/core';

const DEFAULT_TEST_ADMOB_CONFIG = {
  // IDs oficiais de demonstração do Google. Usados SOMENTE para testes.
  appId: 'ca-app-pub-3940256099942544~3347511713',
  bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111',
  interstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712',
  rewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
  nativeAdUnitId: 'ca-app-pub-3940256099942544/2247696110',
} as const;

export function getAdMobConfig() {
  const env = import.meta.env;
  const isNative = Capacitor.isNativePlatform();
  const forceTestIds = env.VITE_ADMOB_USE_TEST_IDS === 'true';
  const hasProductionIds = Boolean(
    env.VITE_ADMOB_APP_ID &&
    env.VITE_ADMOB_BANNER_AD_UNIT_ID &&
    env.VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID &&
    env.VITE_ADMOB_REWARDED_AD_UNIT_ID
  );

  // Quando o modo de teste é explicitamente solicitado, os IDs oficiais do
  // Google vencem qualquer ID de produção presente no .env. Isso evita que
  // um APK de teste tente carregar unidades reais e fique sem anúncio.
  const isUsingTestIds = forceTestIds || (!hasProductionIds && (Boolean(import.meta.env.DEV) || isNative));
  const source = isUsingTestIds ? DEFAULT_TEST_ADMOB_CONFIG : {
    appId: env.VITE_ADMOB_APP_ID || '',
    bannerAdUnitId: env.VITE_ADMOB_BANNER_AD_UNIT_ID || '',
    interstitialAdUnitId: env.VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID || '',
    rewardedAdUnitId: env.VITE_ADMOB_REWARDED_AD_UNIT_ID || '',
    nativeAdUnitId: env.VITE_ADMOB_NATIVE_AD_UNIT_ID || '',
  };

  return {
    ...source,
    isConfigured: Boolean(source.appId && source.bannerAdUnitId && source.interstitialAdUnitId && source.rewardedAdUnitId),
    isUsingTestIds,
    hasProductionIds,
  } as const;
}
