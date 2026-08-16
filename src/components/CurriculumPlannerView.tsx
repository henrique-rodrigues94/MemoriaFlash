import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, GraduationCap, Loader2, Sparkles, X, Lock } from 'lucide-react';
import { Deck, UserStats } from '../types';
import { EducationLevel, EDUCATION_LEVEL_META } from '../lib/educationLevels';
import { identifySubjectLevels, loadAllLevelCurricula, LevelCurriculum, LevelInfo } from '../services/subjectLevelsService';
import { CurriculumCategory } from '../services/curriculumService';
import { queryBankAvailability, fetchSharedCards, BankAvailability, SharedBankCard } from '../services/cardBankService';
import { generateAICards } from '../lib/aiGenerator';
import { remainingAICards } from '../services/generationLimit';
import { requestCurriculumPreparation } from '../services/curriculumRequestService';

interface CurriculumPlannerViewProps {
  decks: Deck[];
  stats: UserStats;
  onSaveNewDeck: (deck: Deck) => void;
  onOpenSubscription?: () => void;
  onOpenAdvanced?: () => void;
}

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function flattenSubtopics(categories: CurriculumCategory[]): string[] {
  return categories.flatMap(category => category.topics || []).filter(Boolean);
}

function makeDeck(subject: string, cards: Deck['cards']): Deck {
  return {
    id: `deck-${Date.now()}`,
    title: subject.trim(),
    category: subject.trim(),
    description: `Flashcards de ${subject.trim()} organizados pela grade curricular selecionada.`,
    color: '#60a5fa',
    accentBorder: 'border-l-primary',
    cards,
    createdAt: new Date().toISOString(),
  };
}

