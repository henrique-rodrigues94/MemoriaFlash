import crypto from 'crypto';
import { getAdminFirestore } from '../../firebaseAdmin';

// ============================================================================
// Cache inteligente de respostas de IA (Firestore, coleção `aiCache`).
// ----------------------------------------------------------------------------
// Antes de gastar uma chamada de IA (e consumir cota gratuita), verificamos
// se já existe uma resposta salva para um pedido equivalente — ex: dois
// alunos pedindo "flashcards sobre mitose" recebem o MESMO resultado do
// cache, sem gastar uma segunda chamada de API.
//
// Só é aplicado a tarefas de conteúdo GENÉRICO/reutilizável (flashcards,
// tópicos sugeridos). Tarefas que dependem de contexto pessoal do usuário
// NÃO devem passar por aqui — cachear essas poderia vazar/entregar uma
// análise de OUTRO usuário.
//
// Se o Firebase Admin SDK não estiver configurado, o cache é simplesmente
// ignorado (a IA é chamada normalmente) — nunca quebra o app.
// ============================================================================

const COLLECTION = 'aiCache';

interface CacheStats {
  hits: number;
  misses: number;
  skipped: number; // Admin SDK não configurado
}

const stats: CacheStats = { hits: 0, misses: 0, skipped: 0 };

export function getCacheStats() {
  const total = stats.hits + stats.misses;
  return {
    ...stats,
    hitRatePercent: total > 0 ? Math.round((stats.hits / total) * 100) : 0,
  };
}

/** Normaliza valores para que variações triviais (espaços, maiúsculas, ordem) gerem a mesma chave de cache. */
function normalize(value: unknown): unknown {
  if (typeof value === 'string') return value.trim().toLowerCase().replace(/\s+/g, ' ');
  if (Array.isArray(value)) return value.map(normalize).sort();
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) {
      out[key] = normalize((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function computeCacheKey(taskId: string, payload: Record<string, unknown>): string {
  const json = JSON.stringify(normalize(payload));
  const hash = crypto.createHash('sha256').update(json).digest('hex').slice(0, 32);
  return `${taskId}_${hash}`;
}

/**
 * Executa `generator()` com cache automático. Em caso de HIT, retorna o
 * valor salvo (marcado com `cacheHit: true`) sem chamar nenhum provedor de
 * IA. Em caso de MISS, executa `generator()`, salva o resultado com o TTL
 * informado e retorna (marcado com `cacheHit: false`).
 */
export async function withCache<T extends object>(
  taskId: string,
  payload: Record<string, unknown>,
  ttlMs: number,
  generator: () => Promise<T>
): Promise<T & { cacheHit: boolean }> {
  const db = getAdminFirestore();
  if (!db) {
    stats.skipped++;
    const result = await generator();
    return { ...result, cacheHit: false };
  }

  const key = computeCacheKey(taskId, payload);
  const ref = db.collection(COLLECTION).doc(key);

  try {
    const snap = await ref.get();
    if (snap.exists) {
      const cached = snap.data() as { value: T; expiresAt: number; hitCount?: number };
      if (cached.expiresAt > Date.now()) {
        stats.hits++;
        ref.set({ hitCount: (cached.hitCount || 0) + 1, lastHitAt: Date.now() }, { merge: true }).catch(() => {});
        return { ...cached.value, cacheHit: true };
      }
    }
  } catch (err) {
    console.warn(`[aiCache] Falha ao ler cache (${key}), seguindo sem cache:`, err);
  }

  stats.misses++;
  const result = await generator();

  ref
    .set({
      value: result,
      taskId,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
      hitCount: 0,
    })
    .catch((err) => console.warn(`[aiCache] Falha ao gravar cache (${key}):`, err));

  return { ...result, cacheHit: false };
}

export const CACHE_TTL = {
  FLASHCARDS: 30 * 24 * 60 * 60 * 1000, // 30 dias — conteúdo educacional muda pouco
  TOPICS: 30 * 24 * 60 * 60 * 1000,
} as const;
