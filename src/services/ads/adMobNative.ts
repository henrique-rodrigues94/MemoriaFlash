import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPosition, BannerAdSize, BannerAdPluginEvents, InterstitialAdPluginEvents, RewardAdPluginEvents } from '@capacitor-community/admob';
import { getAdMobConfig } from '../../lib/adMobConfig';

let initialized = false;
let listenersInstalled = false;
let interstitialPrepared = false;
let consentRequested = false;
const OP_TIMEOUT = 8000;

function isNativeAndroid() { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'; }
function assertConfigured() { const config = getAdMobConfig(); if (!config.isConfigured) throw new Error('AdMob não configurado: defina VITE_ADMOB_APP_ID e os IDs das unidades de anúncio.'); return config; }
async function withTimeout<T>(promise: Promise<T>, label: string, timeout = OP_TIMEOUT): Promise<T> { let timer: ReturnType<typeof setTimeout> | undefined; return Promise.race([promise, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} demorou mais que o esperado.`)), timeout); })]).finally(() => { if (timer) clearTimeout(timer); }); }

export async function initializeAdMob(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  const config = assertConfigured();
  if (!initialized) {
    const testingDevices = String(import.meta.env.VITE_ADMOB_TEST_DEVICE_IDS || '').split(',').map((id: string) => id.trim()).filter(Boolean);
    await withTimeout(AdMob.initialize({ initializeForTesting: config.isUsingTestIds, ...(testingDevices.length ? { testingDevices } : {}) }), 'Inicialização do AdMob');
    initialized = true;
    console.info(`[AdMob] SDK inicializado (${config.isUsingTestIds ? 'IDs de teste' : 'produção'}).`);
  }
  return true;
}

export async function requestAdMobConsent(): Promise<void> {
  if (!isNativeAndroid() || consentRequested) return;
  const config = assertConfigured();
  await initializeAdMob();
  if (config.isUsingTestIds) { consentRequested = true; return; }
  try {
    const status = await withTimeout(AdMob.requestConsentInfo(), 'Verificação de consentimento');
    if (status.isConsentFormAvailable && !status.canRequestAds) await withTimeout(AdMob.showConsentForm(), 'Formulário de consentimento');
    consentRequested = true;
  } catch (error) { console.warn('[AdMob] Consentimento indisponível:', error); consentRequested = true; }
}

export async function showFreeUserBanner(): Promise<void> {
  if (!isNativeAndroid()) return;
  const config = assertConfigured();
  await initializeAdMob();
  await requestAdMobConsent();
  // A margem deixa a barra inferior do aplicativo totalmente livre para toque.
  await withTimeout(AdMob.showBanner({ adId: config.bannerAdUnitId, adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER, margin: 64 }), 'Exibição do banner');
}

export async function hideAdMobBanner(): Promise<void> { if (!isNativeAndroid()) return; try { await withTimeout(AdMob.hideBanner(), 'Ocultação do banner'); } catch (error) { console.warn('[AdMob] hideBanner:', error); } }

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
  await requestAdMobConsent();
  let rewarded = false;
  const rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (rewardItem) => { rewarded = true; onRewarded({ amount: Number(rewardItem.amount || 0), type: rewardItem.type || 'reward' }); });
  try { await withTimeout(AdMob.prepareRewardVideoAd({ adId: config.rewardedAdUnitId }), 'Preparação do rewarded'); await withTimeout(AdMob.showRewardVideoAd(), 'Exibição do rewarded'); return rewarded; }
  finally { await rewardListener.remove(); }
}

export async function installAdMobListeners(): Promise<void> {
  if (!isNativeAndroid() || listenersInstalled) return;
  try {
    await initializeAdMob();
    listenersInstalled = true;
    await AdMob.addListener(BannerAdPluginEvents.Loaded, () => console.info('[AdMob] Banner carregado com sucesso.'));
    await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (error) => console.warn('[AdMob] Banner falhou ao carregar:', error));
    await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (error) => { interstitialPrepared = false; console.warn('[AdMob] Interstitial falhou ao carregar:', error); });
    await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (error) => console.warn('[AdMob] Rewarded falhou ao carregar:', error));
  } catch (error) { console.warn('[AdMob] listeners indisponíveis:', error); }
}
