import { Flashcard, QuizQuestion } from '../types';
import {
  clientGenerateQuiz,
  isAnyProviderConfigured,
} from './aiClient';

// ─── Quiz Diagnostic ─────────────────────────────────────────────────────────

export interface QuizDiagnosticResult {
  diagnosticSummary: string;
  masteredTopics: string[];
  weakTopics: string[];
  cards: Partial<Flashcard>[];
}

export async function apiQuizDiagnostic(
  topic: string,
  userAnswers: { question: string; topic: string; isCorrect: boolean; selectedOption: string }[],
  count: number = 6,
  difficulty: string = 'medium',
  language: string = 'pt'
): Promise<QuizDiagnosticResult> {
  try {
    const res = await fetch('/api/gemini/quiz-diagnostic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, userAnswers, count, difficulty, language }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error((errData as any).error || 'Erro na análise de quiz');
    }
    return await res.json();
  } catch (err: any) {
    console.error('apiQuizDiagnostic error:', err);
    throw new Error('Não há servidor de IA disponível no momento. Tente novamente mais tarde.');
  }
}

// ─── Generate Quiz ───────────────────────────────────────────────────────────

export async function apiGenerateQuiz(
  topic: string = 'Conhecimentos Gerais',
  count: number = 5,
  language: string = 'pt'
): Promise<QuizQuestion[]> {
  // 1ª tentativa: servidor
  try {
    const res = await fetch('/api/gemini/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, count, language }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error((errData as any).error || 'Erro ao gerar quiz');
    }
    const data = await res.json();
    return data.quiz || [];
  } catch (serverErr) {
    console.warn('Servidor falhou para generate-quiz, tentando browser:', serverErr);
  }

  // 2ª tentativa: Gemini direto no browser
  if (isAnyProviderConfigured()) {
    try {
      return await clientGenerateQuiz(topic, count, language);
    } catch (clientErr) {
      console.warn('AI client-side falhou para quiz:', clientErr);
    }
  }

  throw new Error('Não foi possível gerar o quiz. Configure VITE_GEMINI_API_KEY no .env');
}
