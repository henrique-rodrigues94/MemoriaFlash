import { Flashcard } from '../types';

/**
 * Gera sugestões de tópicos para uma matéria.
 * Chama o backend — as chaves de API ficam APENAS no servidor.
 */
export const getAITopicSuggestions = (subject: string): string[] => {
  if (!subject.trim()) return [];
  // Retorno local imediato enquanto o backend responde de forma assíncrona
  return [
    `Conceitos Principais de ${subject}`,
    `Fundamentos de ${subject}`,
    `Aplicações Práticas`,
    `Regras e Exceções`,
    `Exercícios e Questões Frequentes`,
  ];
};

/**
 * Busca sugestões de tópicos reais via IA no backend.
 */
export const fetchAITopicSuggestions = async (subject: string): Promise<string[]> => {
  if (!subject.trim()) return [];
  try {
    const res = await fetch('/api/gemini/suggest-topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: subject, language: 'pt' }),
    });
    if (!res.ok) return getAITopicSuggestions(subject);
    const data = await res.json();
    // O backend retorna { topics: string[] } ou { cacheHit, topics, ... }
    return Array.isArray(data.topics) ? data.topics : getAITopicSuggestions(subject);
  } catch {
    return getAITopicSuggestions(subject);
  }
};

/**
 * Gera flashcards via backend (Gemini → Groq → DeepSeek → ... com fallback automático).
 * Nenhuma chave de API fica exposta no frontend.
 */
export const generateAICards = async (
  subject: string,
  topics: string[],
  count: number
): Promise<Flashcard[]> => {
  const res = await fetch('/api/gemini/generate-flashcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: subject,
      count,
      language: 'pt',
      difficulty: 'medium',
      selectedTopics: topics,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Erro ao gerar flashcards (${res.status})`);
  }

  const data = await res.json();

  // O backend pode retornar { cards: [...] } ou diretamente um array
  const raw: any[] = Array.isArray(data) ? data : (data.cards ?? []);

  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('Nenhum flashcard foi gerado. Tente novamente.');
  }

  return raw.map((item: any, idx: number) => ({
    id: `ai-card-${Date.now()}-${idx}`,
    subject: item.subject || subject,
    topic: item.topic || topics[0] || subject,
    front: item.front || '',
    back: item.back || '',
    explanation: item.explanation || '',
    curiosity: item.curiosity || '',
    difficulty: (item.difficulty as Flashcard['difficulty']) || 'medium',
    reps: 0,
    interval: 0,
    efactor: 2.5,
    dueDate: new Date().toISOString(),
  }));
};
