import React, { useState } from 'react';
import {
  RotateCw,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Award,
  Lightbulb,
  AlertTriangle,
  Star,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Deck, Flashcard, RatingGrade } from '../types';
import { calculateSM2 } from '../services/srsEngine';
import { SupportedLanguage, translations } from '../lib/i18n';

// Define um tamanho de fonte que se ajusta ao comprimento do texto E à altura
// do card (cqh = 1% da altura do container do card), priorizando uma fonte
// média bem legível e reduzindo apenas quando o texto não couber.
function responsiveFontSize(text: string, kind: 'question' | 'answer' = 'question'): string {
  const len = (text || '').length;
  const isQuestion = kind === 'question';

  // Tamanho-base médio legível (mínimo), o máximo (sem reduzir) e a referência
  // de "reduzir quando necessário" em % da altura do card.
  let basePx: number;
  let maxPx: number;
  let minPx: number;
  let sizeCqh: number;

  // Pergunta: fonte média ~40px; Resposta/Explicação: ~28px
  if (len <= 70) {
    basePx = isQuestion ? 40 : 28;
    sizeCqh = isQuestion ? 6.5 : 4.6;
    maxPx = isQuestion ? 46 : 34;
    minPx = isQuestion ? 16 : 13;
  } else if (len <= 120) {
    basePx = isQuestion ? 36 : 25;
    sizeCqh = isQuestion ? 5.8 : 4;
    maxPx = isQuestion ? 42 : 31;
    minPx = isQuestion ? 15 : 13;
  } else if (len <= 200) {
    basePx = isQuestion ? 32 : 22;
    sizeCqh = isQuestion ? 5 : 3.5;
    maxPx = isQuestion ? 38 : 27;
    minPx = isQuestion ? 14 : 12;
  } else if (len <= 320) {
    basePx = isQuestion ? 27 : 19;
    sizeCqh = isQuestion ? 4.2 : 3;
    maxPx = isQuestion ? 32 : 24;
    minPx = isQuestion ? 13 : 12;
  } else {
    basePx = isQuestion ? 23 : 17;
    sizeCqh = isQuestion ? 3.4 : 2.6;
    maxPx = isQuestion ? 27 : 21;
    minPx = isQuestion ? 12 : 11;
  }

  // Usa clamp entre min e base, escalando com a altura do card (cqh).
  // Se o texto não couber, o clamp reduz automaticamente para caber.
  return `clamp(${minPx}px, min(${basePx}px, ${sizeCqh}cqh), ${maxPx}px)`;
}

interface StudySessionViewProps {
  deck: Deck;
  currentLanguage?: SupportedLanguage;
  onFinishSession: (updatedDeck: Deck, cardsReviewedCount: number) => void;
  // Salva o progresso automaticamente a cada card avaliado (sem fechar a sessão)
  onSaveProgress?: (updatedDeck: Deck) => void;
  onBack: () => void;
}

