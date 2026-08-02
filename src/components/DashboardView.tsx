import React from 'react';
import {
  Brain,
  Sparkles,
  ChevronRight,
  Play,
  Plus,
} from 'lucide-react';
import { Deck, UserStats, ActiveTab } from '../types';
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

  const hasCards = decks.length > 0 && decks.some((d) => d.cards.length > 0);
  const firstDeckWithCard = decks.find((d) => d.cards.length > 0);

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Quick AI Trigger Banner */}
      <section className="bg-gradient-to-r from-[#122238] via-[#1a2e48] to-[#122238] rounded-2xl p-5 border border-[#60a5fa]/30 shadow-xl flex flex-col gap-4">
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

        {/* Bloco Continuar o último card / Redirecionamento para a aba 'cards' */}
        {hasCards && firstDeckWithCard ? (
          <div className="p-3.5 rounded-xl bg-[#0b1a2a]/80 border border-[#60a5fa]/20 flex items-center justify-between gap-3">
            <div className="overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#60a5fa] font-bold">
                Continuar o último card
              </span>
              <p className="text-xs font-semibold text-white truncate mt-0.5">
                {firstDeckWithCard.cards[0].front}
              </p>
            </div>
            <button
              onClick={() => onStartStudySession(firstDeckWithCard)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Continuar
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-[#0b1a2a]/80 border border-[#60a5fa]/20 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#60a5fa] font-bold">
                Nenhum card cadastrado
              </span>
              <p className="text-xs text-slate-300 mt-0.5">
                Gere seus primeiros flashcards com IA na aba de criação
              </p>
            </div>
            <button
              onClick={() => setActiveTab('cards')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Criar Cards
            </button>
          </div>
        )}
      </section>

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
    </div>
  );
};