import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, Play } from 'lucide-react';
import { SupportedLanguage } from '../lib/i18n';
import { UserStats } from '../types';
import { showRewardedAd } from '../services/ads/adMobNative';

interface AdMobRewardedModalProps {
  stats: UserStats;
  onRewardEarned: (value: number) => void;
  onClose: () => void;
  currentLanguage?: SupportedLanguage;
}

/** Vídeo AdMob opcional. Não existe mais moeda/crédito associado ao anúncio. */
export const AdMobRewardedModal: React.FC<AdMobRewardedModalProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'loading' | 'unavailable' | 'finished'>('loading');

  useEffect(() => {
    let active = true;
    void showRewardedAd(() => {
      if (!active) return;
      setStatus('finished');
    }).then((shown) => {
      if (active && !shown) setStatus('unavailable');
    }).catch(() => {
      if (active) setStatus('unavailable');
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-3xl p-7 bg-[#0b1a2a] border border-[#adc6ff]/20 text-white shadow-2xl text-center">
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800/70 text-slate-300 hover:text-white" aria-label="Fechar">
          <X className="w-4 h-4" />
        </button>

        <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 grid place-items-center">
          {status === 'finished' ? <ShieldCheck className="w-7 h-7" /> : <Play className="w-7 h-7" />}
        </div>

        {status === 'loading' && <>
          <h3 className="mt-4 text-base font-extrabold">Carregando anúncio</h3>
          <p className="mt-2 text-xs text-slate-400">O anúncio será exibido pelo Google AdMob.</p>
        </>}

        {status === 'finished' && <>
          <h3 className="mt-4 text-base font-extrabold text-emerald-400">Anúncio concluído</h3>
          <p className="mt-2 text-xs text-slate-400">Obrigado por apoiar o MemoriaFlash.</p>
          <button onClick={onClose} className="mt-5 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm">Continuar</button>
        </>}

        {status === 'unavailable' && <>
          <h3 className="mt-4 text-base font-extrabold">Anúncio indisponível</h3>
          <p className="mt-2 text-xs text-slate-400">Nenhum anúncio está disponível no momento.</p>
          <button onClick={onClose} className="mt-5 w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-sm">Fechar</button>
        </>}
      </div>
    </div>
  );
};
