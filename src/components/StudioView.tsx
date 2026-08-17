import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Crown, Loader2, PlusCircle, Save, Sparkles, Trash2 } from 'lucide-react';
import { Deck, Flashcard, UserStats } from '../types';
import { SupportedLanguage } from '../lib/i18n';
import { EducationLevel, EDUCATION_LEVEL_META } from '../lib/educationLevels';
import { ManualCardForm } from './ManualCardForm';
import { generateAICards } from '../lib/aiGenerator';
import { remainingAICards } from '../services/generationLimit';
import { fetchSharedCards, queryBankAvailability } from '../services/cardBankService';
import { identifySubjectLevels, loadAllLevelCurricula, LevelCurriculum, LevelInfo } from '../services/subjectLevelsService';
import { CurriculumCategory } from '../services/curriculumService';
import { requestCurriculumPreparation } from '../services/curriculumRequestService';
import { getCuratedSubjectSuggestions } from '../lib/subjectAutocomplete';

interface StudioViewProps { decks: Deck[]; stats: UserStats; currentLanguage: SupportedLanguage; onSaveNewDeck: (deck: Deck) => void; onDeductCredit?: (amount?: number) => void; onOpenAdMob?: () => void; onOpenSubscription?: () => void; initialDeck?: Deck | null; onConsumedInitialDeck?: () => void; }
function normalize(value: string): string { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim(); }
function upper(value: string): string { return value.toUpperCase(); }
function convertSharedCard(card: any, subject: string, level: EducationLevel): Flashcard { return { id: `shared-${card.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, front: card.front, back: card.back, explanation: card.explanation || '', curiosity: card.curiosity || '', difficulty: (card.difficulty || 'medium') as Flashcard['difficulty'], subject: card.subject || subject, topic: card.topic || '', subtopic: card.subtopic, source: 'ai', reps: 0, interval: 0, efactor: 2.5, dueDate: new Date().toISOString(), bucketId: card.bucketId, cardContentType: card.cardContentType, educationLevel: (card.educationLevel || level) as EducationLevel }; }
function GeneratedCard({ card, index, onRemove }: { card: Flashcard; index: number; onRemove: () => void }) { return <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm"><div className="flex items-start gap-3"><span className="shrink-0 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 px-2 py-1 text-[11px] font-bold text-orange-700 dark:text-orange-300">#{index + 1}</span><div className="min-w-0 flex-1">{card.topic && <p className="mb-1 truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.topic}</p>}<p className="text-sm font-semibold leading-snug text-slate-900 dark:text-white">{card.front}</p></div><button type="button" onClick={onRemove} aria-label="Remover card" className="p-1 text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></div><div className="mt-3 space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3"><p className="whitespace-pre-line text-xs text-slate-700 dark:text-slate-200"><strong className="text-emerald-600 dark:text-emerald-400">Resposta:</strong> {card.back}</p>{card.explanation && <p className="whitespace-pre-line text-xs text-slate-600 dark:text-slate-300"><strong className="text-amber-600 dark:text-amber-400">Explicação:</strong> {card.explanation}</p>}</div></article>; }
function dedupeSubjects(values: string[]): string[] { const map = new Map<string, string>(); values.forEach(value => { const clean = value?.trim(); const key = normalize(clean || ''); if (key && !map.has(key)) map.set(key, upper(clean)); }); return Array.from(map.values()); }

export const StudioView: React.FC<StudioViewProps> = ({ decks, stats, onSaveNewDeck, onOpenSubscription, initialDeck, onConsumedInitialDeck }) => {
  const [mode, setMode] = useState<'ia' | 'manual'>('ia');
  const [subject, setSubject] = useState(upper(initialDeck?.category || initialDeck?.title || ''));
  const [deckName, setDeckName] = useState(upper(initialDeck?.title || ''));
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('medio');
  const [educationLevelLocked, setEducationLevelLocked] = useState(false);
  const [detectedLevels, setDetectedLevels] = useState<LevelInfo[]>([]);
  const [levelCurricula, setLevelCurricula] = useState<Map<EducationLevel, LevelCurriculum>>(new Map());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedSubtopics, setSelectedSubtopics] = useState<Set<string>>(new Set());
  const [cardCount, setCardCount] = useState<number | 'all'>(25);
  const [generatedCards, setGeneratedCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [bankReady, setBankReady] = useState(0);
  const [bankMissing, setBankMissing] = useState(0);

  const curriculum = useMemo(() => levelCurricula.get(educationLevel)?.categories || [], [educationLevel, levelCurricula]);
  const allSubtopics = useMemo(() => curriculum.flatMap((category: CurriculumCategory) => category.topics || []).filter(Boolean), [curriculum]);
  // cardBuckets são indexados por MATÉRIA + TÓPICO PRINCIPAL. A UI exibe subtópicos,
  // portanto o banco deve receber a categoria pai, não cada subtópico isoladamente.
  const selectedBankTopics = useMemo(() => curriculum.filter(category => (category.topics || []).some(topic => selectedSubtopics.has(topic))).map(category => category.category), [curriculum, selectedSubtopics]);
  const allSelected = allSubtopics.length > 0 && selectedSubtopics.size === allSubtopics.length;
  const remaining = remainingAICards(stats);
  const dailyBudget = stats.isPro ? 1000 : Math.max(0, Math.min(200, remaining === Number.POSITIVE_INFINITY ? 200 : remaining));
  const existingFronts = useMemo<Set<string>>(() => new Set(decks.flatMap(deck => deck.cards.map(card => normalize(card.front))).filter(Boolean)), [decks]);
  const quantityOptions = useMemo<Array<number | 'all'>>(() => {
    const options: Array<number | 'all'> = [25, 50, 100, 'all'];
    return options.filter(option => option === 'all' || dailyBudget >= option || stats.isPro);
  }, [dailyBudget, stats.isPro]);

  useEffect(() => {
    if (subject.trim().length < 2) { setDetectedLevels([]); setLevelCurricula(new Map()); setSelectedSubtopics(new Set()); setExpanded(new Set()); setSubjectSuggestions([]); setShowSuggestions(false); setBankReady(0); setBankMissing(0); return; }
    const query = upper(subject.trim());
    const local = dedupeSubjects([...decks.flatMap(deck => [deck.category, deck.title, ...deck.cards.map(card => card.subject || '')]), ...getCuratedSubjectSuggestions(query)]).filter(item => normalize(item).includes(normalize(query))).slice(0, 8);
    setSubjectSuggestions(local); setShowSuggestions(local.length > 0);
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const result = await identifySubjectLevels(query);
        if (cancelled) return;
        const levels = result?.levels || [];
        setDetectedLevels(levels);
        const primary = levels[0]?.level || educationLevel;
        if (!educationLevelLocked) setEducationLevel(primary as EducationLevel);
        await loadAllLevelCurricula(query, levels.length ? levels : [{ level: primary, label: primary, icon: '🎓', reason: '', priority: 1 } as LevelInfo], updated => { if (!cancelled) setLevelCurricula(new Map(updated)); });
      } catch (err: any) { if (!cancelled) setError(err?.message || 'Não foi possível consultar a grade curricular.'); }
    }, 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [subject, educationLevelLocked]);

  useEffect(() => {
    if (!curriculum.length) return;
    setSelectedSubtopics(new Set(allSubtopics));
    setExpanded(new Set(curriculum.map(category => category.category)));
  }, [curriculum.length, educationLevel]);

  useEffect(() => {
    if (!subject.trim() || !selectedBankTopics.length) { setBankReady(0); setBankMissing(0); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const availability = await queryBankAvailability(subject.trim(), selectedBankTopics, educationLevel);
        if (!cancelled) { setBankReady(availability.totalReadyCards); setBankMissing(availability.needsGeneration.length); }
      } catch { if (!cancelled) { setBankReady(0); setBankMissing(selectedBankTopics.length); } }
    }, 200);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [subject, selectedBankTopics, educationLevel]);

  const toggleAll = () => setSelectedSubtopics(allSelected ? new Set() : new Set(allSubtopics));
  const toggleCategory = (category: CurriculumCategory) => {
    const values = category.topics || [];
    setSelectedSubtopics(current => { const next = new Set(current); const all = values.every(value => next.has(value)); values.forEach(value => all ? next.delete(value) : next.add(value)); return next; });
  };

  const handleGenerate = async () => {
    setMessage(null); setError(null);
    const normalizedSubject = upper(subject.trim());
    if (!normalizedSubject) return setError('Informe a MATÉRIA / ASSUNTO.');
    if (!selectedSubtopics.size) return setError('Selecione pelo menos um tópico ou subtópico.');
    if (dailyBudget <= 0) return setError('Você atingiu o limite diário de 200 cards. Amanhã poderá continuar de onde parou.');
    const selected: string[] = Array.from(selectedSubtopics);
    const target = cardCount === 'all' ? dailyBudget : Math.min(cardCount, dailyBudget);
    setLoading(true);
    try {
      const shared = await fetchSharedCards(normalizedSubject, selectedBankTopics, educationLevel, target);
      const known: Set<string> = new Set(existingFronts); const cards: Flashcard[] = [];
      for (const card of shared) {
        const key = normalize(card.front);
        if (!key || known.has(key)) continue;
        if (card.subtopic && !selected.some(item => normalize(item) === normalize(card.subtopic || ''))) continue;
        known.add(key); cards.push(convertSharedCard(card, normalizedSubject, educationLevel));
      }
      let remainingTarget = Math.max(0, target - cards.length);
      if (remainingTarget > 0 && bankMissing > 0) await requestCurriculumPreparation({ subject: normalizedSubject, educationLevel });
      let rounds = 0;
      while (remainingTarget > 0 && rounds < 20) {
        rounds += 1;
        const batch = Math.min(100, remainingTarget);
        const knownFronts: string[] = Array.from(known);
        const generated = await generateAICards(normalizedSubject, selected, batch, educationLevel, knownFronts);
        if (!generated.length) break;
        let added = 0;
        for (const card of generated) { const key = normalize(card.front); if (!key || known.has(key)) continue; known.add(key); cards.push(card); added += 1; }
        remainingTarget -= added;
        if (added === 0 || generated.length < batch) break;
      }
      if (!cards.length) throw new Error(bankReady > 0 ? 'Os cards encontrados no banco já estão no seu baralho. Não gerei duplicados.' : 'Não foi possível obter cards do banco compartilhado nem da IA. Verifique a conexão e tente novamente.');
      setGeneratedCards(cards); setMessage(`${cards.length} cards prontos. O banco compartilhado foi consultado pelos tópicos corretos e a IA completou o que faltou.`);
    } catch (err: any) { setError(err?.message || 'Não foi possível gerar os cards agora.'); }
    finally { setLoading(false); }
  };

  const handleSaveGenerated = () => {
    if (!generatedCards.length) return;
    const title = upper(deckName.trim() || subject.trim() || 'NOVO BARALHO');
    const existing = decks.find(deck => normalize(deck.title) === normalize(title));
    const deck: Deck = existing ? { ...existing, cards: [...generatedCards, ...existing.cards] } : { id: `deck-${Date.now()}`, title, category: upper(subject.trim()) || 'GERAL', description: '', color: '#60a5fa', accentBorder: 'border-l-primary', cards: generatedCards, createdAt: new Date().toISOString() };
    onSaveNewDeck(deck); const count = generatedCards.length; setGeneratedCards([]); setMessage(`${count} cards salvos no baralho ${title}.`); if (initialDeck) onConsumedInitialDeck?.();
  };
  const handleManualCard = (card: Flashcard, targetDeckName: string) => { const title = upper(targetDeckName.trim()); const existing = decks.find(deck => normalize(deck.title) === normalize(title)); if (existing) onSaveNewDeck({ ...existing, cards: [card, ...existing.cards] }); else onSaveNewDeck({ id: `deck-${Date.now()}`, title, category: upper(card.subject || 'GERAL'), description: '', color: '#60a5fa', accentBorder: 'border-l-primary', cards: [card], createdAt: new Date().toISOString() }); setMessage('Card adicionado ao seu baralho.'); };
  const applySuggestion = (value: string) => { setSubject(upper(value)); setDeckName(prev => prev || upper(value)); setShowSuggestions(false); setEducationLevelLocked(false); };

  return <div className="mx-auto max-w-4xl space-y-5 pb-28 animate-fade-in">
    <div className="flex justify-center"><div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><button type="button" onClick={() => setMode('ia')} className={`rounded-xl px-6 py-3 text-xs font-extrabold flex items-center gap-2 ${mode === 'ia' ? 'bg-[#6658f5] text-white' : 'text-slate-500 dark:text-slate-400'}`}><Sparkles className="h-4 w-4" /> GERAR COM IA</button><button type="button" onClick={() => setMode('manual')} className={`rounded-xl px-6 py-3 text-xs font-extrabold flex items-center gap-2 ${mode === 'manual' ? 'bg-[#6658f5] text-white' : 'text-slate-500 dark:text-slate-400'}`}><PlusCircle className="h-4 w-4" /> MANUAL</button></div></div>
    {mode === 'ia' ? <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7">
      <div><p className="text-[11px] font-black uppercase tracking-wider text-[#6658f5]">GERAR COM IA</p><h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Monte sua grade e receba os cards certos.</h1><p className="mt-1 text-xs text-slate-500">A grade mostra todos os tópicos e subtópicos existentes no currículo retornado. Não há seleção limitada artificialmente.</p></div>
      <div className="relative"><label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">MATÉRIA / ASSUNTO *</label><input value={subject} onChange={e => { setSubject(upper(e.target.value)); setEducationLevelLocked(false); }} onFocus={() => setShowSuggestions(subjectSuggestions.length > 0)} autoComplete="off" placeholder="EX.: PORTUGUÊS, DIREITO PENAL, BIOLOGIA..." className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-sm font-bold uppercase text-slate-900 outline-none focus:border-[#6658f5] dark:border-slate-700 dark:bg-slate-950 dark:text-white" />{showSuggestions && subjectSuggestions.length > 0 && <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">{subjectSuggestions.map(item => <button key={normalize(item)} type="button" onMouseDown={() => applySuggestion(item)} className="block w-full px-4 py-3 text-left text-xs font-bold uppercase text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">{item}</button>)}</div>}</div>
      <div><label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">NÍVEL</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{EDUCATION_LEVEL_META.map(level => { const active = educationLevel === level.value; const detected = detectedLevels.length === 0 || detectedLevels.some(item => item.level === level.value); return <button key={level.value} type="button" disabled={!detected} onClick={() => { setEducationLevel(level.value); setEducationLevelLocked(true); setSelectedSubtopics(new Set()); }} className={`rounded-xl border px-3 py-3 text-xs font-extrabold ${active ? 'border-[#6658f5] bg-[#6658f5] text-white' : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'} ${!detected ? 'cursor-not-allowed opacity-35' : ''}`}>{level.icon} {upper(level.label)}</button>; })}</div></div>
      {curriculum.length > 0 && <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-black uppercase text-slate-900 dark:text-white">GRADE CURRICULAR COMPLETA</h2><p className="mt-1 text-[11px] text-slate-500">{selectedSubtopics.size} de {allSubtopics.length} subtópicos selecionados · {selectedBankTopics.length} tópicos principais</p></div><button type="button" onClick={toggleAll} className="rounded-xl bg-[#6658f5]/10 px-3 py-2 text-[11px] font-black text-[#5143d9] dark:text-[#a9a0ff]">{allSelected ? 'DESMARCAR TODOS' : 'SELECIONAR TODOS'}</button></div><div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">{curriculum.map(category => { const items = category.topics || []; const selectedCount = items.filter(item => selectedSubtopics.has(item)).length; const open = expanded.has(category.category); return <div key={category.category} className="border-b border-slate-100 last:border-0 dark:border-slate-800"><div className="flex items-center gap-2 bg-slate-50 px-3 py-3 dark:bg-slate-950"><input type="checkbox" checked={selectedCount === items.length && items.length > 0} ref={el => { if (el) el.indeterminate = selectedCount > 0 && selectedCount < items.length; }} onChange={() => toggleCategory(category)} className="h-4 w-4 accent-[#6658f5]" /><button type="button" onClick={() => setExpanded(current => { const next = new Set(current); next.has(category.category) ? next.delete(category.category) : next.add(category.category); return next; })} className="flex-1 text-left text-xs font-black uppercase text-slate-800 dark:text-slate-100">{category.category}<span className="ml-2 text-[10px] font-normal text-slate-500">{selectedCount}/{items.length}</span></button>{open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}</div>{open && <div className="grid gap-1 p-3 sm:grid-cols-2">{items.map(item => <label key={`${category.category}-${item}`} className="flex cursor-pointer items-start gap-2 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"><input type="checkbox" checked={selectedSubtopics.has(item)} onChange={() => setSelectedSubtopics(current => { const next = new Set(current); next.has(item) ? next.delete(item) : next.add(item); return next; })} className="mt-0.5 h-4 w-4 accent-[#6658f5]" /><span className="text-xs text-slate-700 dark:text-slate-200">{upper(item)}</span></label>)}</div>}</div>; })}</div></div>}
      {subject && selectedBankTopics.length > 0 && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"><b>CONTEÚDO DO BANCO:</b> {bankReady} CARDS PRONTOS. <b>TÓPICOS SEM CARDS:</b> {bankMissing}. O BANCO É CONSULTADO PELO TÓPICO PRINCIPAL CORRETO ANTES DA IA.</div>}
      <div><label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">NOME DO BARALHO</label><input value={deckName} onChange={e => setDeckName(upper(e.target.value))} placeholder={upper(subject || 'EX.: DIREITO PENAL')} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold uppercase text-slate-900 outline-none focus:border-[#6658f5] dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></div>
      <div><label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">QUANTIDADE DE CARDS</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{quantityOptions.map(option => <button key={String(option)} type="button" onClick={() => setCardCount(option)} className={`rounded-xl border py-3 text-xs font-black ${cardCount === option ? 'border-[#6658f5] bg-[#6658f5]/10 text-[#5143d9] dark:text-[#a9a0ff]' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>{option === 'all' ? 'TODOS DISPONÍVEIS' : `${option} CARDS`}</button>)}</div></div>
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" /><p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">O banco compartilhado é a primeira fonte. A IA só completa o que não estiver disponível, evitando duplicação.</p></div>
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>}{message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">{message}</div>}
      <button type="button" onClick={() => void handleGenerate()} disabled={loading || !subject.trim() || !selectedSubtopics.size || dailyBudget <= 0} className="w-full rounded-2xl bg-[#6658f5] py-4 text-sm font-black text-white shadow-lg shadow-[#6658f5]/20 disabled:cursor-not-allowed disabled:opacity-40">{loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> GERANDO...</span> : <span className="flex items-center justify-center gap-2"><Sparkles className="h-5 w-5" /> GERAR {cardCount === 'all' ? 'TODOS OS DISPONÍVEIS' : `${cardCount} CARDS`}</span>}</button>
    </section> : <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7"><div><h1 className="text-xl font-black text-slate-900 dark:text-white">CRIAR CARDS MANUALMENTE</h1><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">SEUS CARDS FICAM NO SEU BARALHO E PODEM SER ESTUDADOS NORMALMENTE.</p></div><ManualCardForm existingDecks={decks.map(deck => deck.title)} subjects={dedupeSubjects(decks.flatMap(deck => [deck.category, ...deck.cards.map(card => card.subject || '')]))} onAddCardDirectly={handleManualCard} /></section>}
    {generatedCards.length > 0 && mode === 'ia' && <section className="space-y-3"><div className="flex items-center justify-between px-1"><h2 className="text-base font-black text-slate-900 dark:text-white">CARDS GERADOS ({generatedCards.length})</h2><button type="button" onClick={() => setGeneratedCards([])} className="text-xs font-bold text-slate-500 hover:text-rose-500">DESCARTAR</button></div>{generatedCards.map((card, index) => <GeneratedCard key={card.id} card={card} index={index} onRemove={() => setGeneratedCards(current => current.filter(c => c.id !== card.id))} />)}<button type="button" onClick={handleSaveGenerated} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-black text-white hover:bg-emerald-700"><Save className="h-5 w-5" /> SALVAR NO BARALHO</button></section>}
    {!stats.isPro && <div className="flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/30"><span className="text-xs font-bold text-blue-700 dark:text-blue-300">PLANO GRATUITO: {dailyBudget} CARDS RESTANTES HOJE</span>{dailyBudget === 0 && onOpenSubscription && <button type="button" onClick={onOpenSubscription} className="flex items-center gap-1 text-xs font-black text-amber-700"><Crown className="h-4 w-4" /> CONHECER PRO</button>}</div>}
  </div>;
};
