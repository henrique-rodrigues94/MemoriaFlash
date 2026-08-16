import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { showFreeUserBanner, hideAdMobBanner } from '../services/ads/adMobNative';
import { UserStats } from '../types';

interface AdMobBannerProps {
  stats: UserStats;
  onOpenAdMob?: () => void;
  onOpenSubscription: () => void;
  onOpenReferral?: () => void;
  isPro?: boolean;
  currentLanguage?: any;
  sticky?: boolean;
}

function isProActive(stats: UserStats, isPro?: boolean): boolean {
  if (isPro !== true) return false;
  const expiry = stats.proExpiryDate ? Date.parse(stats.proExpiryDate) : NaN;
  return Number.isFinite(expiry) && expiry > Date.now();
}

export const AdMobBanner: React.FC<AdMobBannerProps> = ({ stats, isPro }) => {
  const activePro = isProActive(stats, isPro);

  useEffect(() => {
    if (activePro) { void hideAdMobBanner().catch(() => undefined); return; }
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    const timers: number[] = [];
    const refreshBanner = async () => {
      if (disposed) return;
      try { await showFreeUserBanner(); }
      catch (error) { console.warn('[AdMob] Banner indisponível; nova tentativa:', error); }
    };
    void refreshBanner();
    [1000, 3000, 7000].forEach(delay => timers.push(window.setTimeout(() => void refreshBanner(), delay)));
    const interval = window.setInterval(() => void refreshBanner(), 60_000);
    const handleVisibility = () => { if (document.visibilityState === 'visible') void refreshBanner(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      disposed = true;
      timers.forEach(timer => window.clearTimeout(timer));
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      // Não ocultamos aqui: React StrictMode executa cleanup/setup durante o mount
      // e isso fazia o banner aparecer e desaparecer imediatamente.
    };
  }, [activePro]);

  return null;
};
