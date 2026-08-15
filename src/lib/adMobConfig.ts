const DEFAULT_TEST_ADMOB_CONFIG = {
  // IDs oficiais de demonstração do Google. Usados SOMENTE em desenvolvimento.
  appId: 'ca-app-pub-3940256099942544~3347511713',
  bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111',
  interstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712',
  rewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
  nativeAdUnitId: 'ca-app-pub-3940256099942544/2247696110',
} as const;

export function getAdMobConfig() {
  const env = import.meta.env;
  const isDevelopment = Boolean(import.meta.env.DEV);

  const config = {
    appId: env.VITE_ADMOB_APP_ID || (isDevelopment ? DEFAULT_TEST_ADMOB_CONFIG.appId : ''),
    bannerAdUnitId: env.VITE_ADMOB_BANNER_AD_UNIT_ID || (isDevelopment ? DEFAULT_TEST_ADMOB_CONFIG.bannerAdUnitId : ''),
    interstitialAdUnitId: env.VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID || (isDevelopment ? DEFAULT_TEST_ADMOB_CONFIG.interstitialAdUnitId : ''),
    rewardedAdUnitId: env.VITE_ADMOB_REWARDED_AD_UNIT_ID || (isDevelopment ? DEFAULT_TEST_ADMOB_CONFIG.rewardedAdUnitId : ''),
    nativeAdUnitId: env.VITE_ADMOB_NATIVE_AD_UNIT_ID || (isDevelopment ? DEFAULT_TEST_ADMOB_CONFIG.nativeAdUnitId : ''),
  } as const;

  return {
    ...config,
    isConfigured: Boolean(
      config.appId &&
      config.bannerAdUnitId &&
      config.interstitialAdUnitId &&
      config.rewardedAdUnitId
    ),
    isUsingTestIds: isDevelopment && !env.VITE_ADMOB_APP_ID,
  } as const;
}
