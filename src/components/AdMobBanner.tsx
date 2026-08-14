import React from 'react';
import { Crown, Gift } from 'lucide-react';
import { SupportedLanguage, translations } from '../lib/i18n';
import { UserStats } from '../types';
import { FREE_AI_CARD_LIMIT, generatedAICardsCount, remainingAICards } from '../services/generationLimit';

interface AdMobBannerProps {
  stats: UserStats;
  onOpenSubscription: () => void;
  onOpenReferral?: () => void;
  isPro?: boolean;
  currentLanguage?: SupportedLanguage;
  sticky?: boolean;
}

export const AdMobBanner: React.FC<AdMobBannerProps> = ({
  stats,
  onOpenSubscription,
  onOpenReferral,
  isPro,
  currentLanguage = 'pt',
  sticky,
}) => {
  if (isPro) return null;

  const t = translations[currentLanguage] || translations.pt;
  const generated = generatedAICardsCount(stats);
  const remaining = remainingAICards(stats);

  return (
    <div
      style={sticky
        ? { position: 'fixed', bottom: '4rem', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '72rem', zIndex: 30 }
        : undefined}
      className={`w-full ${sticky ? '' : 'my-5'} px-3 sm:px-6 py-2.5 rounded-2xl bg-[#0b1a2a]/95 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl animate-fade-in relative overflow-hidden`}
    >
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center gap-3 min-w-0">
        <div className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[9px] font-extrabold uppercase flex-shrink-0 tracking-wider">
          {t.adLabel}
        </div>
        <div className="min-w-0">
          <h4 className="text-xs sm:text-sm font-bold text-white">
            Anúncios na versão gratuita
          </h4>
          <p className="text-[11px] text-[#8c91a0]">
            {generated}/{FREE_AI_CARD_LIMIT} cards gerados · {remaining} restantes
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
        {onOpenReferral && (
          <button
            onClick={onOpenReferral}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            title="Indique amigos"
          >
            <Gift className="w-3.5 h-3.5" /> Indicar
          </button>
        )}
        <button
          onClick={onOpenSubscription}
          className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          title={t.proPlan}
        >
          <Crown className="w-3.5 h-3.5" /> PRO ilimitado
        </button>
      </div>
    </div>
  );
};
