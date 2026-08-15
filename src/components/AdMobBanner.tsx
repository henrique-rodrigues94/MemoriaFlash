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

/** Banner real do Google AdMob no Android. A antiga faixa visual foi removida:
 * ela não era um anúncio e não deve ser confundida com inventário AdMob. */
export const AdMobBanner: React.FC<AdMobBannerProps> = ({ isPro }) => {
  useEffect(() => {
    if (isPro) {
      void hideAdMobBanner().catch(() => undefined);
      return;
    }

    void showFreeUserBanner().catch((error) => {
      console.warn('[AdMob] Banner indisponível:', error);
    });

    return () => {
      if (Capacitor.isNativePlatform()) {
        void hideAdMobBanner().catch(() => undefined);
      }
    };
  }, [isPro]);

  // O banner é renderizado nativamente pelo SDK. Não criamos um anúncio falso
  // no DOM quando o app está sendo executado na web.
  return null;
};
