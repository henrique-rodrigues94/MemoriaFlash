// 📁 flashmind-ai/src/components/StudioView.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Sparkles, PlusCircle, CheckCircle2, Loader2, Plus, X, Trash2, Check,
  BookOpen, Save, HelpCircle, Lightbulb, ChevronDown,
  ChevronUp, Wand2, Tag, GraduationCap, RefreshCw,
} from 'lucide-react';
import { Deck, UserStats, Flashcard } from '../types';
import { SupportedLanguage } from '../lib/i18n';
import { ManualCardForm } from './ManualCardForm';
import { fetchAITopicSuggestions, generateAICards, EducationLevel } from '../lib/aiGenerator';
import { EDUCATION_LEVEL_META, getAvailableEducationLevels, recommendEducationLevels } from '../lib/educationLevels';
import { fetchCurriculum, CurriculumCategory } from '../services/curriculumService';
import { identifySubjectLevels, loadAllLevelCurricula, LevelInfo, LevelCurriculum } from '../services/subjectLevelsService';
import { getCuratedSubjectSuggestions, getSubjectCorrectionCandidates } from '../lib/subjectAutocomplete';
import { findClosestMatch } from '../lib/spellCheck';
import { queryBankAvailability, invalidateBankStatsCache, BankAvailability } from '../services/cardBankService';

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Spell-check suggestion pill ─────────────────────────────────────────────

function SpellSuggestion({ suggestion, onAccept }: { suggestion: string; onAccept: () => void }) {
  return (
    <div className="mt-2 px-3.5 py-2.5 rounded-xl bg-[#122131] border border-blue-500/30 flex items-center gap-2 text-xs animate-fade-in">
      <Sparkles className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
      <span className="text-[#c2c6d6]">Você quis dizer</span>
      <button
        type="button"
        onClick={onAccept}
        className="font-extrabold text-[#60a5fa] hover:text-white underline decoration-dotted underline-offset-2 cursor-pointer"
      >
        {suggestion.toUpperCase()}
      </button>
      <span className="text-[#8c91a0]">?</span>
    </div>
  );
}

// ─── Generated card preview ───────────────────────────────────────────────────

