import React, { useMemo, useState } from 'react';
import { Loader2, PlusCircle, Save, Sparkles, Trash2, Crown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Deck, Flashcard, UserStats } from '../types';
import { SupportedLanguage } from '../lib/i18n';
import { ManualCardForm } from './ManualCardForm';
import { generateAICards } from '../lib/aiGenerator';
import { remainingAICards } from '../services/generationLimit';
import { fetchSharedCards, queryBankAvailability } from '../services/cardBankService';

interface StudioViewProps {
  decks: Deck[];
  stats: UserStats;
  currentLanguage: SupportedLanguage;
  onSaveNewDeck: (deck: Deck) => void;
  onDeductCredit?: (amount?: number) => void;
  onOpenAdMob?: () => void;
  onOpenSubscription?: () => void;
  initialDeck?: Deck | null;
  onConsumedInitialDeck?: () => void;
}

function normalizeFront(value: string): string { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '').trim(); }

function GeneratedCard({ card, index, onRemove }: { card: Flashcard; index: number; onRemove: () => void }) {
  return <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm"><div className="flex items-start gap-3"><span className="text-[11px] font-bold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-lg px-2 py-1 shrink-0">#{index + 1}</span><div className="min-w-0 flex-1">{card.topic && <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 truncate">{card.topic}</p>}<p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{card.front}</p></div><button type="button" onClick={onRemove} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div><div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2"><p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line"><strong className="text-emerald-600 dark:text-emerald-400">Resposta:</strong> {card.back}</p>{card.explanation && <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line"><strong className="text-amber-600 dark:text-amber-400">Explicação:</strong> {card.explanation}</p>}{card.curiosity && <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line"><strong className="text-purple-600 dark:text-purple-400">Curiosidade:</strong> {card.curiosity}</p>}</div></article>;
}

