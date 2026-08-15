import React, { useEffect, useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { showInterstitialIfReady } from '../services/ads/adMobNative';

interface AdMobInterstitialModalProps {
  onClose: () => void;
}

/** Ponte entre o estado de frequência do app e o interstitial nativo do AdMob.
 * Não existe timer ou anúncio simulado no DOM. */
export const AdMobInterstitialModal: React.FC<AdMobInterstitialModalProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'loading' | 'unavailable'>('loading');

  useEffect(() => {
    let active = true;
    void showInterstitialIfReady().then((shown) => {
      if (!active) return;
      if (!shown) setStatus('unavailable');
      else onClose();
    });
    return () => {
      active = false;
    };
  }, [onClose]);

  if (status !== 'unavailable') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-3xl p-7 bg-[#0b1a2a] border border-[#adc6ff]/20 text-white shadow-2xl text-center">
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800/70 text-slate-300 hover:text-white" aria-label="Fechar">
          <X className="w-4 h-4" />
        </button>
        <ShieldCheck className="w-10 h-10 mx-auto text-emerald-400" />
        <h3 className="mt-4 text-base font-extrabold">Anúncio indisponível</h3>
        <p className="mt-2 text-xs text-slate-400">O estudo continua normalmente. Tente novamente mais tarde.</p>
      </div>
    </div>
  );
};
