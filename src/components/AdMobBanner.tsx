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

    let disposed = false;
    const refreshBanner = () => {
      if (!disposed) {
        void showFreeUserBanner().catch((error) => {
          console.warn('[AdMob] Banner indisponível:', error);
        });
      }
    };

    refreshBanner();
    const interval = window.setInterval(refreshBanner, 60_000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshBanner();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (Capacitor.isNativePlatform()) {
        void hideAdMobBanner().catch(() => undefined);
      }
    };
  }, [activePro]);

  return null;
};
