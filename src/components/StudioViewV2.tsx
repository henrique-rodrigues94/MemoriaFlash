import React, { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, PlusCircle, Save, Sparkles, Trash2, Crown } from 'lucide-react';
import { Deck, Flashcard, UserStats } from '../types';
import { SupportedLanguage } from '../lib/i18n';
import { ManualCardForm } from './ManualCardForm';
import { generateAICards } from '../lib/aiGenerator';
import { FREE_AI_CARD_LIMIT, generatedAICardsCount, remainingAICards, canGenerateAICards } from '../services/generationLimit';

interface StudioViewProps {
  decks: Deck[];
  stats: UserStats;
  currentLanguage: SupportedLanguage;
  onSaveNewDeck: (deck: Deck) => void;
  onOpenSubscription?: () => void;
  initialDeck?: Deck | null;
  onConsumedInitialDeck?: () => void;
}

function normalizeFront(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '').trim();
}

function GeneratedCard({ card, index, onRemove }: { card: Flashcard; index: number; onRemove: () => void }) {
  return (
    <article className="bg-[#0b1a2a]/95 border border-[#adc6ff]/20 rounded-2xl p-4 shadow-xl">
      <div className="flex items-start gap-3">
        <span className="text-[11px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg px-2 py-1 shrink-0">#{index + 1}</span>
        <div className="min-w-0 flex-1">
          {card.topic && <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 truncate">{card.topic}</p>}
          <p className="text-sm font-semibold text-white leading-snug">{card.front}</p>
        </div>
        <button type="button" onClick={onRemove} className="p-1 text-slate-500 hover:text-red-400" title="Remover card">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-3 pt-3 border-t border-[#424754]/40 space-y-2">
        <p className="text-xs text-[#adc6ff] whitespace-pre-line"><strong className="text-emerald-400">Resposta:</strong> {card.back}</p>
        {card.explanation && <p className="text-xs text-slate-400 whitespace-pre-line"><strong className="text-amber-400">Explicação:</strong> {card.explanation}</p>}
        {card.curiosity && <p className="text-xs text-slate-400 whitespace-pre-line"><strong className="text-purple-400">Curiosidade:</strong> {card.curiosity}</p>}
      </div>
    </article>
  );
}

export const StudioView: React.FC<StudioViewProps> = ({
  decks,
  stats,
  onSaveNewDeck,
  onOpenSubscription,
  initialDeck,
  onConsumedInitialDeck,
}) => {
  const [mode, setMode] = useState<'ia' | 'manual'>('ia');
  const [subject, setSubject] = useState(initialDeck?.category || initialDeck?.title || '');
  const [deckName, setDeckName] = useState(initialDeck?.title || '');
  const [topics, setTopics] = useState('');
  const [cardCount, setCardCount] = useState(25);
  const [generatedCards, setGeneratedCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generated = generatedAICardsCount(stats);
  const remaining = remainingAICards(stats);
  const free = !stats.isPro;

  const options = useMemo(() => {
    const base = [25, 50, 100].filter((n) => stats.isPro || n <= remaining);
    if (free && remaining > 0 && remaining < 25) base.unshift(remaining);
    return Array.from(new Set(base));
  }, [free, remaining, stats.isPro]);

  const existingFronts = useMemo(() => {
    const values = decks.flatMap((deck) => deck.cards.map((card) => normalizeFront(card.front)));
    return Array.from(new Set(values.filter(Boolean)));
  }, [decks]);

  const canGenerate = canGenerateAICards(stats, cardCount) && !!subject.trim();

  const handleGenerate = async () => {
    setMessage(null);
    setError(null);
    if (!subject.trim()) {
      setError('Informe a matéria ou assunto.');
      return;
    }
    if (!canGenerateAICards(stats, cardCount)) {
      setError(`Você já utilizou ${generated}/${FREE_AI_CARD_LIMIT} cards gratuitos. Assine o PRO para gerar cards ilimitados.`);
      return;
    }

    setLoading(true);
    try {
      const cards = await generateAICards(
        subject.trim(),
        topics.split(',').map((t) => t.trim()).filter(Boolean),
        cardCount,
        'medio',
        existingFronts,
      );
      setGeneratedCards(cards);
      setMessage(`${cards.length} cards gerados com sucesso.`);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível gerar os cards.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGenerated = () => {
    if (!generatedCards.length) return;
    const title = deckName.trim() || subject.trim() || 'Novo Baralho';
    const existing = decks.find((deck) => deck.title.trim().toLowerCase() === title.toLowerCase());
    const deck: Deck = existing
      ? { ...existing, cards: [...generatedCards, ...existing.cards] }
      : {
          id: `deck-${Date.now()}`,
          title,
          category: subject.trim() || 'Geral',
          description: '',
          color: '#60a5fa',
          accentBorder: 'border-l-primary',
          cards: generatedCards,
          createdAt: new Date().toISOString(),
        };
    onSaveNewDeck(deck);
    setGeneratedCards([]);
    setMessage(`${deck.cards.length === generatedCards.length ? generatedCards.length : generatedCards.length} cards salvos em "${title}".`);
    if (initialDeck) onConsumedInitialDeck?.();
  };

  const handleManualCard = (card: Flashcard, targetDeckName: string) => {
    const existing = decks.find((deck) => deck.title.trim().toLowerCase() === targetDeckName.trim().toLowerCase());
    if (existing) {
      onSaveNewDeck({ ...existing, cards: [card, ...existing.cards] });
    } else {
      onSaveNewDeck({
        id: `deck-${Date.now()}`,
        title: targetDeckName.trim(),
        category: card.subject || 'Geral',
        description: '',
        color: '#60a5fa',
        accentBorder: 'border-l-primary',
        cards: [card],
        createdAt: new Date().toISOString(),
      });
    }
    setMessage('Card adicionado ao seu baralho.');
  };

  return (
    <div className="max-w-3xl mx-auto pb-24 animate-fade-in space-y-5">
      <div className="flex justify-center">
        <div className="bg-[#0b1a2a] p-1.5 rounded-2xl border border-[#424754]/40 flex gap-2">
          <button type="button" onClick={() => setMode('ia')} className={`px-6 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 ${mode === 'ia' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Sparkles className="w-4 h-4" /> Gerar com IA
          </button>
          <button type="button" onClick={() => setMode('manual')} className={`px-6 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 ${mode === 'manual' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <PlusCircle className="w-4 h-4" /> Criar manualmente
          </button>
        </div>
      </div>

      {mode === 'ia' ? (
        <section className="bg-[#0b1a2a]/90 border border-[#adc6ff]/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div>
            <h1 className="text-xl font-extrabold text-white">Gerar flashcards</h1>
            <p className="text-xs text-slate-400 mt-1">Crie cards automaticamente para estudar no MemoriaFlash.</p>
          </div>

          {!stats.isPro && (
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <p className="text-xs font-extrabold text-blue-200">Limite gratuito</p>
                  <p className="text-[11px] text-slate-400">{generated} de {FREE_AI_CARD_LIMIT} cards gerados</p>
                </div>
                <span className="text-sm font-black text-blue-300">{remaining} restantes</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, (generated / FREE_AI_CARD_LIMIT) * 100)}%` }} />
              </div>
              {remaining === 0 && (
                <button type="button" onClick={onOpenSubscription} className="mt-3 w-full py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2">
                  <Crown className="w-4 h-4" /> Assinar PRO — geração ilimitada
                </button>
              )}
            </div>
          )}

          <div className="space-y-4 text-left">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff]">Matéria / Assunto *</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Direito Penal, Biologia, Matemática..." className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm" />

            <label className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff]">Nome do Baralho</label>
            <input value={deckName} onChange={(e) => setDeckName(e.target.value)} placeholder={subject || 'Ex: Direito Penal — Parte Geral'} className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm" />

            <label className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff]">Tópicos <span className="font-normal normal-case text-slate-500">(opcional, separados por vírgula)</span></label>
            <input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="Ex: Tipicidade, dolo, culpa" className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm" />

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff] mb-2">Quantidade</label>
              {options.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {options.map((n) => (
                    <button key={n} type="button" onClick={() => setCardCount(n)} className={`py-3 rounded-xl border text-sm font-bold ${cardCount === n ? 'bg-blue-600/30 border-blue-500 text-blue-200' : 'bg-[#051424] border-[#424754]/50 text-slate-400 hover:text-white'}`}>
                      {n}<span className="block text-[10px] opacity-60 mt-0.5">cards</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">Você atingiu o limite gratuito de {FREE_AI_CARD_LIMIT} cards.</div>
              )}
            </div>

            {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</div>}
            {message && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">{message}</div>}

            <button type="button" onClick={handleGenerate} disabled={loading || !canGenerate} className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Gerando...</> : <><Sparkles className="w-5 h-5" /> Gerar {cardCount} Flashcards</>}
            </button>
          </div>
        </section>
      ) : (
        <section className="bg-[#0b1a2a]/90 border border-[#adc6ff]/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <h1 className="text-xl font-extrabold text-white mb-1">Criar card manualmente</h1>
          <p className="text-xs text-slate-400 mb-5">Cards criados aqui pertencem aos seus baralhos e não são publicados para outros usuários.</p>
          <ManualCardForm
            existingDecks={decks.map((deck) => deck.title)}
            subjects={Array.from(new Set(decks.flatMap((deck) => [deck.category, ...deck.cards.map((card) => card.subject).filter(Boolean) as string[]])))}
            onAddCardDirectly={handleManualCard}
          />
        </section>
      )}

      {generatedCards.length > 0 && mode === 'ia' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-base font-extrabold text-[#adc6ff]">Cards gerados ({generatedCards.length})</h2>
            <button type="button" onClick={() => setGeneratedCards([])} className="text-xs text-slate-500 hover:text-rose-400">Descartar</button>
          </div>
          {generatedCards.map((card, index) => <GeneratedCard key={card.id} card={card} index={index} onRemove={() => setGeneratedCards((prev) => prev.filter((c) => c.id !== card.id))} />)}
          <button type="button" onClick={handleSaveGenerated} className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold flex items-center justify-center gap-2">
            <Save className="w-5 h-5" /> Salvar no Baralho
          </button>
        </section>
      )}
    </div>
  );
};
