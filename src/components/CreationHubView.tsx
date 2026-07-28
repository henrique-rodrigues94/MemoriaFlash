import React, { useState } from 'react';
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
  HelpCircle,
  Check,
  Search,
  Target,
  BrainCircuit,
  BarChart3,
  SlidersHorizontal,
  RefreshCw,
  Award,
  AlertTriangle,
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
  const [activeMode, setActiveMode] = useState<'ai' | 'manual'>('ai');
  const [aiSubMode, setAiSubMode] = useState<'direct' | 'quiz'>('direct');

  // Common inputs
  const [deckTitle, setDeckTitle] = useState('');
  const [promptText, setPromptText] = useState('');
  const [category, setCategory] = useState('Estudos Gerais');
  const [cardCount, setCardCount] = useState(6);
  const [difficulty, setDifficulty] = useState<StudyDifficulty>('medium');

  // Topics Suggestion state
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [customTopicInput, setCustomTopicInput] = useState('');

  // AI Direct Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<Partial<Flashcard>[]>([]);

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

  // Difficulty options definition
  const difficultyOptions: {
    id: StudyDifficulty;
    label: string;
    desc: string;
    badgeColor: string;
    borderColor: string;
  }[] = [
    {
      id: 'easy',
      label: 'Fácil',
      desc: 'Conceitos básicos e definições diretas',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      borderColor: 'border-emerald-500/30',
    },
    {
      id: 'medium',
      label: 'Médio',
      desc: 'Aplicações práticas e relacionamentos',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      borderColor: 'border-blue-500/30',
    },
    {
      id: 'hard',
      label: 'Difícil',
      desc: 'Exceções, pegadinhas e análises críticas',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      borderColor: 'border-amber-500/30',
    },
    {
      id: 'expert',
      label: 'Especialista',
      desc: 'Alto nível técnico e provas de concurso',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      borderColor: 'border-purple-500/30',
    },
  ];

  // Suggest Topics based on Deck Title
  const handleSuggestTopics = async (titleToUse?: string) => {
    const query = titleToUse || deckTitle || promptText;
    if (!query.trim()) {
      alert('Digite o Título do Deck ou o Assunto para buscar tópicos de estudo.');
      return;
    }

    setIsLoadingTopics(true);
    try {
      const topics = await apiSuggestTopics(query, currentLanguage);
      setSuggestedTopics(topics);
      // Auto select all suggested topics by default
      setSelectedTopics(topics);
    } catch (err: any) {
      alert(err.message || 'Erro ao sugerir tópicos');
    } finally {
      setIsLoadingTopics(false);
    }
  };

  const toggleTopicSelection = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleAddCustomTopic = () => {
    if (customTopicInput.trim() && !selectedTopics.includes(customTopicInput.trim())) {
      setSelectedTopics([...selectedTopics, customTopicInput.trim()]);
      setSuggestedTopics([...suggestedTopics, customTopicInput.trim()]);
      setCustomTopicInput('');
    }
  };

  // Direct AI Generation
  const handleGenerateAi = async () => {
    const finalPrompt = promptText.trim() || deckTitle.trim();
    if (!finalPrompt) {
      alert('Preencha o Título do Deck ou o Conteúdo de Estudo.');
      return;
    }

    if (!stats.isPro && (stats.aiCredits || 0) <= 0) {
      onOpenAdMob();
      return;
    }

    setIsGenerating(true);
    setGeneratedCards([]);
    try {
      const cards = await apiGenerateFlashcards(
        finalPrompt,
        cardCount,
        currentLanguage,
        difficulty,
        selectedTopics
      );
      setGeneratedCards(cards);

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
    }
  };

  // Diagnostic Quiz Start
  const handleStartDiagnosticQuiz = async () => {
    const topicToTest = deckTitle.trim() || promptText.trim();
    if (!topicToTest) {
      alert('Digite o Título do Deck para iniciar o Quiz Diagnóstico.');
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

  // Diagnostic Quiz Answer Question
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
      // Quiz finished -> Run Diagnostic Analysis & Generate Targeted Cards
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

  // Save Deck Function
  const handleSaveDeck = () => {
    const finalCards: Flashcard[] = (
      activeMode === 'ai' ? generatedCards : manualCards.filter((c) => c.front && c.back)
    ).map((c, i) => ({
      id: `card-gen-${Date.now()}-${i}`,
      front: c.front || '',
      back: c.back || '',
      topic: c.topic || category || deckTitle,
      difficulty: (c.difficulty as StudyDifficulty) || difficulty,
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
      category: category || 'Geral',
      description: `Deck nível ${difficulty.toUpperCase()} gerado com ${finalCards.length} cartões via Gemini 3.6 Flash.`,
      color: '#60a5fa',
      accentBorder: 'border-l-primary',
      cards: finalCards,
    };

    onSaveNewDeck(newDeck);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);

    // Reset fields
    setGeneratedCards([]);
    setPromptText('');
    setDeckTitle('');
    setQuizQuestions([]);
    setDiagnosticResult(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 animate-fade-in">
      {/* Top Header & Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#424754]/30 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-[#60a5fa] animate-pulse" /> Central de Criação de Decks
          </h2>
          <p className="text-xs text-[#8c91a0] mt-0.5">
            Gere decks com Tópicos de Estudo, Níveis de Dificuldade ou Quiz Diagnóstico com IA.
          </p>
        </div>

        <div className="flex bg-[#0b1a2a] p-1 rounded-2xl border border-[#424754]/40 shadow-inner">
          <button
            onClick={() => setActiveMode('ai')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'ai' ? 'bg-[#4d8eff] text-white shadow-md' : 'text-[#8c91a0] hover:text-white'
            }`}
          >
            Gerador IA
          </button>
          <button
            onClick={() => setActiveMode('manual')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'manual' ? 'bg-[#4d8eff] text-white shadow-md' : 'text-[#8c91a0] hover:text-white'
            }`}
          >
            Manual
          </button>
        </div>
      </div>

      {activeMode === 'ai' ? (
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[#adc6ff]/20 space-y-6">
          {/* AI Sub-mode selector (Direct vs Diagnostic Quiz) */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-[#0b1a2a] rounded-2xl border border-[#424754]/40">
            <button
              onClick={() => {
                setAiSubMode('direct');
                setQuizQuestions([]);
                setDiagnosticResult(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                aiSubMode === 'direct'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'text-[#8c91a0] hover:text-white'
              }`}
            >
              <BrainCircuit className="w-4 h-4" /> Geração Direta por Tópicos
            </button>

            <button
              onClick={() => {
                setAiSubMode('quiz');
                setGeneratedCards([]);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                aiSubMode === 'quiz'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                  : 'text-[#8c91a0] hover:text-white'
              }`}
            >
              <Target className="w-4 h-4" /> Quiz Diagnóstico com IA
            </button>
          </div>

          {/* 1. Deck Title Input & Automatic Topics Trigger */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#60a5fa]" /> 1. Título do Deck / Assunto Principal:
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={deckTitle}
                onChange={(e) => setDeckTitle(e.target.value)}
                onBlur={() => {
                  if (deckTitle.trim() && suggestedTopics.length === 0) {
                    handleSuggestTopics(deckTitle);
                  }
                }}
                placeholder="Ex: Direito Constitucional, Anatomia Humana, Python para Ciência de Dados..."
                className="flex-1 bg-[#0b1a2a] border border-[#424754]/50 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-[#60a5fa]"
              />

              <button
                type="button"
                onClick={() => handleSuggestTopics()}
                disabled={isLoadingTopics || (!deckTitle.trim() && !promptText.trim())}
                className="px-4 py-3.5 rounded-2xl bg-[#122131] hover:bg-[#1a2d42] border border-[#adc6ff]/30 text-[#adc6ff] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                title="Buscar sub-tópicos com IA"
              >
                <Search className="w-4 h-4 text-[#60a5fa]" />
                {isLoadingTopics ? 'Buscando...' : 'Sugerir Tópicos'}
              </button>
            </div>
          </div>

          {/* 2. Suggested Study Topics Section */}
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
                IA analisando o assunto e gerando sub-tópicos de estudo...
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
                Digite um título acima e clique em <strong className="text-white font-medium">"Sugerir Tópicos"</strong> para a IA gerar sub-temas automáticos.
              </div>
            )}

            {/* Custom Topic Add */}
            <div className="flex gap-2 pt-2 border-t border-[#424754]/30">
              <input
                type="text"
                value={customTopicInput}
                onChange={(e) => setCustomTopicInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomTopic())}
                placeholder="Adicionar outro sub-tópico específico..."
                className="flex-1 bg-[#122131] border border-[#424754]/30 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomTopic}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer"
              >
                + Adicionar
              </button>
            </div>
          </div>

          {/* 3. Study Difficulty Selection (Fácil, Médio, Difícil, Especialista) */}
          <div className="space-y-3">
            <label className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#60a5fa]" /> 2. Nível de Estudo (Dificuldade):
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {difficultyOptions.map((opt) => {
                const isSelected = difficulty === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDifficulty(opt.id)}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `bg-[#122238] ${opt.borderColor} ring-2 ring-[#60a5fa]/50 shadow-md`
                        : 'bg-[#0b1a2a] border-[#424754]/30 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md border ${opt.badgeColor}`}>
                        {opt.label}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#60a5fa]" />}
                    </div>
                    <p className="text-[10px] text-[#8c91a0] leading-tight">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Notes / Content Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#8c91a0] uppercase flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#60a5fa]" /> Texto/Resumo Adicional (Opcional)
            </label>
            <textarea
              rows={3}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Cole aqui transcrições, artigos ou anotações para complementar a IA..."
              className="w-full bg-[#0b1a2a] border border-[#424754]/40 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-[#60a5fa]"
            />
          </div>

          {/* Quantity & Category options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#8c91a0] uppercase">Categoria do Deck</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Concursos, Faculdade, Idiomas"
                className="w-full mt-1 bg-[#0b1a2a] border border-[#424754]/40 rounded-xl p-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#8c91a0] uppercase">Quantidade de Cards</label>
              <select
                value={cardCount}
                onChange={(e) => setCardCount(parseInt(e.target.value))}
                className="w-full mt-1 bg-[#0b1a2a] border border-[#424754]/40 rounded-xl p-2.5 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value={4}>4 Flashcards</option>
                <option value={6}>6 Flashcards (Recomendado)</option>
                <option value={10}>10 Flashcards</option>
                <option value={16}>16 Flashcards</option>
              </select>
            </div>
          </div>

          {/* Action Execution according to Sub-Mode */}
          {aiSubMode === 'direct' ? (
            <button
              id="btn-generate-deck-ai"
              onClick={handleGenerateAi}
              disabled={isGenerating || (!deckTitle.trim() && !promptText.trim())}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xl shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.01]"
            >
              <Sparkles className="w-4 h-4 text-blue-300 animate-spin" />
              {isGenerating
                ? 'Gemini 3.6 Flash Criando Flashcards...'
                : `Gerar Deck (${difficultyOptions.find((d) => d.id === difficulty)?.label}) com IA`}
            </button>
          ) : (
            /* Quiz Diagnostic Trigger Box */
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

          {/* Interactive Diagnostic Quiz Running UI */}
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
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Processando Análise e Criando Flashcards...
                  </>
                ) : currentQuizIndex + 1 < quizQuestions.length ? (
                  <>
                    Confirmar Resposta <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Concluir Quiz & Gerar Diagnóstico da IA <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Diagnostic Result & Targeted Flashcards Box */}
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
                      <span key={i} className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded border border-emerald-500/30">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Tópicos com Lacunas:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {diagnosticResult.weakTopics.map((t, i) => (
                      <span key={i} className="text-[10px] bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded border border-amber-500/30">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generated Cards Preview List */}
          {generatedCards.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-[#424754]/30 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Prévia dos Cartões Gerados ({generatedCards.length})
                </h3>
                <span className="text-[10px] font-mono text-blue-300 uppercase font-bold bg-blue-500/20 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                  Nível {difficulty.toUpperCase()}
                </span>
              </div>

              <div className="space-y-3">
                {generatedCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#0b1a2a] border border-[#adc6ff]/20 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-[#8c91a0]">
                      <span className="font-mono text-[10px] font-bold text-[#60a5fa]">
                        CARD #{idx + 1} • {card.topic || deckTitle}
                      </span>
                    </div>
                    <div>
                      <strong className="text-[#8c91a0]">P:</strong>{' '}
                      <span className="text-white font-bold">{card.front}</span>
                    </div>
                    <div className="whitespace-pre-line leading-relaxed">
                      <strong className="text-[#8c91a0]">R:</strong>{' '}
                      <span className="text-slate-300">{card.back}</span>
                    </div>
                  </div>
                ))}
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
      ) : (
        /* Manual Creation Mode */
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[#adc6ff]/20 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-white uppercase">Título do Deck</label>
              <input
                type="text"
                value={deckTitle}
                onChange={(e) => setDeckTitle(e.target.value)}
                placeholder="Ex: Anatomia Humana II"
                className="w-full mt-1 bg-[#0b1a2a] border border-[#424754]/40 rounded-xl p-3 text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-white uppercase">Categoria</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Medicina"
                className="w-full mt-1 bg-[#0b1a2a] border border-[#424754]/40 rounded-xl p-3 text-xs text-white focus:outline-none"
              />
            </div>
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
                  onChange={(e) => {
                    const list = [...manualCards];
                    list[idx].front = e.target.value;
                    setManualCards(list);
                  }}
                  placeholder="Pergunta do cartão..."
                  className="w-full bg-[#122131] border border-[#424754]/30 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                />
                <textarea
                  rows={2}
                  value={mc.back}
                  onChange={(e) => {
                    const list = [...manualCards];
                    list[idx].back = e.target.value;
                    setManualCards(list);
                  }}
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

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Deck salvo com sucesso! Você pode estudá-lo na página inicial.
        </div>
      )}
    </div>
  );
};
