import { Flashcard, QuizQuestion, RecoveryPlanDay } from '../types';
import {
  geminiSuggestTopics,
  geminiGenerateFlashcards,
  geminiGenerateQuiz,
  isGeminiClientConfigured,
} from './geminiClient';

// Templates distintos de perguntas e respostas para o fallback FINAL (sem IA alguma)
const QUESTION_TEMPLATES = [
  (t: string) => `Qual é a definição de ${t}?`,
  (t: string) => `Quais são as principais características de ${t}?`,
  (t: string) => `Como funciona ${t} na prática?`,
  (t: string) => `Quais são os tipos de ${t} e suas diferenças?`,
  (t: string) => `Qual a importância de ${t} na área de estudo?`,
  (t: string) => `Quais são as aplicações práticas de ${t}?`,
  (t: string) => `Quais são os erros mais comuns relacionados a ${t}?`,
  (t: string) => `Como ${t} se relaciona com outros conceitos da área?`,
];

const ANSWER_TEMPLATES = [
  (t: string) =>
    `${t} é definido como um conjunto de conceitos e práticas fundamentais.\n\n• Ponto chave 1: Compreenda o significado central do conceito.\n• Ponto chave 2: Relacione com exemplos concretos para fixar melhor.`,
  (t: string) =>
    `As principais características de ${t} incluem aspectos técnicos e estruturais.\n\n• Ponto chave 1: Identifique os elementos que definem e distinguem o conceito.\n• Ponto chave 2: Compare com temas relacionados para entender diferenças.`,
  (t: string) =>
    `Na prática, ${t} funciona por meio de processos e mecanismos específicos.\n\n• Ponto chave 1: Compreenda o fluxo ou sequência de etapas envolvidas.\n• Ponto chave 2: Relacione com situações do cotidiano para melhor compreensão.`,
  (t: string) =>
    `Os tipos de ${t} são classificados conforme suas propriedades e finalidades.\n\n• Ponto chave 1: Memorize as categorias principais e seus critérios.\n• Ponto chave 2: Saiba identificar as diferenças entre cada tipo.`,
  (t: string) =>
    `A importância de ${t} está no seu impacto e aplicabilidade dentro da área.\n\n• Ponto chave 1: Entenda o papel histórico e atual do conceito.\n• Ponto chave 2: Relacione com problemas reais que esse conhecimento resolve.`,
  (t: string) =>
    `As aplicações práticas de ${t} abrangem contextos reais e casos de uso concretos.\n\n• Ponto chave 1: Identifique onde esse conceito é usado no mundo real.\n• Ponto chave 2: Pratique resolvendo exercícios e problemas relacionados.`,
  (t: string) =>
    `Os erros mais comuns em ${t} envolvem confusões conceituais e má aplicação.\n\n• Ponto chave 1: Identifique os pontos de maior confusão no tema.\n• Ponto chave 2: Revise as exceções e casos especiais do conceito.`,
  (t: string) =>
    `${t} se relaciona com outros conceitos por meio de princípios e fundamentos compartilhados.\n\n• Ponto chave 1: Mapeie os conceitos conectados e suas interdependências.\n• Ponto chave 2: Construa um mapa mental para visualizar as relações.`,
];

function buildLocalFallbackCards(
  prompt: string,
  count: number,
  difficulty: string,
  selectedTopics: string[]
): Partial<Flashcard>[] {
  const safeDiff = (['easy', 'medium', 'hard', 'expert'].includes(difficulty)
    ? difficulty
    : 'medium') as 'easy' | 'medium' | 'hard' | 'expert';
  const effectiveTopics = selectedTopics.length > 0 ? selectedTopics : [prompt];
  return Array.from({ length: count }).map((_, i) => {
    const cardTopic = effectiveTopics[i % effectiveTopics.length];
    const tmplIdx = i % QUESTION_TEMPLATES.length;
    return {
      front: QUESTION_TEMPLATES[tmplIdx](cardTopic),
      back: ANSWER_TEMPLATES[tmplIdx](cardTopic),
      topic: cardTopic,
      difficulty: safeDiff,
    };
  });
}

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

  // 3ª tentativa: fallback local com templates distintos
  console.warn('Usando fallback local. Configure VITE_GEMINI_API_KEY no .env');
  return buildLocalFallbackCards(prompt, count, difficulty, selectedTopics);
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

  // Fallback final: tópicos genéricos com o título
  return [
    `Conceitos Fundamentais de ${title}`,
    `Classificação e Tipos de ${title}`,
    `Aplicações Práticas de ${title}`,
    `Casos Especiais e Exceções em ${title}`,
    `Relação de ${title} com Outros Temas`,
    `Questões Frequentes sobre ${title}`,
  ];
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
    const correctCount = userAnswers.filter((a) => a.isCorrect).length;
    const weakList = userAnswers.filter((a) => !a.isCorrect).map((a) => a.topic || topic);
    const strongList = userAnswers.filter((a) => a.isCorrect).map((a) => a.topic || topic);
    const effectiveWeakTopics = weakList.length > 0 ? weakList : [topic];
    const safeDiff = (['easy', 'medium', 'hard', 'expert'].includes(difficulty)
      ? difficulty
      : 'medium') as any;
    return {
      diagnosticSummary: `Você acertou ${correctCount} de ${userAnswers.length} questões. Lacunas em: ${effectiveWeakTopics.join(', ')}.`,
      masteredTopics: Array.from(new Set(strongList)),
      weakTopics: Array.from(new Set(effectiveWeakTopics)),
      cards: buildLocalFallbackCards(topic, count, safeDiff, effectiveWeakTopics),
    };
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
