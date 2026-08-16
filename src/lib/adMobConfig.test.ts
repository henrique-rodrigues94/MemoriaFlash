import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadConfig() {
  vi.resetModules();
  const mod = await import('./adMobConfig');
  return mod.getAdMobConfig();
}

describe('AdMob production configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock('@capacitor/core');
    vi.resetModules();
  });

  it('never silently falls back to test IDs on a production Web build without real IDs', async () => {
    vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' } }));
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_ADMOB_APP_ID', '');
    vi.stubEnv('VITE_ADMOB_USE_TEST_IDS', 'false');

    const config = await loadConfig();
    expect(config.isUsingTestIds).toBe(false);
    expect(config.isConfigured).toBe(false);
  });

  it('falls back to official Google test IDs on a native Android build without real IDs, so a locally generated APK still shows ads', async () => {
    vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } }));
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_ADMOB_APP_ID', '');
    vi.stubEnv('VITE_ADMOB_USE_TEST_IDS', 'false');

    const config = await loadConfig();
    expect(config.isUsingTestIds).toBe(true);
    expect(config.isConfigured).toBe(true);
    expect(config.appId).toBe('ca-app-pub-3940256099942544~3347511713');
  });

  it('uses the real production IDs on native Android once they are all configured', async () => {
    vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } }));
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_ADMOB_APP_ID', 'ca-app-pub-1111111111111111~1111111111');
    vi.stubEnv('VITE_ADMOB_BANNER_AD_UNIT_ID', 'ca-app-pub-1111111111111111/1111111111');
    vi.stubEnv('VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID', 'ca-app-pub-1111111111111111/2222222222');
    vi.stubEnv('VITE_ADMOB_REWARDED_AD_UNIT_ID', 'ca-app-pub-1111111111111111/3333333333');
    vi.stubEnv('VITE_ADMOB_USE_TEST_IDS', 'false');

    const config = await loadConfig();
    expect(config.isUsingTestIds).toBe(false);
    expect(config.isConfigured).toBe(true);
    expect(config.appId).toBe('ca-app-pub-1111111111111111~1111111111');
  });

  it('VITE_ADMOB_USE_TEST_IDS=true always forces the official test IDs, even with real IDs present', async () => {
    vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } }));
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_ADMOB_APP_ID', 'ca-app-pub-1111111111111111~1111111111');
    vi.stubEnv('VITE_ADMOB_BANNER_AD_UNIT_ID', 'ca-app-pub-1111111111111111/1111111111');
    vi.stubEnv('VITE_ADMOB_INTERSTITIAL_AD_UNIT_ID', 'ca-app-pub-1111111111111111/2222222222');
    vi.stubEnv('VITE_ADMOB_REWARDED_AD_UNIT_ID', 'ca-app-pub-1111111111111111/3333333333');
    vi.stubEnv('VITE_ADMOB_USE_TEST_IDS', 'true');

    const config = await loadConfig();
    expect(config.isUsingTestIds).toBe(true);
    expect(config.appId).toBe('ca-app-pub-3940256099942544~3347511713');
  });
});
