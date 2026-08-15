// Serviço frontend para o banco de cards compartilhado.
//
// REGRA DE OURO:
// - Somente conteúdo gerado pelo fluxo de IA de conteúdo público pode alimentar o banco global.
// - Cards manuais, importados ou derivados de documentos privados NUNCA são enviados ao banco.
// - O cliente apenas consulta disponibilidade; a persistência global é responsabilidade do servidor.

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

const statsCache = new Map<string, { data: BankTopicStat[]; fetchedAt: number }>();
const STATS_CACHE_MS = 5 * 60 * 1000;

function statsCacheKey(subject: string, topics: string[], level: string, cardType: string): string {
  return `${subject.toLowerCase()}|${[...topics].sort().join(',')}|${level}|${cardType}`;
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
  if (cached && Date.now() - cached.fetchedAt < STATS_CACHE_MS) {
    return classifyStats(cached.data);
  }

  try {
    const params = new URLSearchParams({
      subject: subject.trim(),
      topics: topics.join(','),
      educationLevel,
      difficulty: cardType,
    });
    const res = await fetch(`/api/card-bank/stats?${params}`);
    if (!res.ok) return empty;

    const data = await res.json();
    const stats: BankTopicStat[] = Array.isArray(data?.stats) ? data.stats : [];
    statsCache.set(cacheKey, { data: stats, fetchedAt: Date.now() });
    return classifyStats(stats);
  } catch {
    return empty;
  }
}

function classifyStats(stats: BankTopicStat[]): BankAvailability {
  const available = stats.filter(s => s.cardCount > 0 && !s.isStale);
  const needsGeneration = stats.filter(s => s.cardCount === 0 || s.isStale);
  const totalReadyCards = available.reduce((sum, s) => sum + s.cardCount, 0);
  return { available, needsGeneration, totalReadyCards };
}

/** Invalida o cache local de disponibilidade após uma geração. */
export function invalidateBankStatsCache(subject: string): void {
  const prefix = subject.toLowerCase();
  for (const key of statsCache.keys()) {
    if (key.startsWith(prefix)) statsCache.delete(key);
  }
}
