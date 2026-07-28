import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RotateCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowLeft,
  Flame,
  Award,
  Zap,
  Volume2,
  Lightbulb,
  BookOpen,
  X,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Deck, Flashcard, RatingGrade } from '../types';
import { calculateSM2, getDueCardCount } from '../services/srsEngine';
import { apiVoiceTutor } from '../services/api';
import { SupportedLanguage, translations } from '../lib/i18n';

interface StudySessionViewProps {
  deck: Deck;
  currentLanguage?: SupportedLanguage;
  onFinishSession: (updatedDeck: Deck, cardsReviewedCount: number) => void;
  onBack: () => void;
}

export const StudySessionView: React.FC<StudySessionViewProps> = ({
  deck,
  currentLanguage = 'pt',
  onFinishSession,
  onBack,
}) => {
  const t = translations[currentLanguage] || translations.pt;

  // Filtra apenas os cartões vencidos (dueDate <= agora). Se não houver nenhum,
  // estuda todos (caso do deck recém-criado onde todos têm dueDate = now).
  const dueCards = deck.cards.filter((c) => {
    if (!c.dueDate) return true;
    return new Date(c.dueDate) <= new Date();
  });
  const initialCards = dueCards.length > 0 ? dueCards : [...deck.cards];

  const [cards, setCards] = useState<Flashcard[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const currentCard = cards[currentIndex];

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleRate = (rating: RatingGrade) => {
    if (!currentCard) return;

    const sm2Result = calculateSM2(currentCard, rating);
    const updatedCard: Flashcard = { ...currentCard, ...sm2Result };

    const updatedList = [...cards];
    updatedList[currentIndex] = updatedCard;
    setCards(updatedList);
    setReviewedCount((prev) => prev + 1);

    setAiHint(null);
    setIsFlipped(false);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setSessionCompleted(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  const handleRequestAiHint = async () => {
    if (!currentCard) return;
    setIsLoadingHint(true);
    try {
      const res = await apiVoiceTutor(
        `Dê uma dica curta e sem revelar a resposta para a pergunta: "${currentCard.front}"`,
        currentCard.topic || deck.title,
        currentLanguage
      );
      setAiHint(res.answer || res.aiInsight);
    } catch {
      setAiHint('Pense nos conceitos fundamentais e palavras-chave deste tema.');
    } finally {
      setIsLoadingHint(false);
    }
  };

  const handleRequestAiExplanation = async () => {
    if (!currentCard) return;
    setIsLoadingExplanation(true);
    try {
      const prompt = `Por favor, explique detalhadamente o conceito e forneça um EXEMPLO PRÁTICO do mundo real para esta pergunta no idioma ${currentLanguage}.\n\nPergunta / Conceito: "${currentCard.front}"\nResposta de referência: "${currentCard.back}"\n\nResponda de forma extremamente didática e clara, dividida em dois tópicos:\n\n1. 📘 EXPLICAÇÃO DETALHADA DO CONCEITO\n2. 💡 EXEMPLO PRÁTICO DO MUNDO REAL`;
      const res = await apiVoiceTutor(prompt, currentCard.topic || deck.title, currentLanguage);
      setAiExplanation(res.answer || res.aiInsight);
      setShowExplanationModal(true);
    } catch {
      setAiExplanation(
        `📘 EXPLICAÇÃO DETALHADA DO CONCEITO:\n${currentCard.front} é um conceito chave referente a: ${currentCard.back}.\n\n💡 EXEMPLO PRÁTICO DO MUNDO REAL:\nImagine um cenário cotidiano de aplicação do tema "${currentCard.topic || deck.title}" onde este conceito se aplica de forma direta e prática.`
      );
      setShowExplanationModal(true);
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const handleSpeakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCompleteAndReturn = () => {
    // Mescla os cards atualizados de volta no deck completo
    const updatedCardMap = new Map(cards.map((c) => [c.id, c]));
    const mergedCards = deck.cards.map((c) => updatedCardMap.get(c.id) || c);
    const updatedDeck: Deck = { ...deck, cards: mergedCards };
    onFinishSession(updatedDeck, reviewedCount);
  };

  const handleBackRequest = () => {
    if (reviewedCount > 0) {
      setShowExitConfirm(true);
    } else {
      onBack();
    }
  };

  // Calcula XP real ganho nesta sessão
  const xpEarned = reviewedCount * 25;

  if (sessionCompleted || !currentCard) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-2xl shadow-emerald-500/30 flex items-center justify-center">
          <div className="w-full h-full bg-[#0b1a2a] rounded-[23px] flex items-center justify-center">
            <Award className="w-10 h-10 text-emerald-400 animate-bounce" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white">Sessão Concluída! 🎉</h2>
          <p className="text-sm text-[#8c91a0]">
            Você revisou <strong className="text-[#adc6ff]">{reviewedCount} cartões</strong>{' '}
            e atualizou os intervalos de retenção SM-2 no seu cérebro.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#122131] border border-[#adc6ff]/20 flex items-center justify-around text-center">
          <div>
            <div className="text-[10px] text-[#8c91a0] uppercase font-mono">Ganho de XP</div>
            <div className="text-xl font-extrabold text-[#60a5fa] flex items-center justify-center gap-1">
              <Zap className="w-4 h-4" /> +{xpEarned} XP
            </div>
          </div>
          <div className="w-px h-8 bg-[#424754]/40" />
          <div>
            <div className="text-[10px] text-[#8c91a0] uppercase font-mono">Cards Hoje</div>
            <div className="text-xl font-extrabold text-emerald-400">{reviewedCount}</div>
          </div>
        </div>

        <button
          id="btn-finish-study-session"
          onClick={handleCompleteAndReturn}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-all cursor-pointer"
        >
          Salvar Progresso e Voltar
        </button>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 animate-fade-in">
      {/* Modal de confirmação de saída */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#0b1a2a] border border-amber-500/40 rounded-3xl p-6 space-y-4 shadow-2xl text-center">
            <div className="flex justify-center">
              <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Sair da Sessão?</h3>
              <p className="text-xs text-[#8c91a0] mt-1">
                Você revisou <strong className="text-[#adc6ff]">{reviewedCount} cartão{reviewedCount !== 1 ? 's' : ''}</strong>.
                O progresso desta sessão será perdido se sair agora.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#122131] text-[#c2c6d6] text-xs font-bold border border-[#424754]/40 hover:bg-[#1c2b3c] transition-all cursor-pointer"
              >
                Continuar Estudando
              </button>
              <button
                onClick={() => { setShowExitConfirm(false); onBack(); }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 hover:bg-amber-500/30 transition-all cursor-pointer"
              >
                Sair sem Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back-to-dashboard"
          onClick={handleBackRequest}
          className="p-2 rounded-xl bg-[#122131] text-[#c2c6d6] hover:text-white transition-colors flex items-center gap-2 text-xs font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Sair da Sessão
        </button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#adc6ff]/10 text-[#adc6ff] border border-[#adc6ff]/20 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#60a5fa]" /> AI ASSIST ACTIVE
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono text-[#8c91a0]">
          <span>Cartão {currentIndex + 1} de {cards.length}</span>
          <span className="text-[#adc6ff] font-bold">{progressPercent}%</span>
        </div>
        <div className="w-full bg-[#122131] h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 3D Flip Card */}
      <div
        id="flashcard-flip-container"
        onClick={handleFlip}
        className="perspective-1000 min-h-[320px] sm:min-h-[380px] cursor-pointer group select-none"
      >
        <div
          className={`relative w-full h-full min-h-[320px] sm:min-h-[380px] rounded-3xl transition-transform duration-500 preserve-3d glass-card overflow-hidden border-2 ${
            isFlipped ? 'rotate-y-180 border-[#60a5fa]/50' : 'border-[#adc6ff]/20 hover:border-[#adc6ff]/40'
          }`}
        >
          {/* FRONT */}
          <div className="absolute inset-0 p-6 sm:p-8 backface-hidden flex flex-col justify-between h-full space-y-6">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#122131] text-[#adc6ff] text-xs font-mono border border-[#adc6ff]/20">
                {currentCard.topic || deck.category}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeakText(currentCard.front);
                }}
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Ouvir pergunta"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            <div className="my-auto text-center space-y-3">
              <p className="text-xs font-mono text-[#8c91a0] uppercase tracking-wider">Pergunta</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
                {currentCard.front}
              </h3>
            </div>

            <div className="text-center pt-4 border-t border-[#424754]/20 flex items-center justify-center gap-2 text-xs text-[#8c91a0]">
              <RotateCw className="w-4 h-4 text-[#60a5fa]" /> Clique para ver a resposta
            </div>
          </div>

          {/* BACK */}
          <div className="absolute inset-0 p-6 sm:p-8 rotate-y-180 backface-hidden flex flex-col justify-between h-full space-y-6 bg-[#0c1e30] rounded-3xl">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20 font-bold">
                Resposta & Explicação
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeakText(currentCard.back);
                }}
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Ouvir resposta"
              >
                <Volume2 className="w-5 h-5 text-emerald-400" />
              </button>
            </div>

            <div className="my-auto space-y-3 overflow-y-auto max-h-[220px] pr-2">
              <div className="text-base sm:text-lg font-medium text-slate-100 whitespace-pre-line leading-relaxed">
                {currentCard.back}
              </div>
            </div>

            <div className="text-center pt-2 border-t border-[#424754]/20 text-xs text-[#8c91a0]">
              Avalie sua facilidade para calcular o intervalo SRS
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistance Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            id="btn-explain-and-example"
            onClick={handleRequestAiExplanation}
            disabled={isLoadingExplanation}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-blue-500/20 hover:from-amber-500/30 hover:via-orange-500/30 hover:to-blue-500/30 text-white border border-amber-400/40 text-xs font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
          >
            <Lightbulb className="w-4 h-4 text-amber-300 fill-amber-300/30 animate-pulse" />
            <span>
              {isLoadingExplanation ? t.generatingExplanation : t.explainQuestionAndExample}
            </span>
          </button>

          {!aiHint && (
            <button
              id="btn-ai-hint"
              onClick={handleRequestAiHint}
              disabled={isLoadingHint}
              className="px-3.5 py-2.5 rounded-2xl bg-[#122131] hover:bg-[#1c2b3c] text-[#adc6ff] text-xs font-medium flex items-center justify-center gap-1.5 border border-[#adc6ff]/20 transition-all cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-[#60a5fa]" />
              <span>{isLoadingHint ? 'Dica IA...' : 'Pedir Dica'}</span>
            </button>
          )}
        </div>

        {aiHint && (
          <div className="p-4 rounded-2xl bg-[#122238] border border-[#60a5fa]/30 text-xs text-[#adc6ff] space-y-1 animate-fade-in">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#60a5fa]" /> Dica do Tutor IA:
            </div>
            <p className="leading-relaxed text-slate-300">{aiHint}</p>
          </div>
        )}
      </div>

      {/* Explanation & Example Modal */}
      {showExplanationModal && aiExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0b1a2a] border border-amber-500/40 rounded-3xl p-6 text-white shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#424754]/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">{t.explainTitle}</h3>
                  <p className="text-[11px] text-[#8c91a0] line-clamp-1">{currentCard.front}</p>
                </div>
              </div>
              <button
                onClick={() => setShowExplanationModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#122131] border border-[#adc6ff]/20 text-xs text-slate-200 whitespace-pre-line leading-relaxed space-y-3 font-sans max-h-[380px] overflow-y-auto">
              {aiExplanation}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleSpeakText(aiExplanation)}
                className="px-3.5 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-[#60a5fa] border border-blue-400/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Volume2 className="w-4 h-4" /> Ouvir com Voz
              </button>

              <button
                onClick={() => setShowExplanationModal(false)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md cursor-pointer hover:scale-105 transition-all"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SM-2 Rating Controls — só aparecem após virar o card */}
      {isFlipped && (
        <div className="grid grid-cols-3 gap-3 pt-2 animate-fade-in">
          <button
            id="rate-btn-hard"
            onClick={() => handleRate('hard')}
            className="p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group hover:scale-[1.02]"
          >
            <XCircle className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>DIFÍCIL</span>
            <span className="text-[10px] font-normal text-amber-400/70 font-mono">Repetir em 1d</span>
          </button>

          <button
            id="rate-btn-good"
            onClick={() => handleRate('good')}
            className="p-3.5 rounded-2xl bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 border border-[#3b82f6]/30 text-[#60a5fa] font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group hover:scale-[1.02]"
          >
            <RotateCw className="w-5 h-5 text-[#60a5fa] group-hover:scale-110 transition-transform" />
            <span>BOM</span>
            <span className="text-[10px] font-normal text-[#60a5fa]/70 font-mono">Manter Ritmo</span>
          </button>

          <button
            id="rate-btn-easy"
            onClick={() => handleRate('easy')}
            className="p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group hover:scale-[1.02]"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>FÁCIL</span>
            <span className="text-[10px] font-normal text-emerald-400/70 font-mono">Expandir 6d+</span>
          </button>
        </div>
      )}

      {/* Instrução quando o card ainda não foi virado */}
      {!isFlipped && (
        <div className="text-center py-3 text-xs text-[#8c91a0] animate-fade-in">
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#122131] border border-[#424754]/30">
            <RotateCw className="w-3.5 h-3.5 text-[#60a5fa]" />
            Vire o cartão para ver a resposta e avaliar
          </span>
        </div>
      )}
    </div>
  );
};
