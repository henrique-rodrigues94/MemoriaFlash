import { Capacitor } from '@capacitor/core';

const DEFAULT_TEST_ADMOB_CONFIG = {
  // IDs oficiais de demonstração do Google. Só podem ser usados quando
  // VITE_ADMOB_USE_TEST_IDS=true. Nunca são selecionados silenciosamente.
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
  const isProductionBuild = env.MODE === 'production' || env.VITE_APP_ENV === 'production';
  const hasProductionIds = Boolean(
    env.VITE_ADMOB_APP_ID &&
    env.VITE_ADMOB_BANNER_AD_UNIT_ID &&
    env.VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID &&
    env.VITE_ADMOB_REWARDED_AD_UNIT_ID,
  );

  // Test IDs são opt-in. Isso evita que um build de produção nativo sem
  // configuração de produção publique silenciosamente os IDs de demonstração.
  const isUsingTestIds = forceTestIds;
  const source = isUsingTestIds
    ? DEFAULT_TEST_ADMOB_CONFIG
    : {
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
    isProductionBuild,
    isNative,
  } as const;
}