export const StudioView: React.FC<StudioViewProps> = ({ decks, stats, onSaveNewDeck, onOpenSubscription, initialDeck, onConsumedInitialDeck }) => {
  const [mode, setMode] = useState<'ia' | 'manual'>('ia');
  const [subject, setSubject] = useState(initialDeck?.category || initialDeck?.title || '');
  const [deckName, setDeckName] = useState(initialDeck?.title || '');
  const [topics, setTopics] = useState('');
  const [cardCount, setCardCount] = useState<number | 'all'>(25);
  const [generatedCards, setGeneratedCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remaining = remainingAICards(stats);
  const free = !stats.isPro;
  const dailyBudget = stats.isPro ? 1000 : Math.min(200, remaining === Number.POSITIVE_INFINITY ? 200 : remaining);
  const requestedTopics = useMemo(() => topics.split(',').map(t => t.trim()).filter(Boolean), [topics]);
  const existingFronts = useMemo(() => new Set(decks.flatMap(deck => deck.cards.map(card => normalizeFront(card.front))).filter(Boolean)), [decks]);
  const quantityOptions: Array<number | 'all'> = useMemo(() => {
    const options: Array<number | 'all'> = [25, 50, 100];
    if (dailyBudget > 0) options.push('all');
    return options;
  }, [dailyBudget]);

  const handleGenerate = async () => {
    setMessage(null); setError(null);
    if (!subject.trim()) return setError('Informe a matéria ou assunto.');
    if (dailyBudget <= 0) return setError('Você já atingiu o limite diário de 200 cards. Amanhã poderá continuar.');
    setLoading(true);
    try {
      const selected = requestedTopics.length ? requestedTopics : [subject.trim()];
      const availability = await queryBankAvailability(subject.trim(), selected, 'medio');
      const target = cardCount === 'all' ? dailyBudget : Math.min(cardCount, dailyBudget);
      const shared = await fetchSharedCards(subject.trim(), selected, 'medio', target);
      const known = new Set(existingFronts);
      const cards: Flashcard[] = shared.filter(card => !known.has(normalizeFront(card.front))).map(card => ({ id: `shared-${card.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, front: card.front, back: card.back, explanation: card.explanation || '', curiosity: '', difficulty: (card.difficulty || 'medium') as any, subject: card.subject || subject.trim(), topic: card.topic, subtopic: card.subtopic } as Flashcard));
      cards.forEach(card => known.add(normalizeFront(card.front)));

      let remainingTarget = Math.max(0, target - cards.length);
      let rounds = 0;
      while (remainingTarget > 0 && rounds < (cardCount === 'all' ? 20 : 1)) {
        rounds += 1;
        const batch = Math.min(100, remainingTarget);
        const generated = await generateAICards(subject.trim(), requestedTopics, batch, 'medio', Array.from(known));
        if (!generated.length) break;
        let added = 0;
        for (const card of generated) {
          const key = normalizeFront(card.front);
          if (!key || known.has(key)) continue;
          known.add(key); cards.push(card); added += 1;
        }
        remainingTarget -= added;
        if (added === 0 || generated.length < batch) break;
      }

      if (!cards.length) {
        setMessage(availability.totalReadyCards > 0 ? 'Os cards disponíveis já estão no seu baralho. Não gerei duplicados.' : 'Não encontrei conteúdo pronto para esta seleção e a IA não retornou novos cards.');
        return;
      }
      setGeneratedCards(cards);
      setMessage(`${cards.length} cards prontos: o banco compartilhado foi usado primeiro e a IA só completou o que faltou.`);
    } catch (err: any) { setError(err?.message || 'Não foi possível gerar os cards.'); }
    finally { setLoading(false); }
  };

  const handleSaveGenerated = () => {
    if (!generatedCards.length) return;
    const title = deckName.trim() || subject.trim() || 'Novo Baralho';
    const existing = decks.find(deck => deck.title.trim().toLowerCase() === title.toLowerCase());
    const deck: Deck = existing ? { ...existing, cards: [...generatedCards, ...existing.cards] } : { id: `deck-${Date.now()}`, title, category: subject.trim() || 'Geral', description: '', color: '#60a5fa', accentBorder: 'border-l-primary', cards: generatedCards, createdAt: new Date().toISOString() };
    onSaveNewDeck(deck); setGeneratedCards([]); setMessage(`${generatedCards.length} cards salvos em "${title}".`); if (initialDeck) onConsumedInitialDeck?.();
  };

  const handleManualCard = (card: Flashcard, targetDeckName: string) => {
    const existing = decks.find(deck => deck.title.trim().toLowerCase() === targetDeckName.trim().toLowerCase());
    if (existing) onSaveNewDeck({ ...existing, cards: [card, ...existing.cards] });
    else onSaveNewDeck({ id: `deck-${Date.now()}`, title: targetDeckName.trim(), category: card.subject || 'Geral', description: '', color: '#60a5fa', accentBorder: 'border-l-primary', cards: [card], createdAt: new Date().toISOString() });
    setMessage('Card adicionado ao seu baralho.');
  };

  return <div className="max-w-3xl mx-auto pb-24 animate-fade-in space-y-5">
    <div className="flex justify-center"><div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex gap-2 shadow-sm"><button type="button" onClick={() => setMode('ia')} className={`px-6 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 ${mode === 'ia' ? 'bg-[#6658f5] text-white' : 'text-slate-500 dark:text-slate-400'}`}><Sparkles className="w-4 h-4" /> Gerar com IA</button><button type="button" onClick={() => setMode('manual')} className={`px-6 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 ${mode === 'manual' ? 'bg-[#6658f5] text-white' : 'text-slate-500 dark:text-slate-400'}`}><PlusCircle className="w-4 h-4" /> Manual</button></div></div>
    {mode === 'ia' ? <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5"><div><h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Gerar flashcards</h1><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Escolha a quantidade ou use todos os cards disponíveis para a seleção.</p></div>
      {!stats.isPro && <div className="rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-extrabold text-blue-700 dark:text-blue-200">Plano gratuito</p><p className="text-[11px] text-slate-500 dark:text-slate-400">Até 200 cards gerados por dia</p></div><span className="text-sm font-black text-blue-700 dark:text-blue-300">{dailyBudget} restantes</span></div>{dailyBudget === 0 && onOpenSubscription && <button onClick={onOpenSubscription} className="mt-3 w-full py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-2"><Crown className="w-4 h-4" /> Conhecer PRO</button>}</div>}
      <div className="space-y-4"><label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Matéria / Assunto *</label><input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex.: Direito Penal, Biologia, Matemática..." className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#6658f5] text-sm" />
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Nome do Baralho</label><input value={deckName} onChange={e => setDeckName(e.target.value)} placeholder={subject || 'Ex.: Direito Penal'} className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#6658f5] text-sm" />
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Tópicos <span className="font-normal normal-case text-slate-500">(opcional, separados por vírgula)</span></label><input value={topics} onChange={e => setTopics(e.target.value)} placeholder="Ex.: Tipicidade, dolo, culpa" className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#6658f5] text-sm" />
        <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">Quantidade de cards</label><div className="grid grid-cols-4 gap-2">{quantityOptions.map(n => <button key={String(n)} type="button" onClick={() => setCardCount(n)} className={`py-3 rounded-xl border text-xs font-bold ${cardCount === n ? 'bg-[#6658f5]/10 border-[#6658f5] text-[#5143d9] dark:text-[#a9a0ff]' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}>{n === 'all' ? 'Todos disponíveis' : n}</button>)}</div></div>
        <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" /><p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-100/80">A IA pode cometer erros. Revise o conteúdo antes de usar em provas ou decisões importantes.</p></div>
        {error && <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">{error}</div>}{message && <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">{message}</div>}
        <button type="button" onClick={() => void handleGenerate()} disabled={loading || !subject.trim() || dailyBudget <= 0} className="w-full py-4 rounded-xl bg-[#6658f5] hover:bg-[#5849e8] text-white font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-40">{loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Gerando…</> : <><Sparkles className="w-5 h-5" /> Gerar {cardCount === 'all' ? 'todos os disponíveis' : `${cardCount} cards`}</>}</button>
      </div></section> : <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-sm"><h1 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">Criar card manualmente</h1><p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Cards criados aqui pertencem aos seus baralhos e podem ser editados por você.</p><ManualCardForm existingDecks={decks.map(deck => deck.title)} subjects={Array.from(new Set(decks.flatMap(deck => [deck.category, ...deck.cards.map(card => card.subject).filter((s): s is string => !!s)])))} onAddCardDirectly={handleManualCard} /></section>}
    {generatedCards.length > 0 && mode === 'ia' && <section className="space-y-3"><div className="flex items-center justify-between px-2"><h2 className="text-base font-extrabold text-slate-900 dark:text-white">Cards gerados ({generatedCards.length})</h2><button type="button" onClick={() => setGeneratedCards([])} className="text-xs text-slate-500 hover:text-rose-500">Descartar</button></div>{generatedCards.map((card, index) => <GeneratedCard key={card.id} card={card} index={index} onRemove={() => setGeneratedCards(prev => prev.filter(c => c.id !== card.id))} />)}<button type="button" onClick={handleSaveGenerated} className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center justify-center gap-2"><Save className="w-5 h-5" /> Salvar no Baralho</button></section>}
  </div>;
};
