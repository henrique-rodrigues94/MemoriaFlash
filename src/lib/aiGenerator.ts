import { Flashcard } from '../types';
import { EducationLevel } from './educationLevels';
import { auth, ensureAuthenticated } from './firebase';

export type { EducationLevel };

export interface GenerationUsage {
  generated: number;
  remaining: number;
  limit?: number;
  isPro?: boolean;
  generationDay?: string;
  resetAt?: string;
}

function publishGenerationUsage(usage: GenerationUsage): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('memoriaflash:generation-usage', { detail: usage }));
}

export const fetchAITopicSuggestions = async (subject: string, educationLevel: EducationLevel = 'medio'): Promise<string[]> => {
  if (!subject.trim()) return [];
  const res = await fetch('/api/gemini/suggest-topics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: subject, language: 'pt', educationLevel }) });
  if (!res.ok) throw new Error('Não há servidor de IA disponível no momento. Tente novamente mais tarde.');
  const data = await res.json();
  return Array.isArray(data.topics) ? data.topics : [];
};

export const generateAICards = async (
  subject: string,
  topics: string[],
  count: number,
  educationLevel: EducationLevel = 'medio',
  existingFronts: string[] = [],
  onUsageCommitted?: (usage: GenerationUsage) => void,
  cardContentType: string = 'definition',
): Promise<Flashcard[]> => {
  const user = auth.currentUser || await ensureAuthenticated();
  const idToken = await user.getIdToken();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const res = await fetch('/api/gemini/generate-flashcards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      'X-Timezone': timeZone,
    },
    body: JSON.stringify({ prompt: subject, count, language: 'pt', difficulty: 'medium', selectedTopics: topics, educationLevel, existingFronts, cardContentType }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const limitMessage = data?.code === 'GENERATION_DAILY_LIMIT_REACHED'
      ? `Você atingiu os 200 cards gratuitos de hoje. Você poderá gerar novamente após 00:00. ${data?.remaining ?? 0} cards restantes hoje. Assine o PRO para gerar ilimitadamente.`
      : data?.code === 'GENERATION_LIMIT_REACHED'
        ? `Limite gratuito de 200 cards atingido. Assine o PRO para gerar ilimitadamente.`
        : data?.error;
    throw new Error(limitMessage || `Erro ao gerar flashcards (${res.status})`);
  }

  const raw: any[] = Array.isArray(data) ? data : Array.isArray(data?.cards) ? data.cards : Array.isArray(data?.flashcards) ? data.flashcards : [];
  if (!raw.length) throw new Error('Nenhum flashcard foi gerado. Tente novamente.');

  const usage: GenerationUsage | null = data?.usage && typeof data.usage.generated === 'number'
    ? {
        generated: data.usage.generated,
        remaining: Number(data.usage.remaining),
        limit: data.usage.limit,
        isPro: data.usage.isPro,
        generationDay: data.usage.generationDay,
        resetAt: data.usage.resetAt,
      }
    : null;
  if (usage) {
    publishGenerationUsage(usage);
    onUsageCommitted?.(usage);
  }

  return raw.map((item: any, idx: number) => ({
    id: item.id || `ai-card-${Date.now()}-${idx}`,
    subject: item.subject || subject,
    topic: item.topic || topics[0] || subject,
    subtopic: item.subtopic || undefined,
    front: item.front || item.question || '',
    back: item.back || item.answer || '',
    explanation: item.explanation || '',
    curiosity: item.curiosity || '',
    difficulty: (item.difficulty as Flashcard['difficulty']) || 'medium',
    bucketId: item.bucketId || undefined,
    cardContentType: item.cardContentType || cardContentType,
    educationLevel: item.educationLevel || educationLevel,
    reps: 0, interval: 0, efactor: 2.5, dueDate: new Date().toISOString(),
  }));
};