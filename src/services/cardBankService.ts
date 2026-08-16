import { db, doc, getDoc } from '../lib/firebase';

export interface BankTopicStat {
  bucketId: string;
  subject: string;
  topic: string;
  educationLevel: string;
  difficulty: string;
  cardCount: number;
  updatedAt: string;
  isStale: boolean;
}

export interface BankAvailability {
  available: BankTopicStat[];
  needsGeneration: BankTopicStat[];
  totalReadyCards: number;
}

export interface SharedBankCard {
  id: string;
  front: string;
  back: string;
  explanation?: string;
  topic: string;
  subtopic?: string;
  difficulty?: string;
  bucketId?: string;
  subject?: string;
  educationLevel?: string;
  cardContentType?: string;
}

const statsCache = new Map<string, { data: BankTopicStat[]; fetchedAt: number }>();
const cardsCache = new Map<string, { data: SharedBankCard[]; fetchedAt: number }>();
const STATS_CACHE_MS = 5 * 60 * 1000;
const CARDS_CACHE_MS = 2 * 60 * 1000;

function normalizeText(text: string): string {
  return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
}

async function shortHash(text: string, len = 16): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-1', data);
  const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, len);
}

async function bucketId(subject: string, topic: string, level: string, cardType = 'definition', subtopic = ''): Promise<string> {
  return shortHash(`${normalizeText(subject)}|${normalizeText(topic)}|${normalizeText(subtopic)}|${level}|${cardType}`);
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function statsCacheKey(subject: string, topics: string[], level: string, cardType: string): string {
  return `${normalizeText(subject)}|${[...topics].map(normalizeText).sort().join(',')}|${level}|${cardType}`;
}

export async function queryBankAvailability(
  subject: string,
  topics: string[],
  educationLevel: string,
  cardType = 'definition',
): Promise<BankAvailability> {
  const empty: BankAvailability = { available: [], needsGeneration: [], totalReadyCards: 0 };
  if (!subject.trim() || topics.length === 0) return empty;

  const cacheKey = statsCacheKey(subject, topics, educationLevel, cardType);
  const cached = statsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < STATS_CACHE_MS) return classifyStats(cached.data);

  try {
    const uniqueTopics = Array.from(new Set(topics.map(t => t.trim()).filter(Boolean)));
    const stats = await Promise.all(uniqueTopics.map(async (topic): Promise<BankTopicStat> => {
      const id = await bucketId(subject, topic, educationLevel, cardType);
      try {
        const snapshot = await getDoc(doc(db, 'cardBuckets', id));
        if (!snapshot.exists()) {
          return { bucketId: id, subject, topic, educationLevel, difficulty: cardType, cardCount: 0, updatedAt: '', isStale: true };
        }
        const data = snapshot.data() as any;
        const ttlAt = Number(data?.ttlAt || 0);
        return {
          bucketId: id,
          subject: String(data?.subject || subject),
          topic,
          educationLevel: String(data?.level || educationLevel),
          difficulty: String(data?.cardType || cardType),
          cardCount: Number(data?.cardCount ?? data?.cards?.length ?? 0),
          updatedAt: String(data?.updatedAt || ''),
          isStale: !ttlAt || Date.now() > ttlAt,
        };
      } catch {
        return { bucketId: id, subject, topic, educationLevel, difficulty: cardType, cardCount: 0, updatedAt: '', isStale: true };
      }
    }));
    statsCache.set(cacheKey, { data: stats, fetchedAt: Date.now() });
    return classifyStats(stats);
  } catch {
    return empty;
  }
}

export async function fetchSharedCards(
  subject: string,
  topics: string[],
  educationLevel: string,
  limit: number,
  cardType = 'definition',
): Promise<SharedBankCard[]> {
  if (!subject.trim() || topics.length === 0 || limit <= 0) return [];
  const cacheKey = `${statsCacheKey(subject, topics, educationLevel, cardType)}|cards`;
  const cached = cardsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CARDS_CACHE_MS) return shuffle(cached.data).slice(0, limit);

  const uniqueTopics = Array.from(new Set(topics.map(t => t.trim()).filter(Boolean)));
  const buckets = await Promise.all(uniqueTopics.map(async topic => {
    const id = await bucketId(subject, topic, educationLevel, cardType);
    try {
      const snapshot = await getDoc(doc(db, 'cardBuckets', id));
      if (!snapshot.exists()) return [] as SharedBankCard[];
      const data = snapshot.data() as any;
      const ttlAt = Number(data?.ttlAt || 0);
      if (!ttlAt || Date.now() > ttlAt || !Array.isArray(data?.cards)) return [];
      return data.cards.map((card: any) => ({
        id: String(card.id),
        front: String(card.front || ''),
        back: String(card.back || ''),
        explanation: card.explanation || '',
        topic: String(card.topic || topic),
        subtopic: card.subtopic || undefined,
        difficulty: card.difficulty || 'medium',
        bucketId: id,
        subject,
        educationLevel,
        cardContentType: cardType,
      })).filter((card: SharedBankCard) => card.front && card.back);
    } catch {
      return [] as SharedBankCard[];
    }
  }));

  const dedup = new Map<string, SharedBankCard>();
  for (const card of buckets.flat()) {
    const key = normalizeText(card.front);
    if (key && !dedup.has(key)) dedup.set(key, card);
  }
  const all = Array.from(dedup.values());
  cardsCache.set(cacheKey, { data: all, fetchedAt: Date.now() });
  return shuffle(all).slice(0, limit);
}

function classifyStats(stats: BankTopicStat[]): BankAvailability {
  const available = stats.filter(s => s.cardCount > 0 && !s.isStale);
  const needsGeneration = stats.filter(s => s.cardCount === 0 || s.isStale);
  const totalReadyCards = available.reduce((sum, s) => sum + s.cardCount, 0);
  return { available, needsGeneration, totalReadyCards };
}

export function invalidateBankStatsCache(subject: string): void {
  const prefix = normalizeText(subject);
  for (const key of statsCache.keys()) if (key.startsWith(prefix)) statsCache.delete(key);
  for (const key of cardsCache.keys()) if (key.startsWith(prefix)) cardsCache.delete(key);
}
