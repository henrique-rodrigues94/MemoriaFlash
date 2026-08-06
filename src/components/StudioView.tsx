// 📁 flashmind-ai/src/components/StudioView.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Sparkles, PlusCircle, CheckCircle2, Loader2, Plus, X, Trash2,
  BookOpen, Save, HelpCircle, Play, Lock, Lightbulb, ChevronDown,
  ChevronUp, Wand2, Tag, GraduationCap,
} from 'lucide-react';
import { Deck, UserStats, Flashcard } from '../types';
import { SupportedLanguage } from '../lib/i18n';
import { ManualCardForm } from './ManualCardForm';
import { fetchAITopicSuggestions, generateAICards, EducationLevel } from '../lib/aiGenerator';
import { EDUCATION_LEVEL_META, getAvailableEducationLevels, recommendEducationLevel } from '../lib/educationLevels';
import { findClosestMatch } from '../lib/spellCheck';
import { hasEnoughCredits } from '../services/economy/creditsEngine';
import { ECONOMY } from '../services/economy/economyConstants';

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
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-white/5 transition"
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
      </button>

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
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('escola');
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
  const topicInputRef = useRef<HTMLInputElement>(null);

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
    setSubjectSuggestion(findClosestMatch(upper, existingSubjects));
    setEducationLevelLocked(false); // assunto novo → recalcula a recomendação de nível
    // Sincroniza nome do baralho enquanto o usuário não tiver editado manualmente
    if (!deckNameLocked) {
      setDeckName(upper.trim());
      setDeckNameSuggestion(findClosestMatch(upper, existingDeckTitles));
    }
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

  // ── Sugestões de tópicos (debounce 600ms) ─────────────────────────────────
  useEffect(() => {
    if (subject.trim().length < 2) {
      setSuggestedTopics([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const suggestions = await fetchAITopicSuggestions(subject, educationLevel);
        setSuggestedTopics(suggestions.filter(t => !topics.includes(t)));
      } catch {
        // silencioso — sugestões são opcionais
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [subject, topics, educationLevel]);

  // ── Níveis de ensino disponíveis para a matéria digitada ─────────────────
  // Ex.: "Direito" não é uma matéria de Escola (Fundamental/Médio) — nesse
  // caso o botão "Escola" fica desabilitado, sobrando Faculdade/Concurso/Técnico.
  const availableEducationLevels = useMemo(
    () => getAvailableEducationLevels(subject),
    [subject],
  );
  const recommendedEducationLevel = useMemo(
    () => recommendEducationLevel(subject, availableEducationLevels),
    [subject, availableEducationLevels],
  );

  // Enquanto o usuário não escolher um nível manualmente, aplicamos a
  // recomendação automática (ex.: "Direito Penal" → Concurso; "Eletrônica" →
  // Técnico; "Biologia" → Escola). Se ele já tiver travado uma escolha mas
  // ela deixou de ser válida para a nova matéria (ex.: trocou de "Biologia"
  // no nível Escola para "Direito Penal"), reencaixamos na recomendação —
  // nunca deixamos um nível indisponível selecionado.
  useEffect(() => {
    if (!educationLevelLocked || !availableEducationLevels.includes(educationLevel)) {
      setEducationLevel(recommendEducationLevel(subject, availableEducationLevels));
    }
  }, [availableEducationLevels, subject]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trocar de nível de ensino muda o universo de tópicos válidos (ex: um
  // tópico de "Cálculo Diferencial" escolhido no nível Faculdade não faz
  // sentido se o usuário muda para Escola) — limpa a seleção manual ao
  // trocar de nível para evitar tópicos incoerentes com o pedido.
  const handleEducationLevelChange = (level: EducationLevel) => {
    if (!availableEducationLevels.includes(level)) return;
    setEducationLevel(level);
    setEducationLevelLocked(true);
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
      const cards = await generateAICards(subject.trim(), topics, cardCount, educationLevel);
      // Cobra pela quantidade de cards REALMENTE entregues (o backend pode
      // devolver menos que o pedido após remover duplicatas — ver
      // generateFlashcards.ts), nunca pelo que foi apenas solicitado.
      const actualCost = cards.length * ECONOMY.COST_GENERATE_DECK;
      onDeductCredit?.(actualCost);
      setGeneratedAICards(cards);
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
                  className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white placeholder-[#8c91a0] focus:outline-none focus:border-[#60a5fa] text-sm uppercase"
                />
                {subject.trim().length >= 2 && (
                  <div className="absolute inset-y-0 right-3 flex items-center text-[#60a5fa] pointer-events-none">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
                <datalist id="subject-suggestions">
                  {existingSubjects.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              {subjectSuggestion && subjectSuggestion.toUpperCase() !== subject.trim().toUpperCase() && (
                <SpellSuggestion
                  suggestion={subjectSuggestion}
                  onAccept={() => handleSubjectChange(subjectSuggestion)}
                />
              )}
            </div>

            {/* ── Nível de Ensino (obrigatório) ── */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5">
                <GraduationCap className="w-3.5 h-3.5" /> Nível de Ensino
              </label>
              <div className="grid grid-cols-4 gap-2">
                {EDUCATION_LEVEL_META.map(level => {
                  const isAvailable = availableEducationLevels.includes(level.value);
                  const isSelected = educationLevel === level.value;
                  const isRecommended = isAvailable && recommendedEducationLevel === level.value;
                  return (
                    <button
                      key={level.value}
                      type="button"
                      disabled={!isAvailable}
                      title={isAvailable ? undefined : `"${subject.trim() || 'esse assunto'}" não é uma matéria de Escola`}
                      onClick={() => handleEducationLevelChange(level.value)}
                      className={`relative flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-xl text-xs font-bold text-center border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale ${
                        isSelected
                          ? 'bg-[#60a5fa]/15 border-[#60a5fa] text-[#60a5fa]'
                          : 'bg-[#051424] border-[#424754]/50 text-[#c2c6d6] hover:border-[#60a5fa]/50'
                      }`}
                    >
                      {isRecommended && !isSelected && (
                        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[8px] font-extrabold uppercase tracking-wide shadow">
                          Sugerido
                        </span>
                      )}
                      <span className="text-base leading-none" aria-hidden="true">{level.icon}</span>
                      {level.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[11px] text-[#8c91a0]">
                {availableEducationLevels.length < EDUCATION_LEVEL_META.length
                  ? `"${subject.trim()}" não faz parte do currículo escolar — escolha Faculdade, Concurso ou Técnico.`
                  : 'Os tópicos sugeridos e os cards gerados são ajustados ao currículo desse nível.'}
              </p>
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

            {/* ── Sugestões de tópicos da IA ── */}
            {suggestedTopics.length > 0 && (
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
