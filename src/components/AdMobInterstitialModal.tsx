import React, { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';

interface AdMobInterstitialModalProps {
  onClose: () => void;
}

// Anúncio intersticial: curto, exibido entre telas (fim de sessão de estudo,
// fim de duelo). Skippable após 3s, seguindo a regra "nunca force o clique"
// e limites de frequência definidos em src/services/economy/creditsEngine.ts.
export const AdMobInterstitialModal: React.FC<AdMobInterstitialModalProps> = ({ onClose }) => {
  const [canSkip, setCanSkip] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-gradient-to-br from-[#0b1a2a] to-[#122131] border border-[#adc6ff]/20 rounded-3xl p-8 text-white shadow-2xl text-center space-y-4">
        {canSkip ? (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-800/70 text-slate-300 text-[11px] font-mono font-bold flex items-center justify-center">
            {countdown}
          </div>
        )}

        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 mx-auto flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-blue-300" />
        </div>
        <h3 className="text-base font-extrabold">MemoriaFlash Network</h3>
        <p className="text-xs text-[#8c91a0]">
          Continue estudando com repetição espaçada e IA. Considere o plano PRO para remover anúncios.
        </p>
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Anúncio</div>
      </div>
    </div>
  );
};
