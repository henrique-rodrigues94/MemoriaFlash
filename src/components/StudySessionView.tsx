// 📁 flashmind-ai/src/components/StudySessionView.tsx
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  Flame,
  Brain,
  Target,
  Clock,
  ChevronRight,
  Zap,
  BookOpen,
  Flag,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Deck, Flashcard, RatingGrade } from '../types';
import { calculateSM2, getDueCardCount, computeDeckMastery } from '../services/srsEngine';
import { SupportedLanguage, translations } from '../lib/i18n';
import { submitStudyCardFeedback, StudyFeedbackReason } from '../services/studyCardFeedback';

const REPORT_REASONS: Array<{ value: StudyFeedbackReason; label: string }> = [
  { value: 'wrong_answer', label: 'Resposta errada' },
  { value: 'bad_explanation', label: 'Explicação incompleta ou errada' },
  { value: 'confusing_question', label: 'Pergunta confusa' },
  { value: 'duplicate_content', label: 'Conteúdo duplicado' },
  { value: 'outdated_content', label: 'Conteúdo desatualizado' },
  { value: 'other', label: 'Outro problema' },
];

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

// ─── SM-2 preview helper ──────────────────────────────────────────────────────

function previewInterval(card: Flashcard, rating: RatingGrade): string {
  const result = calculateSM2(card, rating);
  const d = result.interval;
  if (d === 0) return 'Hoje';
  if (d === 1) return '1 dia';
  if (d < 7)   return `${d} dias`;
  if (d === 7)  return '1 sem';
  if (d < 14)  return `${d} dias`;
  if (d < 30)  return `${Math.round(d / 7)} sem`;
  if (d < 60)  return `${Math.round(d / 30)} mês`;
  if (d < 365) return `${Math.round(d / 30)} meses`;
  return `${Math.round(d / 365)} ano`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionSummary {
  hardCount: number;
  correctCount: number;
  minutesStudied: number;
}

interface StudySessionViewProps {
  deck: Deck;
  currentLanguage?: SupportedLanguage;
  onFinishSession: (updatedDeck: Deck, cardsReviewedCount: number, summary: SessionSummary) => void;
  onSaveProgress?: (updatedDeck: Deck) => void;
  onBack: () => void;
}

// ─── Mastery level badge ──────────────────────────────────────────────────────

function MasteryBadge({ reps }: { reps: number }) {
  if (reps === 0) return <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 font-bold">NOVO</span>;
  if (reps === 1) return <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">APRENDENDO</span>;
  if (reps <= 3)  return <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">REVISANDO</span>;
  return               <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">DOMINADO</span>;
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

  // ── Tópicos únicos ────────────────────────────────────────────────────────
  const uniqueTopics = useMemo(() =>
    Array.from<string>(new Set<string>(
      deck.cards.map(c => String(c.topic || c.subject || deck.category || '')).filter(Boolean) as string[]
    )).sort((a: string, b: string) => a.localeCompare(b, 'pt-BR')),
    [deck.cards, deck.category]
  );

  // ── Seleção de tópicos ────────────────────────────────────────────────────
  const [selectedTopics, setSelectedTopics] = useState<string[]>(uniqueTopics);
  const [showTopicPicker, setShowTopicPicker] = useState(uniqueTopics.length > 1);

  const filteredCards = useMemo(() => {
    const base = selectedTopics.length > 0
      ? deck.cards.filter(c => selectedTopics.includes(c.topic || c.subject || deck.category))
      : deck.cards;
    const due = base.filter(c => !c.dueDate || new Date(c.dueDate) <= new Date());
    return due.length > 0 ? due : [...base];
  }, [deck.cards, deck.category, selectedTopics]);

  // ── Sessão ────────────────────────────────────────────────────────────────
  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionHardCount, setSessionHardCount] = useState(0);
  const [sessionCorrectCount, setSessionCorrectCount] = useState(0);
  const [sessionStartedAt] = useState(() => Date.now());
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [invertCards, setInvertCards] = useState(false);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [showStreakBurst, setShowStreakBurst] = useState(false);
  const [ratingHistory, setRatingHistory] = useState<RatingGrade[]>([]);
  const [isFlipping, setIsFlipping] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const [updatedCardsMap, setUpdatedCardsMap] = useState<Map<string, Flashcard>>(new Map());

  const rawCard = sessionCards[currentIndex] ?? null;
  const currentCard = rawCard && invertCards
    ? { ...rawCard, front: rawCard.back, back: rawCard.front }
    : rawCard;

  // ── Relatar problema no card ────────────────────────────────────────────
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<StudyFeedbackReason | null>(null);
  const [reportComment, setReportComment] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);

  const openReportModal = useCallback(() => {
    setReportReason(null);
    setReportComment('');
    setReportError(null);
    setReportSuccess(false);
    setShowReportModal(true);
  }, []);

  const handleSendReport = useCallback(async () => {
    if (!reportReason || !rawCard) return;
    setReportSending(true);
    setReportError(null);
    try {
      await submitStudyCardFeedback({
        reason: reportReason,
        comment: reportComment,
        card: rawCard,
        subject: deck.category || deck.title,
        deckId: deck.id,
      });
      setReportSuccess(true);
      window.setTimeout(() => setShowReportModal(false), 1400);
    } catch (err: any) {
      setReportError(err?.message || 'Não foi possível enviar o feedback.');
    } finally {
      setReportSending(false);
    }
  }, [reportReason, reportComment, rawCard, deck.category, deck.title, deck.id]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    if (showTopicPicker || sessionCompleted || !currentCard) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') { e.preventDefault(); triggerFlip(); }
      if (isFlipped) {
        if (e.key === '1') handleRate('hard');
        if (e.key === '2') handleRate('good');
        if (e.key === '3') handleRate('easy');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showTopicPicker, sessionCompleted, isFlipped, currentCard]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start session ─────────────────────────────────────────────────────────
  const handleStartStudy = useCallback(() => {
    if (!filteredCards.length) return;
    setSessionCards([...filteredCards]);
    setUpdatedCardsMap(new Map());
    setCurrentIndex(0);
    setReviewedCount(0);
    setIsFlipped(false);
    setSessionCompleted(false);
    setConsecutiveCorrect(0);
    setRatingHistory([]);
    setShowTopicPicker(false);
  }, [filteredCards]);

  useEffect(() => {
    if (!showTopicPicker && uniqueTopics.length <= 1 && sessionCards.length === 0) {
      handleStartStudy();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Flip with animation ───────────────────────────────────────────────────
  const triggerFlip = useCallback(() => {
    if (isFlipping) return;
    setIsFlipping(true);
    setTimeout(() => {
      setIsFlipped(f => !f);
      setIsFlipping(false);
    }, 150);
  }, [isFlipping]);

  // ── Rate card ─────────────────────────────────────────────────────────────
  const handleRate = useCallback((rating: RatingGrade) => {
    const originalCard = sessionCards[currentIndex];
    if (!originalCard) return;

    const sm2Result = calculateSM2(originalCard, rating);
    const updatedCard: Flashcard = { ...originalCard, ...sm2Result };

    const newMap = new Map(updatedCardsMap);
    newMap.set(updatedCard.id, updatedCard);
    setUpdatedCardsMap(newMap);

    const newReviewedCount = reviewedCount + 1;
    setReviewedCount(newReviewedCount);
    setRatingHistory(prev => [...prev, rating]);

    if (rating === 'hard') {
      setSessionHardCount(p => p + 1);
      setConsecutiveCorrect(0);
    } else {
      setSessionCorrectCount(p => p + 1);
      const newStreak = consecutiveCorrect + 1;
      setConsecutiveCorrect(newStreak);
      if (newStreak > 0 && newStreak % 5 === 0) {
        setShowStreakBurst(true);
        setTimeout(() => setShowStreakBurst(false), 1800);
      }
    }

    setIsFlipped(false);

    if (onSaveProgress) {
      const mergedCards = deck.cards.map(c => newMap.get(c.id) ?? c);
      onSaveProgress({ ...deck, cards: mergedCards });
    }

    if (currentIndex + 1 < sessionCards.length) {
      setTimeout(() => setCurrentIndex(i => i + 1), 200);
    } else {
      setTimeout(() => {
        setSessionCompleted(true);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: ['#60a5fa', '#34d399', '#a78bfa'] });
      }, 200);
    }
  }, [sessionCards, currentIndex, updatedCardsMap, reviewedCount, consecutiveCorrect, deck, onSaveProgress]);

  // ── Complete session ──────────────────────────────────────────────────────
  const handleCompleteAndReturn = useCallback(() => {
    const mergedCards = deck.cards.map(c => updatedCardsMap.get(c.id) ?? c);
    const elapsedMs = Date.now() - sessionStartedAt;
    const minutesStudied = reviewedCount > 0 ? Math.max(1, Math.round(elapsedMs / 60000)) : 0;
    onFinishSession(
      { ...deck, cards: mergedCards },
      reviewedCount,
      { hardCount: sessionHardCount, correctCount: sessionCorrectCount, minutesStudied }
    );
  }, [deck, updatedCardsMap, reviewedCount, onFinishSession, sessionStartedAt, sessionHardCount, sessionCorrectCount]);

  const handleBackRequest = () => {
    if (reviewedCount > 0) setShowExitConfirm(true);
    else onBack();
  };

  // ─── COMPLETION SCREEN ────────────────────────────────────────────────────
  if (sessionCompleted) {
    const totalReviewed = reviewedCount;
    const hardCount = ratingHistory.filter(r => r === 'hard').length;
    const goodCount = ratingHistory.filter(r => r === 'good').length;
    const easyCount = ratingHistory.filter(r => r === 'easy').length;
    const retention = totalReviewed > 0 ? Math.round(((goodCount + easyCount) / totalReviewed) * 100) : 0;
    const elapsedMs = Date.now() - sessionStartedAt;
    const minutesStudied = Math.max(1, Math.round(elapsedMs / 60000));
    const avgSecsPerCard = totalReviewed > 0 ? Math.round(elapsedMs / 1000 / totalReviewed) : 0;

    // Próximos cards a revisar
    const mergedCards = deck.cards.map(c => updatedCardsMap.get(c.id) ?? c);
    const dueCount = getDueCardCount(mergedCards);

    const retentionColor = retention >= 80 ? 'text-emerald-400' : retention >= 50 ? 'text-amber-400' : 'text-rose-400';
    const retentionBg    = retention >= 80 ? 'bg-emerald-500/10 border-emerald-500/30' : retention >= 50 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-rose-500/10 border-rose-500/30';

    return (
      <div className="max-w-xl mx-auto py-8 px-4 space-y-5 animate-fade-in">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-2xl shadow-emerald-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-[#0b1a2a] rounded-[23px] flex items-center justify-center">
              <Award className="w-10 h-10 text-emerald-400" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white">Sessão Concluída! 🎉</h2>
            <p className="text-sm text-slate-400 mt-1">
              {totalReviewed} card{totalReviewed !== 1 ? 's' : ''} revisados em {minutesStudied} min
            </p>
          </div>
        </div>

        {/* Retenção destaque */}
        <div className={`rounded-2xl border p-4 text-center ${retentionBg}`}>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Retenção da Sessão</p>
          <p className={`text-5xl font-extrabold ${retentionColor}`}>{retention}%</p>
          <p className="text-xs text-slate-500 mt-1">
            {retention >= 80 ? '🔥 Excelente domínio!' : retention >= 50 ? '📈 Continue praticando' : '💪 Foque nos difíceis'}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#122131] border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Target className="w-3.5 h-3.5" /> Distribuição
            </div>
            <div className="flex items-end gap-2 mt-2">
              <div className="text-center">
                <div className="text-base font-extrabold text-rose-400">{hardCount}</div>
                <div className="text-[9px] text-rose-400/60 uppercase">Difícil</div>
              </div>
              <div className="text-center">
                <div className="text-base font-extrabold text-blue-400">{goodCount}</div>
                <div className="text-[9px] text-blue-400/60 uppercase">Bom</div>
              </div>
              <div className="text-center">
                <div className="text-base font-extrabold text-emerald-400">{easyCount}</div>
                <div className="text-[9px] text-emerald-400/60 uppercase">Fácil</div>
              </div>
            </div>
            {/* Mini bar */}
            {totalReviewed > 0 && (
              <div className="flex h-1.5 rounded-full overflow-hidden mt-2 gap-0.5">
                {hardCount > 0 && <div className="bg-rose-500 rounded-full" style={{ width: `${(hardCount/totalReviewed)*100}%` }} />}
                {goodCount > 0 && <div className="bg-blue-500 rounded-full" style={{ width: `${(goodCount/totalReviewed)*100}%` }} />}
                {easyCount > 0 && <div className="bg-emerald-500 rounded-full" style={{ width: `${(easyCount/totalReviewed)*100}%` }} />}
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-[#122131] border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" /> Tempo
            </div>
            <div>
              <div className="text-xl font-extrabold text-white">{minutesStudied} min</div>
              <div className="text-[11px] text-slate-500">~{avgSecsPerCard}s por card</div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-violet-300">
              <Flame className="w-3.5 h-3.5" />
              {consecutiveCorrect > 0 ? `Streak máx: ${consecutiveCorrect}` : 'Foco total'}
            </div>
          </div>
        </div>

        {/* Progresso do deck */}
        <div className="p-4 rounded-2xl bg-[#122131] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Brain className="w-3.5 h-3.5" /> Domínio do Deck
            </div>
            <span className="text-xs font-bold text-violet-300">{computeDeckMastery(mergedCards)}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-violet-500 to-purple-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${computeDeckMastery(mergedCards)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {dueCount > 0
              ? `${dueCount} card${dueCount !== 1 ? 's' : ''} para revisar hoje`
              : 'Tudo em dia! 🎯'}
          </p>
        </div>

        {/* Botão concluir */}
        <button
          id="btn-finish-study-session"
          onClick={handleCompleteAndReturn}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
      </div>
    );
  }

  // ─── TOPIC PICKER ─────────────────────────────────────────────────────────
  if (showTopicPicker) {
    const allSelected = selectedTopics.length === uniqueTopics.length;
    const previewCount = filteredCards.length;
    const dueTotal = getDueCardCount(
      deck.cards.filter(c => selectedTopics.includes(c.topic || c.subject || deck.category))
    );

    return (
      <div className="max-w-xl mx-auto py-8 px-4 space-y-5 animate-fade-in">
        {/* Nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-[#122131] text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-xs font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <span className="text-[10px] font-mono text-slate-500 truncate max-w-[160px]">{deck.title}</span>
        </div>

        {/* Hero */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border border-blue-500/20 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="text-xl font-extrabold text-white">Escolha os Tópicos</h2>
          <p className="text-sm text-slate-400">
            Filtre o que revisar em <strong className="text-blue-300">{deck.title}</strong>
          </p>
        </div>

        {/* Select all toggle */}
        <button
          onClick={() => setSelectedTopics(allSelected ? [] : [...uniqueTopics])}
          className="w-full py-2.5 rounded-xl bg-[#122131] border border-blue-500/20 text-blue-300 text-xs font-bold hover:bg-[#1c2b3c] transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <CheckCircle2 className={`w-3.5 h-3.5 ${allSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
          {allSelected ? 'Todos selecionados — clique para desmarcar' : 'Selecionar todos os tópicos'}
        </button>

        {/* Topics list */}
        <div className="space-y-2">
          {uniqueTopics.map(topic => {
            const isSelected = selectedTopics.includes(topic);
            const topicCards = deck.cards.filter(c => (c.topic || c.subject || deck.category) === topic);
            const totalCount = topicCards.length;
            const dueCount = getDueCardCount(topicCards);
            const mastery = computeDeckMastery(topicCards);
            const masteryColor = mastery >= 70 ? 'bg-emerald-500' : mastery >= 40 ? 'bg-blue-500' : 'bg-amber-500';

            return (
              <button
                key={topic}
                onClick={() => setSelectedTopics(prev =>
                  isSelected ? prev.filter(t => t !== topic) : [...prev, topic]
                )}
                className={`w-full p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-blue-600/10 border-blue-500/40'
                    : 'bg-[#122131]/70 border-slate-700/40 hover:border-blue-500/30'
                }`}
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                  isSelected ? 'bg-blue-600 border-blue-500' : 'border-slate-600'
                }`}>
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{topic}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-slate-500">{totalCount} card{totalCount !== 1 ? 's' : ''}</span>
                    {dueCount > 0 && (
                      <span className="text-[11px] text-amber-400 font-bold flex items-center gap-0.5">
                        <Zap className="w-3 h-3" /> {dueCount} pendente{dueCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {/* Mastery bar */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${masteryColor} rounded-full transition-all`} style={{ width: `${mastery}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-500">{mastery}%</span>
                  </div>
                </div>

                <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-blue-400 rotate-90' : 'text-slate-600'}`} />
              </button>
            );
          })}
        </div>

        {/* Preview + start */}
        {selectedTopics.length > 0 && (
          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              <span className="text-white font-bold">{previewCount}</span> cards selecionados
              {dueTotal > 0 && <span className="text-amber-400 ml-1">· {dueTotal} pendentes</span>}
            </span>
          </div>
        )}

        <button
          onClick={handleStartStudy}
          disabled={selectedTopics.length === 0}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {selectedTopics.length === 0
            ? 'Selecione ao menos 1 tópico'
            : <><Sparkles className="w-4 h-4" /> Começar Estudo ({previewCount} card{previewCount !== 1 ? 's' : ''})</>}
        </button>
      </div>
    );
  }

  // ─── STUDY SESSION ────────────────────────────────────────────────────────
  if (!currentCard) return null;

  const progressPercent = Math.round(((currentIndex + 1) / sessionCards.length) * 100);
  const hardPreview = rawCard ? previewInterval(rawCard, 'hard') : '';
  const goodPreview = rawCard ? previewInterval(rawCard, 'good') : '';
  const easyPreview = rawCard ? previewInterval(rawCard, 'easy') : '';

  return (
    <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto h-[100dvh] flex flex-col gap-3 sm:gap-4 overflow-hidden animate-fade-in px-3 sm:px-6 py-3">

      {/* Streak burst overlay */}
      {showStreakBurst && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 animate-bounce">
            <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-violet-600/90 border border-violet-400/50 shadow-2xl shadow-violet-500/40 backdrop-blur-sm">
              <Flame className="w-6 h-6 text-orange-300" />
              <span className="text-white font-extrabold text-lg">{consecutiveCorrect} em sequência!</span>
              <Flame className="w-6 h-6 text-orange-300" />
            </div>
          </div>
        </div>
      )}

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
              <p className="text-xs text-slate-400 mt-1">
                Você revisou <strong className="text-blue-300">{reviewedCount} cartão{reviewedCount !== 1 ? 's' : ''}</strong>.
                O progresso já foi salvo automaticamente.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#122131] text-slate-300 text-xs font-bold border border-slate-700 hover:bg-[#1c2b3c] transition-all cursor-pointer"
              >
                Continuar
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

      {/* Relatar problema modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#0b1a2a] border border-rose-500/30 rounded-3xl p-6 space-y-4 shadow-2xl">
            {reportSuccess ? (
              <div className="text-center py-3">
                <p className="text-base font-extrabold text-white">✓ Feedback enviado</p>
                <p className="text-xs text-slate-400 mt-1">Obrigado. O problema foi registrado para revisão do conteúdo.</p>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-base font-extrabold text-white">Relatar problema neste card</h3>
                  <p className="text-[11px] text-slate-400 mt-1">O card atual, matéria, tópico e nível serão enviados junto com seu relato para correção.</p>
                </div>
                <div className="grid gap-2">
                  {REPORT_REASONS.map(reason => (
                    <button
                      key={reason.value}
                      type="button"
                      onClick={() => setReportReason(reason.value)}
                      className={`w-full py-2.5 px-3 text-left rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        reportReason === reason.value
                          ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                          : 'bg-[#122131] border-slate-700/40 text-slate-300'
                      }`}
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reportComment}
                  onChange={e => setReportComment(e.target.value.slice(0, 500))}
                  placeholder="Explique o problema (opcional)..."
                  className="w-full min-h-[80px] rounded-xl border border-slate-700/40 bg-[#081522] text-slate-200 p-3 text-xs outline-none resize-vertical"
                />
                {reportError && <p className="text-[11px] text-rose-400">{reportError}</p>}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-[#122131] text-slate-300 text-xs font-bold border border-slate-700 hover:bg-[#1c2b3c] transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!reportReason || reportSending}
                    onClick={() => void handleSendReport()}
                    className="flex-1 py-2.5 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30 hover:bg-rose-500/30 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    {reportSending ? 'Enviando...' : 'Enviar feedback'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2.5 shrink-0 pt-2">
        <div className="flex items-center justify-between">
          <button
            id="btn-back-to-dashboard"
            onClick={handleBackRequest}
            className="p-2 rounded-xl bg-[#122131] text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Sair
          </button>

          {/* Center: streak */}
          <div className="flex items-center gap-2">
            {consecutiveCorrect >= 3 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/30">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-bold text-orange-300">{consecutiveCorrect}</span>
              </div>
            )}
          </div>

          {/* Ações fixas no topo: relatar problema + inverter pergunta/resposta */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={openReportModal}
              title="Relatar problema neste card"
              aria-label="Relatar problema neste card"
              className="p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-[#122131] border-slate-700/40 text-slate-500 hover:border-rose-500/40 hover:text-rose-300"
            >
              <Flag className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Relatar</span>
            </button>

            <button
              type="button"
              onClick={() => { setInvertCards(prev => !prev); setIsFlipped(false); }}
              title="Inverter pergunta e resposta do card"
              aria-label={invertCards ? 'Cartão invertido: pergunta e resposta trocadas. Toque para voltar ao normal' : 'Inverter pergunta e resposta do card'}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                invertCards
                  ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                  : 'bg-[#122131] border-slate-700/40 text-slate-500 hover:border-violet-500/40 hover:text-violet-300'
              }`}
            >
              <RotateCw className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">{invertCards ? 'Invertido' : 'Inverter'}</span>
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-500">
            <span>{currentIndex + 1} / {sessionCards.length}</span>
            <div className="flex items-center gap-3">
              {sessionHardCount > 0 && <span className="text-rose-400">{sessionHardCount} ✗</span>}
              {sessionCorrectCount > 0 && <span className="text-emerald-400">{sessionCorrectCount} ✓</span>}
              <span className="text-blue-300 font-bold">{progressPercent}%</span>
            </div>
          </div>
          <div className="w-full bg-[#122131] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Rating dots history */}
          {ratingHistory.length > 0 && (
            <div className="flex gap-0.5 overflow-hidden">
              {ratingHistory.slice(-30).map((r, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 min-w-[4px] rounded-full ${
                    r === 'easy' ? 'bg-emerald-500' : r === 'good' ? 'bg-blue-500' : 'bg-rose-500'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Keyboard hint — desktop only */}
        <p className="hidden sm:block text-[10px] text-slate-700 text-center font-mono">
          Espaço: virar &nbsp;·&nbsp; 1 Difícil &nbsp;·&nbsp; 2 Bom &nbsp;·&nbsp; 3 Fácil
        </p>
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        id="flashcard-flip-container"
        onClick={triggerFlip}
        style={{ perspective: '1200px' }}
        className="flex-1 min-h-0 cursor-pointer select-none [container-type:size] relative"
      >
        <div
          className="w-full h-full transition-all duration-300"
          style={{
            transform: isFlipping ? 'rotateY(90deg)' : 'rotateY(0deg)',
            transformOrigin: 'center',
          }}
        >
          {!isFlipped ? (
            /* FRENTE */
            <div className="w-full h-full p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-between glass-card rounded-3xl border-2 border-blue-300/20 hover:border-blue-300/40 transition-colors">
              <div className="flex items-center justify-between shrink-0">
                <span className="px-3 py-1 rounded-full bg-[#122131] text-blue-300 text-xs font-mono border border-blue-300/20 truncate max-w-[60%]">
                  {currentCard.topic || deck.category}
                </span>
                <MasteryBadge reps={rawCard?.reps ?? 0} />
              </div>

              <div className="my-auto text-center space-y-3 overflow-hidden">
                <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                  {invertCards ? 'Resposta' : 'Pergunta'}
                </p>
                <h3
                  className="font-bold text-white leading-snug break-words"
                  style={{ fontSize: responsiveFontSize(currentCard.front, 'question') }}
                >
                  {currentCard.front}
                </h3>
              </div>

              <div className="text-center pt-3 border-t border-slate-800/60 flex items-center justify-center gap-2 text-xs text-slate-500 shrink-0">
                <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                Toque para ver a {invertCards ? 'pergunta' : 'resposta'}
              </div>
            </div>
          ) : (
            /* VERSO */
            <div className="w-full h-full p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-between rounded-3xl border-2 border-blue-400/50 bg-[#0c1e30] transition-colors">
              <div className="flex items-center justify-between shrink-0">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20 font-bold">
                  {invertCards ? 'Pergunta' : 'Resposta'}
                </span>
                <MasteryBadge reps={rawCard?.reps ?? 0} />
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
                    <div className="font-bold text-amber-300 flex items-center gap-1.5 mb-1.5 text-sm">
                      <Lightbulb className="w-4 h-4 fill-amber-300/30" /> Explicação
                    </div>
                    <p
                      className="leading-relaxed whitespace-pre-line text-sm"
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

              <div className="text-center pt-2 border-t border-slate-800/60 text-[11px] text-slate-600 shrink-0">
                Como foi sua lembrança? Avalie abaixo
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rating buttons */}
      {isFlipped && (
        <div className="grid grid-cols-3 gap-2.5 shrink-0 animate-fade-in pb-2">
          {/* DIFÍCIL */}
          <button
            id="rate-btn-hard"
            onClick={() => handleRate('hard')}
            className="p-3 sm:p-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group active:scale-95"
          >
            <XCircle className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-extrabold">DIFÍCIL</span>
            <span className="text-[10px] font-mono text-rose-400/60 bg-rose-500/10 px-1.5 py-0.5 rounded">
              {hardPreview}
            </span>
          </button>

          {/* BOM */}
          <button
            id="rate-btn-good"
            onClick={() => handleRate('good')}
            className="p-3 sm:p-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group active:scale-95"
          >
            <RotateCw className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-extrabold">BOM</span>
            <span className="text-[10px] font-mono text-blue-400/60 bg-blue-500/10 px-1.5 py-0.5 rounded">
              {goodPreview}
            </span>
          </button>

          {/* FÁCIL */}
          <button
            id="rate-btn-easy"
            onClick={() => handleRate('easy')}
            className="p-3 sm:p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group active:scale-95"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-extrabold">FÁCIL</span>
            <span className="text-[10px] font-mono text-emerald-400/60 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              {easyPreview}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
