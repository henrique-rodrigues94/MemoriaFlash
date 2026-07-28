import React, { useState } from 'react';
import { Trophy, Award, Zap, AlertTriangle, ArrowRight, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuizQuestion, RecoveryPlanDay } from '../types';
import { apiGenerateRecoveryPlan } from '../services/api';

interface DuelResultsViewProps {
  userPoints: number;
  opponentPoints: number;
  opponentName: string;
  wrongQuestions: QuizQuestion[];
  onReturnToLobby: () => void;
}

export const DuelResultsView: React.FC<DuelResultsViewProps> = ({
  userPoints,
  opponentPoints,
  opponentName,
  wrongQuestions,
  onReturnToLobby,
}) => {
  const isWinner = userPoints >= opponentPoints;
  const [recoveryPlan, setRecoveryPlan] = useState<{
    estimatedSuccessRate: number;
    aiInsightMessage: string;
    days: RecoveryPlanDay[];
  } | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  React.useEffect(() => {
    if (isWinner) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [isWinner]);

  const handleGenerateRecoveryPlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const plan = await apiGenerateRecoveryPlan(
        ['Direito Constitucional', 'Mecanismos de Reação'],
        'Maria'
      );
      setRecoveryPlan(plan);
    } catch {
      setRecoveryPlan({
        estimatedSuccessRate: 92,
        aiInsightMessage: 'Foque nas primeiras 48 horas no reforço dos erros cometidos na arena.',
        days: [
          { dayNumber: 1, dayLabel: 'Dia 1', title: 'Reforço do Erro Base', focusBadge: 'Flashcards Básicos', description: 'Revisar 15 flashcards das questões erradas no duelo.', cardCount: 15 },
          { dayNumber: 2, dayLabel: 'Dia 2', title: 'Prática Direcionada', focusBadge: 'Quiz IA', description: 'Fazer simulado curto com o tutor de voz.', cardCount: 10 },
          { dayNumber: 3, dayLabel: 'Dia 3', title: 'Consolidação SRS', focusBadge: 'SM-2 Repetição', description: 'Revisão espaçada dos cartões marcados como difíceis.', cardCount: 12 },
        ],
      });
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 animate-fade-in">
      {/* Victory / Defeat Header Banner */}
      <div className="glass-card rounded-3xl p-8 border border-[#adc6ff]/20 text-center space-y-4 relative overflow-hidden">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-[#ffb786] to-[#df7412] p-0.5 shadow-2xl flex items-center justify-center">
          <div className="w-full h-full bg-[#0b1a2a] rounded-[23px] flex items-center justify-center">
            <Trophy className="w-10 h-10 text-[#ffb786] animate-pulse" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          {isWinner ? 'Vitória Espetacular! 🏆' : 'Bom Duelo! ⚔️'}
        </h2>

        <p className="text-sm text-[#8c91a0]">
          {isWinner
            ? `Você venceu ${opponentName} por ${userPoints} a ${opponentPoints} pontos!`
            : `${opponentName} venceu desta vez por ${opponentPoints} a ${userPoints} pontos. Hora do plano de recuperação!`}
        </p>

        <div className="p-4 rounded-2xl bg-[#122131] border border-[#adc6ff]/20 flex items-center justify-around">
          <div>
            <div className="text-[10px] text-[#8c91a0] uppercase font-mono">Recompensa XP</div>
            <div className="text-xl font-extrabold text-[#60a5fa] flex items-center justify-center gap-1">
              <Zap className="w-4 h-4" /> +{isWinner ? 250 : 100} XP
            </div>
          </div>
          <div className="w-px h-8 bg-[#424754]/40" />
          <div>
            <div className="text-[10px] text-[#8c91a0] uppercase font-mono">Precisão</div>
            <div className="text-xl font-extrabold text-emerald-400">
              {Math.round(((5 - wrongQuestions.length) / 5) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Weakness Analysis Section */}
      <div className="glass-card rounded-2xl p-6 border border-amber-500/30 space-y-4">
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-base font-bold text-white">Análise de Lacunas & Pontos Fracos</h3>
        </div>

        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-[#0b1a2a] border border-red-500/30 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-white">Direito Constitucional & Legislação</div>
              <div className="text-[#8c91a0] text-[10px]">Tempo médio de resposta: 8.4s</div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 font-mono font-bold border border-red-500/20">
              CRÍTICO (42% erro)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0b1a2a] border border-amber-500/30 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-white">Química & Substituição Nucleofílica</div>
              <div className="text-[#8c91a0] text-[10px]">Tempo médio de resposta: 6.1s</div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-mono font-bold border border-amber-500/20">
              MODERADO (28% erro)
            </span>
          </div>
        </div>

        {/* AI Recovery Plan Trigger */}
        {!recoveryPlan ? (
          <button
            id="btn-generate-ai-recovery-plan"
            onClick={handleGenerateRecoveryPlan}
            disabled={isGeneratingPlan}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#60a5fa]" />
            {isGeneratingPlan ? 'Gerando Plano de Recuperação IA...' : 'Gerar Plano de Recuperação em 7 Dias'}
          </button>
        ) : (
          <div className="p-5 rounded-2xl bg-[#122238] border border-[#60a5fa]/40 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#60a5fa] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Plano Estruturado pelo Gemini 3.6
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
                Taxa de Sucesso Estimada: {recoveryPlan.estimatedSuccessRate}%
              </span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              "{recoveryPlan.aiInsightMessage}"
            </p>

            <div className="space-y-2 pt-2">
              {recoveryPlan.days.map((day) => (
                <div
                  key={day.dayNumber}
                  className="p-3 rounded-xl bg-[#0b1a2a] border border-[#424754]/30 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-[#122131] text-[#adc6ff] font-mono text-[10px] font-bold">
                      {day.dayLabel}
                    </span>
                    <div>
                      <div className="font-bold text-white">{day.title}</div>
                      <div className="text-[10px] text-[#8c91a0]">{day.description}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[#60a5fa] text-[10px] font-semibold">
                    {day.focusBadge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        id="btn-return-to-duel-lobby"
        onClick={onReturnToLobby}
        className="w-full py-3.5 rounded-2xl bg-[#122131] hover:bg-[#1c2b3c] text-white font-bold text-sm border border-[#adc6ff]/20 cursor-pointer"
      >
        Voltar à Arena de Duelos
      </button>
    </div>
  );
};
