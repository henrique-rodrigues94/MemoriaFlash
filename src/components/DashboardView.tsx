import React from 'react';
import {
  Brain,
  Sparkles,
  TrendingUp,
  Plus,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Deck, UserStats, ActiveTab } from '../types';
import { getDueCardCount } from '../services/srsEngine';
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

  

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Banner e meta diária removidos */}

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
            <button
              onClick={onOpenQuickCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Criar com IA agora
            </button>
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
