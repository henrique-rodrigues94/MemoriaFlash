import { Flashcard, QuizQuestion, RecoveryPlanDay } from '../types';
import {
  geminiSuggestTopics,
  geminiGenerateFlashcards,
  geminiGenerateQuiz,
  isGeminiClientConfigured,
} from './geminiClient';

// ─── Generate Flashcards ─────────────────────────────────────────────────────

export async function apiGenerateFlashcards(
  prompt: string,
  count: number = 6,
  language: string = 'pt',
  difficulty: string = 'medium',
  selectedTopics: string[] = []
): Promise<Partial<Flashcard>[]> {
  // 1ª tentativa: servidor
  try {
    const res = await fetch('/api/gemini/generate-flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, count, language, difficulty, selectedTopics }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error((errData as any).error || 'Erro do servidor');
    }
    const data = await res.json();
    const cards = data.cards || [];
    // Se o servidor retornou cards locais (sem IA), tenta browser
    if (cards.length > 0 && cards[0]?.back?.includes('sem IA disponível')) {
      throw new Error('Servidor em modo local, tentando browser');
    }
    return cards;
  } catch (serverErr) {
    console.warn('Servidor falhou, tentando Gemini direto no browser:', serverErr);
  }

  // 2ª tentativa: Gemini direto no browser
  if (isGeminiClientConfigured()) {
    try {
      const cards = await geminiGenerateFlashcards(prompt, count, language, difficulty, selectedTopics);
      return cards;
    } catch (clientErr) {
      console.warn('Gemini client-side falhou:', clientErr);
    }
  }

  // Nenhum provedor de IA disponível
  throw new Error('Não há servidor de IA disponível no momento. Tente novamente mais tarde.');
}

// ─── Suggest Topics ──────────────────────────────────────────────────────────

export async function apiSuggestTopics(title: string, language: string = 'pt'): Promise<string[]> {
  // 1ª tentativa: servidor
  try {
    const res = await fetch('/api/gemini/suggest-topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, language }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error((errData as any).error || 'Erro do servidor');
    }
    const data = await res.json();
    const topics: string[] = data.topics || [];
    // Servidor retornou array vazio = está em modo local (sem IA), escala para browser
    if (topics.length === 0) {
      throw new Error('Servidor em modo local, tentando browser');
    }
    return topics;
  } catch (serverErr) {
    console.warn('Servidor falhou para suggest-topics, tentando browser:', serverErr);
  }

  // 2ª tentativa: Gemini direto no browser
  if (isGeminiClientConfigured()) {
    try {
      const topics = await geminiSuggestTopics(title, language);
      if (topics.length > 0) return topics;
    } catch (clientErr) {
      console.warn('Gemini client-side falhou para tópicos:', clientErr);
    }
  }

  // Nenhum provedor de IA disponível
  throw new Error('Não há servidor de IA disponível no momento. Tente novamente mais tarde.');
}

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

// ─── Voice Tutor ─────────────────────────────────────────────────────────────

export interface VoiceTutorResponse {
  answer: string;
  aiInsight: string;
  suggestedFlashcard?: { front: string; back: string };
}

export async function apiVoiceTutor(
  question: string,
  contextTopic: string = 'Geral',
  language: string = 'pt'
): Promise<VoiceTutorResponse> {
  const res = await fetch('/api/gemini/voice-tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, contextTopic, language }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error((errData as any).error || 'Erro ao consultar Tutor IA');
  }
  return await res.json();
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
  if (isGeminiClientConfigured()) {
    try {
      return await geminiGenerateQuiz(topic, count, language);
    } catch (clientErr) {
      console.warn('Gemini client-side falhou para quiz:', clientErr);
    }
  }

  throw new Error('Não foi possível gerar o quiz. Configure VITE_GEMINI_API_KEY no .env');
}

// ─── Recovery Plan ───────────────────────────────────────────────────────────

export interface RecoveryPlanResult {
  estimatedSuccessRate: number;
  aiInsightMessage: string;
  days: RecoveryPlanDay[];
}

export async function apiGenerateRecoveryPlan(
  weakTopics: string[],
  studentName: string = 'Maria',
  language: string = 'pt'
): Promise<RecoveryPlanResult> {
  const res = await fetch('/api/gemini/recovery-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weakTopics, studentName, language }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error((errData as any).error || 'Erro ao gerar plano de recuperação');
  }
  const data = await res.json();
  return data.plan;
}
