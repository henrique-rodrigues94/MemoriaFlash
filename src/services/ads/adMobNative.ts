import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPosition, BannerAdSize, InterstitialAdPluginEvents, RewardAdPluginEvents } from '@capacitor-community/admob';
import { getAdMobConfig } from '../../lib/adMobConfig';

let initialized = false;
let listenersInstalled = false;
let bannerVisible = false;
let interstitialPrepared = false;
let consentRequested = false;
const OP_TIMEOUT = 8000;

function isNativeAndroid() { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'; }
function assertConfigured() { const config = getAdMobConfig(); if (!config.isConfigured) throw new Error('AdMob não configurado: defina VITE_ADMOB_APP_ID e os IDs das unidades de anúncio.'); return config; }

async function withTimeout<T>(promise: Promise<T>, label: string, timeout = OP_TIMEOUT): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([promise, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} demorou mais que o esperado.`)), timeout); })]).finally(() => { if (timer) clearTimeout(timer); });
}

export async function initializeAdMob(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  const config = assertConfigured();
  if (!initialized) { await withTimeout(AdMob.initialize({ initializeForTesting: config.isUsingTestIds }), 'Inicialização do AdMob'); initialized = true; }
  return true;
}

export async function requestAdMobConsent(): Promise<void> {
  if (!isNativeAndroid() || consentRequested) return;
  await initializeAdMob();
  try {
    const status = await withTimeout(AdMob.requestConsentInfo(), 'Verificação de consentimento');
    consentRequested = true;
    if (status.isConsentFormAvailable && !status.canRequestAds) await withTimeout(AdMob.showConsentForm(), 'Formulário de consentimento');
  } catch (error) {
    // Não bloqueia o banner inteiro se o formulário de consentimento estiver indisponível.
    // O SDK continuará respeitando as próprias regras de consentimento.
    console.warn('[AdMob] Consentimento indisponível:', error);
    consentRequested = true;
  }
}

export async function showFreeUserBanner(): Promise<void> {
  if (!isNativeAndroid()) return;
  const config = assertConfigured();
  await initializeAdMob();
  try { await requestAdMobConsent(); } catch (error) { console.warn('[AdMob] Consent request skipped:', error); }
  try {
    await withTimeout(AdMob.showBanner({ adId: config.bannerAdUnitId, adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER, margin: 0 }), 'Exibição do banner');
    bannerVisible = true;
  } catch (error) {
    bannerVisible = false;
    console.warn('[AdMob] Não foi possível exibir o banner:', error);
    throw error;
  }
}

export async function hideAdMobBanner(): Promise<void> {
  if (!isNativeAndroid()) return;
  try { await withTimeout(AdMob.hideBanner(), 'Ocultação do banner'); } catch (error) { console.warn('[AdMob] hideBanner:', error); } finally { bannerVisible = false; }
}

export async function prepareInterstitial(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  const config = assertConfigured();
  await initializeAdMob();
  await withTimeout(AdMob.prepareInterstitial({ adId: config.interstitialAdUnitId }), 'Preparação do interstitial');
  interstitialPrepared = true;
  return true;
}

export async function showInterstitialIfReady(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  if (!interstitialPrepared) { try { await prepareInterstitial(); } catch { return false; } }
  try { await withTimeout(AdMob.showInterstitial(), 'Exibição do interstitial'); interstitialPrepared = false; void prepareInterstitial().catch(() => undefined); return true; } catch { interstitialPrepared = false; return false; }
}

export async function showRewardedAd(onRewarded: (reward: { amount: number; type: string }) => void): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  const config = assertConfigured();
  await initializeAdMob();
  let rewarded = false;
  const rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (rewardItem) => { rewarded = true; onRewarded({ amount: Number(rewardItem.amount || 0), type: rewardItem.type || 'reward' }); });
  try { await withTimeout(AdMob.prepareRewardVideoAd({ adId: config.rewardedAdUnitId }), 'Preparação do rewarded'); await withTimeout(AdMob.showRewardVideoAd(), 'Exibição do rewarded'); return rewarded; } finally { await rewardListener.remove(); }
}

export async function installAdMobListeners(): Promise<void> {
  if (!isNativeAndroid() || listenersInstalled) return;
  try {
    await initializeAdMob();
    listenersInstalled = true;
    await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (error) => { interstitialPrepared = false; console.warn('[AdMob] Falha ao carregar interstitial:', error); });
  } catch (error) { console.warn('[AdMob] listeners indisponíveis:', error); }
}
