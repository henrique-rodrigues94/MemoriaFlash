import React from 'react';
import {
  Brain,
  Sparkles,
  TrendingUp,
  Plus,
  Clock,
  ChevronRight,
  Play,
  RotateCcw,
} from 'lucide-react';
import { Deck, UserStats, ActiveTab } from '../types';
import { getDueCardCount, computeDeckMastery } from '../services/srsEngine';
import { getLastStudiedDeckId, getLastStudiedAt } from '../services/storage';
import { DeckCard } from './DeckCard';
import { AdMobBanner } from './AdMobBanner';
import { SupportedLanguage, translations } from '../lib/i18n';

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

/** Formata o tempo desde o último estudo em texto amigável ("há 5 min", "ontem"...). */
function formatTimeAgo(iso?: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;
  return `há ${Math.floor(days / 30)} mes(es)`;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  decks,
  currentLanguage,
  onOpenLanguageSelector,
  setActiveTab,
  onStartStudySession,
  onManageDeck,
  onOpenQuickCreate,
  onOpenAdMob,
  onOpenSubscription,
  onOpenReferral,
}) => {
  const t = translations[currentLanguage] || translations.pt;

  // ── "Continuar de onde parou" ──
  // Encontra o último baralho estudado a partir do id persistido em localStorage.
  const lastStudiedId = getLastStudiedDeckId();
  const lastStudiedAt = getLastStudiedAt();
  const lastStudiedDeck = decks.find((d) => d.id === lastStudiedId) || null;
  const lastStudiedDue = lastStudiedDeck ? getDueCardCount(lastStudiedDeck.cards) : 0;
  const lastStudiedMastery = lastStudiedDeck ? computeDeckMastery(lastStudiedDeck.cards) : 0;

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Banner e meta diária removidos */}

      {/* Continue Studying — retoma o último baralho onde o usuário parou */}
      {lastStudiedDeck && (
        <section className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-r from-[#1e2b4a] via-[#243a63] to-[#122238] border border-[#adc6ff]/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* glow decorativo */}
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-[#60a5fa]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center flex-shrink-0 shadow-lg">
              <RotateCcw className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-emerald-300/90 mb-0.5">
                <Clock className="w-3 h-3" />
                Última revisão {formatTimeAgo(lastStudiedAt)}
              </div>
              <h3 className="text-base font-bold text-white leading-tight">
                Continuar <span className="text-[#adc6ff]">“{lastStudiedDeck.title}”</span>
              </h3>
              <p className="text-xs text-[#8c91a0] mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                  {lastStudiedDue} revisões pendentes
                </span>
                ·
                <span className="text-[#adc6ff]">{lastStudiedMastery}% dominado</span>
              </p>
            </div>
          </div>

          <button
            id="btn-continue-last-deck"
            onClick={() => onStartStudySession(lastStudiedDeck)}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer hover:scale-[1.02] whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-white" /> Continuar Agora
          </button>
        </section>
      )}

      {/* Quick AI Trigger Banner */}
      <section className="bg-gradient-to-r from-[#122238] via-[#1a2e48] to-[#122238] rounded-2xl p-5 border border-[#60a5fa]/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#3b82f6]/20 border border-[#3b82f6]/40 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Sparkles className="w-6 h-6 text-[#60a5fa] animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Gerar Decks com Inteligência Artificial
            </h3>
          </div>
        </div>

        <button
          id="btn-quick-ai-create"
          onClick={onOpenQuickCreate}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Criar com IA
        </button>
      </section>

      {/* Barra de ações rápidas removida */}

      {/* Decks Collection Section */}
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
          {decks.slice(0, 4).map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onManageDeck={onManageDeck}
              onStartStudySession={onStartStudySession}
            />
          ))}
        </div>

        {/* Empty state — nenhum deck ainda */}
        {decks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#60a5fa]/30 bg-[#0b1a2a]/60 p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#3b82f6]/10 border border-[#60a5fa]/30 flex items-center justify-center mx-auto">
              <Brain className="w-7 h-7 text-[#60a5fa]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Nenhum deck ainda</h3>
            </div>
          </div>
        )}
      </section>

      {/* AdMob Banner for Free Users */}
      <AdMobBanner
        stats={stats}
        onOpenAdMob={onOpenAdMob}
        onOpenSubscription={onOpenSubscription}
        onOpenReferral={onOpenReferral}
        isPro={stats.isPro}
        currentLanguage={currentLanguage}
      />

      {/* Memory Trend removed as requested */}
    </div>
  );
};