function convertSharedCard(card: SharedBankCard): Deck['cards'][number] {
  return {
    id: `shared-${card.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    front: card.front,
    back: card.back,
    explanation: card.explanation || '',
    curiosity: '',
    difficulty: card.difficulty || 'medium',
    subject: card.subject,
    topic: card.topic,
    subtopic: card.subtopic,
    source: 'shared-bank',
  } as Deck['cards'][number];
}

export const CurriculumPlannerView: React.FC<CurriculumPlannerViewProps> = ({ decks, stats, onSaveNewDeck, onOpenSubscription, onOpenAdvanced }) => {
  const [subject, setSubject] = useState('');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('medio');
  const [educationLevelLocked, setEducationLevelLocked] = useState(false);
  const [detectedLevels, setDetectedLevels] = useState<LevelInfo[]>([]);
  const [levelCurricula, setLevelCurricula] = useState<Map<EducationLevel, LevelCurriculum>>(new Map());
  const [isLoadingLevels, setIsLoadingLevels] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [selectedSubtopics, setSelectedSubtopics] = useState<Set<string>>(new Set());
  const [bankAvailability, setBankAvailability] = useState<BankAvailability | null>(null);
  const [isCheckingBank, setIsCheckingBank] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const curriculum = useMemo<CurriculumCategory[]>(() => levelCurricula.get(educationLevel)?.categories || [], [educationLevel, levelCurricula]);
  const allSubtopics = useMemo(() => flattenSubtopics(curriculum), [curriculum]);
  const allSelected = allSubtopics.length > 0 && selectedSubtopics.size === allSubtopics.length;
  const remainingToday = remainingAICards(stats);
  const sharedReady = bankAvailability?.totalReadyCards || 0;

  useEffect(() => {
    if (subject.trim().length < 2) {
      setDetectedLevels([]); setLevelCurricula(new Map()); setSelectedSubtopics(new Set()); setExpandedTopics(new Set()); setBankAvailability(null); return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsLoadingLevels(true); setError(null);
      try {
        const result = await identifySubjectLevels(subject.trim());
        if (cancelled) return;
        const levels = result?.levels || [];
        setDetectedLevels(levels);
        const primary = levels[0]?.level || educationLevel;
        if (!educationLevelLocked) setEducationLevel(primary as EducationLevel);
        await loadAllLevelCurricula(subject.trim(), levels.length ? levels : [{ level: primary, label: primary, priority: 1 } as LevelInfo], updated => {
          if (!cancelled) setLevelCurricula(new Map(updated));
        });
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Não foi possível carregar a grade curricular.');
      } finally {
        if (!cancelled) setIsLoadingLevels(false);
      }
    }, 450);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [subject, educationLevelLocked]);

  useEffect(() => {
    if (!curriculum.length) return;
    setSelectedSubtopics(new Set(flattenSubtopics(curriculum)));
    setExpandedTopics(new Set(curriculum.map(category => category.category)));
  }, [educationLevel, curriculum.length]);

  useEffect(() => {
    if (!subject.trim() || selectedSubtopics.size === 0) { setBankAvailability(null); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsCheckingBank(true);
      const result = await queryBankAvailability(subject.trim(), Array.from(selectedSubtopics), educationLevel);
      if (!cancelled) { setBankAvailability(result); setIsCheckingBank(false); }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [subject, educationLevel, selectedSubtopics]);

  const toggleAll = () => setSelectedSubtopics(allSelected ? new Set() : new Set(allSubtopics));
  const toggleSubtopic = (subtopic: string) => setSelectedSubtopics(current => { const next = new Set(current); if (next.has(subtopic)) next.delete(subtopic); else next.add(subtopic); return next; });
  const toggleExpanded = (category: string) => setExpandedTopics(current => { const next = new Set(current); if (next.has(category)) next.delete(category); else next.add(category); return next; });
  const toggleTopic = (category: CurriculumCategory) => {
    const topics = category.topics || [];
    const all = topics.every(item => selectedSubtopics.has(item));
    setSelectedSubtopics(current => { const next = new Set(current); topics.forEach(item => all ? next.delete(item) : next.add(item)); return next; });
  };

  const handleGenerate = async () => {
    if (!subject.trim()) return setError('Digite a matéria ou assunto.');
    if (!selectedSubtopics.size) return setError('Selecione pelo menos um tópico ou subtópico.');
    setIsGenerating(true); setError(null); setMessage(null);
    try {
      const freeRemaining = remainingToday === Number.POSITIVE_INFINITY ? Number.MAX_SAFE_INTEGER : remainingToday;
      const dailyBudget = stats.isPro ? 1000 : Math.min(200, freeRemaining);
      if (dailyBudget <= 0) { setError('Você já atingiu o limite diário de 200 cards. Amanhã poderá continuar de onde parou.'); return; }

      const selected = Array.from(selectedSubtopics);
      const sharedLimit = Math.min(dailyBudget, Math.max(0, sharedReady));
      const sharedCards = sharedLimit > 0 ? await fetchSharedCards(subject.trim(), selected, educationLevel, sharedLimit) : [];

      const existingFronts = new Set<string>();
      for (const deck of decks) {
        for (const card of deck.cards || []) {
          if (normalize(card.subject || deck.category || deck.title) === normalize(subject)) existingFronts.add(normalize(card.front));
        }
      }

      const newShared = sharedCards.filter(card => !existingFronts.has(normalize(card.front))).map(convertSharedCard);
      newShared.forEach(card => existingFronts.add(normalize(card.front)));
      const generatedCards: Deck['cards'] = [...newShared];
      let remainingBudget = Math.max(0, dailyBudget - newShared.length);

      const missing = bankAvailability?.needsGeneration || [];
      if (missing.length > 0) {
        await requestCurriculumPreparation({ subject: subject.trim(), educationLevel });
      }

      // A IA só entra depois do banco compartilhado e apenas para preencher o que
      // ainda não existe. Em contas gratuitas, o limite é diário e nunca é
      // consumido por cards reaproveitados do banco compartilhado.
      if (remainingBudget > 0 && missing.length > 0) {
        let rounds = 0;
        while (remainingBudget > 0 && rounds < 20) {
          rounds += 1;
          const batch = Math.min(100, remainingBudget);
          const cards = await generateAICards(subject.trim(), selected, batch, educationLevel, Array.from(existingFronts));
          if (!cards.length) break;
          let added = 0;
          for (const card of cards) {
            const key = normalize(card.front);
            if (!key || existingFronts.has(key)) continue;
            existingFronts.add(key); generatedCards.push(card); added += 1;
          }
          remainingBudget -= added;
          if (added === 0 || cards.length < batch) break;
        }
      }

      if (!generatedCards.length) {
        setMessage(sharedReady > 0 ? 'Os cards disponíveis já estão no seu baralho. Não gerei conteúdo duplicado.' : 'A grade foi preparada, mas ainda não há cards prontos para esta seleção.');
        return;
      }

      const title = subject.trim();
      const existingDeck = decks.find(deck => normalize(deck.title) === normalize(title));
      const deck = existingDeck ? { ...existingDeck, cards: [...generatedCards, ...existingDeck.cards] } : makeDeck(title, generatedCards);
      onSaveNewDeck(deck);
      const fromShared = newShared.length;
      const fromAI = generatedCards.length - fromShared;
      setMessage(`✓ ${generatedCards.length} cards adicionados${fromShared ? ` (${fromShared} do banco compartilhado` : ''}${fromAI ? `${fromShared ? ', ' : ' ('}${fromAI} gerados com IA` : ''}${fromShared ? ')' : fromAI ? ')' : ''}. ${stats.isPro ? 'Você pode continuar preenchendo a grade.' : 'Volte amanhã para continuar sem perder seu progresso.'}`);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível gerar os cards agora.');
    } finally { setIsGenerating(false); }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-5 animate-fade-in">
      <section className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-wider text-[#6658f5] flex items-center gap-2"><Sparkles className="w-4 h-4" /> Gerar com IA</p><h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">Monte sua grade e receba os cards certos.</h1></div>{onOpenAdvanced && <button onClick={onOpenAdvanced} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">Gerador avançado</button>}</div>
        <div><label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">Matéria / assunto</label><input value={subject} onChange={e => { setSubject(e.target.value); setEducationLevelLocked(false); }} placeholder="Ex.: Português, Direito Penal, Biologia..." className="w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-[#6658f5] focus:ring-4 focus:ring-[#6658f5]/10" /></div>
        <div><div className="flex items-center justify-between mb-2"><label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Nível</label>{isLoadingLevels && <Loader2 className="w-4 h-4 animate-spin text-[#6658f5]" />}</div><div className="flex flex-wrap gap-2">{(detectedLevels.length ? detectedLevels : EDUCATION_LEVEL_META).map((level: any) => { const value = level.level || level.value; const active = educationLevel === value; return <button key={value} onClick={() => { setEducationLevel(value); setEducationLevelLocked(true); setSelectedSubtopics(new Set()); }} className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold ${active ? 'bg-[#6658f5] text-white border-[#6658f5]' : 'bg-white text-slate-600 border-slate-200'}`}>{level.icon || '🎓'} {level.label}</button>; })}</div></div>
      </section>

      {curriculum.length > 0 && <section className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">Grade curricular</h2><p className="text-xs text-slate-500 mt-1">{selectedSubtopics.size} de {allSubtopics.length} subtópicos selecionados</p></div><button onClick={toggleAll} className="px-3.5 py-2 rounded-xl bg-[#6658f5]/10 text-[#5143d9] text-xs font-black flex items-center gap-1.5"><Check className="w-3.5 h-3.5" />{allSelected ? 'Desmarcar todos' : 'Selecionar todos'}</button></div>
        <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">{curriculum.map(category => { const topics = category.topics || []; const selectedCount = topics.filter(t => selectedSubtopics.has(t)).length; const expanded = expandedTopics.has(category.category); return <div key={category.category}><div className="flex items-center gap-2 px-4 py-3 bg-slate-50"><input type="checkbox" checked={selectedCount === topics.length && topics.length > 0} ref={el => { if (el) el.indeterminate = selectedCount > 0 && selectedCount < topics.length; }} onChange={() => toggleTopic(category)} className="w-4 h-4 accent-[#6658f5]" /><button onClick={() => toggleExpanded(category.category)} className="flex-1 text-left font-bold text-sm text-slate-800">{category.category}<span className="ml-2 text-[10px] text-slate-500">{selectedCount}/{topics.length}</span></button><button onClick={() => toggleExpanded(category.category)} className="p-1 text-slate-500">{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button></div>{expanded && <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 p-4">{topics.map(topic => <label key={topic} className="flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-slate-50 cursor-pointer"><input type="checkbox" checked={selectedSubtopics.has(topic)} onChange={() => toggleSubtopic(topic)} className="mt-0.5 w-4 h-4 accent-[#6658f5]" /><span className="text-xs text-slate-700 leading-relaxed">{topic}</span></label>)}</div>}</div>; })}</div>
      </section>}

      {isCheckingBank && <div className="flex items-center justify-center gap-2 text-xs text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Verificando conteúdo compartilhado…</div>}
      {bankAvailability && selectedSubtopics.size > 0 && <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600"><b className="text-slate-800">Conteúdo pronto:</b> {sharedReady} cards no banco compartilhado para sua seleção. <b className="text-slate-800">Faltando:</b> {bankAvailability.needsGeneration.length} subtópicos. O app usa o banco primeiro e só chama a IA quando necessário.</div>}
      {error && <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-xs flex gap-2"><X className="w-4 h-4" />{error}</div>}
      {message && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-xs flex gap-2"><Check className="w-4 h-4" />{message}</div>}

      <section className="flex flex-col sm:flex-row gap-3"><button onClick={() => void handleGenerate()} disabled={isGenerating || !subject.trim() || selectedSubtopics.size === 0} className="flex-1 py-4 rounded-2xl bg-[#6658f5] hover:bg-[#5849e8] disabled:opacity-40 text-white font-black text-sm flex items-center justify-center gap-2">{isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Montando seus cards…</> : <><Sparkles className="w-5 h-5" /> {stats.isPro ? 'Gerar todos os disponíveis' : `Gerar até ${Math.min(200, remainingToday)} hoje`}</>}</button>{!stats.isPro && onOpenSubscription && <button onClick={onOpenSubscription} className="sm:w-48 py-4 rounded-2xl border border-[#6658f5]/30 text-[#5143d9] font-black text-sm bg-[#6658f5]/5 flex items-center justify-center gap-2"><Lock className="w-4 h-4" /> Conhecer PRO</button>}</section>
    </div>
  );
};
