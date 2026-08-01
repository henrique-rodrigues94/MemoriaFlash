import React, { useState } from 'react';
import {
  Sparkles,
  RotateCw,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Award,
  Zap,
  Lightbulb,
  X,
  AlertTriangle,
  Star,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Deck, Flashcard, RatingGrade } from '../types';
import { calculateSM2 } from '../services/srsEngine';
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

  const dueCards = deck.cards.filter((c) => {
    if (!c.dueDate) return true;
    return new Date(c.dueDate) <= new Date();
  });
  const initialCards = dueCards.length > 0 ? dueCards : [...deck.cards];

  const [cards, setCards] = useState<Flashcard[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Inverte pergunta/resposta ao revisar (útil para consolidar a resposta como estímulo)
  const [invertCards, setInvertCards] = useState(false);

  // Cards com pergunta/resposta invertidas (resposta vira pergunta e vice-versa)
  const effectiveCards = invertCards
    ? cards.map((c) => ({
        ...c,
        front: c.back,
        back: c.front,
        explanation: c.explanation,
        curiosity: c.curiosity,
      }))
    : cards;
  const currentCard = effectiveCards[currentIndex];

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

    setIsFlipped(false);
    setAiExplanation(null);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setSessionCompleted(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  const handleRequestAiExplanation = async () => {
    if (!currentCard) return;

    // Use stored explanation/curiosity first if available
    if (currentCard.explanation && !aiExplanation) {
      setAiExplanation(currentCard.explanation);
      setShowExplanationModal(true);
      return;
    }

    setIsLoadingExplanation(true);
    try {
      const prompt = `Por favor, explique detalhadamente o conceito e forneça um EXEMPLO PRÁTICO do mundo real para esta pergunta no idioma ${currentLanguage}.\n\nPergunta / Conceito: "${currentCard.front}"\nResposta de referência: "${currentCard.back}"\n\nResponda de forma extremamente didática e clara, dividida em dois tópicos:\n\n📘 EXPLICAÇÃO DETALHADA DO CONCEITO\n💡 EXEMPLO PRÁTICO DO MUNDO REAL`;
      const res = await apiVoiceTutor(prompt, currentCard.topic || deck.title, currentLanguage);
      setAiExplanation(res.answer || res.aiInsight);
      setShowExplanationModal(true);
    } catch {
      setAiExplanation(
        `📘 EXPLICAÇÃO DETALHADA DO CONCEITO:\n${currentCard.front} — ${currentCard.back}.\n\n💡 EXEMPLO PRÁTICO DO MUNDO REAL:\nAplique este conceito em situações do dia a dia relacionadas ao tema "${currentCard.topic || deck.title}".`
      );
      setShowExplanationModal(true);
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const handleCompleteAndReturn = (shouldInvert: boolean = invertCards) => {
    const updatedCardMap = new Map(cards.map((c) => [c.id, c]));
    const mergedCards = deck.cards.map((c) => updatedCardMap.get(c.id) || c);

    // Se o usuário quiser inverter, troca front/back de todos os cards antes de salvar
    const finalCards = shouldInvert
      ? mergedCards.map((c) => ({
          ...c,
          front: c.back,
          back: c.front,
        }))
      : mergedCards;

    const updatedDeck: Deck = { ...deck, cards: finalCards };
    onFinishSession(updatedDeck, reviewedCount);
  };

  const handleBackRequest = () => {
    if (reviewedCount > 0) {
      setShowExitConfirm(true);
    } else {
      onBack();
    }
  };

  const xpEarned = reviewedCount * 25;

  // ── Session Complete Screen ──
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
            Você revisou <strong className="text-[#adc6ff]">{reviewedCount} cartões</strong> e atualizou os intervalos de retenção SM-2 no seu cérebro.
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

        {/* Opção de inverter resposta com pergunta antes de sair */}
        <button
          type="button"
          onClick={() => setInvertCards((prev) => !prev)}
          className={`w-full py-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            invertCards
              ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
              : 'bg-[#122131] border-[#424754]/40 text-[#8c91a0] hover:border-violet-500/40 hover:text-violet-300'
          }`}
        >
          <RotateCw className={`w-4 h-4 ${invertCards ? 'text-violet-400' : ''}`} />
          {invertCards ? '✓ Inverter Resposta com Pergunta (ativo)' : 'Inverter Resposta com Pergunta'}
        </button>
        {invertCards && (
          <p className="text-[11px] text-[#8c91a0] -mt-2">
            A resposta virará a pergunta e a pergunta virará a resposta ao salvar.
          </p>
        )}

        <button
          id="btn-finish-study-session"
          onClick={() => handleCompleteAndReturn(invertCards)}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-all cursor-pointer"
        >
          Salvar Progresso e Voltar
        </button>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24 animate-fade-in">

      {/* Exit confirm modal */}
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
                Você revisou <strong className="text-[#adc6ff]">{reviewedCount} cartão{reviewedCount !== 1 ? 's' : ''}</strong>. O progresso será perdido se sair agora.
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

      {/* Explanation Modal */}
      {showExplanationModal && aiExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0b1a2a] border border-amber-500/40 rounded-3xl p-6 text-white shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#424754]/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Explicação & Exemplo</h3>
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

            <div className="p-4 rounded-2xl bg-[#122131] border border-[#adc6ff]/20 text-xs text-slate-200 whitespace-pre-line leading-relaxed max-h-[320px] overflow-y-auto">
              {aiExplanation}
            </div>

            {/* Curiosity block if available */}
            {currentCard.curiosity && (
              <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-xs text-violet-200 space-y-1">
                <div className="font-bold text-violet-300 flex items-center gap-1.5 mb-1">
                  <Star className="w-4 h-4 fill-violet-400/30" /> Curiosidade
                </div>
                <p className="leading-relaxed">{currentCard.curiosity}</p>
              </div>
            )}

            <button
              onClick={() => setShowExplanationModal(false)}
              className="w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md cursor-pointer hover:scale-105 transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back-to-dashboard"
          onClick={handleBackRequest}
          className="p-2 rounded-xl bg-[#122131] text-[#c2c6d6] hover:text-white transition-colors flex items-center gap-2 text-xs font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Sair da Sessão
        </button>
      </div>

      {/* Progress */}
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

      {/* "Explicar Pergunta & Ver Exemplo" — acima do card, sempre visível */}
      <button
        id="btn-explain-and-example"
        onClick={(e) => { e.stopPropagation(); handleRequestAiExplanation(); }}
        disabled={isLoadingExplanation}
        className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-blue-500/20 hover:from-amber-500/30 hover:to-blue-500/30 text-white border border-amber-400/40 text-xs font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] transition-all cursor-pointer"
      >
        <Lightbulb className="w-4 h-4 text-amber-300 fill-amber-300/30 animate-pulse" />
        {isLoadingExplanation ? 'Gerando explicação...' : t.explainQuestionAndExample || 'Explicar Pergunta & Ver Exemplo'}
      </button>

      {/* ── CARD ── */}
      <div
        id="flashcard-flip-container"
        onClick={handleFlip}
        className="min-h-[420px] sm:min-h-[500px] cursor-pointer select-none"
      >
        {!isFlipped ? (
          /* FRONT */
          <div className="w-full min-h-[420px] sm:min-h-[500px] p-7 sm:p-10 flex flex-col justify-between glass-card rounded-3xl border-2 border-[#adc6ff]/20 hover:border-[#adc6ff]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#122131] text-[#adc6ff] text-xs font-mono border border-[#adc6ff]/20">
                {currentCard.topic || deck.category}
              </span>
            </div>

            <div className="my-auto text-center space-y-4">
              <p className="text-xs font-mono text-[#8c91a0] uppercase tracking-wider">Pergunta</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-white leading-relaxed">
                {currentCard.front}
              </h3>
            </div>

            <div className="text-center pt-4 border-t border-[#424754]/20 flex items-center justify-center gap-2 text-xs text-[#8c91a0]">
              <RotateCw className="w-4 h-4 text-[#60a5fa]" /> Clique para ver a resposta
            </div>
          </div>
        ) : (
          /* BACK */
          <div className="w-full min-h-[420px] sm:min-h-[500px] p-7 sm:p-10 flex flex-col justify-between rounded-3xl border-2 border-[#60a5fa]/50 bg-[#0c1e30] transition-colors">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20 font-bold">
                Resposta
              </span>
            </div>

            <div className="my-auto space-y-4 overflow-y-auto max-h-[260px] pr-1">
              <div className="text-lg sm:text-xl font-medium text-slate-100 whitespace-pre-line leading-relaxed">
                {currentCard.back}
              </div>

              {/* Curiosity on back of card */}
              {currentCard.curiosity && (
                <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-xs text-violet-200 space-y-1">
                  <div className="font-bold text-violet-300 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-violet-400/30" /> Curiosidade
                  </div>
                  <p className="leading-relaxed">{currentCard.curiosity}</p>
                </div>
              )}
            </div>

            <div className="text-center pt-2 border-t border-[#424754]/20 text-xs text-[#8c91a0]">
              Avalie sua facilidade para calcular o intervalo SRS
            </div>
          </div>
        )}
      </div>

      {/* SM-2 Rating Controls — only after flip */}
      {isFlipped && (
        <div className="grid grid-cols-3 gap-3 pt-1 animate-fade-in">
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

      {/* Instruction when card not flipped */}
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
