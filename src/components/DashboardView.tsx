// 📁 flashmind-ai/src/components/DashboardView.tsx
import React, { useMemo } from 'react';
import {
  Brain,
  Sparkles,
  ChevronRight,
  Play,
  Plus,
  RotateCw,
  Flame,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import { Deck, UserStats, ActiveTab } from '../types';
import { DeckCard } from './DeckCard';
import { SupportedLanguage, translations } from '../lib/i18n';
import { getDueCardCount } from '../services/srsEngine';
import { isStreakAtRiskToday } from '../services/studyStreak';
import { getLastStudiedDeck } from '../services/storage';

interface DashboardViewProps {
  stats: UserStats;
  decks: Deck[];
  currentLanguage: SupportedLanguage;
  onOpenLanguageSelector: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  onStartStudySession: (deck: Deck) => void;
  onManageDeck: (deck: Deck) => void;
  onOpenQuickCreate: () => void;
  onOpenAdMob: () => void;
  onOpenSubscription: () => void;
  onOpenReferral?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  decks,
  currentLanguage,
  setActiveTab,
  onStartStudySession,
  onManageDeck,
}) => {
  const t = translations[currentLanguage] || translations.pt;

  // ── Computações derivadas dos decks ─────────────────────────────────────────
  const decksWithCards = useMemo(() => decks.filter(d => d.cards.length > 0), [decks]);

  // Deck com mais cards vencidos hoje (o mais urgente para estudar)
  const urgentDeck = useMemo(() => {
    if (!decksWithCards.length) return null;
    return decksWithCards
      .map(d => ({ deck: d, due: getDueCardCount(d.cards) }))
      .filter(({ due }) => due > 0)
      .sort((a, b) => b.due - a.due)[0]?.deck ?? null;
  }, [decksWithCards]);

  // Deck em progresso: tem pelo menos 1 card já revisado (reps > 0).
  // Prioriza o último deck efetivamente estudado (localStorage) — só cai para
  // "o primeiro deck com progresso encontrado" se esse último não existir mais
  // ou não tiver progresso registrado.
  const inProgressDeck = useMemo(() => {
    const decksInProgress = decksWithCards.filter(d => d.cards.some(c => (c.reps || 0) > 0));
    if (!decksInProgress.length) return null;
    const lastId = getLastStudiedDeck();
    const lastDeck = lastId ? decksInProgress.find(d => d.id === lastId) : null;
    return lastDeck ?? decksInProgress[0];
  }, [decksWithCards]);

  // Deck para começar: nunca estudado
  const freshDeck = useMemo(() =>
    decksWithCards.find(d => d.cards.every(c => !c.reps || c.reps === 0)) ?? null,
    [decksWithCards]
  );

  // Total de cards vencidos em todos os decks
  const totalDueCards = useMemo(
    () => decksWithCards.reduce((sum, d) => sum + getDueCardCount(d.cards), 0),
    [decksWithCards]
  );

  // Estado do streak
  const streakAtRisk = isStreakAtRiskToday(stats);
  const streakDays = stats.streakDays || 0;

  // Deck recomendado para o CTA principal: urgente → em progresso → novo
  const recommendedDeck = urgentDeck ?? inProgressDeck ?? freshDeck;

  // Estado do CTA principal
  const ctaState: 'empty' | 'fresh' | 'resume' | 'urgent' =
    !decksWithCards.length ? 'empty'
    : urgentDeck ? 'urgent'
    : inProgressDeck ? 'resume'
    : 'fresh';

  // ── Render CTA ──────────────────────────────────────────────────────────────
  const renderStudyCTA = () => {
    if (ctaState === 'empty') {
      return (
        <div className="p-3.5 rounded-xl bg-[#0b1a2a]/80 border border-[#60a5fa]/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-[#60a5fa]" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#60a5fa] font-bold">
                Nenhum card ainda
              </span>
              <p className="text-xs text-slate-300 truncate mt-0.5">
                Gere seus primeiros flashcards com IA
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('cards')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Criar Card
          </button>
        </div>
      );
    }

    if (ctaState === 'urgent' && urgentDeck) {
      const due = getDueCardCount(urgentDeck.cards);
      return (
        <div className="p-3.5 rounded-xl bg-[#0b1a2a]/80 border border-amber-500/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-amber-400" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                {due} card{due !== 1 ? 's' : ''} para revisar
              </span>
              <p className="text-xs font-semibold text-white truncate mt-0.5">
                {urgentDeck.title}
              </p>
            </div>
          </div>
          <button
            onClick={() => onStartStudySession(urgentDeck)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Revisar
          </button>
        </div>
      );
    }

    if (ctaState === 'resume' && inProgressDeck) {
      return (
        <div className="p-3.5 rounded-xl bg-[#0b1a2a]/80 border border-emerald-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <RotateCw className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                Continuar estudando
              </span>
              <p className="text-xs font-semibold text-white truncate mt-0.5">
                {inProgressDeck.title}
              </p>
            </div>
          </div>
          <button
            onClick={() => onStartStudySession(inProgressDeck)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Continuar
          </button>
        </div>
      );
    }

    // fresh
    if (freshDeck) {
      return (
        <div className="p-3.5 rounded-xl bg-[#0b1a2a]/80 border border-[#60a5fa]/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <Play className="w-4 h-4 text-blue-400 fill-current" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">
                Novo baralho
              </span>
              <p className="text-xs font-semibold text-white truncate mt-0.5">
                {freshDeck.title}
              </p>
            </div>
          </div>
          <button
            onClick={() => onStartStudySession(freshDeck)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Começar
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">

      {/* ── Banner principal ─────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-[#122238] via-[#1a2e48] to-[#122238] rounded-2xl p-5 border border-[#60a5fa]/30 shadow-xl flex flex-col gap-4">

        {/* Streak + cards vencidos */}
        {decksWithCards.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            {/* Streak */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
              streakAtRisk
                ? 'bg-rose-500/10 border-rose-500/30'
                : streakDays > 0
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-[#0b1a2a]/60 border-[#424754]/30'
            }`}>
              {streakAtRisk
                ? <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                : <Flame className={`w-4 h-4 shrink-0 ${streakDays > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
              }
              <div>
                <p className={`text-xs font-bold ${streakAtRisk ? 'text-rose-300' : streakDays > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                  {streakAtRisk
                    ? 'Sequência em risco!'
                    : streakDays > 0
                      ? `${streakDays} dia${streakDays !== 1 ? 's' : ''} seguidos`
                      : 'Comece sua sequência'}
                </p>
                {streakAtRisk && (
                  <p className="text-[10px] text-rose-400/70">Estude hoje para manter</p>
                )}
              </div>
            </div>

            {/* Cards vencidos total */}
            {totalDueCards > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0b1a2a]/60 border border-[#424754]/30">
                <BookOpen className="w-4 h-4 text-[#60a5fa] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#adc6ff]">{totalDueCards} para revisar</p>
                  <p className="text-[10px] text-slate-500">em todos os decks</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CTA de estudo */}
        {renderStudyCTA()}
      </section>

      {/* ── Lista de decks ────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#adc6ff]" />
            <h2 className="text-lg font-extrabold text-white tracking-tight">
              Seus Decks de Estudo
            </h2>
          </div>
          {decks.length > 4 && (
            <button
              onClick={() => setActiveTab('explore')}
              className="flex items-center gap-1 text-xs text-[#60a5fa] hover:text-white transition font-semibold"
            >
              Ver todos ({decks.length}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decks.slice(0, 4).map(deck => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onManageDeck={onManageDeck}
              onStartStudySession={onStartStudySession}
            />
          ))}
        </div>

        {decks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#60a5fa]/30 bg-[#0b1a2a]/60 p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#3b82f6]/10 border border-[#60a5fa]/30 flex items-center justify-center mx-auto">
              <Brain className="w-7 h-7 text-[#60a5fa]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Nenhum deck ainda</h3>
              <p className="text-sm text-[#8c91a0] mt-1">Crie seu primeiro deck na aba Cards</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
