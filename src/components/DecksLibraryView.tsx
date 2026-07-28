import React, { useMemo, useState } from 'react';
import { Search, Plus, BookOpen, ArrowDownAZ, Flame, Trophy } from 'lucide-react';
import { Deck, ActiveTab } from '../types';
import { getDueCardCount, computeDeckMastery } from '../services/srsEngine';
import { DeckCard } from './DeckCard';
import { SupportedLanguage, translations } from '../lib/i18n';

interface DecksLibraryViewProps {
  decks: Deck[];
  currentLanguage: SupportedLanguage;
  setActiveTab: (tab: ActiveTab) => void;
  onStartStudySession: (deck: Deck) => void;
  onManageDeck: (deck: Deck) => void;
  onOpenQuickCreate: () => void;
}

type SortMode = 'due' | 'mastery' | 'alphabetical';

// Tela dedicada de "Baralhos" — antes, esta aba mostrava exatamente a mesma
// tela de Início (bug: os dois botões da navegação renderizavam o mesmo
// <DashboardView>). Agora é a biblioteca completa: busca, filtro por
// categoria e ordenação sobre TODOS os decks do usuário.
export const DecksLibraryView: React.FC<DecksLibraryViewProps> = ({
  decks,
  currentLanguage,
  setActiveTab,
  onStartStudySession,
  onManageDeck,
  onOpenQuickCreate,
}) => {
  const t = translations[currentLanguage] || translations.pt;
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('due');

  const categories = useMemo(() => {
    const set = new Set(decks.map((d) => d.category).filter(Boolean));
    return Array.from(set).sort();
  }, [decks]);

  const filteredDecks = useMemo(() => {
    let result = decks;

    if (selectedCategory) {
      result = result.filter((d) => d.category === selectedCategory);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (d) => d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
      );
    }

    const withMeta = result.map((deck) => ({
      deck,
      due: getDueCardCount(deck.cards),
      mastery: computeDeckMastery(deck.cards),
    }));

    switch (sortMode) {
      case 'due':
        withMeta.sort((a, b) => b.due - a.due);
        break;
      case 'mastery':
        withMeta.sort((a, b) => a.mastery - b.mastery); // menos dominados primeiro (precisam de atenção)
        break;
      case 'alphabetical':
        withMeta.sort((a, b) => a.deck.title.localeCompare(b.deck.title));
        break;
    }

    return withMeta.map((w) => w.deck);
  }, [decks, selectedCategory, search, sortMode]);

  const totalDue = useMemo(() => decks.reduce((sum, d) => sum + getDueCardCount(d.cards), 0), [decks]);

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <section className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-[#adc6ff]/20">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-emerald-500/15 via-[#60a5fa]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{t.decks}</h1>
              <p className="text-sm text-[#8c91a0]">
                {decks.length} {decks.length === 1 ? 'deck' : 'decks'} na sua coleção
                {totalDue > 0 && (
                  <span className="text-amber-300"> · {totalDue} cartões pendentes no total</span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenQuickCreate}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Novo Deck
          </button>
        </div>
      </section>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8c91a0]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou descrição..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0b1a2a]/70 border border-[#424754]/30 text-sm text-white placeholder:text-[#8c91a0] focus:outline-none focus:border-[#adc6ff]/50 transition-colors"
          />
        </div>

        <div className="flex gap-1.5 bg-[#0b1a2a]/70 border border-[#424754]/30 rounded-xl p-1">
          {(
            [
              { id: 'due', label: 'Pendentes', icon: Flame },
              { id: 'mastery', label: 'Precisa de atenção', icon: Trophy },
              { id: 'alphabetical', label: 'A-Z', icon: ArrowDownAZ },
            ] as { id: SortMode; label: string; icon: React.ComponentType<{ className?: string }> }[]
          ).map((opt) => {
            const Icon = opt.icon;
            const active = sortMode === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSortMode(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  active ? 'bg-[#3b82f6] text-white' : 'text-[#8c91a0] hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
              selectedCategory === null
                ? 'bg-[#adc6ff]/15 text-[#adc6ff] border-[#adc6ff]/40'
                : 'bg-transparent text-[#8c91a0] border-[#424754]/30 hover:text-white'
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#adc6ff]/15 text-[#adc6ff] border-[#adc6ff]/40'
                  : 'bg-transparent text-[#8c91a0] border-[#424754]/30 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Deck grid / empty states */}
      {decks.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-[#424754]/20 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#3b82f6]/10 text-[#60a5fa] flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Sua coleção está vazia</h3>
            <p className="text-xs text-[#8c91a0] mt-1">Crie seu primeiro deck com IA em segundos.</p>
          </div>
          <button
            onClick={onOpenQuickCreate}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Criar Primeiro Deck
          </button>
        </div>
      ) : filteredDecks.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center border border-[#424754]/20">
          <p className="text-sm text-[#8c91a0]">Nenhum deck encontrado para essa busca/filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDecks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onManageDeck={onManageDeck}
              onStartStudySession={onStartStudySession}
            />
          ))}
        </div>
      )}
    </div>
  );
};
