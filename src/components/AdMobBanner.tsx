import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { showFreeUserBanner, hideAdMobBanner } from '../services/ads/adMobNative';

interface AdMobBannerProps {
  stats: any;
  onOpenAdMob?: () => void;
  onOpenSubscription: () => void;
  onOpenReferral?: () => void;
  isPro?: boolean;
  currentLanguage?: any;
  sticky?: boolean;
}

/** Banner nativo real do Google AdMob no Android. */
export const AdMobBanner: React.FC<AdMobBannerProps> = ({ isPro }) => {
  useEffect(() => {
    if (isPro) {
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

    // Primeira tentativa imediatamente.
    refreshBanner();

    // O SDK pode remover/recriar a View nativa após rotação, background,
    // retorno ao app ou mudança de inventário. Revalida periodicamente sem
    // criar nenhum banner HTML falso.
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
  }, [isPro]);

  return null;
};
