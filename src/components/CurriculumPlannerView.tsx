import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Loader2,
  Sparkles,
  Wand2,
  X,
  Lock,
} from 'lucide-react';
import { Deck, UserStats } from '../types';
import { EducationLevel, EDUCATION_LEVEL_META } from '../lib/educationLevels';
import { identifySubjectLevels, loadAllLevelCurricula, LevelCurriculum, LevelInfo } from '../services/subjectLevelsService';
import { CurriculumCategory } from '../services/curriculumService';
import { queryBankAvailability, BankAvailability } from '../services/cardBankService';
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
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

export const CurriculumPlannerView: React.FC<CurriculumPlannerViewProps> = ({
  decks,
  stats,
  onSaveNewDeck,
  onOpenSubscription,
  onOpenAdvanced,
}) => {
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

  const curriculum = useMemo<CurriculumCategory[]>(() => {
    return levelCurricula.get(educationLevel)?.categories || [];
  }, [educationLevel, levelCurricula]);

  const allSubtopics = useMemo(() => flattenSubtopics(curriculum), [curriculum]);
  const allSelected = allSubtopics.length > 0 && selectedSubtopics.size === allSubtopics.length;

  const ownedByTopic = useMemo(() => {
    const result = new Map<string, number>();
    const subjectKey = normalize(subject);
    for (const deck of decks) {
      for (const card of deck.cards || []) {
        if (normalize(card.subject || deck.category || deck.title) !== subjectKey) continue;
        const key = normalize(card.topic || '');
        if (!key) continue;
        result.set(key, (result.get(key) || 0) + 1);
      }
    }
    return result;
  }, [decks, subject]);

  const ownedSelectedCards = useMemo(() => {
    let total = 0;
    for (const topic of selectedSubtopics) total += ownedByTopic.get(normalize(topic)) || 0;
    return total;
  }, [ownedByTopic, selectedSubtopics]);

  const readyNewEstimate = Math.max(0, (bankAvailability?.totalReadyCards || 0) - ownedSelectedCards);
  const remainingToday = remainingAICards(stats);
  const freeDailyTarget = Math.min(200, remainingToday === Number.POSITIVE_INFINITY ? 200 : remainingToday, readyNewEstimate);

  useEffect(() => {
    if (subject.trim().length < 2) {
      setDetectedLevels([]);
      setLevelCurricula(new Map());
      setSelectedSubtopics(new Set());
      setExpandedTopics(new Set());
      setBankAvailability(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsLoadingLevels(true);
      setError(null);
      try {
        const result = await identifySubjectLevels(subject.trim());
        if (cancelled) return;

        const levels = result?.levels || [];
        setDetectedLevels(levels);
        const primary = levels[0]?.level || educationLevel;
        if (!educationLevelLocked) setEducationLevel(primary as EducationLevel);

        if (levels.length > 0) {
          await loadAllLevelCurricula(subject.trim(), levels, updated => {
            if (cancelled) return;
            setLevelCurricula(new Map(updated));
          });
        } else {
          setError('Não consegui identificar o nível desta matéria. Escolha o nível manualmente.');
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Não foi possível carregar a matéria.');
      } finally {
        if (!cancelled) setIsLoadingLevels(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [subject, educationLevelLocked]);

  useEffect(() => {
    if (!curriculum.length) return;
    const next = new Set<string>(flattenSubtopics(curriculum));
    setSelectedSubtopics(next);
    setExpandedTopics(new Set(curriculum.map(category => category.category)));
  }, [educationLevel, curriculum.length]);

  useEffect(() => {
    if (!subject.trim() || selectedSubtopics.size === 0) {
      setBankAvailability(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsCheckingBank(true);
      const result = await queryBankAvailability(subject.trim(), Array.from(selectedSubtopics), educationLevel);
      if (!cancelled) {
        setBankAvailability(result);
        setIsCheckingBank(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [subject, educationLevel, selectedSubtopics]);

  const toggleAll = () => {
    setSelectedSubtopics(allSelected ? new Set<string>() : new Set<string>(allSubtopics));
  };

  const toggleSubtopic = (subtopic: string) => {
    setSelectedSubtopics(current => {
      const next = new Set(current);
      if (next.has(subtopic)) next.delete(subtopic);
      else next.add(subtopic);
      return next;
    });
  };

  const toggleTopic = (category: CurriculumCategory) => {
    const topicSubtopics = category.topics || [];
    const selectedCount = topicSubtopics.filter(item => selectedSubtopics.has(item)).length;
    setSelectedSubtopics(current => {
      const next = new Set(current);
      if (selectedCount === topicSubtopics.length) topicSubtopics.forEach(item => next.delete(item));
      else topicSubtopics.forEach(item => next.add(item));
      return next;
    });
  };

  const toggleExpanded = (category: string) => {
    setExpandedTopics(current => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const handleLevelChange = (level: EducationLevel) => {
    setEducationLevel(level);
    setEducationLevelLocked(true);
    setSelectedSubtopics(new Set<string>());
    setBankAvailability(null);
  };

  const handleGenerate = async () => {
    if (!subject.trim()) {
      setError('Digite a matéria ou assunto.');
      return;
    }
    if (selectedSubtopics.size === 0) {
      setError('Selecione pelo menos um tópico ou subtópico.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setMessage(null);

    try {
      const missingTopics = bankAvailability?.needsGeneration || [];
      if (missingTopics.length > 0) {
        await requestCurriculumPreparation({ subject: subject.trim(), educationLevel });
      }

      if (readyNewEstimate <= 0) {
        setMessage(
          missingTopics.length > 0
            ? 'A grade está selecionada. Os cards que ainda não existem no banco foram enviados para preparação pelo Content Agent. Você será beneficiado quando o conteúdo ficar disponível.'
            : 'Você já possui todos os cards disponíveis para os tópicos selecionados.'
        );
        return;
      }

      const target = stats.isPro ? readyNewEstimate : Math.min(200, remainingToday, readyNewEstimate);
      if (target <= 0) {
        setError('Você já atingiu o limite diário de 200 cards. Amanhã poderá continuar de onde parou.');
        return;
      }

      const selected = Array.from(selectedSubtopics);
      const existingFronts = new Set<string>();
      for (const deck of decks) {
        for (const card of deck.cards || []) {
          if (normalize(card.subject || deck.category || deck.title) === normalize(subject)) {
            existingFronts.add(normalize(card.front));
          }
        }
      }

      const generatedCards: Deck['cards'] = [];
      let remainingToGenerate = target;
      let safetyRounds = 0;

      while (remainingToGenerate > 0 && safetyRounds < 20) {
        safetyRounds += 1;
        const batchSize = Math.min(100, remainingToGenerate);
        const cards = await generateAICards(
          subject.trim(),
          selected,
          batchSize,
          educationLevel,
          Array.from(existingFronts),
        );
        if (!cards.length) break;

        let newCount = 0;
        for (const card of cards) {
          const key = normalize(card.front);
          if (!key || existingFronts.has(key)) continue;
          existingFronts.add(key);
          generatedCards.push(card);
          newCount += 1;
        }

        if (newCount === 0) break;
        remainingToGenerate -= newCount;
        if (cards.length < batchSize) break;
      }

      if (!generatedCards.length) {
        setMessage('Os cards selecionados já estão no seu baralho ou o banco ainda está preparando conteúdo novo.');
        return;
      }

      const title = subject.trim();
      const existingDeck = decks.find(deck => normalize(deck.title) === normalize(title));
      const updatedDeck = existingDeck
        ? { ...existingDeck, cards: [...generatedCards, ...existingDeck.cards] }
        : makeDeck(title, generatedCards);
      onSaveNewDeck(updatedDeck);

      if (stats.isPro) {
        setMessage(`✓ ${generatedCards.length} cards adicionados. O conteúdo faltante continua sendo preparado pelo Agent quando necessário.`);
      } else if (generatedCards.length >= 200 || remainingToday <= generatedCards.length) {
        setMessage(`✓ ${generatedCards.length} cards adicionados hoje. Amanhã você poderá continuar preenchendo esta mesma matéria.`);
      } else {
        setMessage(`✓ ${generatedCards.length} cards adicionados. Ainda há conteúdo disponível para continuar preenchendo a matéria.`);
      }
    } catch (err: any) {
      setError(err?.message || 'Não foi possível gerar os cards agora.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-5 animate-fade-in">
      <div className="rounded-3xl bg-gradient-to-br from-[#242a52] to-[#161a35] text-white p-6 sm:p-8 shadow-xl border border-[#6d63ff]/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#9d95ff] flex items-center gap-2"><Sparkles className="w-4 h-4" /> Estudo por matéria</p>
            <h1 className="text-2xl sm:text-3xl font-black mt-2">Monte sua grade e receba os cards certos.</h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl">Digite uma matéria, escolha o nível e selecione exatamente o que deseja estudar. O MemoriaFlash evita gerar conteúdo desnecessário e aproveita o banco compartilhado.</p>
          </div>
          {onOpenAdvanced && (
            <button type="button" onClick={onOpenAdvanced} className="shrink-0 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-bold">Gerador avançado</button>
          )}
        </div>
      </div>

      <section className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">📚 Matéria / assunto</label>
          <input value={subject} onChange={event => { setSubject(event.target.value.toUpperCase()); setEducationLevelLocked(false); }} placeholder="Ex.: Português, Direito Penal, Biologia..." className="w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-[#6658f5] focus:ring-4 focus:ring-[#6658f5]/10" />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5"><GraduationCap className="w-4 h-4" /> Nível de ensino</label>
            {isLoadingLevels && <Loader2 className="w-4 h-4 animate-spin text-[#6658f5]" />}
          </div>
          <div className="flex flex-wrap gap-2">
            {(detectedLevels.length ? detectedLevels : EDUCATION_LEVEL_META).map((level: any) => {
              const value = level.level || level.value;
              const label = level.label;
              const active = educationLevel === value;
              return <button key={value} type="button" onClick={() => handleLevelChange(value)} className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition ${active ? 'bg-[#6658f5] text-white border-[#6658f5]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#6658f5]/40'}`}>{level.icon || '🎓'} {label}</button>;
            })}
          </div>
          {detectedLevels.length > 1 && <p className="text-[11px] text-slate-500 mt-2">O nível principal é selecionado automaticamente. Você pode trocar antes de carregar a grade.</p>}
        </div>

        {curriculum.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5"><Wand2 className="w-4 h-4 text-[#6658f5]" /> Grade curricular</p>
                <p className="text-[11px] text-slate-500 mt-1">{selectedSubtopics.size} de {allSubtopics.length} subtópicos selecionados</p>
              </div>
              <button type="button" onClick={toggleAll} className="px-3.5 py-2 rounded-xl bg-[#6658f5]/10 text-[#5143d9] border border-[#6658f5]/20 text-xs font-black flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}</button>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {curriculum.map(category => {
                const subtopics = category.topics || [];
                const selectedCount = subtopics.filter(item => selectedSubtopics.has(item)).length;
                const topicSelected = selectedCount === subtopics.length && subtopics.length > 0;
                const partiallySelected = selectedCount > 0 && selectedCount < subtopics.length;
                const expanded = expandedTopics.has(category.category);
                return (
                  <div key={category.category} className="bg-white">
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <button type="button" onClick={() => toggleTopic(category)} className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${topicSelected ? 'bg-[#6658f5] border-[#6658f5]' : partiallySelected ? 'bg-[#6658f5]/20 border-[#6658f5]' : 'border-slate-300'}`} aria-label={`Selecionar ${category.category}`}>
                        {topicSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        {partiallySelected && <span className="w-2 h-0.5 rounded-full bg-[#6658f5]" />}
                      </button>
                      <button type="button" onClick={() => toggleExpanded(category.category)} className="flex-1 text-left min-w-0">
                        <span className="font-black text-sm text-slate-800">{category.category}</span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">{selectedCount}/{subtopics.length} subtópicos</span>
                      </button>
                      <button type="button" onClick={() => toggleExpanded(category.category)} className="p-2 text-slate-400">{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                    </div>
                    {expanded && (
                      <div className="px-4 pb-4 pl-12 grid sm:grid-cols-2 gap-2">
                        {subtopics.map(subtopic => {
                          const selected = selectedSubtopics.has(subtopic);
                          return <button key={subtopic} type="button" onClick={() => toggleSubtopic(subtopic)} className={`text-left px-3 py-2.5 rounded-xl border text-xs flex items-center gap-2 transition ${selected ? 'bg-[#6658f5]/8 border-[#6658f5]/30 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}><span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected ? 'bg-[#6658f5] border-[#6658f5]' : 'border-slate-300 bg-white'}`}>{selected && <Check className="w-3 h-3 text-white" />}</span><span>{subtopic}</span></button>;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isCheckingBank && selectedSubtopics.size > 0 && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Verificando cards disponíveis...</div>}

        {bankAvailability && selectedSubtopics.size > 0 && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between gap-3"><span className="text-xs font-black text-slate-700">Cards disponíveis para sua seleção</span><span className="text-sm font-black text-[#5143d9]">{readyNewEstimate}</span></div>
            <p className="text-[11px] text-slate-500">{bankAvailability.available.length} subtópicos já possuem conteúdo pronto e {bankAvailability.needsGeneration.length} ainda precisam ser preparados.</p>
            {!stats.isPro && <p className="text-[11px] text-[#5143d9] font-bold">Plano gratuito: até 200 cards por dia. Você pode voltar amanhã e continuar preenchendo esta mesma matéria.</p>}
            {stats.isPro && <p className="text-[11px] text-emerald-600 font-bold">PRO: sem limite diário de geração. O app entrega os cards disponíveis sem exigir seleção manual de quantidade.</p>}
          </div>
        )}

        {error && <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-xs flex gap-2"><X className="w-4 h-4 shrink-0" />{error}</div>}
        {message && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-xs flex gap-2"><Check className="w-4 h-4 shrink-0" />{message}</div>}

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button type="button" onClick={handleGenerate} disabled={isGenerating || !subject.trim() || selectedSubtopics.size === 0 || (!stats.isPro && freeDailyTarget <= 0 && readyNewEstimate > 0)} className="flex-1 py-4 rounded-2xl bg-[#6658f5] hover:bg-[#5849e8] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#6658f5]/20">{isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Montando seus cards...</> : <><Sparkles className="w-5 h-5" /> {stats.isPro ? 'Gerar todos os cards disponíveis' : `Gerar até ${Math.min(200, remainingToday)} cards hoje`}</>}</button>
          {!stats.isPro && onOpenSubscription && <button type="button" onClick={onOpenSubscription} className="sm:w-52 py-4 rounded-2xl border border-[#6658f5]/30 text-[#5143d9] font-black text-sm bg-[#6658f5]/5 hover:bg-[#6658f5]/10 flex items-center justify-center gap-2"><Lock className="w-4 h-4" /> Conhecer PRO</button>}
        </div>
      </section>

      <div className="text-[10px] text-slate-400 text-center px-4">O MemoriaFlash prioriza cards já existentes no banco compartilhado. Quando uma matéria ou subtópico ainda não está pronto, o Content Agent recebe uma solicitação para preparar a grade e completar o conteúdo, evitando chamadas de IA desnecessárias.</div>
    </div>
  );
};
