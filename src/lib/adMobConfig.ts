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
  const useExplicitTestIds = env.VITE_ADMOB_USE_TEST_IDS === 'true';
  const hasProductionIds = Boolean(
    env.VITE_ADMOB_APP_ID &&
    env.VITE_ADMOB_BANNER_AD_UNIT_ID &&
    env.VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID &&
    env.VITE_ADMOB_REWARDED_AD_UNIT_ID
  );

  // Android debug/test installs often do not receive Vite environment
  // variables. When no production IDs exist, use Google's official test IDs
  // so the free-tier banner can actually be tested. Production release checks
  // must still provide real IDs.
  const isUsingTestIds = !hasProductionIds && (Boolean(import.meta.env.DEV) || isNative || useExplicitTestIds);

  const config = {
    appId: env.VITE_ADMOB_APP_ID || (isUsingTestIds ? DEFAULT_TEST_ADMOB_CONFIG.appId : ''),
    bannerAdUnitId: env.VITE_ADMOB_BANNER_AD_UNIT_ID || (isUsingTestIds ? DEFAULT_TEST_ADMOB_CONFIG.bannerAdUnitId : ''),
    interstitialAdUnitId: env.VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID || (isUsingTestIds ? DEFAULT_TEST_ADMOB_CONFIG.interstitialAdUnitId : ''),
    rewardedAdUnitId: env.VITE_ADMOB_REWARDED_AD_UNIT_ID || (isUsingTestIds ? DEFAULT_TEST_ADMOB_CONFIG.rewardedAdUnitId : ''),
    nativeAdUnitId: env.VITE_ADMOB_NATIVE_AD_UNIT_ID || (isUsingTestIds ? DEFAULT_TEST_ADMOB_CONFIG.nativeAdUnitId : ''),
  } as const;

  return {
    ...config,
    isConfigured: Boolean(config.appId && config.bannerAdUnitId && config.interstitialAdUnitId && config.rewardedAdUnitId),
    isUsingTestIds,
    hasProductionIds,
  } as const;
}