function AICardPreview({ card, index, onRemove }: { card: Flashcard; index: number; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-[#0b1a2a]/95 border border-[#adc6ff]/20 rounded-2xl overflow-hidden shadow-xl">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(e => !e)}
        onKeyDown={e => e.key === 'Enter' && setExpanded(v => !v)}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-white/5 transition cursor-pointer"
      >
        <span className="text-[11px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg px-2 py-1 shrink-0 mt-0.5">
          #{index + 1}
        </span>
        <div className="flex-1 min-w-0">
          {card.topic && (
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 truncate">{card.topic}</p>
          )}
          <p className="text-sm text-white font-semibold leading-snug">
            {card.front}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="text-slate-600 hover:text-red-400 p-0.5 transition-colors cursor-pointer"
            title="Remover card"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#424754]/40 pt-3">
          <div className="space-y-1">
            <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" /> Pergunta:
            </span>
            <p className="text-sm text-white">{card.front}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Resposta:
            </span>
            <p className="text-sm text-[#adc6ff] whitespace-pre-line">{card.back}</p>
          </div>
          {card.explanation && (
            <div className="space-y-1">
              <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" /> Explicação:
              </span>
              <p className="text-sm text-[#fbbf24]/90 whitespace-pre-line">{card.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Manual card preview ──────────────────────────────────────────────────────

function ManualCardPreview({ card, onRemove }: { card: Flashcard; onRemove: () => void }) {
  return (
    <div className="bg-[#0b1a2a]/95 border border-[#adc6ff]/20 rounded-2xl p-5 text-left space-y-3 shadow-xl">
      <div className="flex items-center justify-between border-b border-[#424754]/40 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
            {card.subject}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {card.topic}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="text-[#8c91a0] hover:text-red-400 p-1.5 transition-colors cursor-pointer"
          title="Remover visualização"
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
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const StudioView: React.FC<StudioViewProps> = ({
  decks,
  stats,
  onSaveNewDeck,
  initialDeck,
  onConsumedInitialDeck,
}) => {
  const [activeMode, setActiveMode] = useState<'ia' | 'manual'>('ia');

  // ── Gerador IA — form state ───────────────────────────────────────────────
  const [subject, setSubject] = useState('');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('medio');
  const [educationLevelLocked, setEducationLevelLocked] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [deckNameLocked, setDeckNameLocked] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [cardCount, setCardCount] = useState<number>(25);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bankAvailability, setBankAvailability] = useState<BankAvailability | null>(null);
  const topicInputRef = useRef<HTMLInputElement>(null);

  const existingDeckTopics = useMemo<Set<string>>(() => {
    if (!initialDeck?.cards?.length) return new Set();
    const s = new Set<string>();
    initialDeck.cards.forEach(c => {
      if (c.topic) s.add(c.topic);
      if (c.subject) s.add(c.subject);
    });
    return s;
  }, [initialDeck]);

  const existingFronts = useMemo<Set<string>>(() => {
    if (!initialDeck?.cards?.length) return new Set();
    return new Set(
      initialDeck.cards.map(c =>
        (c.front || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '').trim()
      ).filter(Boolean)
    );
  }, [initialDeck]);

  const [generatedAICards, setGeneratedAICards] = useState<Flashcard[]>([]);
  const [createdManualCards, setCreatedManualCards] = useState<Flashcard[]>([]);

  const existingDeckTitles = Array.from(new Set(decks.map(d => d.title)));
  const existingSubjects = Array.from(
    new Set(
      decks.flatMap(d => [
        d.category || d.title,
        ...d.cards.map(c => c.subject).filter((s): s is string => !!s),
      ])
    )
  );

  const [subjectSuggestion, setSubjectSuggestion] = useState<string | null>(null);
  const [deckNameSuggestion, setDeckNameSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (!initialDeck) return;
    const firstCardSubject = initialDeck.cards.find(c => c.subject)?.subject || '';
    const fallback = firstCardSubject || initialDeck.category || initialDeck.title || '';
    setSubject(fallback.toUpperCase());
    setDeckName(initialDeck.title.toUpperCase());
    setDeckNameLocked(true);
    onConsumedInitialDeck?.();
  }, [initialDeck?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubjectChange = (value: string) => {
    const upper = value.toUpperCase();
    setSubject(upper);
    setSubjectSuggestion(findClosestMatch(upper, [...existingSubjects, ...getSubjectCorrectionCandidates()]));
    setEducationLevelLocked(false);
    if (!deckNameLocked) {
      setDeckName(upper.trim());
      setDeckNameSuggestion(findClosestMatch(upper, existingDeckTitles));
    }
  };

  const handleSubjectBlur = () => {
    const correction = findClosestMatch(subject, [...existingSubjects, ...getSubjectCorrectionCandidates()]);
    if (correction) handleSubjectChange(correction);
  };

  const handleDeckNameChange = (value: string) => {
    const upper = value.toUpperCase();
    setDeckName(upper);
    setDeckNameLocked(true);
    setDeckNameSuggestion(findClosestMatch(upper, existingDeckTitles));
  };

  const handleClearDeckName = () => {
    setDeckName('');
    setDeckNameLocked(false);
    setDeckNameSuggestion(null);
  };

  const [detectedLevels, setDetectedLevels] = useState<LevelInfo[]>([]);
  const [levelCurricula, setLevelCurricula] = useState<Map<EducationLevel, LevelCurriculum>>(new Map());
  const [activeLevel, setActiveLevel] = useState<EducationLevel | null>(null);
  const [isLevelsLoading, setIsLevelsLoading] = useState(false);

  const curatedCurriculum: CurriculumCategory[] | null = useMemo(() => {
    if (!activeLevel) return null;
    const lc = levelCurricula.get(activeLevel);
    return lc?.categories?.length ? lc.categories : null;
  }, [activeLevel, levelCurricula]);

  const isCurriculumLoading = useMemo(() => {
    if (!activeLevel) return isLevelsLoading;
    return levelCurricula.get(activeLevel)?.loading ?? isLevelsLoading;
  }, [activeLevel, levelCurricula, isLevelsLoading]);

  useEffect(() => {
    if (subject.trim().length < 2) {
      setDetectedLevels([]);
      setLevelCurricula(new Map());
      setActiveLevel(null);
      setSuggestedTopics([]);
      return;
    }

    let cancelled = false;
    setIsLevelsLoading(true);

    const timer = setTimeout(async () => {
      const levelsResult = await identifySubjectLevels(subject.trim());
      if (cancelled) return;

      if (!levelsResult?.levels?.length) {
        setIsLevelsLoading(false);
        try {
          const suggestions = await fetchAITopicSuggestions(subject, educationLevel);
          if (!cancelled) setSuggestedTopics(suggestions.filter(t => !topics.includes(t)));
        } catch { /* silencioso */ }
        return;
      }

      const levels = levelsResult.levels;
      setDetectedLevels(levels);
      setSuggestedTopics([]);

      const primaryLevel = levels[0].level;
      if (!cancelled) {
        setActiveLevel(primaryLevel);
        if (!educationLevelLocked) setEducationLevel(primaryLevel);
        setIsLevelsLoading(false);
      }

      await loadAllLevelCurricula(subject.trim(), levels, (updated) => {
        if (!cancelled) setLevelCurricula(updated);
      });
    }, 700);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [subject]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!subject.trim() || topics.length === 0) {
      setBankAvailability(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const availability = await queryBankAvailability(subject.trim(), topics, educationLevel);
      if (!cancelled) setBankAvailability(availability);
    }, 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [subject, topics, educationLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  const curatedSubjectSuggestions = useMemo(() => getCuratedSubjectSuggestions(subject), [subject]);

  const handleEducationLevelChange = (level: EducationLevel) => {
    setEducationLevel(level);
    setEducationLevelLocked(true);
    setActiveLevel(level);
    setTopics([]);
  };

  const handleAddTopic = useCallback((topicToAdd?: string) => {
    const target = (topicToAdd || topicInput).trim();
    if (target && !topics.includes(target)) {
      setTopics(prev => [...prev, target]);
      setTopicInput('');
      topicInputRef.current?.focus();
    }
  }, [topicInput, topics]);

  const handleRemoveTopic = (index: number) => setTopics(prev => prev.filter((_, i) => i !== index));

  const handleToggleTopic = (topic: string) => {
    setTopics(prev => (prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]));
  };

  const handleAddManualCard = (newCard: Flashcard, targetDeckName: string) => {
    const existing = decks.find(d => d.title.trim().toLowerCase() === targetDeckName.trim().toLowerCase());
    if (existing) {
      onSaveNewDeck({ ...existing, cards: [newCard, ...existing.cards] });
    } else {
      onSaveNewDeck({
        id: `deck-${Date.now()}`,
        title: targetDeckName.trim(),
        category: newCard.subject || 'Geral',
        description: '',
        color: '#60a5fa',
        accentBorder: 'border-l-primary',
        cards: [newCard],
        createdAt: new Date().toISOString(),
      });
    }
    setCreatedManualCards(prev => [newCard, ...prev]);
    showSuccess(`🎉 Card adicionado ao baralho "${targetDeckName}"!`);
  };

  // ── Geração IA ────────────────────────────────────────────────────────────
  // O backend é a autoridade para o limite. O frontend apenas evita pedidos
  // que ultrapassem o saldo gratuito conhecido e informa o usuário.
  const FREE_GENERATION_LIMIT = 200;
  const remainingFreeCards = Math.max(0, FREE_GENERATION_LIMIT - (stats.aiCardsGenerated || 0));

  const handleGenerateCards = async () => {
    if (!subject.trim()) {
      setErrorMsg('Por favor, digite a Matéria / Assunto.');
      return;
    }

    if (!stats.isPro && remainingFreeCards <= 0) {
      setErrorMsg('Você atingiu o limite gratuito de 200 cards gerados com IA. Faça upgrade para continuar gerando cards ilimitados.');
      return;
    }

    if (!stats.isPro && cardCount > remainingFreeCards) {
      setErrorMsg(`Você possui apenas ${remainingFreeCards} card${remainingFreeCards === 1 ? '' : 's'} restante${remainingFreeCards === 1 ? '' : 's'} no plano gratuito. Escolha uma quantidade menor ou faça upgrade para gerar ilimitadamente.`);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const cards = await generateAICards(
        subject.trim(),
        topics,
        cardCount,
        educationLevel,
        Array.from(existingFronts),
      );

      if (!cards.length) {
        throw new Error('A IA não retornou nenhum flashcard. Tente novamente com outro assunto ou tópico.');
      }

      setGeneratedAICards(cards);
      invalidateBankStatsCache(subject.trim());
      setBankAvailability(null);
      showSuccess(`🎉 ${cards.length} flashcards gerados com sucesso usando IA!`);
    } catch (err: any) {
      console.error('[StudioView] Erro ao gerar cards com IA:', err);
      setErrorMsg(err?.message || 'Ocorreu um erro ao gerar os cards com IA.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAllAICards = () => {
    if (!generatedAICards.length) return;
    const title = (deckName.trim() || subject.trim() || generatedAICards[0].subject || 'Geral');
    const existing = decks.find(d => d.title.toLowerCase() === title.toLowerCase());
    if (existing) {
      onSaveNewDeck({ ...existing, cards: [...generatedAICards, ...existing.cards] });
    } else {
      onSaveNewDeck({
        id: `deck-${Date.now()}`,
        title,
        category: subject.trim() || generatedAICards[0].subject || 'Geral',
        description: '',
        color: '#60a5fa',
        accentBorder: 'border-l-primary',
        cards: generatedAICards,
        createdAt: new Date().toISOString(),
      });
    }
    showSuccess(`🎉 ${generatedAICards.length} flashcards salvos em "${title}"!`);
    setGeneratedAICards([]);
    setTopics([]);
    setSubject('');
    setDeckName('');
    setDeckNameLocked(false);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="max-w-3xl mx-auto pb-24 animate-fade-in space-y-6">
      <div className="flex justify-center">
        <div className="bg-[#0b1a2a] p-1.5 rounded-2xl border border-[#424754]/40 flex items-center gap-2 shadow-lg">
          {(['ia', 'manual'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`px-6 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeMode === mode ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-[#8c91a0] hover:text-white'
              }`}
            >
              {mode === 'ia' ? <><Sparkles className="w-4 h-4" /> Gerador IA</> : <><PlusCircle className="w-4 h-4" /> Manual</>}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#0b1a2a]/90 backdrop-blur-xl border border-[#adc6ff]/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in">
            <X className="w-4 h-4 text-rose-400 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        {activeMode === 'manual' ? (
          <ManualCardForm existingDecks={existingDeckTitles} subjects={existingSubjects} onAddCardDirectly={handleAddManualCard} />
        ) : (
          <div className="space-y-5 text-left">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5">
                📚 Matéria / Assunto <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="subject-suggestions"
                  placeholder="Ex: DIREITO PENAL, BIOLOGIA, MATEMÁTICA…"
                  value={subject}
                  onChange={e => handleSubjectChange(e.target.value)}
                  onBlur={handleSubjectBlur}
                  className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white placeholder-[#8c91a0] focus:outline-none focus:border-[#60a5fa] text-sm uppercase"
                />
                {subject.trim().length >= 2 && (
                  <div className="absolute inset-y-0 right-3 flex items-center text-[#60a5fa] pointer-events-none"><Sparkles className="w-4 h-4" /></div>
                )}
                <datalist id="subject-suggestions">
                  {curatedSubjectSuggestions.map(s => <option key={`curated-${s}`} value={s} />)}
                  {existingSubjects.filter(s => !curatedSubjectSuggestions.includes(s)).map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              {subjectSuggestion && subjectSuggestion.toUpperCase() !== subject.trim().toUpperCase() && (
                <SpellSuggestion suggestion={subjectSuggestion} onAccept={() => handleSubjectChange(subjectSuggestion)} />
              )}

              {/* ── Nível de Ensino ── */}
              <div className="mt-4">
                <label htmlFor="education-level" className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5">
                  🎓 Nível de Ensino
                </label>
                <select
                  id="education-level"
                  value={educationLevel}
                  onChange={e => handleEducationLevelChange(e.target.value as EducationLevel)}
                  className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#60a5fa] text-sm cursor-pointer"
                >
                  {EDUCATION_LEVEL_META
                    .filter(level => getAvailableEducationLevels(subject).includes(level.value))
                    .map(level => (
                      <option key={level.value} value={level.value} className="bg-[#051424] text-white">
                        {level.icon} {level.label}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Escolha o nível para ajustar a profundidade e a linguagem dos cards gerados pela IA.
                </p>
              </div>

              {subject.trim().length >= 2 && (
                <div className="mt-2.5">
                  {isLevelsLoading && detectedLevels.length === 0 && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      Identificando níveis para <strong className="text-blue-300">{subject.trim()}</strong>…
                    </div>
                  )}
                  {detectedLevels.length > 0 && (
                    <div className="space-y-1">
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#8c91a0]"><GraduationCap className="w-3 h-3" /> Níveis identificados pela IA:</span>
                      <div className="flex items-center flex-wrap gap-1.5">
                        {detectedLevels.map((levelInfo, i) => {
                          const lc = levelCurricula.get(levelInfo.level);
                          const isActive = activeLevel === levelInfo.level;
                          const isLoading = lc?.loading ?? true;
                          const hasContent = (lc?.categories?.length ?? 0) > 0;
                          return (
                            <button key={levelInfo.level} type="button" onClick={() => { setActiveLevel(levelInfo.level); setEducationLevel(levelInfo.level); setEducationLevelLocked(true); }} title={levelInfo.reason}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition cursor-pointer ${isActive ? 'bg-[#60a5fa]/20 border-[#60a5fa] text-[#60a5fa] shadow-sm shadow-blue-500/20' : 'bg-[#051424] border-[#424754]/50 text-[#c2c6d6] hover:border-[#60a5fa]/50 hover:text-white'}`}>
                              <span>{levelInfo.icon}</span>{levelInfo.label}
                              {isLoading ? <Loader2 className="w-3 h-3 animate-spin opacity-50" /> : hasContent ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> : null}
                              {i === 0 && detectedLevels.length > 1 && <span className="text-[8px] font-extrabold text-emerald-400 uppercase leading-none">principal</span>}
                            </button>
                          );
                        })}
                      </div>
                      {activeLevel && detectedLevels.find(l => l.level === activeLevel)?.reason && (
                        <p className="text-[10px] text-slate-500 italic mt-0.5">💡 {detectedLevels.find(l => l.level === activeLevel)?.reason}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#adc6ff]">🗂️ Nome do Baralho <span className="text-[#8c91a0] font-normal normal-case tracking-normal">(opcional — usa a Matéria se vazio)</span></label>
                {deckName && <button type="button" onClick={handleClearDeckName} className="text-[10px] text-[#8c91a0] hover:text-rose-400 flex items-center gap-1 transition"><X className="w-3 h-3" /> Limpar</button>}
              </div>
              <div className="relative">
                <input type="text" list="deck-name-suggestions" placeholder={subject.trim() ? subject.trim() : 'Ex: DIREITO PENAL — PARTE GERAL…'} value={deckName} onChange={e => handleDeckNameChange(e.target.value)} className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white placeholder-[#8c91a0]/60 focus:outline-none focus:border-[#60a5fa] text-sm uppercase" />
                <datalist id="deck-name-suggestions">{existingDeckTitles.map(s => <option key={s} value={s} />)}</datalist>
              </div>
              {deckNameSuggestion && deckNameSuggestion.toUpperCase() !== deckName.trim().toUpperCase() && <SpellSuggestion suggestion={deckNameSuggestion} onAccept={() => handleDeckNameChange(deckNameSuggestion)} />}
              {subject.trim() && <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1"><BookOpen className="w-3 h-3" /> Baralho: <span className="text-slate-300 font-semibold ml-1">{(deckName.trim() || subject.trim()).toUpperCase()}</span></p>}
            </div>

            {isCurriculumLoading && subject.trim().length >= 2 && !curatedCurriculum && (
              <div className="p-3.5 bg-[#051424]/80 rounded-2xl border border-blue-500/20 animate-fade-in flex items-center gap-3"><Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" /><span className="text-[11px] text-[#8c91a0]">Carregando grade curricular{activeLevel && detectedLevels.find(l => l.level === activeLevel) && <> — {detectedLevels.find(l => l.level === activeLevel)!.icon} <strong className="text-blue-300">{detectedLevels.find(l => l.level === activeLevel)!.label}</strong></>}…</span></div>
            )}
            {curatedCurriculum ? (
              <div className="p-3.5 bg-[#051424]/80 rounded-2xl border border-blue-500/20 animate-fade-in space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="block text-[11px] font-bold text-[#60a5fa] uppercase tracking-wide flex items-center gap-1.5"><Wand2 className="w-3.5 h-3.5" />{activeLevel && detectedLevels.find(l => l.level === activeLevel) ? <>{detectedLevels.find(l => l.level === activeLevel)!.icon} Grade {detectedLevels.find(l => l.level === activeLevel)!.label} — clique para selecionar:</> : <>Grade Curricular — clique para selecionar os tópicos:</>}</span>
                  {existingDeckTopics.size > 0 && <div className="flex items-center gap-2 flex-wrap text-[10px]"><span className="flex items-center gap-1 text-amber-400"><RefreshCw className="w-3 h-3" /> Já tem cards (gerará novos diferentes)</span><span className="flex items-center gap-1 text-emerald-400"><Check className="w-3 h-3" /> Selecionado</span></div>}
                </div>
                {curatedCurriculum.map((cat: CurriculumCategory) => (
                  <div key={cat.category} className="space-y-1.5"><span className="block text-[11px] font-bold text-[#8c91a0] uppercase tracking-wide">{cat.category}</span><div className="flex flex-wrap gap-2">{cat.topics.map((sug) => {
                    const isSelected = topics.includes(sug); const alreadyInDeck = existingDeckTopics.has(sug);
                    return <button key={sug} type="button" onClick={() => handleToggleTopic(sug)} title={alreadyInDeck ? 'Este tópico já tem cards no baralho — novos cards serão diferentes' : undefined}
                      className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 ${isSelected ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300' : alreadyInDeck ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-[#0e2742] hover:bg-[#163a61] text-[#adc6ff] border-blue-500/30'}`}>
                      {isSelected ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : alreadyInDeck ? <RefreshCw className="w-3 h-3 text-amber-400" /> : <Plus className="w-3.5 h-3.5 text-blue-400" />}{sug}{alreadyInDeck && !isSelected && <span className="text-[9px] font-bold text-amber-400/70 bg-amber-500/10 px-1 rounded">+novo</span>}
                    </button>;
                  })}</div></div>
                ))}
              </div>
            ) : !isCurriculumLoading && suggestedTopics.length > 0 && (
              <div className="p-3.5 bg-[#051424]/80 rounded-2xl border border-blue-500/20 animate-fade-in"><span className="block text-[11px] font-bold text-[#60a5fa] mb-2 uppercase tracking-wide flex items-center gap-1.5"><Wand2 className="w-3.5 h-3.5" /> Sugestões de Tópicos da IA:</span><div className="flex flex-wrap gap-2">{suggestedTopics.map((sug, idx) => <button key={idx} type="button" onClick={() => handleAddTopic(sug)} className="px-3 py-1.5 rounded-xl bg-[#0e2742] hover:bg-[#163a61] text-[#adc6ff] border border-blue-500/30 text-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105"><Plus className="w-3.5 h-3.5 text-blue-400" /> {sug}</button>)}</div></div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Tópicos de estudo <span className="text-[#8c91a0] font-normal normal-case tracking-normal">(opcional)</span></label>
              <div className="flex gap-2"><input ref={topicInputRef} type="text" placeholder="Ex: Parte Geral, Mitocôndrias…" value={topicInput} onChange={e => setTopicInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())} className="flex-1 bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white placeholder-[#8c91a0] focus:outline-none focus:border-[#60a5fa] text-sm" /><button type="button" onClick={() => handleAddTopic()} className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-[#424754]/50 cursor-pointer transition">+ Adicionar</button></div>
              {topics.length > 0 && <div className="flex flex-wrap gap-2 mt-3">{topics.map((t, idx) => <span key={idx} className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs flex items-center gap-1.5">{t}<button onClick={() => handleRemoveTopic(idx)} className="hover:text-white cursor-pointer"><X className="w-3.5 h-3.5" /></button></span>)}</div>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5">Quantidade de Cards</label>
              <div className="grid grid-cols-3 gap-2">{([25, 50, 100] as const).map(n => <button key={n} type="button" onClick={() => setCardCount(n)} className={`py-3 rounded-xl text-sm font-semibold border transition ${cardCount === n ? 'bg-blue-600/30 border-blue-500 text-blue-200' : 'bg-[#051424] border-[#424754]/50 text-[#8c91a0] hover:border-slate-500 hover:text-white'}`}>{n}<span className="block text-[10px] opacity-70 mt-0.5">{n === 25 ? 'Rápido' : n === 50 ? 'Completo' : 'Intensivo'}</span></button>)}</div>
            </div>

            <div className="rounded-xl p-3.5 border border-blue-500/20 bg-blue-500/10">
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><Sparkles className="w-4 h-4 text-blue-400 shrink-0" /><div className="min-w-0"><p className="text-xs font-bold text-blue-300">{stats.isPro ? 'Geração ilimitada com IA' : 'Geração com IA'}</p><p className="text-[11px] text-slate-400">{stats.isPro ? 'Seu plano permite gerar cards ilimitadamente.' : `Plano gratuito: ${remainingFreeCards} de 200 cards restantes.`}</p></div></div>{!stats.isPro && <span className="text-xs font-extrabold text-blue-300 whitespace-nowrap">{remainingFreeCards}/200</span>}</div>
              {!stats.isPro && <div className="mt-2.5 h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, ((stats.aiCardsGenerated || 0) / 200) * 100)}%` }} /></div>}
            </div>

            {bankAvailability && topics.length > 0 && <div className="animate-fade-in rounded-xl border px-4 py-3 text-xs space-y-1.5 bg-[#051424]/80 border-blue-500/20"><div className="flex items-center gap-2 font-bold text-[#60a5fa]"><span>🗄️</span><span>Banco de cards compartilhado</span></div>{bankAvailability.available.length > 0 && <p className="text-emerald-400">✓ {bankAvailability.available.length} tópico{bankAvailability.available.length !== 1 ? 's' : ''} com cards prontos no banco ({bankAvailability.totalReadyCards} cards) — sem custo de IA</p>}{bankAvailability.needsGeneration.length > 0 && <p className="text-amber-400">⚡ {bankAvailability.needsGeneration.length} tópico{bankAvailability.needsGeneration.length !== 1 ? 's' : ''} precisam de geração via IA</p>}</div>}

            <button type="button" onClick={handleGenerateCards} disabled={isLoading || !subject.trim() || (!stats.isPro && remainingFreeCards <= 0)} className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all mt-4 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]">
              {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Criando {cardCount} Flashcards com IA…</> : <><Sparkles className="w-5 h-5" /> Gerar {cardCount} Flashcards com IA</>}
            </button>
          </div>
        )}
      </div>

      {activeMode === 'manual' && createdManualCards.length > 0 && (
        <div className="space-y-4 pt-2 animate-fade-in"><div className="flex items-center justify-between px-2"><h3 className="text-base font-extrabold uppercase tracking-wider text-[#adc6ff] flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-400" /> Cards Criados ({createdManualCards.length})</h3><button type="button" onClick={() => setCreatedManualCards([])} className="text-xs text-[#8c91a0] hover:text-rose-400 transition">Limpar lista</button></div><div className="space-y-3">{createdManualCards.map(card => <ManualCardPreview key={card.id} card={card} onRemove={() => setCreatedManualCards(prev => prev.filter(c => c.id !== card.id))} />)}</div></div>
      )}

      {activeMode === 'ia' && generatedAICards.length > 0 && (
        <div className="space-y-4 pt-2 animate-fade-in"><div className="flex items-center justify-between px-2"><h3 className="text-base font-extrabold uppercase tracking-wider text-[#adc6ff] flex items-center gap-2"><BookOpen className="w-5 h-5 text-orange-400" /> Cards Gerados ({generatedAICards.length})</h3><button type="button" onClick={() => setGeneratedAICards([])} className="text-xs text-[#8c91a0] hover:text-rose-400 transition">Descartar todos</button></div><div className="space-y-3">{generatedAICards.map((card, index) => <AICardPreview key={card.id} card={card} index={index} onRemove={() => setGeneratedAICards(prev => prev.filter(c => c.id !== card.id))} />)}</div><button type="button" onClick={handleSaveAllAICards} className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-base shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"><Save className="w-5 h-5" /> Salvar {generatedAICards.length} Cards no Baralho</button></div>
      )}
    </div>
  );
};
