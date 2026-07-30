import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Layers,
  Zap,
  Check,
  Target,
  BrainCircuit,
  BarChart3,
  RefreshCw,
  Award,
  AlertTriangle,
  Upload,
  Scan,
  X,
  FileUp,
  Settings2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Deck, Flashcard, QuizQuestion, UserStats } from '../types';
import {
  apiGenerateFlashcards,
  apiSuggestTopics,
  apiGenerateQuiz,
  apiQuizDiagnostic,
  QuizDiagnosticResult,
} from '../services/api';
import { SupportedLanguage, translations } from '../lib/i18n';

interface CreationHubViewProps {
  decks: Deck[];
  stats: UserStats;
  currentLanguage: SupportedLanguage;
  onSaveNewDeck: (deck: Deck) => void;
  onDeductCredit: (amount: number) => void;
  onOpenAdMob: () => void;
  onOpenSubscription: () => void;
}

export type StudyDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export const CreationHubView: React.FC<CreationHubViewProps> = ({
  decks,
  stats,
  currentLanguage,
  onSaveNewDeck,
  onDeductCredit,
  onOpenAdMob,
  onOpenSubscription,
}) => {
  const t = translations[currentLanguage] || translations.pt;
  const [activeMode, setActiveMode] = useState<'ai' | 'manual' | 'upload'>('ai');
  const [aiSubMode, setAiSubMode] = useState<'direct' | 'quiz'>('direct');

  // Common inputs
  const [deckTitle, setDeckTitle] = useState('');
  const [promptText, setPromptText] = useState('');
  const [cardCount, setCardCount] = useState(25);
  const difficulty: StudyDifficulty = 'medium';

  // Topics state
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);

  // AI Direct Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<Partial<Flashcard>[]>([]);
  const [generationProgress, setGenerationProgress] = useState<{ done: number; total: number } | null>(null);

  // Prompt editor state
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const DEFAULT_SYSTEM_PROMPT = `Você é o FlashMind AI, um assistente especialista em criação de flashcards educativos de alta retenção baseados no método de repetição espaçada (SRS SM-2).
Crie exatamente {count} flashcards sobre o tema/conteúdo "{prompt}" em Português.{topics}
Cada flashcard deve conter:
- front: Uma pergunta clara, concisa e instigante.
- back: Uma resposta completa com explicação sucinta e 2-3 pontos-chave em tópicos para facilidade de memorização.
- explanation: Uma explicação detalhada do conceito com um EXEMPLO PRÁTICO do mundo real. Comece com "📘 Explicação:" e depois "💡 Exemplo Prático:".
- curiosity: Uma curiosidade fascinante relacionada ao tema. Comece com "🌟 Curiosidade:".
- topic: Subtópico específico do assunto.
- difficulty: Classifique como "easy", "medium", "hard" ou "expert" de acordo com a complexidade real do conteúdo.`;
  const [customSystemPrompt, setCustomSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedContent, setUploadedContent] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quiz Diagnostic state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [userSelectedOption, setUserSelectedOption] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<
    { question: string; topic: string; isCorrect: boolean; selectedOption: string }[]
  >([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isAnalyzingQuiz, setIsAnalyzingQuiz] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<QuizDiagnosticResult | null>(null);

  // Manual Mode state
  const [manualCards, setManualCards] = useState<{ front: string; back: string }[]>([
    { front: '', back: '' },
  ]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Auto-suggest topics when deckTitle changes (debounced)
  useEffect(() => {
    if (!deckTitle.trim() || deckTitle.trim().length < 3) {
      setSuggestedTopics([]);
      setSelectedTopics([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoadingTopics(true);
      try {
        const topics = await apiSuggestTopics(deckTitle, currentLanguage);
        setSuggestedTopics(topics);
        setSelectedTopics(topics);
      } catch {
        // silent fail
      } finally {
        setIsLoadingTopics(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [deckTitle]);

  // Auto-complete for custom topic input
  useEffect(() => {
    if (!customTopicInput.trim() || customTopicInput.length < 2) {
      setTopicSuggestions([]);
      setShowTopicDropdown(false);
      return;
    }
    const lower = customTopicInput.toLowerCase();
    const filtered = suggestedTopics.filter(
      (t) => t.toLowerCase().includes(lower) && !selectedTopics.includes(t)
    );
    // Also add the typed value as first option
    const opts = customTopicInput.trim() && !filtered.includes(customTopicInput.trim())
      ? [customTopicInput.trim(), ...filtered]
      : filtered;
    setTopicSuggestions(opts.slice(0, 6));
    setShowTopicDropdown(opts.length > 0);
  }, [customTopicInput, suggestedTopics, selectedTopics]);

  const toggleTopicSelection = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleAddCustomTopic = (value?: string) => {
    const topic = (value || customTopicInput).trim();
    if (topic && !selectedTopics.includes(topic)) {
      setSelectedTopics([...selectedTopics, topic]);
      if (!suggestedTopics.includes(topic)) {
        setSuggestedTopics([...suggestedTopics, topic]);
      }
    }
    setCustomTopicInput('');
    setShowTopicDropdown(false);
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setIsProcessingFile(true);
    try {
      const text = await file.text();
      setUploadedContent(text.slice(0, 8000)); // limit context
      if (!deckTitle) {
        setDeckTitle(file.name.replace(/\.[^.]+$/, ''));
      }
    } catch {
      setUploadedContent('');
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Direct AI Generation (with batch chunking for large counts)
  const BATCH_SIZE = 25;
  const handleGenerateAi = async () => {
    const finalPrompt =
      activeMode === 'upload'
        ? uploadedContent || deckTitle.trim()
        : promptText.trim() || deckTitle.trim();

    if (!finalPrompt) {
      alert(activeMode === 'upload' ? 'Faça upload de um documento primeiro.' : 'Preencha o campo Matéria/Assunto.');
      return;
    }

    if (!stats.isPro && (stats.aiCredits || 0) <= 0) {
      onOpenAdMob();
      return;
    }

    setIsGenerating(true);
    setGeneratedCards([]);
    setGenerationProgress(null);

    try {
      if (cardCount <= BATCH_SIZE) {
        // Single request — small deck
        const cards = await apiGenerateFlashcards(
          finalPrompt,
          cardCount,
          currentLanguage,
          difficulty,
          selectedTopics,
          customSystemPrompt
        );
        setGeneratedCards(cards);
      } else {
        // Batch mode — split into chunks of BATCH_SIZE
        const batches = Math.ceil(cardCount / BATCH_SIZE);
        const allCards: Partial<Flashcard>[] = [];
        setGenerationProgress({ done: 0, total: cardCount });

        for (let b = 0; b < batches; b++) {
          const remaining = cardCount - b * BATCH_SIZE;
          const batchCount = Math.min(BATCH_SIZE, remaining);
          const batchIndex = b + 1;

          // Vary the prompt per batch to avoid duplicate cards
          const batchPrompt = `${finalPrompt} [Lote ${batchIndex} de ${batches}: gere cards DIFERENTES dos lotes anteriores, abordando novos aspectos e subtópicos ainda não cobertos]`;

          const cards = await apiGenerateFlashcards(
            batchPrompt,
            batchCount,
            currentLanguage,
            difficulty,
            selectedTopics,
            customSystemPrompt
          );
          allCards.push(...cards);
          setGenerationProgress({ done: allCards.length, total: cardCount });
          setGeneratedCards([...allCards]); // live preview
        }
      }

      if (!deckTitle) {
        setDeckTitle(`Deck: ${finalPrompt.slice(0, 24)}`);
      }
      if (!stats.isPro) {
        onDeductCredit(1);
      }
    } catch (err: any) {
      alert(err.message || 'Falha ao gerar flashcards');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  // Diagnostic Quiz Start
  const handleStartDiagnosticQuiz = async () => {
    const topicToTest = deckTitle.trim() || promptText.trim();
    if (!topicToTest) {
      alert('Digite a Matéria/Assunto para iniciar o Quiz Diagnóstico.');
      return;
    }

    if (!stats.isPro && (stats.aiCredits || 0) <= 0) {
      onOpenAdMob();
      return;
    }

    setIsGeneratingQuiz(true);
    setQuizQuestions([]);
    setCurrentQuizIndex(0);
    setUserAnswers([]);
    setDiagnosticResult(null);
    setUserSelectedOption(null);

    try {
      const qList = await apiGenerateQuiz(topicToTest, 4, currentLanguage);
      setQuizQuestions(qList);
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar quiz diagnóstico');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleAnswerQuizQuestion = async () => {
    if (userSelectedOption === null) return;

    const currentQ = quizQuestions[currentQuizIndex];
    const isCorrect = userSelectedOption === currentQ.correctIndex;

    const newAnswer = {
      question: currentQ.question,
      topic: currentQ.explanation.slice(0, 30) || deckTitle,
      isCorrect,
      selectedOption: currentQ.options[userSelectedOption],
    };

    const updatedAnswers = [...userAnswers, newAnswer];
    setUserAnswers(updatedAnswers);
    setUserSelectedOption(null);

    if (currentQuizIndex + 1 < quizQuestions.length) {
      setCurrentQuizIndex(currentQuizIndex + 1);
    } else {
      setIsAnalyzingQuiz(true);
      try {
        const result = await apiQuizDiagnostic(
          deckTitle || promptText,
          updatedAnswers,
          cardCount,
          difficulty,
          currentLanguage
        );
        setDiagnosticResult(result);
        setGeneratedCards(result.cards);

        if (!stats.isPro) {
          onDeductCredit(1);
        }
      } catch (err: any) {
        alert(err.message || 'Erro ao processar diagnóstico do quiz');
      } finally {
        setIsAnalyzingQuiz(false);
      }
    }
  };

  const handleSaveDeck = () => {
    const finalCards: Flashcard[] = (
      activeMode === 'manual' ? manualCards.filter((c) => c.front && c.back) : generatedCards
    ).map((c, i) => ({
      id: `card-gen-${Date.now()}-${i}`,
      front: (c as any).front || '',
      back: (c as any).back || '',
      explanation: (c as any).explanation || '',
      curiosity: (c as any).curiosity || '',
      topic: (c as any).topic || deckTitle,
      difficulty: ((c as any).difficulty as StudyDifficulty) || 'medium',
      reps: 0,
      interval: 0,
      efactor: 2.5,
      dueDate: new Date().toISOString(),
    }));

    if (!finalCards.length) {
      alert('Adicione pelo menos 1 flashcard válido para salvar o deck.');
      return;
    }

    const newDeck: Deck = {
      id: `deck-${Date.now()}`,
      title: deckTitle || 'Novo Deck AI',
      category: 'Geral',
      description: '',
      color: '#60a5fa',
      accentBorder: 'border-l-primary',
      cards: finalCards,
    };

    onSaveNewDeck(newDeck);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);

    setGeneratedCards([]);
    setPromptText('');
    setDeckTitle('');
    setUploadedFile(null);
    setUploadedContent('');
    setQuizQuestions([]);
    setDiagnosticResult(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-24 animate-fade-in">

      {/* Row 1: Scanner / Upload — full-width pill button */}
      <div className="flex justify-center">
        <button
          onClick={() => setActiveMode('upload')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer shadow-md hover:scale-[1.02] ${
            activeMode === 'upload'
              ? 'bg-[#7c3aed] text-white border-[#7c3aed] shadow-violet-500/30'
              : 'bg-[#0b1a2a] text-[#a78bfa] border-[#7c3aed]/40 hover:bg-[#7c3aed]/10 hover:border-[#7c3aed]/70'
          }`}
        >
          <Scan className="w-3.5 h-3.5" />
          Scanner / Upload de Documento
        </button>
      </div>

      {/* Row 2: Gerador IA | Manual — paired toggle */}
      <div className="flex justify-center">
        <div className="flex bg-[#0b1a2a] p-1 rounded-2xl border border-[#424754]/40 shadow-inner gap-1">
          <button
            onClick={() => setActiveMode('ai')}
            className={`px-5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'ai' ? 'bg-[#4d8eff] text-white shadow-md' : 'text-[#8c91a0] hover:text-white'
            }`}
          >
            Gerador IA
          </button>
          <button
            onClick={() => setActiveMode('manual')}
            className={`px-5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'manual' ? 'bg-[#4d8eff] text-white shadow-md' : 'text-[#8c91a0] hover:text-white'
            }`}
          >
            Manual
          </button>
        </div>
      </div>

      {/* ── UPLOAD MODE ── */}
      {activeMode === 'upload' && (
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[#7c3aed]/30 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-[#7c3aed]/20 border border-[#7c3aed]/30">
              <Scan className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Scanner / Upload de Documento</h3>
              <p className="text-[11px] text-[#8c91a0]">PDF, Word, TXT, livro — a IA gera flashcards automaticamente</p>
            </div>
          </div>

          {/* Upload area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all hover:border-violet-400/60 hover:bg-violet-500/5 ${
              uploadedFile ? 'border-violet-400/50 bg-violet-500/10' : 'border-[#424754]/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md,.epub"
              onChange={handleFileUpload}
              className="hidden"
            />
            {isProcessingFile ? (
              <div className="space-y-2">
                <RefreshCw className="w-8 h-8 text-violet-400 animate-spin mx-auto" />
                <p className="text-xs text-violet-300">Processando documento...</p>
              </div>
            ) : uploadedFile ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <FileUp className="w-6 h-6 text-violet-400" />
                  <span className="text-sm font-bold text-white">{uploadedFile.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setUploadedFile(null); setUploadedContent(''); }}
                    className="p-1 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-emerald-400">✓ Documento carregado com sucesso</p>
                <p className="text-[10px] text-[#8c91a0]">{uploadedContent.length.toLocaleString()} caracteres extraídos</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-10 h-10 text-[#8c91a0] mx-auto" />
                <div>
                  <p className="text-sm font-bold text-white">Arraste ou clique para fazer upload</p>
                  <p className="text-xs text-[#8c91a0] mt-1">PDF, Word (.docx), TXT, Markdown, EPUB</p>
                </div>
                <span className="inline-block px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs border border-violet-500/30">
                  Selecionar Arquivo
                </span>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-400" /> Matéria / Assunto:
            </label>
            <input
              type="text"
              value={deckTitle}
              onChange={(e) => setDeckTitle(e.target.value)}
              placeholder="Ex: Direito Constitucional, Anatomia Humana, Python..."
              className="w-full bg-[#0b1a2a] border border-[#424754]/50 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-violet-400"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="text-[11px] font-bold text-[#8c91a0] uppercase">Quantidade de Cards</label>
            <select
              value={cardCount}
              onChange={(e) => setCardCount(parseInt(e.target.value))}
              className="w-full mt-1 bg-[#0b1a2a] border border-[#424754]/40 rounded-xl p-2.5 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value={25}>25 Flashcards (Recomendado)</option>
              <option value={50}>50 Flashcards</option>
              <option value={100}>100 Flashcards</option>
            </select>
          </div>

          <button
            onClick={handleGenerateAi}
            disabled={isGenerating || (!uploadedContent && !deckTitle.trim())}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 hover:from-violet-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-xl shadow-violet-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.01]"
          >
            <Sparkles className="w-4 h-4 text-violet-300 animate-spin" />
            {isGenerating ? 'Analisando Documento e Gerando Flashcards...' : 'Gerar Flashcards do Documento'}
          </button>
        </div>
      )}

      {/* ── AI MODE ── */}
      {activeMode === 'ai' && (
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[#adc6ff]/20 space-y-6">
          {/* Sub-mode selector */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-[#0b1a2a] rounded-2xl border border-[#424754]/40">
            <button
              onClick={() => { setAiSubMode('direct'); setQuizQuestions([]); setDiagnosticResult(null); }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                aiSubMode === 'direct'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'text-[#8c91a0] hover:text-white'
              }`}
            >
              <BrainCircuit className="w-4 h-4" /> Geração Direta por Tópicos
            </button>
            <button
              onClick={() => { setAiSubMode('quiz'); setGeneratedCards([]); }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                aiSubMode === 'quiz'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                  : 'text-[#8c91a0] hover:text-white'
              }`}
            >
              <Target className="w-4 h-4" /> Quiz Diagnóstico com IA
            </button>
          </div>

          {/* Matéria/Assunto input — auto-suggests topics on type */}
          <div className="space-y-3">
            <label className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#60a5fa]" /> Matéria / Assunto:
            </label>
            <div className="relative">
              <input
                type="text"
                value={deckTitle}
                onChange={(e) => setDeckTitle(e.target.value)}
                placeholder="Ex: Direito Constitucional, Anatomia Humana, Python para Ciência de Dados..."
                className="w-full bg-[#0b1a2a] border border-[#424754]/50 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-[#60a5fa]"
              />
              {isLoadingTopics && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <RefreshCw className="w-4 h-4 text-[#60a5fa] animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Suggested Study Topics */}
          <div className="p-4 rounded-2xl bg-[#0b1a2a]/80 border border-[#424754]/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" /> Tópicos de Estudo Relacionados
                {selectedTopics.length > 0 && (
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {selectedTopics.length} Selecionados
                  </span>
                )}
              </span>
              <span className="text-[10px] text-[#8c91a0]">Clique para incluir/excluir</span>
            </div>

            {isLoadingTopics ? (
              <div className="py-4 text-center text-xs text-[#8c91a0] animate-pulse flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#60a5fa]" />
                IA gerando tópicos de estudo para "{deckTitle}"...
              </div>
            ) : suggestedTopics.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestedTopics.map((topic, idx) => {
                  const isSelected = selectedTopics.includes(topic);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleTopicSelection(topic)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600/30 text-blue-200 border-blue-400/60 shadow-sm'
                          : 'bg-[#122131] text-slate-400 border-slate-700/50 hover:border-slate-500'
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Plus className="w-3.5 h-3.5 text-slate-500" />}
                      {topic}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-[#8c91a0] italic">
                Digite uma matéria acima — os tópicos de estudo aparecerão automaticamente.
              </div>
            )}

            {/* Custom Topic with autocomplete */}
            <div className="relative flex gap-2 pt-2 border-t border-[#424754]/30">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={customTopicInput}
                  onChange={(e) => setCustomTopicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddCustomTopic(); }
                    if (e.key === 'Escape') setShowTopicDropdown(false);
                  }}
                  onBlur={() => setTimeout(() => setShowTopicDropdown(false), 150)}
                  placeholder="Adicionar tópico específico..."
                  className="w-full bg-[#122131] border border-[#424754]/30 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#60a5fa]"
                />
                {showTopicDropdown && topicSuggestions.length > 0 && (
                  <div className="absolute bottom-full mb-1 left-0 right-0 bg-[#0b1a2a] border border-[#424754]/60 rounded-xl overflow-hidden shadow-xl z-20">
                    {topicSuggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={() => handleAddCustomTopic(s)}
                        className="w-full px-3 py-2 text-xs text-left text-slate-200 hover:bg-[#1a2d42] flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-[#60a5fa]" /> {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleAddCustomTopic()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer"
              >
                + Adicionar
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-[11px] font-bold text-[#8c91a0] uppercase">Quantidade de Cards</label>
            <select
              value={cardCount}
              onChange={(e) => setCardCount(parseInt(e.target.value))}
              className="w-full mt-1 bg-[#0b1a2a] border border-[#424754]/40 rounded-xl p-2.5 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value={25}>25 Flashcards (Recomendado)</option>
              <option value={50}>50 Flashcards</option>
              <option value={100}>100 Flashcards</option>
            </select>
          </div>

          {/* Prompt Editor (collapsible) */}
          {aiSubMode === 'direct' && (
            <div className="rounded-2xl bg-[#0b1a2a] border border-[#424754]/40 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPromptEditor(!showPromptEditor)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-300 hover:text-white cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-amber-400" />
                  Controle do Prompt da IA
                  <span className="text-[10px] font-normal text-slate-500">(avançado)</span>
                </span>
                {showPromptEditor ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {showPromptEditor && (
                <div className="px-4 pb-4 space-y-3 border-t border-[#424754]/30">
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    Edite o system prompt enviado à IA. Use <code className="text-amber-300 bg-amber-500/10 px-1 rounded">{'{count}'}</code>, <code className="text-amber-300 bg-amber-500/10 px-1 rounded">{'{prompt}'}</code> e <code className="text-amber-300 bg-amber-500/10 px-1 rounded">{'{topics}'}</code> como variáveis.
                  </p>
                  <textarea
                    rows={10}
                    value={customSystemPrompt}
                    onChange={(e) => setCustomSystemPrompt(e.target.value)}
                    className="w-full bg-[#060f18] border border-[#424754]/50 rounded-xl p-3 text-[11px] text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-amber-400/50 resize-y"
                    placeholder="System prompt da IA..."
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 cursor-pointer"
                    >
                      ↩ Restaurar padrão
                    </button>
                    <span className="text-[10px] text-slate-600 self-center">{customSystemPrompt.length} chars</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Generation progress bar */}
          {isGenerating && generationProgress && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Gerando em lotes...</span>
                <span className="font-mono font-bold text-blue-300">{generationProgress.done} / {generationProgress.total} cards</span>
              </div>
              <div className="h-2 rounded-full bg-[#0b1a2a] border border-[#424754]/40 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.round((generationProgress.done / generationProgress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Generate / Quiz buttons */}
          {aiSubMode === 'direct' ? (
            <button
              id="btn-generate-deck-ai"
              onClick={handleGenerateAi}
              disabled={isGenerating || (!deckTitle.trim() && !promptText.trim())}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xl shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.01]"
            >
              <Sparkles className="w-4 h-4 text-blue-300 animate-spin" />
              {isGenerating
                ? generationProgress
                  ? `Lote ${Math.ceil(generationProgress.done / 25)} de ${Math.ceil(generationProgress.total / 25)} — ${generationProgress.done} cards prontos...`
                  : 'IA Criando Flashcards...'
                : 'Gerar Deck com IA'}
            </button>
          ) : (
            <div className="space-y-4 pt-2 border-t border-[#424754]/30">
              {quizQuestions.length === 0 && !diagnosticResult && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-xs space-y-3">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <Target className="w-4 h-4" /> Como funciona o Quiz Diagnóstico com IA?
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    A IA gerará 4 questões sobre <strong className="text-white">"{deckTitle || 'seu assunto'}"</strong>. Ao responder, a IA fará uma análise imediata das suas lacunas e criará flashcards focando exatamente nos tópicos onde você precisa melhorar!
                  </p>
                  <button
                    id="btn-start-diagnostic-quiz"
                    onClick={handleStartDiagnosticQuiz}
                    disabled={isGeneratingQuiz || !deckTitle.trim()}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    {isGeneratingQuiz ? 'Gerando Quiz Diagnóstico...' : 'Iniciar Quiz Diagnóstico Agora'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quiz Running UI */}
          {quizQuestions.length > 0 && !diagnosticResult && (
            <div className="p-5 rounded-2xl bg-[#0b1a2a] border border-amber-500/40 space-y-4 animate-fade-in shadow-xl">
              <div className="flex items-center justify-between text-xs text-amber-300 font-bold border-b border-[#424754]/30 pb-2">
                <span className="flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-amber-400" />
                  Quiz Diagnóstico • Questão {currentQuizIndex + 1} de {quizQuestions.length}
                </span>
                <span className="font-mono text-[10px] bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                  IA Analisando Lacunas
                </span>
              </div>
              <h4 className="text-sm font-bold text-white leading-relaxed">
                {quizQuestions[currentQuizIndex]?.question}
              </h4>
              <div className="space-y-2">
                {quizQuestions[currentQuizIndex]?.options.map((option, optIdx) => {
                  const isSelected = userSelectedOption === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => setUserSelectedOption(optIdx)}
                      className={`w-full p-3 rounded-xl text-xs text-left border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-200 border-amber-400/80 font-bold shadow'
                          : 'bg-[#122131] text-slate-300 border-slate-700/50 hover:bg-[#1a2d42]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-mono text-[10px] font-bold text-slate-300">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{option}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handleAnswerQuizQuestion}
                disabled={userSelectedOption === null || isAnalyzingQuiz}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-40"
              >
                {isAnalyzingQuiz ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Processando e Criando Flashcards...</>
                ) : currentQuizIndex + 1 < quizQuestions.length ? (
                  <>Confirmar Resposta <ArrowRight className="w-4 h-4" /></>
                ) : (
                  <>Concluir Quiz & Gerar Diagnóstico da IA <Sparkles className="w-4 h-4" /></>
                )}
              </button>
            </div>
          )}

          {/* Diagnostic Result */}
          {diagnosticResult && (
            <div className="p-5 rounded-2xl bg-[#0b1a2a] border border-emerald-500/40 space-y-4 animate-fade-in shadow-2xl">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm border-b border-[#424754]/30 pb-2">
                <Award className="w-5 h-5" /> Relatório Diagnóstico Gemini IA
              </div>
              <p className="text-xs text-slate-200 leading-relaxed bg-[#122131] p-3 rounded-xl border border-emerald-500/20">
                {diagnosticResult.diagnosticSummary}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tópicos Dominados:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {diagnosticResult.masteredTopics.map((t, i) => (
                      <span key={i} className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded border border-emerald-500/30">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Tópicos com Lacunas:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {diagnosticResult.weakTopics.map((t, i) => (
                      <span key={i} className="text-[10px] bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded border border-amber-500/30">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generated Cards Preview */}
          {generatedCards.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-[#424754]/30 animate-fade-in">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Prévia dos Cartões Gerados ({generatedCards.length})
                {isGenerating && generationProgress && (
                  <span className="text-[10px] text-blue-300 font-mono animate-pulse">gerando mais...</span>
                )}
              </h3>
              <div className="space-y-3">
                {generatedCards.map((card, idx) => {
                  const diff = (card as any).difficulty as string || 'medium';
                  const diffStyles: Record<string, { badge: string; dot: string; label: string }> = {
                    easy:   { badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',   dot: 'bg-blue-400',   label: 'Fácil' },
                    medium: { badge: 'bg-green-500/20 text-green-300 border-green-500/40', dot: 'bg-green-400',  label: 'Médio' },
                    hard:   { badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40', dot: 'bg-violet-400', label: 'Difícil' },
                    expert: { badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40', dot: 'bg-orange-400', label: 'Especialista' },
                  };
                  const ds = diffStyles[diff] ?? diffStyles.medium;
                  return (
                  <div key={idx} className="p-4 rounded-2xl bg-[#0b1a2a] border border-[#adc6ff]/20 space-y-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-[#60a5fa]">CARD #{idx + 1}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${ds.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ds.dot}`} />
                        {(card as any).topic || deckTitle}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${ds.badge}`}>
                        {ds.label}
                      </span>
                    </div>
                    <div><strong className="text-[#8c91a0]">P:</strong> <span className="text-white font-bold">{card.front}</span></div>
                    <div><strong className="text-[#8c91a0]">R:</strong> <span className="text-slate-300">{card.back}</span></div>
                    {(card as any).explanation && (
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 whitespace-pre-line">{(card as any).explanation}</div>
                    )}
                    {(card as any).curiosity && (
                      <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-200">{(card as any).curiosity}</div>
                    )}
                  </div>
                  );
                })}
              </div>
              <button
                id="btn-save-generated-deck"
                onClick={handleSaveDeck}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/20 cursor-pointer hover:scale-[1.01] transition-all"
              >
                Salvar Deck na Sua Coleção
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MANUAL MODE ── */}
      {activeMode === 'manual' && (
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[#adc6ff]/20 space-y-6">
          <div>
            <label className="text-xs font-bold text-white uppercase">Matéria / Assunto</label>
            <input
              type="text"
              value={deckTitle}
              onChange={(e) => setDeckTitle(e.target.value)}
              placeholder="Ex: Anatomia Humana II"
              className="w-full mt-1 bg-[#0b1a2a] border border-[#424754]/40 rounded-xl p-3 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Cartões do Deck:</h3>
            {manualCards.map((mc, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#0b1a2a] border border-[#424754]/30 space-y-3 relative">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono font-bold text-[#adc6ff]">Cartão #{idx + 1}</span>
                  {manualCards.length > 1 && (
                    <button
                      onClick={() => setManualCards(manualCards.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={mc.front}
                  onChange={(e) => { const list = [...manualCards]; list[idx].front = e.target.value; setManualCards(list); }}
                  placeholder="Pergunta do cartão..."
                  className="w-full bg-[#122131] border border-[#424754]/30 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                />
                <textarea
                  rows={2}
                  value={mc.back}
                  onChange={(e) => { const list = [...manualCards]; list[idx].back = e.target.value; setManualCards(list); }}
                  placeholder="Resposta explicativa..."
                  className="w-full bg-[#122131] border border-[#424754]/30 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                />
              </div>
            ))}
            <button
              onClick={() => setManualCards([...manualCards, { front: '', back: '' }])}
              className="w-full py-2.5 rounded-xl border border-dashed border-[#adc6ff]/30 text-[#adc6ff] text-xs font-bold hover:bg-[#122131] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Adicionar Mais Um Cartão
            </button>
          </div>

          <button
            id="btn-save-manual-deck"
            onClick={handleSaveDeck}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-blue-500/25 cursor-pointer"
          >
            Criar Deck Manualmente
          </button>
        </div>
      )}

      {/* Upload mode generated cards preview */}
      {activeMode === 'upload' && generatedCards.length > 0 && (
        <div className="glass-card rounded-3xl p-6 border border-[#adc6ff]/20 space-y-4 animate-fade-in">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Flashcards Gerados do Documento ({generatedCards.length})
          </h3>
          <div className="space-y-3">
            {generatedCards.map((card, idx) => {
              const diff = (card as any).difficulty as string || 'medium';
              const diffStyles: Record<string, { badge: string; dot: string; label: string }> = {
                easy:   { badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',   dot: 'bg-blue-400',   label: 'Fácil' },
                medium: { badge: 'bg-green-500/20 text-green-300 border-green-500/40', dot: 'bg-green-400',  label: 'Médio' },
                hard:   { badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40', dot: 'bg-violet-400', label: 'Difícil' },
                expert: { badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40', dot: 'bg-orange-400', label: 'Especialista' },
              };
              const ds = diffStyles[diff] ?? diffStyles.medium;
              return (
              <div key={idx} className="p-4 rounded-2xl bg-[#0b1a2a] border border-[#adc6ff]/20 space-y-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] font-bold text-violet-400">CARD #{idx + 1}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${ds.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ds.dot}`} />
                    {(card as any).topic || deckTitle}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${ds.badge}`}>{ds.label}</span>
                </div>
                <div><strong className="text-[#8c91a0]">P:</strong> <span className="text-white font-bold">{card.front}</span></div>
                <div><strong className="text-[#8c91a0]">R:</strong> <span className="text-slate-300">{card.back}</span></div>
                {(card as any).explanation && (
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 whitespace-pre-line">{(card as any).explanation}</div>
                )}
                {(card as any).curiosity && (
                  <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-200">{(card as any).curiosity}</div>
                )}
              </div>
              );
            })}
          </div>
          <button
            onClick={handleSaveDeck}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-sm shadow-xl cursor-pointer hover:scale-[1.01] transition-all"
          >
            Salvar Deck na Sua Coleção
          </button>
        </div>
      )}

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Deck salvo com sucesso! Você pode estudá-lo na página inicial.
        </div>
      )}
    </div>
  );
};
