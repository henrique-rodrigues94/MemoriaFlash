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
  const isProductionBuild = env.MODE === 'production' || env.VITE_APP_ENV === 'production';
  const hasProductionIds = Boolean(
    env.VITE_ADMOB_APP_ID &&
    env.VITE_ADMOB_BANNER_AD_UNIT_ID &&
    env.VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID &&
    env.VITE_ADMOB_REWARDED_AD_UNIT_ID,
  );

  // Produção Web nunca cai silenciosamente nos IDs de teste. Já um APK/AAB
  // nativo pode usar os IDs oficiais de demonstração quando os IDs reais não
  // estiverem configurados. O gate de release (RELEASE_PRODUCTION=true)
  // continua exigindo os IDs reais antes de uma publicação de produção.
  // Isso permite gerar um APK local com `npm run build` e testar o AdMob sem
  // que o build Vite em modo production desative os anúncios de homologação.
  const isUsingTestIds = forceTestIds || (!hasProductionIds && (!isProductionBuild || isNative));
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
