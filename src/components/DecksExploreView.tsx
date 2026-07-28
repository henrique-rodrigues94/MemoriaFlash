import React, { useState } from 'react';
import {
  BookOpen,
  Play,
  Plus,
  Search,
  Brain,
  Sparkles,
} from 'lucide-react';
import { Deck, UserStats, ActiveTab } from '../types';
import { getDueCardCount, computeDeckMastery } from '../services/srsEngine';
import { SupportedLanguage } from '../lib/i18n';

interface DecksExploreViewProps {
  decks: Deck[];
  stats: UserStats;
  currentLanguage: SupportedLanguage;
  setActiveTab: (tab: ActiveTab) => void;
  onStartStudySession: (deck: Deck) => void;
  onManageDeck: (deck: Deck) => void;
  onOpenQuickCreate: () => void;
}

export const DecksExploreView: React.FC<DecksExploreViewProps> = ({
  decks,
  stats,
  currentLanguage,
  setActiveTab,
  onStartStudySession,
  onManageDeck,
  onOpenQuickCreate,
}) => {
  const [search, setSearch] = useState('');

  const filtered = decks.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalCards = decks.reduce((s, d) => s + d.cards.length, 0);
  const totalDue = decks.reduce((s, d) => s + getDueCardCount(d.cards), 0);

  return (
    <div className="flex flex-col gap-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-[#adc6ff]" />
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Minha Coleção
          </h1>
        </div>
        <button
          onClick={onOpenQuickCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4d8eff] hover:bg-[#3b82f6] text-white text-sm font-bold shadow-md shadow-[#4d8eff]/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Novo Deck
        </button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-4 border border-[#424754]/20 text-center">
          <div className="text-2xl font-extrabold text-white">{decks.length}</div>
          <div className="text-[11px] text-[#8c91a0] mt-0.5">Baralhos</div>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-[#424754]/20 text-center">
          <div className="text-2xl font-extrabold text-white">{totalCards}</div>
          <div className="text-[11px] text-[#8c91a0] mt-0.5">Cartões</div>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-amber-500/20 text-center">
          <div className={`text-2xl font-extrabold ${totalDue > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
            {totalDue}
          </div>
          <div className="text-[11px] text-[#8c91a0] mt-0.5">Pendentes</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8c91a0]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar baralhos..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0b1a2a]/80 border border-[#424754]/30 text-white text-sm placeholder-[#8c91a0] focus:outline-none focus:border-[#4d8eff]/60 transition-colors"
        />
      </div>

      {/* Deck list */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 border border-[#424754]/20 flex flex-col items-center gap-4 text-center">
          {decks.length === 0 ? (
            <>
              <div className="p-4 rounded-full bg-[#4d8eff]/10">
                <Brain className="w-10 h-10 text-[#60a5fa]" />
              </div>
              <div>
                <p className="font-bold text-white text-lg">Nenhum baralho ainda</p>
                <p className="text-[#8c91a0] text-sm mt-1">Crie seu primeiro deck para começar a estudar</p>
              </div>
              <button
                onClick={onOpenQuickCreate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4d8eff] hover:bg-[#3b82f6] text-white font-bold text-sm transition-all"
              >
                <Sparkles className="w-4 h-4" /> Criar com IA
              </button>
            </>
          ) : (
            <p className="text-[#8c91a0] text-sm">Nenhum baralho encontrado para "{search}"</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((deck) => {
            const dueCount = getDueCardCount(deck.cards);
            const mastery = computeDeckMastery(deck.cards);

            return (
              <div
                key={deck.id}
                className="glass-card rounded-2xl p-5 border border-[#424754]/20 hover:border-[#adc6ff]/40 transition-all flex flex-col justify-between group shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    {deck.category && (
                      <span className="px-2 py-0.5 rounded-full bg-[#122131] text-[#adc6ff] text-[10px] font-mono border border-[#adc6ff]/20 truncate max-w-[120px]">
                        {deck.category}
                      </span>
                    )}
                    <div className="ml-auto">
                      {dueCount > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-extrabold animate-pulse">
                          {dueCount} Pendentes
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                          Em Dia
                        </span>
                      )}
                    </div>
                  </div>

                  <h3
                    onClick={() => onManageDeck(deck)}
                    className="text-base font-bold text-white group-hover:text-[#adc6ff] transition-colors cursor-pointer mt-1"
                  >
                    {deck.title}
                  </h3>
                </div>

                <div className="mt-5 pt-4 border-t border-[#424754]/20 space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] text-[#8c91a0] mb-1 font-medium">
                      <span>{deck.cards.length} cartões</span>
                      <span className="text-[#adc6ff] font-bold">{mastery}% Dominado</span>
                    </div>
                    <div className="w-full bg-[#122131] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] h-full rounded-full transition-all duration-700"
                        style={{ width: `${mastery}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => onManageDeck(deck)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#c2c6d6] hover:bg-[#122131] hover:text-white transition-colors"
                    >
                      Editar Cards
                    </button>
                    <button
                      onClick={() => onStartStudySession(deck)}
                      className="px-4 py-2 rounded-xl bg-[#4d8eff] hover:bg-[#3b82f6] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#4d8eff]/20 transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Estudar Agora
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
