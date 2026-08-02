import React from 'react';
import { Play, Crown, Ban } from 'lucide-react';
import { SupportedLanguage, translations } from '../lib/i18n';
import { UserStats } from '../types';
import { canWatchRewardedAd, computeNextAdReward, rewardedAdsRemainingToday } from '../services/economy/creditsEngine';

interface AdMobBannerProps {
  stats: UserStats;
  onOpenAdMob: () => void;
  onOpenSubscription: () => void;
  onOpenReferral?: () => void;
  isPro?: boolean;
  currentLanguage?: SupportedLanguage;
  /** Quando true, o banner fica fixo acima da barra de navegação (sempre visível ao rolar). */
  sticky?: boolean;
}

export const AdMobBanner: React.FC<AdMobBannerProps> = ({
  stats,
  onOpenAdMob,
  onOpenSubscription,
  onOpenReferral,
  isPro,
  currentLanguage = 'pt',
  sticky,
}) => {
  if (isPro) return null; // PRO users have zero ads

  const t = translations[currentLanguage] || translations.pt;
  const canWatch = canWatchRewardedAd(stats);
  const rewardAmount = computeNextAdReward(stats);
  const remaining = rewardedAdsRemainingToday(stats);

  return (
    <div className={`w-full ${sticky ? 'sticky bottom-16 z-30' : 'my-5'} p-3.5 sm:p-4 rounded-2xl bg-[#0b1a2a]/95 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl animate-fade-in relative overflow-hidden`}>
      {/* Background glow accent */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center gap-3">
        <div className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[9px] font-extrabold uppercase flex-shrink-0 tracking-wider">
          Anúncio
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
            Mantenha o MemoriaFlash 100% Grátis
          </h4>
          <p className="text-[11px] text-[#8c91a0]">
            {canWatch ? (
              <>
                Assista a um vídeo curto para ganhar{' '}
                <strong className="text-[#60a5fa] font-semibold">+{rewardAmount} Créditos de IA</strong> ·{' '}
                {remaining} restantes hoje
              </>
            ) : (
              <span className="text-slate-400">
                Limite diário de anúncios atingido. Volte amanhã ou indique um amigo para ganhar mais créditos.
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
        <button
          onClick={onOpenAdMob}
          disabled={!canWatch}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
            canWatch
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20 cursor-pointer hover:scale-[1.02]'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {canWatch ? (
            <>
              <Play className="w-3.5 h-3.5 fill-current text-white" /> Assistir (+{rewardAmount})
            </>
          ) : (
            <>
              <Ban className="w-3.5 h-3.5" /> Limite atingido
            </>
          )}
        </button>

        {onOpenReferral && (
          <button
            onClick={onOpenReferral}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            title="Indique amigos e ganhe créditos"
          >
            Indicar
          </button>
        )}

        <button
          onClick={onOpenSubscription}
          className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          title="Remover Anúncios e Virar PRO"
        >
          <Crown className="w-3.5 h-3.5" /> PRO
        </button>
      </div>
    </div>
  );
};
