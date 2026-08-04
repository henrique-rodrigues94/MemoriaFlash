// 📁 flashmind-ai/src/components/StudySessionView.tsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { calculateSM2, getDueCardCount } from '../services/srsEngine';
import { SupportedLanguage, translations } from '../lib/i18n';

// ─── Font size helper ─────────────────────────────────────────────────────────

function responsiveFontSize(text: string, kind: 'question' | 'answer' = 'question'): string {
  const len = (text || '').length;
  const isQ = kind === 'question';

  let basePx: number, maxPx: number, minPx: number, sizeCqh: number;
  if (len <= 70)        { basePx = isQ ? 40 : 28; sizeCqh = isQ ? 6.5 : 4.6; maxPx = isQ ? 46 : 34; minPx = isQ ? 16 : 13; }
  else if (len <= 120)  { basePx = isQ ? 36 : 25; sizeCqh = isQ ? 5.8 : 4.0; maxPx = isQ ? 42 : 31; minPx = isQ ? 15 : 13; }
  else if (len <= 200)  { basePx = isQ ? 32 : 22; sizeCqh = isQ ? 5.0 : 3.5; maxPx = isQ ? 38 : 27; minPx = isQ ? 14 : 12; }
  else if (len <= 320)  { basePx = isQ ? 27 : 19; sizeCqh = isQ ? 4.2 : 3.0; maxPx = isQ ? 32 : 24; minPx = isQ ? 13 : 12; }
  else                  { basePx = isQ ? 23 : 17; sizeCqh = isQ ? 3.4 : 2.6; maxPx = isQ ? 27 : 21; minPx = isQ ? 12 : 11; }

  return `clamp(${minPx}px, min(${basePx}px, ${sizeCqh}cqh), ${maxPx}px)`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudySessionViewProps {
  deck: Deck;
  currentLanguage?: SupportedLanguage;
  onFinishSession: (updatedDeck: Deck, cardsReviewedCount: number) => void;
  onSaveProgress?: (updatedDeck: Deck) => void;
  onBack: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const StudySessionView: React.FC<StudySessionViewProps> = ({
  deck,
  currentLanguage = 'pt',
  onFinishSession,
  onSaveProgress,
  onBack,
}) => {
  const t = translations[currentLanguage] || translations.pt;

  // ── Tópicos únicos do baralho ─────────────────────────────────────────────
  const uniqueTopics = useMemo(() =>
    Array.from(new Set(
      deck.cards.map(c => c.topic || c.subject || deck.category).filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [deck.cards, deck.category]
  );

  // ── Estado da seleção de tópicos ──────────────────────────────────────────
  const [selectedTopics, setSelectedTopics] = useState<string[]>(uniqueTopics);
  const [showTopicPicker, setShowTopicPicker] = useState(uniqueTopics.length > 1);

  // Cards filtrados pelos tópicos selecionados (recomputa ao trocar seleção)
  const filteredCards = useMemo(() => {
    const base = selectedTopics.length > 0
      ? deck.cards.filter(c => selectedTopics.includes(c.topic || c.subject || deck.category))
      : deck.cards;
    const due = base.filter(c => !c.dueDate || new Date(c.dueDate) <= new Date());
    return due.length > 0 ? due : [...base];
  }, [deck.cards, deck.category, selectedTopics]);

  // ── Sessão ────────────────────────────────────────────────────────────────
  // `sessionCards` é a fila de cards da sessão em curso — só é definida no início
  // (handleStartStudy). Não recalcula automaticamente para não reiniciar a sessão.
  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Inverte pergunta/resposta durante a revisão (só visual — não altera dados)
  const [invertCards, setInvertCards] = useState(false);

  // ── Mapa de cards atualizados (id → card) — acumula mudanças de SM-2 ─────
  // Separar do array de exibição evita re-renderizações desnecessárias e
  // torna o merge final com deck.cards simples e correto.
  const [updatedCardsMap, setUpdatedCardsMap] = useState<Map<string, Flashcard>>(new Map());

  // Card atual (com inversão visual se ativa, mas usando id original para lookup)
  const rawCard = sessionCards[currentIndex] ?? null;
  const currentCard = rawCard && invertCards
    ? { ...rawCard, front: rawCard.back, back: rawCard.front }
    : rawCard;

  // ── Keyboard shortcut: Espaço → virar; 1/2/3 → avaliar ──────────────────
  useEffect(() => {
    if (showTopicPicker || sessionCompleted || !currentCard) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') { e.preventDefault(); setIsFlipped(f => !f); }
      if (isFlipped) {
        if (e.key === '1') handleRate('hard');
        if (e.key === '2') handleRate('good');
        if (e.key === '3') handleRate('easy');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showTopicPicker, sessionCompleted, isFlipped, currentCard]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Inicia sessão com os cards filtrados ──────────────────────────────────
  const handleStartStudy = useCallback(() => {
    if (!filteredCards.length) return;
    setSessionCards([...filteredCards]);
    setUpdatedCardsMap(new Map());
    setCurrentIndex(0);
    setReviewedCount(0);
    setIsFlipped(false);
    setSessionCompleted(false);
    setShowTopicPicker(false);
  }, [filteredCards]);

  // Se há apenas 1 tópico (ou nenhum), pula o picker e inicia direto
  useEffect(() => {
    if (!showTopicPicker && uniqueTopics.length <= 1 && sessionCards.length === 0) {
      handleStartStudy();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Avalia card e avança ───────────────────────────────────────────────────
  const handleRate = useCallback((rating: RatingGrade) => {
    // Usa o card ORIGINAL (não invertido) para calcular SM-2 e persistir
    const originalCard = sessionCards[currentIndex];
    if (!originalCard) return;

    const sm2Result = calculateSM2(originalCard, rating);
    const updatedCard: Flashcard = { ...originalCard, ...sm2Result };

    // Atualiza o mapa de mudanças
    const newMap = new Map(updatedCardsMap);
    newMap.set(updatedCard.id, updatedCard);
    setUpdatedCardsMap(newMap);

    const newReviewedCount = reviewedCount + 1;
    setReviewedCount(newReviewedCount);
    setIsFlipped(false);

    // Salva progresso incremental: merge do mapa com o deck original
    if (onSaveProgress) {
      const mergedCards = deck.cards.map(c => newMap.get(c.id) ?? c);
      onSaveProgress({ ...deck, cards: mergedCards });
    }

    if (currentIndex + 1 < sessionCards.length) {
      setCurrentIndex(i => i + 1);
    } else {
      setSessionCompleted(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  }, [sessionCards, currentIndex, updatedCardsMap, reviewedCount, deck, onSaveProgress]);

  // ── Conclui sessão e retorna ───────────────────────────────────────────────
  // CORREÇÃO: não inverte front/back nos dados persistidos — a inversão é
  // apenas visual durante a revisão. Salvar invertido destruiria o deck.
  const handleCompleteAndReturn = useCallback(() => {
    const mergedCards = deck.cards.map(c => updatedCardsMap.get(c.id) ?? c);
    onFinishSession({ ...deck, cards: mergedCards }, reviewedCount);
  }, [deck, updatedCardsMap, reviewedCount, onFinishSession]);

  const handleBackRequest = () => {
    if (reviewedCount > 0) setShowExitConfirm(true);
    else onBack();
  };

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  // ── Tela de conclusão ─────────────────────────────────────────────────────
  if (sessionCompleted) {
    // Estatísticas rápidas da sessão
    const easyCount = Array.from(updatedCardsMap.values()).filter(c => c.interval >= 6).length;
    const hardCount = Array.from(updatedCardsMap.values()).filter(c => c.interval <= 1 && c.reps === 0).length;
    const goodCount = reviewedCount - easyCount - hardCount;

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
            Você revisou <strong className="text-[#adc6ff]">{reviewedCount} cartão{reviewedCount !== 1 ? 's' : ''}</strong> e atualizou os intervalos SM-2.
          </p>
        </div>

        {/* Resumo da sessão */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
            <div className="text-lg font-extrabold text-rose-400">{hardCount}</div>
            <div className="text-[10px] text-rose-400/70 uppercase tracking-wide mt-0.5">Difícil</div>
          </div>
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
            <div className="text-lg font-extrabold text-blue-400">{goodCount}</div>
            <div className="text-[10px] text-blue-400/70 uppercase tracking-wide mt-0.5">Bom</div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <div className="text-lg font-extrabold text-emerald-400">{easyCount}</div>
            <div className="text-[10px] text-emerald-400/70 uppercase tracking-wide mt-0.5">Fácil</div>
          </div>
        </div>

        <button
          id="btn-finish-study-session"
          onClick={handleCompleteAndReturn}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-all cursor-pointer"
        >
          Voltar para Estudo
        </button>
      </div>
    );
  }

  // ── Tela de seleção de tópicos ────────────────────────────────────────────
  if (showTopicPicker) {
    const allSelected = selectedTopics.length === uniqueTopics.length;
    // Recalcula em tempo real quantos cards serão estudados com a seleção atual
    const previewCount = filteredCards.length;

    return (
      <div className="max-w-xl mx-auto py-8 px-4 text-center space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
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
            Selecione quais tópicos estudar em <strong className="text-[#adc6ff]">{deck.title}</strong>.
          </p>
        </div>

        <button
          onClick={() => setSelectedTopics(allSelected ? [] : [...uniqueTopics])}
          className="w-full py-2.5 rounded-xl bg-[#122131] border border-[#adc6ff]/30 text-[#adc6ff] text-xs font-bold hover:bg-[#1c2b3c] transition-colors cursor-pointer"
        >
          {allSelected ? '✓ Todos selecionados' : 'Selecionar todos'}
        </button>

        <div className="space-y-2 text-left">
          {uniqueTopics.map(topic => {
            const isSelected = selectedTopics.includes(topic);
            const totalCount = deck.cards.filter(c => (c.topic || c.subject || deck.category) === topic).length;
            const dueCount = getDueCardCount(
              deck.cards.filter(c => (c.topic || c.subject || deck.category) === topic)
            );
            return (
              <button
                key={topic}
                onClick={() => setSelectedTopics(prev =>
                  isSelected ? prev.filter(t => t !== topic) : [...prev, topic]
                )}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
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
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-[#8c91a0]">{totalCount} card{totalCount !== 1 ? 's' : ''}</span>
                  {dueCount > 0 && (
                    <span className="block text-[10px] font-mono text-amber-400">{dueCount} pendente{dueCount !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleStartStudy}
          disabled={selectedTopics.length === 0}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {selectedTopics.length === 0
            ? 'Selecione ao menos 1 tópico'
            : `Começar Estudo (${previewCount} card${previewCount !== 1 ? 's' : ''})`}
        </button>
      </div>
    );
  }

  // ── Sessão principal ──────────────────────────────────────────────────────
  if (!currentCard) return null;

  const progressPercent = Math.round(((currentIndex + 1) / sessionCards.length) * 100);

  return (
    <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto h-[100dvh] flex flex-col gap-4 sm:gap-5 overflow-hidden animate-fade-in px-3 sm:px-6 py-3">

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
                O progresso já foi salvo automaticamente.
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
                onClick={() => { setShowExitConfirm(false); handleCompleteAndReturn(); }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 hover:bg-amber-500/30 transition-all cursor-pointer"
              >
                Sair e Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header + progresso */}
      <div className="flex flex-col gap-3 shrink-0 pt-3">
        <div className="flex items-center justify-between">
          <button
            id="btn-back-to-dashboard"
            onClick={handleBackRequest}
            className="p-2 rounded-xl bg-[#122131] text-[#c2c6d6] hover:text-white transition-colors flex items-center gap-2 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Sair da Sessão
          </button>

          {/* Botão de inversão — só visual, sem alterar dados */}
          <button
            type="button"
            onClick={() => { setInvertCards(prev => !prev); setIsFlipped(false); }}
            title={invertCards ? 'Desativar inversão' : 'Inverter pergunta/resposta (visual)'}
            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              invertCards
                ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                : 'bg-[#122131] border-[#424754]/40 text-[#8c91a0] hover:border-violet-500/40 hover:text-violet-300'
            }`}
          >
            <RotateCw className={`w-4 h-4 ${invertCards ? 'text-violet-400' : ''}`} />
            <span className="hidden sm:inline">{invertCards ? 'Inversão ativa' : 'Inverter P/R'}</span>
          </button>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono text-[#8c91a0]">
            <span>Cartão {currentIndex + 1} de {sessionCards.length}</span>
            <span className="text-[#adc6ff] font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-[#122131] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Dica de teclado — só desktop */}
        <p className="hidden sm:block text-[10px] text-[#424754] text-center font-mono">
          Espaço: virar &nbsp;·&nbsp; 1 Difícil &nbsp;·&nbsp; 2 Bom &nbsp;·&nbsp; 3 Fácil
        </p>
      </div>

      {/* Card (preenche espaço restante) */}
      <div
        id="flashcard-flip-container"
        onClick={handleFlip}
        className="flex-1 min-h-0 cursor-pointer select-none [container-type:size]"
      >
        {!isFlipped ? (
          /* FRENTE */
          <div className="w-full h-full p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-between glass-card rounded-3xl border-2 border-[#adc6ff]/20 hover:border-[#adc6ff]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#122131] text-[#adc6ff] text-xs font-mono border border-[#adc6ff]/20">
                {currentCard.topic || deck.category}
              </span>
            </div>
            <div className="my-auto text-center space-y-3 overflow-hidden">
              <p className="text-xs font-mono text-[#8c91a0] uppercase tracking-wider">
                {invertCards ? 'Resposta' : 'Pergunta'}
              </p>
              <h3
                className="font-bold text-white leading-snug break-words"
                style={{ fontSize: responsiveFontSize(currentCard.front, 'question') }}
              >
                {currentCard.front}
              </h3>
            </div>
            <div className="text-center pt-3 border-t border-[#424754]/20 flex items-center justify-center gap-2 text-xs text-[#8c91a0] shrink-0">
              <RotateCw className="w-4 h-4 text-[#60a5fa]" /> Clique para ver a {invertCards ? 'pergunta' : 'resposta'}
            </div>
          </div>
        ) : (
          /* VERSO */
          <div className="w-full h-full p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-between rounded-3xl border-2 border-[#60a5fa]/50 bg-[#0c1e30] transition-colors">
            <div className="flex items-center justify-between shrink-0">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20 font-bold">
                {invertCards ? 'Pergunta' : 'Resposta'}
              </span>
            </div>
            <div className="my-auto space-y-3 overflow-y-auto pr-1 min-h-0">
              <div
                className="font-medium text-slate-100 whitespace-pre-line leading-relaxed"
                style={{ fontSize: responsiveFontSize(currentCard.back, 'answer') }}
              >
                {currentCard.back}
              </div>
              {currentCard.explanation && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-100">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5 mb-1.5">
                    <Lightbulb className="w-4 h-4 fill-amber-300/30" /> Explicação & Curiosidade
                  </div>
                  <p
                    className="leading-relaxed whitespace-pre-line"
                    style={{ fontSize: responsiveFontSize(currentCard.explanation, 'answer') }}
                  >
                    {currentCard.explanation}
                  </p>
                </div>
              )}
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

      {/* Botões de avaliação SM-2 */}
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
            <span className="text-[10px] font-normal text-[#60a5fa]/70 font-mono">Manter ritmo</span>
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
