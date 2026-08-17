import React, { useEffect, useState } from 'react';
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

/**
 * O banner do Capacitor é uma View nativa sobre o WebView. Portanto, CSS
 * sozinho não reserva espaço para ele. Mantemos um espaço de segurança no
 * fluxo da página e ocultamos explicitamente o banner ao desmontar o
 * componente (por exemplo, ao entrar na sessão de estudo).
 */
export const AdMobBanner: React.FC<AdMobBannerProps> = ({ stats, isPro }) => {
  const activePro = isProActive(stats, isPro);
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    let disposed = false;
    const timers: number[] = [];

    if (activePro || !Capacitor.isNativePlatform()) {
      setBannerVisible(false);
      void hideAdMobBanner().catch(() => undefined);
      return () => undefined;
    }

    // Garante que um banner deixado pela tela anterior não permaneça visível
    // enquanto a nova tela ainda está sendo montada.
    void hideAdMobBanner().catch(() => undefined);

    const refreshBanner = async () => {
      if (disposed) return;
      try {
        await showFreeUserBanner();
        if (disposed) {
          await hideAdMobBanner().catch(() => undefined);
          return;
        }
        setBannerVisible(true);
      } catch (error) {
        if (!disposed) console.warn('[AdMob] Banner indisponível; nova tentativa:', error);
      }
    };

    void refreshBanner();
    [1200, 3500, 8000].forEach(delay => timers.push(window.setTimeout(() => void refreshBanner(), delay)));
    const interval = window.setInterval(() => void refreshBanner(), 60_000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refreshBanner();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposed = true;
      setBannerVisible(false);
      timers.forEach(timer => window.clearTimeout(timer));
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      // Essencial: o banner é nativo e não desaparece automaticamente quando
      // este componente React é desmontado.
      void hideAdMobBanner().catch(() => undefined);
    };
  }, [activePro]);

  if (activePro || !Capacitor.isNativePlatform() || !bannerVisible) return null;

  // Reserva espaço para o banner + área de segurança/nav. Isso impede que o
  // anúncio cubra botões, cards ou o último conteúdo rolável.
  return (
    <div
      className="memoriaflash-admob-reserved-space h-[142px] sm:h-[150px] shrink-0"
      aria-hidden="true"
    />
  );
};
