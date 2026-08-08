// 📁 flashmind-ai/src/components/DecksLibraryView.tsx
import React, { useMemo, useState } from 'react';
import { Search, Plus, BookOpen, ArrowDownAZ, Flame, Trophy, Zap, Brain, X } from 'lucide-react';
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

type SortMode = 'due' | 'mastery' | 'alphabetical' | 'newest';

export const DecksLibraryView: React.FC<DecksLibraryViewProps> = ({
  decks,
  currentLanguage,
  setActiveTab,
  onStartStudySession,
  onManageDeck,
  onOpenQuickCreate,
}) => {
  const t = (translations as any)[currentLanguage] || (translations as any).pt;
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('due');
  const [onlyDue, setOnlyDue] = useState(false);

  const categories = useMemo(() => {
    const set = new Set(decks.map((d) => d.category).filter(Boolean));
    return Array.from(set).sort();
  }, [decks]);

  // Summary stats
  const summary = useMemo(() => {
    const totalDue = decks.reduce((s, d) => s + getDueCardCount(d.cards), 0);
    const totalCards = decks.reduce((s, d) => s + d.cards.length, 0);
    const avgMastery = decks.length > 0
      ? Math.round(decks.reduce((s, d) => s + computeDeckMastery(d.cards), 0) / decks.length)
      : 0;
    const decksWithDue = decks.filter(d => getDueCardCount(d.cards) > 0).length;
    return { totalDue, totalCards, avgMastery, decksWithDue };
  }, [decks]);

  const filteredDecks = useMemo(() => {
    let result = decks;

    if (onlyDue) result = result.filter(d => getDueCardCount(d.cards) > 0);
    if (selectedCategory) result = result.filter(d => d.category === selectedCategory);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(d =>
        d.title.toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q)
      );
    }

    const withMeta = result.map(deck => ({
      deck,
      due: getDueCardCount(deck.cards),
      mastery: computeDeckMastery(deck.cards),
    }));

    switch (sortMode) {
      case 'due':        withMeta.sort((a, b) => b.due - a.due); break;
      case 'mastery':    withMeta.sort((a, b) => a.mastery - b.mastery); break;
      case 'alphabetical': withMeta.sort((a, b) => a.deck.title.localeCompare(b.deck.title, 'pt-BR')); break;
      case 'newest':     withMeta.sort((a, b) => (b.deck.createdAt || '').localeCompare(a.deck.createdAt || '')); break;
    }

    return withMeta.map(w => w.deck);
  }, [decks, selectedCategory, search, sortMode, onlyDue]);

  const hasFilters = search.trim() || selectedCategory || onlyDue;

  return (
    <div className="space-y-5 pb-24 max-w-5xl mx-auto">

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
                {decks.length} deck{decks.length !== 1 ? 's' : ''} · {summary.totalCards} cards
                {summary.totalDue > 0 && (
                  <span className="text-amber-300 font-bold"> · {summary.totalDue} pendentes</span>
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

        {/* Mini stats row */}
        {decks.length > 0 && (
          <div className="relative z-10 grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-800/60">
            <div className="text-center">
              <div className="text-xl font-extrabold text-amber-400">{summary.totalDue}</div>
              <div className="text-[10px] text-slate-600 uppercase font-bold mt-0.5">Para revisar</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-extrabold text-blue-400">{summary.avgMastery}%</div>
              <div className="text-[10px] text-slate-600 uppercase font-bold mt-0.5">Domínio médio</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-extrabold text-violet-400">{summary.decksWithDue}</div>
              <div className="text-[10px] text-slate-600 uppercase font-bold mt-0.5">Decks ativos</div>
            </div>
          </div>
        )}
      </section>

      {/* Filtros e busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8c91a0]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar decks..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0b1a2a]/70 border border-[#424754]/30 text-sm text-white placeholder:text-[#8c91a0] focus:outline-none focus:border-[#adc6ff]/50 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex gap-1 bg-[#0b1a2a]/70 border border-[#424754]/30 rounded-xl p-1">
          {([
            { id: 'due',         icon: Flame,       label: 'Urgente' },
            { id: 'mastery',     icon: Brain,       label: 'Domínio' },
            { id: 'alphabetical',icon: ArrowDownAZ, label: 'A–Z' },
            { id: 'newest',      icon: Trophy,      label: 'Recente' },
          ] as { id: SortMode; icon: React.ComponentType<{className?:string}>; label: string }[]).map(opt => {
            const Icon = opt.icon;
            const active = sortMode === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSortMode(opt.id)}
                title={opt.label}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
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

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Only due toggle */}
        {summary.totalDue > 0 && (
          <button
            onClick={() => setOnlyDue(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
              onlyDue
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-transparent text-[#8c91a0] border-[#424754]/30 hover:text-amber-300'
            }`}
          >
            <Zap className="w-3 h-3" /> Só pendentes
          </button>
        )}

        {/* Category chips */}
        {categories.length > 0 && (
          <>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                !selectedCategory
                  ? 'bg-[#adc6ff]/15 text-[#adc6ff] border-[#adc6ff]/40'
                  : 'bg-transparent text-[#8c91a0] border-[#424754]/30 hover:text-white'
              }`}
            >
              Todas
            </button>
            {categories.map(cat => (
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
          </>
        )}

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setSelectedCategory(null); setOnlyDue(false); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 transition cursor-pointer"
          >
            <X className="w-3 h-3" /> Limpar filtros
          </button>
        )}
      </div>

      {/* Results count when filtering */}
      {hasFilters && filteredDecks.length > 0 && (
        <p className="text-[11px] text-slate-600">
          {filteredDecks.length} deck{filteredDecks.length !== 1 ? 's' : ''} encontrado{filteredDecks.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Grid / empty states */}
      {decks.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-[#424754]/20 space-y-4">
          <BookOpen className="w-12 h-12 text-slate-700 mx-auto" />
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
        <div className="glass-card rounded-3xl p-10 text-center border border-[#424754]/20 space-y-2">
          <p className="text-sm text-white font-semibold">Nenhum deck encontrado</p>
          <p className="text-xs text-[#8c91a0]">Tente outros termos ou remova os filtros.</p>
          <button
            onClick={() => { setSearch(''); setSelectedCategory(null); setOnlyDue(false); }}
            className="text-xs text-blue-400 hover:text-blue-300 transition cursor-pointer mt-1"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDecks.map(deck => (
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
