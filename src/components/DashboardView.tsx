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
            <p className="text-xs text-[#8c91a0] mt-0.5">
              Transforme artigos, PDFs, links do YouTube ou textos em flashcards de alta qualidade.
            </p>
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
          <button
            id="view-all-decks-btn"
            onClick={() => setActiveTab('explore')}
            className="text-xs text-[#60a5fa] hover:underline flex items-center gap-1 font-medium"
          >
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </button>
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

      {/* Memory Trend & SRS Tips Footer Card */}
      <section className="glass-card rounded-2xl p-5 border border-[#adc6ff]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-[#8c91a0]">Tendência de Memorização</div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              +15% Maior Retenção de Longo Prazo
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                SRS SM-2 Ativo
              </span>
            </div>
          </div>
        </div>

        <div className="text-xs text-[#8c91a0] flex items-center gap-2 bg-[#0b1a2a] px-3 py-2 rounded-xl border border-[#424754]/30">
          <Clock className="w-4 h-4 text-[#60a5fa]" />
          <span>Próxima revisão ideal em ~24 horas</span>
        </div>
      </section>
    </div>
  );
};
