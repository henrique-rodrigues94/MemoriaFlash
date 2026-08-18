import { db, doc, getDoc } from '../lib/firebase';
import { collection, documentId, getDocs, query, where } from 'firebase/firestore';

export interface BankTopicStat { bucketId: string; subject: string; topic: string; educationLevel: string; difficulty: string; cardCount: number; updatedAt: string; isStale: boolean; }
export interface BankAvailability { available: BankTopicStat[]; needsGeneration: BankTopicStat[]; totalReadyCards: number; }
export interface SharedBankCard { id: string; front: string; back: string; explanation?: string; topic: string; subtopic?: string; difficulty?: string; bucketId?: string; subject?: string; educationLevel?: string; cardContentType?: string; }

const statsCache = new Map<string, { data: BankTopicStat[]; fetchedAt: number }>();
const cardsCache = new Map<string, { data: SharedBankCard[]; fetchedAt: number }>();
const STATS_CACHE_MS = 5 * 60 * 1000;
const CARDS_CACHE_MS = 2 * 60 * 1000;

function normalizeText(text: string): string { return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim(); }
async function shortHash(text: string, len = 16): Promise<string> { const data = new TextEncoder().encode(text); const digest = await crypto.subtle.digest('SHA-1', data); return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, len); }
// Mantém exatamente o identificador usado pelos buckets já existentes no Firebase.
async function bucketId(subject: string, topic: string, level: string, cardType = 'definition'): Promise<string> { return shortHash(`${normalizeText(subject)}|${normalizeText(topic)}||${level}|${cardType}`); }
function shuffle<T>(items: T[]): T[] { const copy = [...items]; for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }
function statsCacheKey(subject: string, topics: string[], level: string, cardType: string): string { return `${normalizeText(subject)}|${[...topics].map(normalizeText).sort().join(',')}|${level}|${cardType}`; }

function bucketIsUsable(data: any): boolean {
  if (!Array.isArray(data?.cards) && Number(data?.cardCount || 0) <= 0) return false;
  const ttlAt = Number(data?.ttlAt || 0);
  return ttlAt === 0 || Date.now() <= ttlAt;
}

/**
 * Busca vários documentos de `cardBuckets` por ID em UMA consulta por lote de
 * até 10 IDs (limite do operador `in` do Firestore), em vez de uma leitura
 * individual por tópico. Para uma grade com 20 tópicos isso troca 20
 * round-trips por apenas 2 — resposta bem mais rápida no app.
 */
async function fetchBucketDocsByIds(ids: string[]): Promise<Map<string, any>> {
  const result = new Map<string, any>();
  const uniqueIds = Array.from(new Set(ids));
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += 10) chunks.push(uniqueIds.slice(i, i + 10));
  await Promise.all(chunks.map(async chunk => {
    try {
      const snapshot = await getDocs(query(collection(db, 'cardBuckets'), where(documentId(), 'in', chunk)));
      snapshot.forEach(docSnap => result.set(docSnap.id, docSnap.data()));
    } catch {
      // Fallback: se a consulta em lote falhar (ex: regra/índice), tenta
      // leitura individual para não derrubar a experiência do usuário.
      await Promise.all(chunk.map(async id => {
        try { const snap = await getDoc(doc(db, 'cardBuckets', id)); if (snap.exists()) result.set(id, snap.data()); } catch { /* ignora */ }
      }));
    }
  }));
  return result;
}

export async function queryBankAvailability(subject: string, topics: string[], educationLevel: string, cardType = 'definition'): Promise<BankAvailability> {
  const empty: BankAvailability = { available: [], needsGeneration: [], totalReadyCards: 0 };
  if (!subject.trim() || topics.length === 0) return empty;
  const cacheKey = statsCacheKey(subject, topics, educationLevel, cardType);
  const cached = statsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < STATS_CACHE_MS) return classifyStats(cached.data);
  try {
    const uniqueTopics = Array.from(new Set(topics.map(t => t.trim()).filter(Boolean)));
    const ids = await Promise.all(uniqueTopics.map(topic => bucketId(subject, topic, educationLevel, cardType)));
    const docs = await fetchBucketDocsByIds(ids);
    const stats: BankTopicStat[] = uniqueTopics.map((topic, i) => {
      const id = ids[i];
      const data = docs.get(id);
      if (!data) return { bucketId: id, subject, topic, educationLevel, difficulty: cardType, cardCount: 0, updatedAt: '', isStale: true };
      const cardCount = Number(data?.cardCount ?? data?.cards?.length ?? 0);
      const usable = bucketIsUsable(data);
      return { bucketId: id, subject: String(data?.subject || subject), topic, educationLevel: String(data?.level || educationLevel), difficulty: String(data?.cardType || cardType), cardCount, updatedAt: String(data?.updatedAt || ''), isStale: !usable };
    });
    statsCache.set(cacheKey, { data: stats, fetchedAt: Date.now() });
    return classifyStats(stats);
  } catch { return empty; }
}

export async function fetchSharedCards(subject: string, topics: string[], educationLevel: string, limit: number, cardType = 'definition'): Promise<SharedBankCard[]> {
  if (!subject.trim() || topics.length === 0 || limit <= 0) return [];
  const cacheKey = `${statsCacheKey(subject, topics, educationLevel, cardType)}|cards`;
  const cached = cardsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CARDS_CACHE_MS) return shuffle(cached.data).slice(0, limit);
  const uniqueTopics = Array.from(new Set(topics.map(t => t.trim()).filter(Boolean)));
  const ids = await Promise.all(uniqueTopics.map(topic => bucketId(subject, topic, educationLevel, cardType)));
  const docs = await fetchBucketDocsByIds(ids);
  const dedup = new Map<string, SharedBankCard>();
  uniqueTopics.forEach((topic, i) => {
    const id = ids[i];
    const data = docs.get(id);
    if (!data || !bucketIsUsable(data) || !Array.isArray(data?.cards)) return;
    for (const card of data.cards) {
      const front = String(card?.front || '');
      const back = String(card?.back || '');
      if (!front || !back) continue;
      const key = normalizeText(front);
      if (key && !dedup.has(key)) {
        dedup.set(key, {
          id: String(card.id), front, back, explanation: card.explanation || '', topic: String(card.topic || topic),
          subtopic: card.subtopic || undefined, difficulty: card.difficulty || 'medium', bucketId: id, subject: String(data?.subject || subject), educationLevel: String(data?.level || educationLevel), cardContentType: cardType,
        });
      }
    }
  });
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

export function invalidateBankStatsCache(subject: string): void { const prefix = normalizeText(subject); for (const key of statsCache.keys()) if (key.startsWith(prefix)) statsCache.delete(key); for (const key of cardsCache.keys()) if (key.startsWith(prefix)) cardsCache.delete(key); }
