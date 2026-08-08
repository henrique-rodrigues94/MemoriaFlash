// 📁 flashmind-ai/src/services/cardBankService.ts
//
// Serviço frontend para o banco de cards compartilhado.
//
// REGRA DE OURO: a IA só é chamada quando necessário.
//
// FLUXO COMPLETO:
//  1. Usuário digita matéria + tópicos
//  2. Frontend consulta /api/card-bank/stats → sabe quantos cards existem por tópico
//  3. Usuário clica "Gerar"
//  4. /api/gemini/generate-flashcards → internamente já usa o banco (serve do banco
//     se tiver, gera via IA e salva se não tiver ou estiver desatualizado)
//  5. Cards gerados ficam no banco para o próximo usuário

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
  /** Tópicos que têm cards prontos e atualizados no banco */
  available: BankTopicStat[];
  /** Tópicos que precisarão de geração via IA (banco vazio ou stale) */
  needsGeneration: BankTopicStat[];
  /** Total de cards disponíveis no banco sem precisar de IA */
  totalReadyCards: number;
}

// ─── Cache de sessão (evita consultas repetidas) ──────────────────────────────

const statsCache = new Map<string, { data: BankTopicStat[]; fetchedAt: number }>();
const STATS_CACHE_MS = 5 * 60 * 1000; // 5 minutos

function statsCacheKey(subject: string, topics: string[], level: string, difficulty: string): string {
  return `${subject.toLowerCase()}|${topics.sort().join(',')}|${level}|${difficulty}`;
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Consulta disponibilidade de cards no banco para uma lista de tópicos.
 * Retorna breakdown: quais tópicos já têm cards prontos vs. precisam de IA.
 */
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
      difficulty: cardType, // API ainda usa 'difficulty' como param name
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

/**
 * Contribui cards criados manualmente para o banco compartilhado.
 * Chamado quando o usuário finaliza cards manuais com tópico + matéria claros.
 */
export async function contributeCardsToBank(args: {
  subject: string;
  topic: string;
  educationLevel: string;
  difficulty?: string;
  cards: Array<{ front: string; back: string; explanation?: string; topic?: string; difficulty?: string }>;
}): Promise<{ saved: number } | null> {
  const { subject, topic, educationLevel, difficulty = 'medium', cards } = args;
  if (!subject.trim() || !topic.trim() || cards.length === 0) return null;

  // Só contribui cards com frente e verso preenchidos
  const validCards = cards.filter(c => c.front?.trim() && c.back?.trim());
  if (validCards.length === 0) return null;

  try {
    const res = await fetch('/api/card-bank/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: subject.trim(),
        topic: topic.trim(),
        educationLevel,
        difficulty,
        cards: validCards.map(c => ({
          front: c.front.trim(),
          back: c.back.trim(),
          explanation: c.explanation?.trim() ?? '',
          topic: c.topic?.trim() ?? topic.trim(),
          difficulty: c.difficulty ?? difficulty,
        })),
        providerUsed: 'manual',
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Invalida o cache de stats para uma matéria (após gerar novos cards) */
export function invalidateBankStatsCache(subject: string): void {
  for (const key of statsCache.keys()) {
    if (key.startsWith(subject.toLowerCase())) {
      statsCache.delete(key);
    }
  }
}
