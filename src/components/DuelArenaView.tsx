import React, { useState, useEffect } from 'react';
import { Swords, Clock, CheckCircle, XCircle, AlertCircle, Bot, Award, Sparkles } from 'lucide-react';
import { QuizQuestion, UserStats } from '../types';

interface DuelArenaViewProps {
  stats: UserStats;
  opponentName: string;
  opponentAvatar: string;
  questions: QuizQuestion[];
  onFinishDuel: (userPoints: number, opponentPoints: number, wrongQuestions: QuizQuestion[]) => void;
}

export const DuelArenaView: React.FC<DuelArenaViewProps> = ({
  stats,
  opponentName,
  opponentAvatar,
  questions,
  onFinishDuel,
}) => {
  const [currentRound, setCurrentRound] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const [opponentPoints, setOpponentPoints] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(12);
  const [wrongQuestions, setWrongQuestions] = useState<QuizQuestion[]>([]);

  const currentQ = questions[currentRound];

  // Countdown timer for each question
  useEffect(() => {
    if (isSubmitted || !currentQ) return;

    if (timeLeft <= 0) {
      handleSelectOption(-1); // Timeout penalty
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, isSubmitted, currentQ]);

  const handleSelectOption = (index: number) => {
    if (isSubmitted) return;

    setSelectedOption(index);
    setIsSubmitted(true);

    const isCorrect = index === currentQ.correctIndex;
    let earnedUser = 0;

    if (isCorrect) {
      earnedUser = 100 + timeLeft * 10;
      setUserPoints((prev) => prev + earnedUser);
    } else {
      setWrongQuestions((prev) => [...prev, currentQ]);
    }

    // Simulate opponent answer logic
    const oppCorrect = Math.random() > 0.35;
    if (oppCorrect) {
      setOpponentPoints((prev) => prev + 120);
    }

    // Auto advance after 2.5 seconds
    setTimeout(() => {
      if (currentRound + 1 < questions.length) {
        setCurrentRound((prev) => prev + 1);
        setSelectedOption(null);
        setIsSubmitted(false);
        setTimeLeft(12);
      } else {
        // Duel complete
        onFinishDuel(userPoints + earnedUser, opponentPoints + (oppCorrect ? 120 : 0), wrongQuestions);
      }
    }, 2500);
  };

  if (!currentQ) {
    return (
      <div className="text-center py-12 text-white">
        <Sparkles className="w-8 h-8 animate-spin mx-auto text-[#60a5fa] mb-2" />
        Carregando perguntas do duelo...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 animate-fade-in">
      {/* Scoreboard Header */}
      <div className="glass-card rounded-2xl p-4 border border-[#424754]/30 flex items-center justify-between">
        {/* User Stats */}
        <div className="flex items-center gap-3">
          <img
            src={stats.avatar}
            alt={stats.name}
            className="w-10 h-10 rounded-full object-cover border-2 border-[#60a5fa]"
          />
          <div>
            <div className="text-xs font-bold text-white">{stats.name}</div>
            <div className="text-sm font-extrabold text-[#60a5fa]">{userPoints} pts</div>
          </div>
        </div>

        {/* Round Badge */}
        <div className="text-center">
          <span className="px-3 py-1 rounded-full bg-[#122131] border border-[#adc6ff]/20 text-xs font-mono text-[#adc6ff] font-bold">
            RODADA {currentRound + 1}/{questions.length}
          </span>
        </div>

        {/* Opponent Stats */}
        <div className="flex items-center gap-3 text-right">
          <div>
            <div className="text-xs font-bold text-white">{opponentName}</div>
            <div className="text-sm font-extrabold text-amber-400">{opponentPoints} pts</div>
          </div>
          <img
            src={opponentAvatar}
            alt={opponentName}
            className="w-10 h-10 rounded-full object-cover border-2 border-amber-400"
          />
        </div>
      </div>

      {/* Timer Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-mono text-[#8c91a0]">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> Tempo para responder
          </span>
          <span className="text-amber-400 font-bold">{timeLeft}s</span>
        </div>
        <div className="w-full bg-[#122131] h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              timeLeft < 4 ? 'bg-red-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'
            }`}
            style={{ width: `${(timeLeft / 12) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[#adc6ff]/20 space-y-6">
        <div className="text-xs font-mono text-[#60a5fa] uppercase tracking-wider">
          Questão de Múltipla Escolha
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
          {currentQ.question}
        </h3>

        {/* Options List */}
        <div className="space-y-3">
          {currentQ.options.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx); // A, B, C, D
            const isChosen = selectedOption === idx;
            const isCorrect = idx === currentQ.correctIndex;

            let btnClass = 'bg-[#0b1a2a] border-[#424754]/30 text-white hover:border-[#adc6ff]/50';

            if (isSubmitted) {
              if (isCorrect) {
                btnClass = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold';
              } else if (isChosen && !isCorrect) {
                btnClass = 'bg-red-500/20 border-red-500 text-red-300 font-bold';
              } else {
                btnClass = 'bg-[#0b1a2a]/40 border-[#424754]/20 text-slate-500';
              }
            }

            return (
              <button
                key={idx}
                id={`duel-opt-${idx}`}
                disabled={isSubmitted}
                onClick={() => handleSelectOption(idx)}
                className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between text-xs sm:text-sm transition-all cursor-pointer ${btnClass}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-[#122131] border border-[#adc6ff]/20 font-mono font-bold flex items-center justify-center text-xs text-[#adc6ff]">
                    {letter}
                  </span>
                  <span>{opt}</span>
                </div>

                {isSubmitted && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                {isSubmitted && isChosen && !isCorrect && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Feedback explanation */}
        {isSubmitted && (
          <div className="p-4 rounded-xl bg-[#122238] border border-[#60a5fa]/30 text-xs text-slate-200 space-y-1 animate-fade-in">
            <strong className="text-[#60a5fa]">Explicação do Gabarito:</strong>
            <p>{currentQ.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
};
