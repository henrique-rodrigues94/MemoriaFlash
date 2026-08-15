import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdMobConsentDebugGeography,
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
  const options = import.meta.env.DEV
    ? {
        debugGeography: AdMobConsentDebugGeography.EEA,
        testDeviceIdentifiers: [],
      }
    : undefined;

  const status = await AdMob.requestConsentInfo(options);
  consentRequested = true;

  if (status.isConsentFormAvailable && !status.canRequestAds) {
    await AdMob.showConsentForm();
  }
}

export async function showFreeUserBanner(): Promise<void> {
  if (!isNativeAndroid() || bannerVisible) return;
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
  await AdMob.hideBanner();
  bannerVisible = false;
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
  if (!interstitialPrepared) {
    await prepareInterstitial();
  }

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

/**
 * Exibe um Rewarded Ad real. O callback onRewarded só é executado quando o
 * SDK do Google informa que a recompensa foi efetivamente concedida.
 * Nenhum timer local pode liberar créditos.
 */
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
      onRewarded({
        amount: Number(rewardItem.amount || 0),
        type: rewardItem.type || 'reward',
      });
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
