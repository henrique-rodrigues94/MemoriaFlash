// 📁 flashmind-ai/src/components/StudioView.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Sparkles, PlusCircle, CheckCircle2, Loader2, Plus, X, Trash2, Check,
  BookOpen, Save, HelpCircle, Play, Lock, Lightbulb, ChevronDown,
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
import { hasEnoughCredits } from '../services/economy/creditsEngine';
import { ECONOMY } from '../services/economy/economyConstants';
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

// ─── Credits banner ───────────────────────────────────────────────────────────

function CreditsBanner({
  stats,
  cardCount,
  onOpenAdMob,
}: {
  stats: UserStats;
  /** Quando informado, mostra o custo total da geração (cardCount × custo por card) em vez do custo unitário. */
  cardCount?: number;
  onOpenAdMob?: () => void;
}) {
  if (stats.isPro) return null;
  const credits = stats.aiCredits || 0;
  const hasCredits = credits > 0;
  // BUG CORRIGIDO: o custo mostrado (e cobrado — ver handleGenerateCards)
  // era um valor fixo de 1 crédito por geração inteira, não importava se o
  // usuário pedia 10 ou 100 cards. Agora reflete 1 crédito POR CARD gerado.
  const totalCost = (cardCount || 1) * ECONOMY.COST_GENERATE_DECK;
  return (
    <div className={`rounded-xl p-3.5 flex items-center justify-between gap-3 border ${
      hasCredits ? 'bg-blue-500/10 border-blue-500/30' : 'bg-amber-500/10 border-amber-500/30'
    }`}>
      <div className="flex items-center gap-2">
        {hasCredits
          ? <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          : <Lock className="w-4 h-4 text-amber-400 shrink-0" />}
        <div>
          <p className={`text-xs font-bold ${hasCredits ? 'text-blue-300' : 'text-amber-300'}`}>
            {hasCredits
              ? `${credits} crédito${credits !== 1 ? 's' : ''} disponí${credits !== 1 ? 'veis' : 'vel'}`
              : 'Sem créditos — assista um vídeo para ganhar'}
          </p>
          <p className="text-[11px] text-slate-400">
            {hasCredits
              ? `${ECONOMY.COST_GENERATE_DECK} crédito por card gerado${cardCount ? ` · esta geração custa ${totalCost} crédito${totalCost !== 1 ? 's' : ''}` : ''}`
              : 'Créditos são necessários para usar a IA'}
          </p>
        </div>
      </div>
      {!hasCredits && onOpenAdMob && (
        <button
          type="button"
          onClick={onOpenAdMob}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold whitespace-nowrap hover:bg-amber-500/30 transition"
        >
          <Play className="w-3.5 h-3.5 fill-current" /> Ganhar créditos
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const StudioView: React.FC<StudioViewProps> = ({
  decks,
  stats,
  onSaveNewDeck,
  onDeductCredit,
  onOpenAdMob,
  initialDeck,
  onConsumedInitialDeck,
}) => {
  const [activeMode, setActiveMode] = useState<'ia' | 'manual'>('ia');

  // ── Gerador IA — form state ───────────────────────────────────────────────
  const [subject, setSubject] = useState('');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('medio');
  // true quando o usuário escolheu o nível manualmente (não sincroniza mais
  // com a recomendação automática enquanto ele não trocar de matéria de novo)
  const [educationLevelLocked, setEducationLevelLocked] = useState(false);
  const [deckName, setDeckName] = useState('');
  // true quando o usuário editou o nome manualmente (não sincroniza com matéria)
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

  // Tópicos que JÁ existem no baralho atual (quando editando um deck existente).
  // Usado para destacar visualmente esses tópicos na grade curricular e
  // garantir que a geração produza cards DIFERENTES dos já existentes.
  const existingDeckTopics = useMemo<Set<string>>(() => {
    if (!initialDeck?.cards?.length) return new Set();
    const s = new Set<string>();
    initialDeck.cards.forEach(c => {
      if (c.topic) s.add(c.topic);
      if (c.subject) s.add(c.subject);
    });
    return s;
  }, [initialDeck]);

  // Fronts dos cards já existentes no baralho — usados para deduplicação
  // na geração: a IA não deve gerar cards com a mesma pergunta.
  const existingFronts = useMemo<Set<string>>(() => {
    if (!initialDeck?.cards?.length) return new Set();
    return new Set(
      initialDeck.cards.map(c =>
        (c.front || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '').trim()
      ).filter(Boolean)
    );
  }, [initialDeck]);

  // ── Cards gerados / criados ───────────────────────────────────────────────
  const [generatedAICards, setGeneratedAICards] = useState<Flashcard[]>([]);
  const [createdManualCards, setCreatedManualCards] = useState<Flashcard[]>([]);

  // ── Autocomplete lists ────────────────────────────────────────────────────
  const existingDeckTitles = Array.from(new Set(decks.map(d => d.title)));
  const existingSubjects = Array.from(
    new Set(
      decks.flatMap(d => [
        d.category || d.title,
        ...d.cards.map(c => c.subject).filter((s): s is string => !!s),
      ])
    )
  );

  // ── Spell-check suggestions ───────────────────────────────────────────────
  const [subjectSuggestion, setSubjectSuggestion] = useState<string | null>(null);
  const [deckNameSuggestion, setDeckNameSuggestion] = useState<string | null>(null);

  // ── Pré-preenche campos quando vem do Gerenciador de Deck ─────────────────
  useEffect(() => {
    if (!initialDeck) return;
    const firstCardSubject = initialDeck.cards.find(c => c.subject)?.subject || '';
    const fallback = firstCardSubject || initialDeck.category || initialDeck.title || '';
    setSubject(fallback.toUpperCase());
    setDeckName(initialDeck.title.toUpperCase());
    setDeckNameLocked(true);
    onConsumedInitialDeck?.();
  }, [initialDeck?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers: subject & deckName ──────────────────────────────────────────
  const handleSubjectChange = (value: string) => {
    const upper = value.toUpperCase();
    setSubject(upper);
    setSubjectSuggestion(findClosestMatch(
      upper,
      [...existingSubjects, ...getSubjectCorrectionCandidates()],
    ));
    setEducationLevelLocked(false); // assunto novo → recalcula a recomendação de nível
    // Sincroniza nome do baralho enquanto o usuário não tiver editado manualmente
    if (!deckNameLocked) {
      setDeckName(upper.trim());
      setDeckNameSuggestion(findClosestMatch(upper, existingDeckTitles));
    }
  };

  // Corrige automaticamente apenas erros de digitação bem próximos quando o
  // usuário conclui o campo. Enquanto ele digita, a sugestão continua visível
  // e não interfere em assuntos novos ou mais específicos.
  const handleSubjectBlur = () => {
    const correction = findClosestMatch(
      subject,
      [...existingSubjects, ...getSubjectCorrectionCandidates()],
    );
    if (correction) handleSubjectChange(correction);
  };

  const handleDeckNameChange = (value: string) => {
    const upper = value.toUpperCase();
    setDeckName(upper);
    setDeckNameLocked(true); // usuário editou — não sobrescreve mais
    setDeckNameSuggestion(findClosestMatch(upper, existingDeckTitles));
  };

  // Limpa o nome do baralho → volta a sincronizar com a matéria
  const handleClearDeckName = () => {
    setDeckName('');
    setDeckNameLocked(false);
    setDeckNameSuggestion(null);
  };

  // ── Identificação de níveis + carregamento de currículos ─────────────────
  // A IA identifica quais níveis fazem sentido para a matéria digitada.
  // Todos os currículos são carregados em paralelo; o usuário navega por abas.
  const [detectedLevels, setDetectedLevels] = useState<LevelInfo[]>([]);
  const [levelCurricula, setLevelCurricula] = useState<Map<EducationLevel, LevelCurriculum>>(new Map());
  const [activeLevel, setActiveLevel] = useState<EducationLevel | null>(null);
  const [isLevelsLoading, setIsLevelsLoading] = useState(false);

  // Currículo da aba ativa (para compatibilidade com o restante da UI)
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
      // 1. IA identifica os níveis relevantes
      const levelsResult = await identifySubjectLevels(subject.trim());
      if (cancelled) return;

      if (!levelsResult?.levels?.length) {
        // Fallback: sugestões simples sem currículo
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

      // Sincroniza educationLevel com o nível principal detectado
      const primaryLevel = levels[0].level;
      if (!cancelled) {
        setActiveLevel(primaryLevel);
        setEducationLevel(primaryLevel);
        setIsLevelsLoading(false);
      }

      // 2. Carrega todos os currículos em paralelo
      await loadAllLevelCurricula(subject.trim(), levels, (updated) => {
        if (!cancelled) setLevelCurricula(updated);
      });
    }, 700);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [subject]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Consulta disponibilidade no banco de cards ────────────────────────────
  // Quando matéria + tópicos mudam, consulta o banco para saber quantos cards
  // já existem prontos (sem precisar de IA).
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
  // Ex.: "Direito" não é uma matéria de Fundamental/Médio — nesse caso esses
  // chips ficam de fora, sobrando Faculdade/Concurso/Técnico.
  // Sugestões curadas de subáreas pra matéria ampla digitada (ex.: "direito" → "Direito Penal"…)
  const curatedSubjectSuggestions = useMemo(
    () => getCuratedSubjectSuggestions(subject),
    [subject],
  );

  // Nota: detecção de níveis agora feita pela IA via identifySubjectLevels().

  // Trocar de nível de ensino muda o universo de tópicos válidos (ex: um
  // tópico de "Cálculo Diferencial" escolhido no nível Faculdade não faz
  // sentido se o usuário muda para Escola) — limpa a seleção manual ao
  // trocar de nível para evitar tópicos incoerentes com o pedido.
  const handleEducationLevelChange = (level: EducationLevel) => {
    setEducationLevel(level);
    setEducationLevelLocked(true);
    setActiveLevel(level);
    setTopics([]);
  };

  // ── Tópicos ───────────────────────────────────────────────────────────────
  const handleAddTopic = useCallback((topicToAdd?: string) => {
    const target = (topicToAdd || topicInput).trim();
    if (target && !topics.includes(target)) {
      setTopics(prev => [...prev, target]);
      setTopicInput('');
      topicInputRef.current?.focus();
    }
  }, [topicInput, topics]);

  const handleRemoveTopic = (index: number) =>
    setTopics(prev => prev.filter((_, i) => i !== index));

  const handleToggleTopic = (topic: string) => {
    setTopics(prev => (prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]));
  };

  // ── Card manual → persiste no baralho ────────────────────────────────────
  const handleAddManualCard = (newCard: Flashcard, targetDeckName: string) => {
    const existing = decks.find(
      d => d.title.trim().toLowerCase() === targetDeckName.trim().toLowerCase()
    );
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
  const handleGenerateCards = async () => {
    if (!subject.trim()) {
      setErrorMsg('Por favor, digite a Matéria / Assunto.');
      return;
    }
    // BUG CORRIGIDO: o custo era fixo (1 crédito), não importava quantos
    // cards o usuário pedisse (10, 25, 50 ou 100). Agora é 1 crédito POR
    // CARD, calculado sobre a quantidade selecionada — e a checagem de
    // saldo usa esse total, não o preço unitário.
    const estimatedCost = cardCount * ECONOMY.COST_GENERATE_DECK;
    if (!hasEnoughCredits(stats, estimatedCost)) {
      onOpenAdMob?.();
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
      // Cobra pela quantidade de cards REALMENTE entregues (o backend pode
      // devolver menos que o pedido após remover duplicatas — ver
      // generateFlashcards.ts), nunca pelo que foi apenas solicitado.
      const actualCost = cards.length * ECONOMY.COST_GENERATE_DECK;
      onDeductCredit?.(actualCost);
      setGeneratedAICards(cards);
      // Invalida cache de stats do banco (novos cards foram gerados/salvos)
      invalidateBankStatsCache(subject.trim());
      setBankAvailability(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ocorreu um erro ao gerar os cards com IA.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Salvar cards gerados pela IA ──────────────────────────────────────────
  const handleSaveAllAICards = () => {
    if (!generatedAICards.length) return;
    // Nome do baralho: campo manual → matéria → fallback 'Geral'
    const title = (deckName.trim() || subject.trim() || generatedAICards[0].subject || 'Geral');
    const existing = decks.find(d => d.title.toLowerCase() === title.toLowerCase());
    if (existing) {
      onSaveNewDeck({ ...existing, cards: [...generatedAICards, ...existing.cards] });
    } else {
      onSaveNewDeck({
        id: `deck-${Date.now()}`,
        title,
        // BUG CORRIGIDO: usava generatedAICards[0].topic — o TÓPICO do
        // primeiro card (ex.: "Mitocôndria") em vez da MATÉRIA digitada
        // (ex.: "Biologia"). Isso poluía deck.category com um valor de
        // tópico, que depois vazava de volta para o campo "Matéria" ao
        // reabrir o deck e clicar em "Adicionar Cartão" (StudioView
        // pré-preenche a Matéria a partir de initialDeck.category quando
        // os cards não têm .subject próprio — ver useEffect abaixo).
        category: subject.trim() || generatedAICards[0].subject || 'Geral',
        description: '',
        color: '#60a5fa',
        accentBorder: 'border-l-primary',
        cards: generatedAICards,
        createdAt: new Date().toISOString(),
      });
    }
    showSuccess(`🎉 ${generatedAICards.length} flashcards salvos em "${title}"!`);
    // Reset form
    setGeneratedAICards([]);
    setTopics([]);
    setSubject('');
    setDeckName('');
    setDeckNameLocked(false);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // BUG CORRIGIDO: comparava o saldo só com o preço unitário (1), então
  // com apenas 1 crédito o botão ficava habilitado mesmo pedindo 100 cards
  // — e a geração era então bloqueada só depois, dentro de
  // handleGenerateCards. Agora reflete o custo real da quantidade selecionada.
  const noCredits = !stats.isPro && (stats.aiCredits || 0) < cardCount * ECONOMY.COST_GENERATE_DECK;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto pb-24 animate-fade-in space-y-6">

      {/* Tab switcher */}
      <div className="flex justify-center">
        <div className="bg-[#0b1a2a] p-1.5 rounded-2xl border border-[#424754]/40 flex items-center gap-2 shadow-lg">
          {(['ia', 'manual'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`px-6 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeMode === mode
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-[#8c91a0] hover:text-white'
              }`}
            >
              {mode === 'ia'
                ? <><Sparkles className="w-4 h-4" /> Gerador IA</>
                : <><PlusCircle className="w-4 h-4" /> Manual</>}
            </button>
          ))}
        </div>
      </div>

      {/* Form card */}
      <div className="bg-[#0b1a2a]/90 backdrop-blur-xl border border-[#adc6ff]/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">

        {/* Feedback banners */}
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
          <ManualCardForm
            existingDecks={existingDeckTitles}
            subjects={existingSubjects}
            onAddCardDirectly={handleAddManualCard}
          />
        ) : (
          <div className="space-y-5 text-left">

            {/* ── Matéria (obrigatório) ── */}
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
                  <div className="absolute inset-y-0 right-3 flex items-center text-[#60a5fa] pointer-events-none">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
                <datalist id="subject-suggestions">
                  {/* Autocomplete curado (ex.: "direito" → "Direito Penal", "Direito Civil"…)
                      aparece primeiro; matérias que o usuário já usou completam a lista. */}
                  {curatedSubjectSuggestions.map(s => <option key={`curated-${s}`} value={s} />)}
                  {existingSubjects
                    .filter(s => !curatedSubjectSuggestions.includes(s))
                    .map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              {subjectSuggestion && subjectSuggestion.toUpperCase() !== subject.trim().toUpperCase() && (
                <SpellSuggestion
                  suggestion={subjectSuggestion}
                  onAccept={() => handleSubjectChange(subjectSuggestion)}
                />
              )}

              {/* ── Níveis detectados pela IA ── */}
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
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#8c91a0]">
                        <GraduationCap className="w-3 h-3" /> Níveis identificados pela IA:
                      </span>
                      <div className="flex items-center flex-wrap gap-1.5">
                        {detectedLevels.map((levelInfo, i) => {
                          const lc = levelCurricula.get(levelInfo.level);
                          const isActive = activeLevel === levelInfo.level;
                          const isLoading = lc?.loading ?? true;
                          const hasContent = (lc?.categories?.length ?? 0) > 0;
                          return (
                            <button
                              key={levelInfo.level}
                              type="button"
                              onClick={() => {
                                setActiveLevel(levelInfo.level);
                                setEducationLevel(levelInfo.level);
                              }}
                              title={levelInfo.reason}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                                isActive
                                  ? 'bg-[#60a5fa]/20 border-[#60a5fa] text-[#60a5fa] shadow-sm shadow-blue-500/20'
                                  : 'bg-[#051424] border-[#424754]/50 text-[#c2c6d6] hover:border-[#60a5fa]/50 hover:text-white'
                              }`}
                            >
                              <span>{levelInfo.icon}</span>
                              {levelInfo.label}
                              {isLoading
                                ? <Loader2 className="w-3 h-3 animate-spin opacity-50" />
                                : hasContent
                                  ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  : null
                              }
                              {i === 0 && detectedLevels.length > 1 && (
                                <span className="text-[8px] font-extrabold text-emerald-400 uppercase leading-none">principal</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {activeLevel && detectedLevels.find(l => l.level === activeLevel)?.reason && (
                        <p className="text-[10px] text-slate-500 italic mt-0.5">
                          💡 {detectedLevels.find(l => l.level === activeLevel)?.reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Nome do Baralho (opcional) ── */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#adc6ff]">
                  🗂️ Nome do Baralho{' '}
                  <span className="text-[#8c91a0] font-normal normal-case tracking-normal">
                    (opcional — usa a Matéria se vazio)
                  </span>
                </label>
                {deckName && (
                  <button
                    type="button"
                    onClick={handleClearDeckName}
                    className="text-[10px] text-[#8c91a0] hover:text-rose-400 flex items-center gap-1 transition"
                  >
                    <X className="w-3 h-3" /> Limpar
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  list="deck-name-suggestions"
                  placeholder={subject.trim() ? subject.trim() : 'Ex: DIREITO PENAL — PARTE GERAL…'}
                  value={deckName}
                  onChange={e => handleDeckNameChange(e.target.value)}
                  className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white placeholder-[#8c91a0]/60 focus:outline-none focus:border-[#60a5fa] text-sm uppercase"
                />
                <datalist id="deck-name-suggestions">
                  {existingDeckTitles.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              {deckNameSuggestion && deckNameSuggestion.toUpperCase() !== deckName.trim().toUpperCase() && (
                <SpellSuggestion
                  suggestion={deckNameSuggestion}
                  onAccept={() => handleDeckNameChange(deckNameSuggestion)}
                />
              )}
              {/* Preview do nome que será usado */}
              {subject.trim() && (
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Baralho: <span className="text-slate-300 font-semibold ml-1">
                    {(deckName.trim() || subject.trim()).toUpperCase()}
                  </span>
                </p>
              )}
            </div>

            {/* ── Grade curricular: loading / currículo do banco / sugestões simples ── */}
            {isCurriculumLoading && subject.trim().length >= 2 && !curatedCurriculum && (
              <div className="p-3.5 bg-[#051424]/80 rounded-2xl border border-blue-500/20 animate-fade-in flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                <span className="text-[11px] text-[#8c91a0]">
                  Carregando grade curricular
                  {activeLevel && detectedLevels.find(l => l.level === activeLevel) && (
                    <> — {detectedLevels.find(l => l.level === activeLevel)!.icon} <strong className="text-blue-300">{detectedLevels.find(l => l.level === activeLevel)!.label}</strong></>
                  )}…
                </span>
              </div>
            )}
            {curatedCurriculum ? (
              <div className="p-3.5 bg-[#051424]/80 rounded-2xl border border-blue-500/20 animate-fade-in space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="block text-[11px] font-bold text-[#60a5fa] uppercase tracking-wide flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5" />
                    {activeLevel && detectedLevels.find(l => l.level === activeLevel)
                      ? <>{detectedLevels.find(l => l.level === activeLevel)!.icon} Grade {detectedLevels.find(l => l.level === activeLevel)!.label} — clique para selecionar:</>
                      : <>Grade Curricular — clique para selecionar os tópicos:</>
                    }
                  </span>
                  {existingDeckTopics.size > 0 && (
                    <div className="flex items-center gap-2 flex-wrap text-[10px]">
                      <span className="flex items-center gap-1 text-amber-400">
                        <RefreshCw className="w-3 h-3" /> Já tem cards (gerará novos diferentes)
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Check className="w-3 h-3" /> Selecionado
                      </span>
                    </div>
                  )}
                </div>
                {curatedCurriculum.map((cat: CurriculumCategory) => (
                  <div key={cat.category} className="space-y-1.5">
                    <span className="block text-[11px] font-bold text-[#8c91a0] uppercase tracking-wide">{cat.category}</span>
                    <div className="flex flex-wrap gap-2">
                      {cat.topics.map((sug) => {
                        const isSelected = topics.includes(sug);
                        const alreadyInDeck = existingDeckTopics.has(sug);
                        return (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => handleToggleTopic(sug)}
                            title={alreadyInDeck ? 'Este tópico já tem cards no baralho — novos cards serão diferentes' : undefined}
                            className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 ${
                              isSelected
                                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                                : alreadyInDeck
                                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-[#0e2742] hover:bg-[#163a61] text-[#adc6ff] border-blue-500/30'
                            }`}
                          >
                            {isSelected
                              ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                              : alreadyInDeck
                                ? <RefreshCw className="w-3 h-3 text-amber-400" />
                                : <Plus className="w-3.5 h-3.5 text-blue-400" />
                            }
                            {sug}
                            {alreadyInDeck && !isSelected && (
                              <span className="text-[9px] font-bold text-amber-400/70 bg-amber-500/10 px-1 rounded">+novo</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : !isCurriculumLoading && suggestedTopics.length > 0 && (
              <div className="p-3.5 bg-[#051424]/80 rounded-2xl border border-blue-500/20 animate-fade-in">
                <span className="block text-[11px] font-bold text-[#60a5fa] mb-2 uppercase tracking-wide flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" /> Sugestões de Tópicos da IA:
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

            {/* ── Tópicos adicionados ── */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Tópicos de estudo
                <span className="text-[#8c91a0] font-normal normal-case tracking-normal">(opcional)</span>
              </label>
              <div className="flex gap-2">
                <input
                  ref={topicInputRef}
                  type="text"
                  placeholder="Ex: Parte Geral, Mitocôndrias…"
                  value={topicInput}
                  onChange={e => setTopicInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
                  className="flex-1 bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white placeholder-[#8c91a0] focus:outline-none focus:border-[#60a5fa] text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleAddTopic()}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-[#424754]/50 cursor-pointer transition"
                >
                  + Adicionar
                </button>
              </div>
              {topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {topics.map((t, idx) => (
                    <span key={idx} className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs flex items-center gap-1.5">
                      {t}
                      <button onClick={() => handleRemoveTopic(idx)} className="hover:text-white cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Quantidade ── */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5">
                Quantidade de Cards
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([25, 50, 100] as const).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCardCount(n)}
                    className={`py-3 rounded-xl text-sm font-semibold border transition ${
                      cardCount === n
                        ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                        : 'bg-[#051424] border-[#424754]/50 text-[#8c91a0] hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    {n}
                    <span className="block text-[10px] opacity-70 mt-0.5">
                      {n === 25 ? 'Rápido' : n === 50 ? 'Completo' : 'Intensivo'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Créditos ── */}
            <CreditsBanner stats={stats} cardCount={cardCount} onOpenAdMob={onOpenAdMob} />

            {/* ── Disponibilidade no banco de cards ── */}
            {bankAvailability && topics.length > 0 && (
              <div className="animate-fade-in rounded-xl border px-4 py-3 text-xs space-y-1.5
                bg-[#051424]/80 border-blue-500/20">
                <div className="flex items-center gap-2 font-bold text-[#60a5fa]">
                  <span>🗄️</span>
                  <span>Banco de cards compartilhado</span>
                </div>
                {bankAvailability.available.length > 0 && (
                  <p className="text-emerald-400">
                    ✓ {bankAvailability.available.length} tópico{bankAvailability.available.length !== 1 ? 's' : ''} com
                    cards prontos no banco ({bankAvailability.totalReadyCards} cards)
                    — sem custo de IA
                  </p>
                )}
                {bankAvailability.needsGeneration.length > 0 && (
                  <p className="text-amber-400">
                    ⚡ {bankAvailability.needsGeneration.length} tópico{bankAvailability.needsGeneration.length !== 1 ? 's' : ''} precisam
                    de geração via IA
                  </p>
                )}
              </div>
            )}

            {/* ── Gerar ── */}
            <button
              type="button"
              onClick={handleGenerateCards}
              disabled={isLoading || noCredits}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all mt-4 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Criando Flashcards com IA…</>
              ) : noCredits ? (
                <><Lock className="w-5 h-5" /> Sem Créditos — Assista um Anúncio</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Gerar {cardCount} Flashcards com IA</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Cards criados manualmente ── */}
      {activeMode === 'manual' && createdManualCards.length > 0 && (
        <div className="space-y-4 pt-2 animate-fade-in">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-base font-extrabold uppercase tracking-wider text-[#adc6ff] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              Cards Criados ({createdManualCards.length})
            </h3>
            <button
              type="button"
              onClick={() => setCreatedManualCards([])}
              className="text-xs text-[#8c91a0] hover:text-rose-400 transition"
            >
              Limpar lista
            </button>
          </div>
          <div className="space-y-3">
            {createdManualCards.map(card => (
              <ManualCardPreview
                key={card.id}
                card={card}
                onRemove={() => setCreatedManualCards(prev => prev.filter(c => c.id !== card.id))}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Cards gerados pela IA ── */}
      {activeMode === 'ia' && generatedAICards.length > 0 && (
        <div className="space-y-4 pt-2 animate-fade-in">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-base font-extrabold uppercase tracking-wider text-[#adc6ff] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-400" />
              Cards Gerados ({generatedAICards.length})
            </h3>
            <button
              type="button"
              onClick={() => setGeneratedAICards([])}
              className="text-xs text-[#8c91a0] hover:text-rose-400 transition"
            >
              Descartar todos
            </button>
          </div>
          <div className="space-y-3">
            {generatedAICards.map((card, index) => (
              <AICardPreview
                key={card.id}
                card={card}
                index={index}
                onRemove={() => setGeneratedAICards(prev => prev.filter(c => c.id !== card.id))}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleSaveAllAICards}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-base shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Save className="w-5 h-5" /> Salvar {generatedAICards.length} Cards no Baralho
          </button>
        </div>
      )}
    </div>
  );
};
