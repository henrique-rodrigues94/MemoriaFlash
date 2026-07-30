import React, { useState } from 'react';
import { Target, Zap, RefreshCw, Check, ArrowRight } from 'lucide-react';
import { SupportedLanguage, translations } from '../lib/i18n';
import { apiGenerateQuiz, apiQuizDiagnostic } from '../services/api';
import { QuizQuestion, Flashcard } from '../types';

interface Props {
  currentLanguage: SupportedLanguage;
}

export const QuizDiagnosticView: React.FC<Props> = ({ currentLanguage }) => {
  const t = translations[currentLanguage] || translations.pt;
  const [deckTitle, setDeckTitle] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [userSelectedOption, setUserSelectedOption] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isAnalyzingQuiz, setIsAnalyzingQuiz] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<{ diagnosticSummary: string; masteredTopics: string[]; weakTopics: string[]; cards: Flashcard[] } | null>(null);

  const startDiagnostic = async () => {
    if (!deckTitle.trim()) return alert('Digite a Matéria/Assunto para iniciar o Quiz Diagnóstico.');
    setIsGeneratingQuiz(true);
    setQuizQuestions([]);
    setCurrentQuizIndex(0);
    setUserAnswers([]);
    try {
      const qList = await apiGenerateQuiz(deckTitle, 4, currentLanguage);
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
    const newAnswer = { question: currentQ.question, topic: currentQ.explanation?.slice(0, 30) || deckTitle, isCorrect, selectedOption: currentQ.options[userSelectedOption] };
    const updatedAnswers = [...userAnswers, newAnswer];
    setUserAnswers(updatedAnswers);
    setUserSelectedOption(null);
    if (currentQuizIndex + 1 < quizQuestions.length) {
      setCurrentQuizIndex(currentQuizIndex + 1);
    } else {
      setIsAnalyzingQuiz(true);
      try {
        const result = await apiQuizDiagnostic(deckTitle, updatedAnswers, 25, 'medium', currentLanguage);
        setDiagnosticResult(result as any);
      } catch (err: any) {
        alert(err.message || 'Erro ao processar diagnóstico do quiz');
      } finally {
        setIsAnalyzingQuiz(false);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-24 animate-fade-in">
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[#adc6ff]/20 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            Matéria / Assunto
          </label>
          <input type="text" value={deckTitle} onChange={(e) => setDeckTitle(e.target.value)} placeholder="Ex: Direito Constitucional" className="w-full bg-[#0b1a2a] border border-[#424754]/50 rounded-2xl p-3.5 text-xs text-white" />
        </div>

        {!quizQuestions.length && !diagnosticResult && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <Target className="w-4 h-4" /> Como funciona o Quiz Diagnóstico com IA?
            </div>
            <p className="text-slate-300">A IA gerará 4 questões sobre "{deckTitle || 'seu assunto'}" e fará uma análise das suas lacunas.</p>
            <button onClick={startDiagnostic} disabled={isGeneratingQuiz || !deckTitle.trim()} className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs">
              {isGeneratingQuiz ? 'Gerando Quiz Diagnóstico...' : 'Iniciar Quiz Diagnóstico Agora'}
            </button>
          </div>
        )}

        {quizQuestions.length > 0 && !diagnosticResult && (
          <div className="p-5 rounded-2xl bg-[#0b1a2a] border border-amber-500/40 space-y-4">
            <div className="flex items-center justify-between text-xs text-amber-300 font-bold border-b border-[#424754]/30 pb-2">
              <span className="flex items-center gap-1.5"><Target className="w-4 h-4 text-amber-400" /> Quiz Diagnóstico • Questão {currentQuizIndex + 1} de {quizQuestions.length}</span>
            </div>
            <h4 className="text-sm font-bold text-white">{quizQuestions[currentQuizIndex]?.question}</h4>
            <div className="space-y-2">
              {quizQuestions[currentQuizIndex]?.options.map((option, optIdx) => (
                <button key={optIdx} onClick={() => setUserSelectedOption(optIdx)} className={`w-full p-3 rounded-xl text-xs text-left ${userSelectedOption === optIdx ? 'bg-amber-500/20 text-amber-200' : 'bg-[#122131] text-slate-300'}`}>
                  <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center">{String.fromCharCode(65 + optIdx)}</span><span>{option}</span></div>
                </button>
              ))}
            </div>
            <button onClick={confirmAnswer} disabled={userSelectedOption === null || isAnalyzingQuiz} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs">
              {isAnalyzingQuiz ? (<><RefreshCw className="w-4 h-4 animate-spin" /> Processando...</>) : currentQuizIndex + 1 < quizQuestions.length ? (<>Confirmar Resposta <ArrowRight className="w-4 h-4" /></>) : (<>Concluir Quiz & Gerar Diagnóstico <Zap className="w-4 h-4" /></>) }
            </button>
          </div>
        )}

        {diagnosticResult && (
          <div className="p-5 rounded-2xl bg-[#0b1a2a] border border-emerald-500/40 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm border-b border-[#424754]/30 pb-2"><Check className="w-5 h-5" /> Relatório Diagnóstico</div>
            <p className="text-xs text-slate-200 leading-relaxed">{diagnosticResult.diagnosticSummary}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizDiagnosticView;
