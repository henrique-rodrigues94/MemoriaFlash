import React, { useState } from 'react';
import { Target, Sparkles, Plus, ArrowRight, RefreshCw, Zap, Check, X, Play, Lock } from 'lucide-react';
import { apiGenerateQuiz, apiQuizDiagnostic } from '../services/api';
import { SupportedLanguage, translations } from '../lib/i18n';
import { QuizQuestion, Flashcard, UserStats } from '../types';
import { hasEnoughCredits } from '../services/economy/creditsEngine';
import { ECONOMY } from '../services/economy/economyConstants';

interface Props {
  currentLanguage?: SupportedLanguage;
  stats?: UserStats;
  onDeductCredit?: (amount?: number) => void;
  onOpenAdMob?: () => void;
  onOpenSubscription?: () => void;
}

export function QuizView({ currentLanguage = 'pt', stats, onDeductCredit, onOpenAdMob }: Props) {
  const t = translations[currentLanguage] || translations.pt;
  const [subject, setSubject] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [cardCount, setCardCount] = useState(25);

  // Estado do fluxo do quiz
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [userSelectedOption, setUserSelectedOption] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isAnalyzingQuiz, setIsAnalyzingQuiz] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<{
    diagnosticSummary: string;
    masteredTopics: string[];
    weakTopics: string[];
    cards: Flashcard[];
  } | null>(null);

  const handleAddTopic = () => {
    if (newTopic.trim()) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic('');
    }
  };

  const startDiagnostic = async () => {
    if (!subject.trim()) return alert('Digite a Matéria/Assunto para iniciar o Quiz Diagnóstico.');

    // Gate de créditos: 1 crédito por quiz diagnóstico
    const cost = ECONOMY.COST_GENERATE_DECK;
    if (stats && !hasEnoughCredits(stats, cost)) {
      if (onOpenAdMob) onOpenAdMob();
      return;
    }

    setIsGeneratingQuiz(true);
    setQuizQuestions([]);
    setCurrentQuizIndex(0);
    setUserAnswers([]);
    setDiagnosticResult(null);
    try {
      const qList = await apiGenerateQuiz(subject.trim(), 4, currentLanguage);
      // Desconta crédito após sucesso
      if (stats && !stats.isPro && onDeductCredit) onDeductCredit(cost);
      setQuizQuestions(qList);
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar quiz diagnóstico');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const confirmAnswer = async () => {
    if (userSelectedOption === null) return;
    const currentQ = quizQuestions[currentQuizIndex];
    const isCorrect = userSelectedOption === currentQ.correctIndex;
    const newAnswer = {
      question: currentQ.question,
      topic: currentQ.explanation?.slice(0, 30) || subject,
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
        const result = await apiQuizDiagnostic(subject.trim(), updatedAnswers, cardCount, 'medium', currentLanguage);
        setDiagnosticResult(result as any);
      } catch (err: any) {
        alert(err.message || 'Erro ao processar diagnóstico do quiz');
      } finally {
        setIsAnalyzingQuiz(false);
      }
    }
  };

  const resetQuiz = () => {
    setQuizQuestions([]);
    setCurrentQuizIndex(0);
    setUserAnswers([]);
    setDiagnosticResult(null);
    setUserSelectedOption(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 text-slate-100">
      {/* CARD PRINCIPAL DO QUIZ */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6">
        {/* Banner/Header da Aba Quiz */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-3 rounded-xl text-center font-bold text-white flex items-center justify-center gap-2 shadow-lg">
          <Target className="w-5 h-5" />
          Quiz Diagnóstico com IA
        </div>

        {/* Campo 1: Matéria / Assunto */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">📖 MATÉRIA / ASSUNTO:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value.toUpperCase())}
            placeholder="EX: DIREITO CONSTITUCIONAL, ANATOMIA HUMANA, PYTHON..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition uppercase"
          />
        </div>

        {/* Campo 2: Tópicos de Estudo Relacionados */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">📚 Tópicos de Estudo Relacionados</label>
            <span className="text-xs text-slate-500">Clique para incluir/excluir</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Adicionar tópico específico..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition text-sm"
            />
            <button
              onClick={handleAddTopic}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>

          {topics.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {topics.map((tp, idx) => (
                <span key={idx} className="bg-slate-800 text-amber-400 text-xs px-3 py-1.5 rounded-lg border border-slate-700">{tp}</span>
              ))}
            </div>
          )}
        </div>

        {/* Campo 3: Quantidade de Cards */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">QUANTIDADE DE CARDS</label>
          <select
            value={cardCount}
            onChange={(e) => setCardCount(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition"
          >
            <option value={25}>25 Flashcards</option>
            <option value={50}>50 Flashcards</option>
            <option value={100}>100 Flashcards</option>
          </select>
        </div>

        {/* Bloco Explicativo do Quiz */}
        {quizQuestions.length === 0 && !diagnosticResult && (
          <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4 text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Target className="w-4 h-4" />
              Como funciona o Quiz Diagnóstico com IA?
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              A IA gerará 4 questões sobre <strong className="text-slate-200">"{subject || 'seu assunto'}"</strong>. Ao responder, a IA fará uma análise imediata das suas lacunas e criará flashcards focando exatamente nos tópicos onde você precisa melhorar!
            </p>

            {/* Banner de créditos quiz */}
            {stats && !stats.isPro && (
              <div className={`rounded-xl p-3 flex items-center justify-between gap-2 border ${
                (stats.aiCredits || 0) > 0
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-amber-500/10 border-amber-500/40'
              }`}>
                <div className="flex items-center gap-2">
                  {(stats.aiCredits || 0) > 0
                    ? <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    : <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  <span className={`text-xs font-semibold ${(stats.aiCredits || 0) > 0 ? 'text-blue-300' : 'text-amber-300'}`}>
                    {(stats.aiCredits || 0) > 0
                      ? `${stats.aiCredits} crédito${(stats.aiCredits || 0) !== 1 ? 's' : ''} — custa ${ECONOMY.COST_GENERATE_DECK} por quiz`
                      : 'Sem créditos — assista um vídeo para ganhar'}
                  </span>
                </div>
                {(stats.aiCredits || 0) === 0 && onOpenAdMob && (
                  <button
                    type="button"
                    onClick={onOpenAdMob}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold whitespace-nowrap hover:bg-amber-500/30 transition"
                  >
                    <Play className="w-3 h-3 fill-current" /> Ganhar
                  </button>
                )}
              </div>
            )}

            <button
              onClick={startDiagnostic}
              disabled={isGeneratingQuiz || !subject.trim() || (!!stats && !stats.isPro && (stats.aiCredits || 0) < ECONOMY.COST_GENERATE_DECK)}
              className="w-full mt-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGeneratingQuiz ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Gerando Quiz Diagnóstico...</>
              ) : (!!stats && !stats.isPro && (stats.aiCredits || 0) < ECONOMY.COST_GENERATE_DECK) ? (
                <><Lock className="w-4 h-4" /> Sem Créditos — Assista um Anúncio</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Iniciar Quiz Diagnóstico Agora</>
              )}
            </button>
          </div>
        )}

        {/* Quiz em andamento */}
        {quizQuestions.length > 0 && !diagnosticResult && (
          <div className="p-5 rounded-2xl bg-[#0b1a2a] border border-amber-500/40 space-y-4">
            <div className="flex items-center justify-between text-xs text-amber-300 font-bold border-b border-[#424754]/30 pb-2">
              <span className="flex items-center gap-1.5"><Target className="w-4 h-4 text-amber-400" /> Quiz Diagnóstico • Questão {currentQuizIndex + 1} de {quizQuestions.length}</span>
            </div>
            <h4 className="text-sm font-bold text-white">{quizQuestions[currentQuizIndex]?.question}</h4>
            <div className="space-y-2">
              {quizQuestions[currentQuizIndex]?.options.map((option, optIdx) => (
                <button
                  key={optIdx}
                  onClick={() => setUserSelectedOption(optIdx)}
                  className={`w-full p-3 rounded-xl text-xs text-left ${userSelectedOption === optIdx ? 'bg-amber-500/20 text-amber-200' : 'bg-[#122131] text-slate-300 hover:bg-[#1c2b3c]'}`}
                >
                  <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center">{String.fromCharCode(65 + optIdx)}</span><span>{option}</span></div>
                </button>
              ))}
            </div>
            <button
              onClick={confirmAnswer}
              disabled={userSelectedOption === null || isAnalyzingQuiz}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs disabled:opacity-50"
            >
              {isAnalyzingQuiz ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Processando...</>
              ) : currentQuizIndex + 1 < quizQuestions.length ? (
                <>Confirmar Resposta <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>Concluir Quiz & Gerar Diagnóstico <Zap className="w-4 h-4" /></>
              )}
            </button>
          </div>
        )}

        {/* Resultado do Diagnóstico */}
        {diagnosticResult && (
          <div className="p-5 rounded-2xl bg-[#0b1a2a] border border-emerald-500/40 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm border-b border-[#424754]/30 pb-2">
              <Check className="w-5 h-5" /> Relatório Diagnóstico
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">{diagnosticResult.diagnosticSummary}</p>

            {diagnosticResult.weakTopics?.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-rose-400">🎯 Tópicos a revisar:</div>
                <div className="flex flex-wrap gap-2">
                  {diagnosticResult.weakTopics.map((tp, i) => (
                    <span key={i} className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs px-3 py-1.5 rounded-lg">{tp}</span>
                  ))}
                </div>
              </div>
            )}

            {diagnosticResult.masteredTopics?.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-emerald-400">✅ Tópicos dominados:</div>
                <div className="flex flex-wrap gap-2">
                  {diagnosticResult.masteredTopics.map((tp, i) => (
                    <span key={i} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-3 py-1.5 rounded-lg">{tp}</span>
                  ))}
                </div>
              </div>
            )}

            {diagnosticResult.cards?.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#122131] border border-[#adc6ff]/20">
                <div className="text-xs font-bold text-amber-300 mb-2">📇 {diagnosticResult.cards.length} Flashcards sugeridos para revisão:</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {diagnosticResult.cards.map((card, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#0b1a2a] border border-[#424754]/40">
                      <div className="text-xs text-white font-semibold">Q: {card.front}</div>
                      <div className="text-[11px] text-slate-400 mt-1">R: {card.back}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={resetQuiz}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs"
            >
              Fazer Outro Quiz Diagnóstico
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