export const StudySessionView: React.FC<StudySessionViewProps> = ({
  deck,
  currentLanguage = 'pt',
  onFinishSession,
  onSaveProgress,
  onBack,
}) => {
  const t = translations[currentLanguage] || translations.pt;

  // Tópicos únicos do baralho (usados para filtro de estudo) — ordenados alfabeticamente
  const uniqueTopics = Array.from(new Set(deck.cards.map((c) => c.topic || c.subject || deck.category).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  // ── Seleção de tópicos a estudar ────────────────────────────────────────────
  // Padrão: TODOS selecionados. O usuário pode desmarcar para estudar só alguns.
  const [selectedTopics, setSelectedTopics] = useState<string[]>(uniqueTopics);
  const [showTopicPicker, setShowTopicPicker] = useState(true);

  const filteredCards = selectedTopics.length > 0
    ? deck.cards.filter((c) => selectedTopics.includes(c.topic || c.subject || deck.category))
    : deck.cards;

  const dueCards = filteredCards.filter((c) => {
    if (!c.dueDate) return true;
    return new Date(c.dueDate) <= new Date();
  });
  const initialCards = dueCards.length > 0 ? dueCards : [...filteredCards];

  const [cards, setCards] = useState<Flashcard[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
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
    // Importante: usar o card ORIGINAL (não invertido) como base. `currentCard`
    // pode ter front/back trocados quando "Inverter Resposta/Pergunta" está
    // ativo — isso é só para exibição durante a revisão. Se salvássemos a
    // partir de `currentCard`, a troca virava permanente no baralho real.
    const originalCard = cards[currentIndex];
    const updatedCard: Flashcard = { ...originalCard, ...sm2Result };

    const updatedList = [...cards];
    updatedList[currentIndex] = updatedCard;
    setCards(updatedList);
    const newReviewedCount = reviewedCount + 1;
    setReviewedCount(newReviewedCount);

    setIsFlipped(false);

    // Salva automaticamente o progresso (deck + intervalo SM-2) a cada card avaliado
    const updatedCardMap = new Map(updatedList.map((c) => [c.id, c]));
    const mergedCards = deck.cards.map((c) => updatedCardMap.get(c.id) || c);
    if (onSaveProgress) onSaveProgress({ ...deck, cards: mergedCards });

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setSessionCompleted(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  const handleCompleteAndReturn = (shouldInvert: boolean = invertCards) => {
    const updatedCardMap = new Map(cards.map((c) => [c.id, c]));
    const mergedCards = deck.cards.map((c) => updatedCardMap.get(c.id) || c);

    // Se o usuário quiser, inverte front/back de todos os cards antes de salvar
    const finalCards = shouldInvert
      ? mergedCards.map((c) => ({ ...c, front: c.back, back: c.front }))
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

  // Inicia a sessão com os cards filtrados pelos tópicos selecionados
  const handleStartStudy = () => {
    const chosen = selectedTopics.length > 0
      ? deck.cards.filter((c) => selectedTopics.includes(c.topic || c.subject || deck.category))
      : deck.cards;
    const chosenDue = chosen.filter((c) => {
      if (!c.dueDate) return true;
      return new Date(c.dueDate) <= new Date();
    });
    const list = chosenDue.length > 0 ? chosenDue : [...chosen];
    setCards(list);
    setCurrentIndex(0);
    setSessionCompleted(false);
    setReviewedCount(0);
    setShowTopicPicker(false);
  };

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

        <div className="p-4 rounded-2xl bg-[#122131] border border-[#adc6ff]/20">
          <div className="text-[10px] text-[#8c91a0] uppercase font-mono">Cards Hoje</div>
          <div className="text-xl font-extrabold text-emerald-400">{reviewedCount}</div>
        </div>

        <button
          id="btn-finish-study-session"
          onClick={() => handleCompleteAndReturn(false)}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-all cursor-pointer"
        >
          Voltar para Estudo
        </button>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

  // ── Tela de seleção de tópicos (antes de começar a sessão) ──
  if (showTopicPicker && uniqueTopics.length > 0) {
    const totalSelected = selectedTopics.length;
    return (
      <div className="max-w-xl mx-auto py-8 px-4 text-center space-y-5 animate-fade-in">
        {/* Botão Sair no topo */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackRequest}
            className="p-2 rounded-xl bg-[#122131] text-[#c2c6d6] hover:text-white transition-colors flex items-center gap-2 text-xs font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Sair
          </button>
          <span className="text-[10px] font-mono text-[#8c91a0]">{deck.title}</span>
        </div>

        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-[#122131] to-[#273647] border border-[#adc6ff]/30 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-[#60a5fa]" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Escolha os Tópicos</h2>
          <p className="text-sm text-[#8c91a0] mt-1">
            Selecione quais tópicos você quer estudar agora no baralho <strong className="text-[#adc6ff]">{deck.title}</strong>.
          </p>
        </div>

        {/* Toggle todos */}
        <button
          onClick={() => setSelectedTopics(totalSelected === uniqueTopics.length ? [] : [...uniqueTopics])}
          className="w-full py-2.5 rounded-xl bg-[#122131] border border-[#adc6ff]/30 text-[#adc6ff] text-xs font-bold hover:bg-[#1c2b3c] transition-colors cursor-pointer"
        >
          {totalSelected === uniqueTopics.length ? '✓ Todos selecionados' : 'Selecionar todos'}
        </button>

        {/* Lista de tópicos */}
        <div className="space-y-2">
          {uniqueTopics.map((topic) => {
            const isSelected = selectedTopics.includes(topic);
            const count = deck.cards.filter((c) => (c.topic || c.subject || deck.category) === topic).length;
            return (
              <button
                key={topic}
                onClick={() => setSelectedTopics((prev) => isSelected ? prev.filter((t) => t !== topic) : [...prev, topic])}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#3b82f6]/15 border-[#3b82f6]/40'
                    : 'bg-[#122131]/70 border-[#424754]/40 hover:border-[#60a5fa]/40'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-[#3b82f6] border-[#3b82f6] text-white' : 'border-[#424754]'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </span>
                  <span className="text-sm font-semibold text-white truncate">{topic}</span>
                </div>
                <span className="text-[10px] font-mono text-[#8c91a0] flex-shrink-0">{count} card{count !== 1 ? 's' : ''}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-2">
          <button
            onClick={handleStartStudy}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-all cursor-pointer"
          >
            Começar Estudo ({initialCards.length} card{initialCards.length !== 1 ? 's' : ''})
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto h-[100dvh] flex flex-col gap-4 sm:gap-5 overflow-hidden animate-fade-in px-3 sm:px-6 py-3">

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

      {/* Cabeçalho + progresso (área fixa no topo) */}
      <div className="flex flex-col gap-3 shrink-0 pt-3">
        {/* Header: Sair da Sessão */}
        <div className="flex items-center justify-between">
          <button
            id="btn-back-to-dashboard"
            onClick={handleBackRequest}
            className="p-2 rounded-xl bg-[#122131] text-[#c2c6d6] hover:text-white transition-colors flex items-center gap-2 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Sair da Sessão
          </button>

          <button
            type="button"
            onClick={() => { setInvertCards((prev) => !prev); setIsFlipped(false); }}
            title={invertCards ? 'Desativar inversão de pergunta/resposta' : 'Inverter resposta com pergunta'}
            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              invertCards
                ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                : 'bg-[#122131] border-[#424754]/40 text-[#8c91a0] hover:border-violet-500/40 hover:text-violet-300'
            }`}
          >
            <RotateCw className={`w-4 h-4 ${invertCards ? 'text-violet-400' : ''}`} />
            <span className="hidden sm:inline">{invertCards ? 'Inversão ativa' : 'Inverter Resposta/Pergunta'}</span>
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

      </div>

      {/* ── CARD (preenche o espaço restante sem scroll) ── */}
      <div
        id="flashcard-flip-container"
        onClick={handleFlip}
        className="flex-1 min-h-0 cursor-pointer select-none [container-type:size]"
      >
        {!isFlipped ? (
          /* FRONT */
          <div className="w-full h-full p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-between glass-card rounded-3xl border-2 border-[#adc6ff]/20 hover:border-[#adc6ff]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#122131] text-[#adc6ff] text-xs font-mono border border-[#adc6ff]/20">
                {currentCard.topic || deck.category}
              </span>
            </div>

            <div className="my-auto text-center space-y-3 overflow-hidden">
              <p className="text-xs font-mono text-[#8c91a0] uppercase tracking-wider">Pergunta</p>
              <h3
                className="font-bold text-white leading-snug break-words"
                style={{ fontSize: responsiveFontSize(currentCard.front, 'question') }}
              >
                {currentCard.front}
              </h3>
            </div>

            <div className="text-center pt-3 border-t border-[#424754]/20 flex items-center justify-center gap-2 text-xs text-[#8c91a0] shrink-0">
              <RotateCw className="w-4 h-4 text-[#60a5fa]" /> Clique para ver a resposta
            </div>
          </div>
        ) : (
          /* BACK */
          <div className="w-full h-full p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-between rounded-3xl border-2 border-[#60a5fa]/50 bg-[#0c1e30] transition-colors">
            <div className="flex items-center justify-between shrink-0">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20 font-bold">
                Resposta
              </span>
            </div>

            <div className="my-auto space-y-3 overflow-y-auto pr-1 min-h-0">
              <div
                className="font-medium text-slate-100 whitespace-pre-line leading-relaxed"
                style={{ fontSize: responsiveFontSize(currentCard.back, 'answer') }}
              >
                {currentCard.back}
              </div>

              {/* Explicação + Exemplo — exibida automaticamente no verso do card */}
              {currentCard.explanation && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-100">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5 mb-1.5">
                    <Lightbulb className="w-4 h-4 fill-amber-300/30" /> Explicação & Exemplo
                  </div>
                  <p
                    className="leading-relaxed whitespace-pre-line"
                    style={{ fontSize: responsiveFontSize(currentCard.explanation, 'answer') }}
                  >
                    {currentCard.explanation}
                  </p>
                </div>
              )}

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

            <div className="text-center pt-2 border-t border-[#424754]/20 text-xs text-[#8c91a0] shrink-0">
              Avalie sua facilidade para calcular o intervalo SRS
            </div>
          </div>
        )}
      </div>

      {/* SM-2 Rating Controls — only after flip */}
      {isFlipped && (
        <div className="grid grid-cols-3 gap-3 shrink-0 animate-fade-in pb-1 pt-1">
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

    </div>
  );
};
