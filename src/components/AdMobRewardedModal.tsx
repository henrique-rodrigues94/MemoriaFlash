import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, Gift } from 'lucide-react';
import { SupportedLanguage } from '../lib/i18n';
import { UserStats } from '../types';
import { canWatchRewardedAd } from '../services/economy/creditsEngine';
import { showRewardedAd } from '../services/ads/adMobNative';

interface AdMobRewardedModalProps {
  stats: UserStats;
  onRewardEarned: (creditsEarned: number) => void;
  onClose: () => void;
  currentLanguage?: SupportedLanguage;
}

/** Rewarded Ad real. A recompensa só é concedida pelo callback do SDK do AdMob. */
export const AdMobRewardedModal: React.FC<AdMobRewardedModalProps> = ({ stats, onRewardEarned, onClose }) => {
  const [status, setStatus] = useState<'loading' | 'unavailable' | 'rewarded'>('loading');

  useEffect(() => {
    if (!canWatchRewardedAd(stats)) {
      setStatus('unavailable');
      return;
    }

    let active = true;
    void showRewardedAd((reward) => {
      if (!active) return;
      const amount = Number.isFinite(reward.amount) && reward.amount > 0 ? reward.amount : 1;
      onRewardEarned(amount);
      setStatus('rewarded');
    }).then((shown) => {
      if (active && !shown) setStatus('unavailable');
    }).catch(() => {
      if (active) setStatus('unavailable');
    });

    return () => {
      active = false;
    };
  }, [stats, onRewardEarned]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-3xl p-7 bg-[#0b1a2a] border border-[#adc6ff]/20 text-white shadow-2xl text-center">
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800/70 text-slate-300 hover:text-white" aria-label="Fechar">
          <X className="w-4 h-4" />
        </button>

        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 grid place-items-center">
          {status === 'rewarded' ? <ShieldCheck className="w-7 h-7" /> : <Gift className="w-7 h-7" />}
        </div>

        {status === 'loading' && (
          <>
            <h3 className="mt-4 text-base font-extrabold">Carregando anúncio</h3>
            <p className="mt-2 text-xs text-slate-400">O anúncio será exibido pelo Google AdMob.</p>
          </>
        )}

        {status === 'rewarded' && (
          <>
            <h3 className="mt-4 text-base font-extrabold text-emerald-400">Recompensa recebida</h3>
            <p className="mt-2 text-xs text-slate-400">A recompensa foi liberada somente após a confirmação do AdMob.</p>
            <button onClick={onClose} className="mt-5 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm">Continuar</button>
          </>
        )}

        {status === 'unavailable' && (
          <>
            <h3 className="mt-4 text-base font-extrabold">Anúncio indisponível</h3>
            <p className="mt-2 text-xs text-slate-400">Nenhuma recompensa foi concedida. Tente novamente quando houver um anúncio disponível.</p>
            <button onClick={onClose} className="mt-5 w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-sm">Fechar</button>
          </>
        )}
      </div>
    </div>
  );
};
