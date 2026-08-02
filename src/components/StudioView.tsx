import React, { useState, useEffect } from 'react';
import { Sparkles, PlusCircle, CheckCircle2, Loader2, Plus, X, Trash2, BookOpen, Save, HelpCircle, Play, Lock } from 'lucide-react';
import { Deck, UserStats, Flashcard } from '../types';
import { SupportedLanguage } from '../lib/i18n';
import { ManualCardForm } from './ManualCardForm';
import { fetchAITopicSuggestions, generateAICards } from '../lib/aiGenerator';
import { hasEnoughCredits, applySpendCredits } from '../services/economy/creditsEngine';
import { ECONOMY } from '../services/economy/economyConstants';

interface StudioViewProps {
  decks: Deck[];
  stats: UserStats;
  currentLanguage: SupportedLanguage;
  onSaveNewDeck: (deck: Deck) => void;
  onDeductCredit?: (amount?: number) => void;
  onOpenAdMob?: () => void;
  onOpenSubscription?: () => void;
}

export const StudioView: React.FC<StudioViewProps> = ({
  decks,
  stats,
  onSaveNewDeck,
  onDeductCredit,
  onOpenAdMob,
  onOpenSubscription,
}) => {
  const [activeMode, setActiveMode] = useState<'ia' | 'manual'>('ia');

  // Estados Form IA
  const [subject, setSubject] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [cardCount, setCardCount] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cards gerados pela IA
  const [generatedAICards, setGeneratedAICards] = useState<Flashcard[]>([]);

  // Cards criados no modo Manual
  const [createdManualCards, setCreatedManualCards] = useState<Flashcard[]>([]);

  // Listas para Autocomplete
  const existingDeckTitles = Array.from(new Set(decks.map((d) => d.title)));
  const existingSubjects = Array.from(new Set(decks.map((d) => d.category || d.title)));

  useEffect(() => {
    if (subject.trim().length < 2) {
      setSuggestedTopics([]);
      return;
    }
    // Debounce 600ms — chama o backend para sugestões reais de IA
    const timer = setTimeout(async () => {
      const suggestions = await fetchAITopicSuggestions(subject);
      setSuggestedTopics(suggestions.filter((t) => !topics.includes(t)));
    }, 600);
    return () => clearTimeout(timer);
  }, [subject, topics]);

  const handleAddTopic = (topicToAdd?: string) => {
    const target = topicToAdd || topicInput.trim();
    if (target && !topics.includes(target)) {
      setTopics([...topics, target]);
      setTopicInput('');
    }
  };

  const handleRemoveTopic = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index));
  };

  // --- ADICIONA CARD MANUAL E VINCULA AO BARALHO ---
  const handleAddManualCard = (newCard: Flashcard, targetDeckName: string) => {
    // Procura se já existe um baralho com esse nome (evita duplicidade de baralhos)
    const existingDeck = decks.find(
      (d) => d.title.trim().toLowerCase() === targetDeckName.trim().toLowerCase()
    );

    if (existingDeck) {
      // Adiciona o card ao baralho existente
      const updatedDeck: Deck = {
        ...existingDeck,
        cards: [newCard, ...existingDeck.cards],
      };
      onSaveNewDeck(updatedDeck);
    } else {
      // Cria um novo baralho
      const newDeck: Deck = {
        id: `deck-${Date.now()}`,
        title: targetDeckName.trim(),
        category: newCard.subject || 'Geral',
        description: '',
        color: '#60a5fa',
        accentBorder: 'border-l-primary',
        cards: [newCard],
        createdAt: new Date().toISOString(),
      };
      onSaveNewDeck(newDeck);
    }

    // Adiciona na lista visual de pré-visualização abaixo
    setCreatedManualCards((prev) => [newCard, ...prev]);

    setSuccessMsg(`🎉 Card adicionado ao baralho "${targetDeckName}"!`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // --- GERAÇÃO VIA IA ---
  const handleGenerateCards = async () => {
    if (!subject.trim()) {
      alert('Por favor, digite a Matéria / Assunto.');
      return;
    }

    // Gate de créditos: 1 crédito por geração
    const cost = ECONOMY.COST_GENERATE_DECK;
    if (!hasEnoughCredits(stats, cost)) {
      // Abre modal de anúncio recompensado para ganhar créditos
      if (onOpenAdMob) onOpenAdMob();
      return;
    }

    setIsLoading(true);
    setSuccessMsg(null);

    try {
      const cards = await generateAICards(subject.trim(), topics, cardCount);
      // Desconta crédito após geração bem-sucedida
      if (onDeductCredit) onDeductCredit(cost);
      setGeneratedAICards(cards);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Ocorreu um erro ao gerar os cards com IA.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- SALVAMENTO FINAL DOS CARDS GERADOS POR IA ---
  const handleSaveAllAICards = () => {
    if (generatedAICards.length === 0) return;

    const mainSubject = generatedAICards[0].subject || subject.trim() || 'Geral';
    const existingDeck = decks.find(
      (d) => d.title.toLowerCase() === mainSubject.toLowerCase()
    );

    if (existingDeck) {
      const updatedDeck: Deck = {
        ...existingDeck,
        cards: [...generatedAICards, ...existingDeck.cards],
      };
      onSaveNewDeck(updatedDeck);
    } else {
      const newDeck: Deck = {
        id: `deck-${Date.now()}`,
        title: mainSubject,
        category: generatedAICards[0].topic || 'Geral',
        description: '',
        color: '#60a5fa',
        accentBorder: 'border-l-primary',
        cards: generatedAICards,
        createdAt: new Date().toISOString(),
      };
      onSaveNewDeck(newDeck);
    }

    setSuccessMsg(`🎉 ${generatedAICards.length} Flashcards salvos no baralho "${mainSubject}"!`);
    setGeneratedAICards([]);
    setTopics([]);
    setSubject('');
  };

  const handleRemoveAICard = (cardId: string) => {
    setGeneratedAICards((prev) => prev.filter((c) => c.id !== cardId));
  };

  const handleRemoveManualCard = (cardId: string) => {
    setCreatedManualCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  return (
    <div className="max-w-3xl mx-auto pb-24 animate-fade-in space-y-6">
      {/* Seletor IA / Manual */}
      <div className="flex justify-center">
        <div className="bg-[#0b1a2a] p-1.5 rounded-2xl border border-[#424754]/40 flex items-center gap-2 shadow-lg">
          <button
            onClick={() => setActiveMode('ia')}
            className={`px-6 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeMode === 'ia'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-[#8c91a0] hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Gerador IA
          </button>
          <button
            onClick={() => setActiveMode('manual')}
            className={`px-6 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeMode === 'manual'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-[#8c91a0] hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" /> Manual
          </button>
        </div>
      </div>

      {/* Formulário Central */}
      <div className="bg-[#0b1a2a]/90 backdrop-blur-xl border border-[#adc6ff]/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {activeMode === 'manual' ? (
          <ManualCardForm
            existingDecks={existingDeckTitles}
            subjects={existingSubjects}
            onAddCardDirectly={handleAddManualCard}
          />
        ) : (
          <div className="space-y-5 text-left">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5">
                💻 MATÉRIA / ASSUNTO:
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="subject-suggestions"
                  placeholder="Ex: Direito Penal, Biologia, Matemática..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white placeholder-[#8c91a0] focus:outline-none focus:border-[#60a5fa] text-sm"
                />
                {/* Autocomplete: sugere matérias de decks já existentes */}
                <datalist id="subject-suggestions">
                  {existingSubjects.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {subject.trim().length >= 2 && (
                  <div className="absolute inset-y-0 right-3 flex items-center text-[#60a5fa]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>

            {suggestedTopics.length > 0 && (
              <div className="p-3.5 bg-[#051424]/80 rounded-2xl border border-blue-500/20 animate-fade-in">
                <span className="block text-[11px] font-bold text-[#60a5fa] mb-2 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Sugestões de Tópicos da IA:
                </span>
                <div className="flex flex-wrap gap-2">
                  {suggestedTopics.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddTopic(sug)}
                      className="px-3 py-1.5 rounded-xl bg-[#0e2742] hover:bg-[#163a61] text-[#adc6ff] border border-blue-500/30 text-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-400" /> {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5">
                🏷️ TÓPICOS DE ESTUDO RELACIONADOS
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Parte Geral, Mitocôndrias..."
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
                  className="flex-1 bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white placeholder-[#8c91a0] focus:outline-none focus:border-[#60a5fa] text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleAddTopic()}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-[#424754]/50 cursor-pointer"
                >
                  + Adicionar
                </button>
              </div>

              {topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {topics.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs flex items-center gap-1.5"
                    >
                      {t}
                      <button onClick={() => handleRemoveTopic(idx)} className="hover:text-white cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5">
                QUANTIDADE DE CARDS
              </label>
              <select
                value={cardCount}
                onChange={(e) => setCardCount(Number(e.target.value))}
                className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#60a5fa] text-sm cursor-pointer"
              >
                <option value={25}>25 Flashcards</option>
                <option value={50}>50 Flashcards</option>
                <option value={100}>100 Flashcards</option>
              </select>
            </div>

            {/* Banner de créditos */}
            {!stats.isPro && (
              <div className={`rounded-xl p-3.5 flex items-center justify-between gap-3 mt-2 border ${
                (stats.aiCredits || 0) > 0
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}>
                <div className="flex items-center gap-2">
                  {(stats.aiCredits || 0) > 0 ? (
                    <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <p className={`text-xs font-bold ${(stats.aiCredits || 0) > 0 ? 'text-blue-300' : 'text-amber-300'}`}>
                      {(stats.aiCredits || 0) > 0
                        ? `${stats.aiCredits} crédito${(stats.aiCredits || 0) !== 1 ? 's' : ''} disponível`
                        : 'Sem créditos — assista um vídeo para ganhar'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {(stats.aiCredits || 0) > 0
                        ? `Cada geração custa ${ECONOMY.COST_GENERATE_DECK} crédito`
                        : 'Créditos são necessários para usar a IA'}
                    </p>
                  </div>
                </div>
                {(stats.aiCredits || 0) === 0 && onOpenAdMob && (
                  <button
                    type="button"
                    onClick={onOpenAdMob}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold whitespace-nowrap hover:bg-amber-500/30 transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Ganhar créditos
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerateCards}
              disabled={isLoading || (!stats.isPro && (stats.aiCredits || 0) < ECONOMY.COST_GENERATE_DECK)}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Criando Flashcards com IA...
                </>
              ) : (!stats.isPro && (stats.aiCredits || 0) < ECONOMY.COST_GENERATE_DECK) ? (
                <>
                  <Lock className="w-5 h-5" /> Sem Créditos — Assista um Anúncio
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> Gerar Flashcards com IA
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* CARDS CRIADOS MANUALMENTE (EXIBIDOS ABAIXO DO BOTÃO) */}
      {activeMode === 'manual' && createdManualCards.length > 0 && (
        <div className="space-y-6 pt-4 animate-fade-in">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-base font-extrabold uppercase tracking-wider text-[#adc6ff] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              Cards Criados ({createdManualCards.length})
            </h3>
          </div>

          <div className="space-y-4">
            {createdManualCards.map((card) => (
              <div
                key={card.id}
                className="bg-[#0b1a2a]/95 border border-[#adc6ff]/20 rounded-2xl p-6 text-left space-y-4 shadow-xl relative"
              >
                <div className="flex items-center justify-between border-b border-[#424754]/40 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      💻 Matéria: {card.subject}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      🏷️ Tópico: {card.topic}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveManualCard(card.id)}
                    className="text-[#8c91a0] hover:text-red-400 p-1.5 transition-colors cursor-pointer"
                    title="Remover visualização"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Pergunta */}
                <div className="space-y-1">
                  <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" /> Pergunta:
                  </span>
                  <p className="text-sm text-white font-semibold">{card.front}</p>
                </div>

                {/* Resposta */}
                <div className="space-y-1">
                  <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resposta:
                  </span>
                  <p className="text-sm text-[#adc6ff]">{card.back}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CARDS GERADOS PELA IA */}
      {activeMode === 'ia' && generatedAICards.length > 0 && (
        <div className="space-y-6 pt-4 animate-fade-in">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-base font-extrabold uppercase tracking-wider text-[#adc6ff] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-400" />
              Cards Gerados pela IA ({generatedAICards.length})
            </h3>
          </div>

          <div className="space-y-4">
            {generatedAICards.map((card) => (
              <div
                key={card.id}
                className="bg-[#0b1a2a]/95 border border-[#adc6ff]/20 rounded-2xl p-6 text-left space-y-4 shadow-xl relative"
              >
                <div className="flex items-center justify-between border-b border-[#424754]/40 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      💻 Matéria: {card.subject}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      🏷️ Tópico: {card.topic}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveAICard(card.id)}
                    className="text-[#8c91a0] hover:text-red-400 p-1.5 transition-colors cursor-pointer"
                    title="Remover card"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" /> Pergunta:
                  </span>
                  <p className="text-sm text-white font-semibold">{card.front}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resposta:
                  </span>
                  <p className="text-sm text-[#adc6ff]">{card.back}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleSaveAllAICards}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-base shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Save className="w-5 h-5" /> Salvar Cards ({generatedAICards.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};