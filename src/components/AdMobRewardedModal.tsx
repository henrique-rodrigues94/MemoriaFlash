import React, { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle2, Sparkles, X, Volume2, VolumeX, ShieldCheck, Award, RefreshCw, Flame } from 'lucide-react';
import { SupportedLanguage, translations } from '../lib/i18n';
import { UserStats } from '../types';
import { computeNextAdReward, rewardedAdsRemainingToday } from '../services/economy/creditsEngine';
import { ECONOMY } from '../services/economy/economyConstants';

interface AdMobRewardedModalProps {
  stats: UserStats;
  onRewardEarned: () => void;
  onClose: () => void;
  currentLanguage?: SupportedLanguage;
}

export const AdMobRewardedModal: React.FC<AdMobRewardedModalProps> = ({
  stats,
  onRewardEarned,
  onClose,
  currentLanguage = 'pt',
}) => {
  const [isPlaying, setIsPlaying] = useState(true); // Auto-start playback
  const [timeLeft, setTimeLeft] = useState(5);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const t = translations[currentLanguage] || translations.pt;
  const rewardAmount = computeNextAdReward(stats);
  const remainingAfterThis = Math.max(0, rewardedAdsRemainingToday(stats) - 1);
  const streak = stats.adWatchStreakDays || 0;

  // Auto-start video countdown
  useEffect(() => {
    let timer: any;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isPlaying && timeLeft === 0) {
      setIsCompleted(true);
      setIsPlaying(false);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  // Attempt video play on mount
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Fallback gracefully to animated spectrum if browser blocks video autoplay
      });
    }
  }, []);

  const handleReplayAd = () => {
    setIsCompleted(false);
    setIsPlaying(true);
    setTimeLeft(5);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleClaimReward = () => {
    onRewardEarned();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0b1a2a] border border-[#adc6ff]/30 rounded-3xl p-6 text-white shadow-2xl space-y-5">
        {/* Header Badge */}
        <div className="flex items-center justify-between border-b border-[#424754]/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-extrabold rounded-md uppercase tracking-wider">
              Vídeo Recompensado
            </span>
            {streak > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-orange-300">
                <Flame className="w-3 h-3" /> {streak}d
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Player Box / Ad Container */}
        <div className="relative aspect-video rounded-2xl bg-slate-950 border border-[#424754]/40 flex flex-col items-center justify-center overflow-hidden shadow-inner">
          {isPlaying ? (
            <div className="relative w-full h-full flex flex-col justify-between p-4">
              {/* Fundo animado em CSS (funciona sem vídeo externo / sem bloqueio) */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-indigo-950 to-purple-950 animate-gradient-x" />
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" />
              {/* Padrão decorativo */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 20% 30%, rgba(96,165,250,0.6) 0, transparent 25%), radial-gradient(circle at 80% 70%, rgba(139,92,246,0.6) 0, transparent 25%)',
                }}
              />

              {/* Ad Overlay Header */}
              <div className="relative z-10 flex items-center justify-between text-xs text-white/90">
                <span className="font-mono text-[10px] bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded-md border border-white/20 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  Anúncio ({timeLeft}s)
                </span>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 rounded-md bg-black/80 backdrop-blur-sm text-white hover:bg-black transition-colors cursor-pointer border border-white/20"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>

              {/* Ad Content Demo Center overlay */}
              <div className="relative z-10 text-center space-y-1 py-1 bg-black/60 backdrop-blur-sm p-3 rounded-xl border border-white/10 max-w-xs mx-auto">
                <div className="w-10 h-10 rounded-xl bg-blue-600/40 border border-blue-400/50 mx-auto flex items-center justify-center animate-pulse">
                  <Sparkles className="w-5 h-5 text-blue-300" />
                </div>
                <h4 className="text-xs font-extrabold text-white tracking-wide">MemoriaFlash Network</h4>
                <p className="text-[10px] text-slate-200">
                  Potencialize sua memória com Repetição Espaçada e IA.
                </p>
              </div>

              {/* Progress Bar */}
              <div className="relative z-10 w-full bg-slate-900/80 h-2 rounded-full overflow-hidden border border-white/10">
                <div
                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${((5 - timeLeft) / 5) * 100}%` }}
                />
              </div>
            </div>
          ) : isCompleted ? (
            <div className="text-center p-6 space-y-3 animate-fade-in z-10">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-emerald-400">Anúncio Concluído!</h3>
              <p className="text-xs text-slate-300">
                Você ganhou <strong className="text-white">+{rewardAmount} Créditos de IA</strong>
                {streak >= 4 && <span className="text-amber-300"> (bônus de streak de {streak} dias!)</span>}.
              </p>
            </div>
          ) : (
            <div className="text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
                <Play className="w-6 h-6 ml-0.5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Assista ao Vídeo Patrocinado</h4>
                <p className="text-[11px] text-[#8c91a0]">
                  Ganhe +{rewardAmount} Créditos de IA gratuitamente
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Policy / Cap Info Badge */}
        <div className="p-3 rounded-2xl bg-[#122131] border border-[#424754]/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div className="text-[11px] text-[#8c91a0]">
              <div>
                Restam <strong className="text-white">{remainingAfterThis}</strong> vídeos hoje (limite de{' '}
                {ECONOMY.MAX_REWARDED_ADS_PER_DAY}/dia).
              </div>
              <div className="text-[9px] text-slate-500">Assista dias seguidos para aumentar sua recompensa.</div>
            </div>
          </div>

          {isCompleted && (
            <button
              onClick={handleReplayAd}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all border border-slate-700"
              title="Assistir Novamente"
            >
              <RefreshCw className="w-3 h-3" /> Replay
            </button>
          )}
        </div>

        {/* Action Button */}
        {isCompleted ? (
          <button
            onClick={handleClaimReward}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
          >
            <CheckCircle2 className="w-4 h-4" /> Resgatar +{rewardAmount} Créditos de IA Agora
          </button>
        ) : (
          <button
            disabled
            className="w-full py-3.5 rounded-2xl bg-slate-800 text-slate-300 font-extrabold text-xs cursor-not-allowed text-center flex items-center justify-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            Reproduzindo Anúncio ({timeLeft}s)...
          </button>
        )}
      </div>
    </div>
  );
};
