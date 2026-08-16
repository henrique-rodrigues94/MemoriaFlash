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
  if (!stats.proExpiryDate) return true;
  const expiry = Date.parse(stats.proExpiryDate);
  return Number.isFinite(expiry) && expiry > Date.now();
}

/** Banner nativo real do Google AdMob no Android. */
export const AdMobBanner: React.FC<AdMobBannerProps> = ({ stats, isPro }) => {
  const activePro = isProActive(stats, isPro);

  useEffect(() => {
    if (activePro) {
      void hideAdMobBanner().catch(() => undefined);
      return;
    }

    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    const timers: number[] = [];

    const refreshBanner = async () => {
      if (disposed) return;
      try {
        await showFreeUserBanner();
      } catch (error) {
        console.warn('[AdMob] Banner indisponível; nova tentativa:', error);
      }
    };

    // O primeiro carregamento pode acontecer antes do WebView/SDK terminar a
    // inicialização. Fazemos tentativas curtas em vez de esperar 60 segundos.
    void refreshBanner();
    [1000, 3000, 7000].forEach((delay) => {
      timers.push(window.setTimeout(() => void refreshBanner(), delay));
    });

    const interval = window.setInterval(() => void refreshBanner(), 60_000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refreshBanner();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposed = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (Capacitor.isNativePlatform()) void hideAdMobBanner().catch(() => undefined);
    };
  }, [activePro]);

  return null;
};
