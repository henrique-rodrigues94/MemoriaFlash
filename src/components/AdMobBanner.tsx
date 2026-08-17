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
  /**
   * O banner do AdMob é uma View nativa do Android renderizada por cima do
   * WebView — CSS z-index não tem nenhum efeito sobre ela. Isso significa
   * que, se algum modal HTML (indicação, assinatura, importar/exportar,
   * notificações, idioma, etc.) estiver aberto por cima da bottom nav, o
   * anúncio nativo pode ficar visualmente grudado sobre o modal e atrapalhar
   * a interação. Passe `hidden` sempre que qualquer modal estiver aberto.
   */
  hidden?: boolean;
}

function isProActive(stats: UserStats, isPro?: boolean): boolean {
  if (isPro !== true) return false;
  const expiry = stats.proExpiryDate ? Date.parse(stats.proExpiryDate) : NaN;
  return Number.isFinite(expiry) && expiry > Date.now();
}

/**
 * O banner do Capacitor é uma View nativa sobre o WebView. O componente não
 * desenha o anúncio em HTML: ele apenas controla o ciclo de vida do banner
 * nativo e reserva espaço no fluxo da página.
 *
 * IMPORTANTE: React StrictMode pode montar/desmontar/montar o componente
 * imediatamente em desenvolvimento. Um hide() direto no cleanup criava uma
 * corrida que podia desligar o banner recém-mostrado. Por isso o hide do
 * cleanup é atrasado e cancelado quando outro mount assume o banner.
 */
let bannerLifecycleToken = 0;
let pendingHideTimer: ReturnType<typeof setTimeout> | undefined;

export const AdMobBanner: React.FC<AdMobBannerProps> = ({ stats, isPro, hidden }) => {
  const activePro = isProActive(stats, isPro);
  const shouldHide = activePro || Boolean(hidden);

  useEffect(() => {
    const token = ++bannerLifecycleToken;
    if (pendingHideTimer) {
      clearTimeout(pendingHideTimer);
      pendingHideTimer = undefined;
    }

    if (shouldHide || !Capacitor.isNativePlatform()) {
      void hideAdMobBanner().catch(() => undefined);
      return () => undefined;
    }

    let disposed = false;
    const timers: number[] = [];

    const refreshBanner = async () => {
      if (disposed || token !== bannerLifecycleToken) return;
      try {
        await showFreeUserBanner();
        // Uma chamada antiga não pode ressuscitar o banner depois que a tela
        // mudou para outra tela sem AdMob.
        if (disposed || token !== bannerLifecycleToken) {
          if (token === bannerLifecycleToken) await hideAdMobBanner().catch(() => undefined);
        }
      } catch (error) {
        if (!disposed && token === bannerLifecycleToken) {
          console.warn('[AdMob] Banner indisponível; nova tentativa:', error);
        }
      }
    };

    void refreshBanner();
    [1200, 3500, 8000].forEach((delay) => {
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

      // Não faça hide imediatamente: em StrictMode o cleanup pode ocorrer
      // apenas para simular um remount. Se não houver novo mount, o banner é
      // realmente ocultado após a pequena janela de segurança.
      pendingHideTimer = setTimeout(() => {
        if (token === bannerLifecycleToken) {
          void hideAdMobBanner().catch(() => undefined);
          pendingHideTimer = undefined;
        }
      }, 150);
    };
  }, [shouldHide]);

  if (shouldHide || !Capacitor.isNativePlatform()) return null;

  // O banner nativo fica colado imediatamente acima da bottom nav (64px de
  // altura, margin nativa = 64px). A reserva de espaço abaixo evita que o
  // último conteúdo rolável da tela fique escondido atrás do anúncio.
  return <div className="memoriaflash-admob-reserved-space h-[128px] sm:h-[136px] shrink-0" aria-hidden="true" />;
};
