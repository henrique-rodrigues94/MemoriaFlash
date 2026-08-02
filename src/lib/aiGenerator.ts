import { Flashcard } from '../types';

/**
 * Busca sugestões de tópicos reais via IA no backend.
 * Lança erro amigável se nenhum provedor de IA estiver disponível.
 */
export const fetchAITopicSuggestions = async (subject: string): Promise<string[]> => {
  if (!subject.trim()) return [];
  const res = await fetch('/api/gemini/suggest-topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: subject, language: 'pt' }),
  });
  if (!res.ok) {
    throw new Error('Não há servidor de IA disponível no momento. Tente novamente mais tarde.');
  }
  const data = await res.json();
  return Array.isArray(data.topics) ? data.topics : [];
};

/**
 * Gera flashcards via backend (Gemini principal → ChatGPT fallback).
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

  const raw: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.cards)
      ? data.cards
      : Array.isArray(data?.flashcards)
        ? data.flashcards
        : [];

  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('Nenhum flashcard foi gerado. Tente novamente.');
  }

  return raw.map((item: any, idx: number) => ({
    id: `ai-card-${Date.now()}-${idx}`,
    subject: item.subject || subject,
    topic: item.topic || topics[0] || subject,
    front: item.front || item.question || '',
    back: item.back || item.answer || '',
    explanation: item.explanation || '',
    curiosity: item.curiosity || '',
    difficulty: (item.difficulty as Flashcard['difficulty']) || 'medium',
    reps: 0,
    interval: 0,
    efactor: 2.5,
    dueDate: new Date().toISOString(),
  }));
};
