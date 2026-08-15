import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';
import { getAdMobConfig } from '../../lib/adMobConfig';

let initialized = false;
let listenersInstalled = false;
let bannerVisible = false;
let interstitialPrepared = false;
let consentRequested = false;

function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

function assertConfigured(): ReturnType<typeof getAdMobConfig> {
  const config = getAdMobConfig();
  if (!config.isConfigured) {
    throw new Error('AdMob não configurado: defina VITE_ADMOB_APP_ID e os IDs das unidades de anúncio.');
  }
  return config;
}

export async function initializeAdMob(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  const config = assertConfigured();

  if (!initialized) {
    await AdMob.initialize({ initializeForTesting: config.isUsingTestIds });
    initialized = true;
  }

  return true;
}

export async function requestAdMobConsent(): Promise<void> {
  if (!isNativeAndroid() || consentRequested) return;

  await initializeAdMob();
  const status = await AdMob.requestConsentInfo();
  consentRequested = true;

  if (status.isConsentFormAvailable && !status.canRequestAds) {
    await AdMob.showConsentForm();
  }
}

/**
 * Mostra/revalida o banner. Não usa um flag como condição de retorno: o SDK
 * pode remover o banner nativo por falta de inventário, mudança de atividade
 * ou retorno do app, mesmo que a aplicação ainda considere o banner visível.
 * Por isso a camada de UI pode chamar esta função novamente com segurança.
 */
export async function showFreeUserBanner(): Promise<void> {
  if (!isNativeAndroid()) return;
  const config = assertConfigured();
  await initializeAdMob();

  await AdMob.showBanner({
    adId: config.bannerAdUnitId,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
  });
  bannerVisible = true;
}

export async function hideAdMobBanner(): Promise<void> {
  if (!isNativeAndroid() || !bannerVisible) return;
  try {
    await AdMob.hideBanner();
  } finally {
    bannerVisible = false;
  }
}

export async function prepareInterstitial(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  const config = assertConfigured();
  await initializeAdMob();

  await AdMob.prepareInterstitial({ adId: config.interstitialAdUnitId });
  interstitialPrepared = true;
  return true;
}

export async function showInterstitialIfReady(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  if (!interstitialPrepared) await prepareInterstitial();

  try {
    await AdMob.showInterstitial();
    interstitialPrepared = false;
    void prepareInterstitial().catch(() => undefined);
    return true;
  } catch {
    interstitialPrepared = false;
    return false;
  }
}

/** Mantido para compatibilidade do plugin; não concede créditos ao usuário. */
export async function showRewardedAd(
  onRewarded: (reward: { amount: number; type: string }) => void,
): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  const config = assertConfigured();
  await initializeAdMob();

  let rewarded = false;
  const rewardListener = await AdMob.addListener(
    RewardAdPluginEvents.Rewarded,
    (rewardItem) => {
      rewarded = true;
      onRewarded({ amount: Number(rewardItem.amount || 0), type: rewardItem.type || 'reward' });
    },
  );

  try {
    await AdMob.prepareRewardVideoAd({ adId: config.rewardedAdUnitId });
    await AdMob.showRewardVideoAd();
    return rewarded;
  } finally {
    await rewardListener.remove();
  }
}

export async function installAdMobListeners(): Promise<void> {
  if (!isNativeAndroid() || listenersInstalled) return;
  await initializeAdMob();
  listenersInstalled = true;

  await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (error) => {
    interstitialPrepared = false;
    console.warn('[AdMob] Falha ao carregar interstitial:', error);
  });
}
