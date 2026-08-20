// Serviço de currículo com duas camadas de cache:
// 1. memória da sessão — instantâneo;
// 2. Firestore público — evita chamar o Express/IA quando o conteúdo já existe.
//
// Somente quando não há currículo válido no Firestore o endpoint do servidor é
// chamado. O servidor então consulta novamente seu Firestore/Admin SDK e, se
// for realmente novo, gera via IA e persiste para os próximos usuários.

import { EducationLevel } from '../lib/educationLevels';
import { fetchWithTimeout } from '../lib/fetchWithTimeout';
import { getCachedCurriculum } from './firestoreCurriculumCache';

export interface CurriculumCategory {
  category: string;
  topics: string[];
}

/** Estrutura semântica usada pela UI: categoria = tópico e topics = subtópicos. */
export interface CurriculumTopic {
  topic: string;
  subtopics: string[];
}

export interface CurriculumResult {
  categories: CurriculumCategory[];
  topics: CurriculumTopic[];
  fromCache: boolean;
  cacheSource: 'memory' | 'firestore' | 'server' | 'none';
  subject: string;
  educationLevel: EducationLevel;
}

const sessionCache = new Map<string, CurriculumResult>();

function cacheKey(subject: string, level: EducationLevel): string {
  return `${subject.toLowerCase().trim()}__${level}`;
}

function toTopics(categories: CurriculumCategory[]): CurriculumTopic[] {
  return categories.map(category => ({
    topic: category.category,
    subtopics: [...category.topics],
  }));
}

function buildResult(
  categories: CurriculumCategory[],
  subject: string,
  educationLevel: EducationLevel,
  source: CurriculumResult['cacheSource'],
): CurriculumResult {
  return {
    categories,
    topics: toTopics(categories),
    fromCache: source === 'memory' || source === 'firestore',
    cacheSource: source,
    subject: subject.trim(),
    educationLevel,
  };
}

/**
 * Busca a grade curricular sem consumir IA para conteúdo já conhecido.
 *
 * Ordem de resolução:
 * memória → Firestore direto → servidor → IA (somente no servidor se novo).
 */
export async function fetchCurriculum(
  subject: string,
  educationLevel: EducationLevel,
): Promise<CurriculumResult | null> {
  if (!subject.trim()) return null;

  const normalizedSubject = subject.trim();
  const key = cacheKey(normalizedSubject, educationLevel);

  const memory = sessionCache.get(key);
  if (memory) {
    return { ...memory, cacheSource: 'memory', fromCache: true };
  }

  // Conteúdo educacional é público e pode ser lido diretamente do Firestore.
  // Isso evita até mesmo uma requisição ao Express quando o banco já possui a grade.
  const firestore = await getCachedCurriculum(normalizedSubject, educationLevel);
  if (firestore) {
    const result = buildResult(
      firestore.categories,
      firestore.subject || normalizedSubject,
      educationLevel,
      'firestore',
    );
    sessionCache.set(key, result);
    return result;
  }

  // Cache miss: somente agora consultamos o servidor. Ele é a autoridade para
  // gerar e persistir uma grade nova no Firestore usando IA.
  try {
    const params = new URLSearchParams({
      subject: normalizedSubject,
      level: educationLevel,
    });
    // 130s: cobre o pior caso do backend, que tenta até 3 provedores de IA em
    // sequência antes de cair no fallback do Firestore (Gemini ~30s + DeepSeek
    // ~60s + OpenAI ~25s de timeout cada, quando um provedor está lento/
    // degradado em vez de simplesmente offline). Um timeout menor no cliente
    // abortava a requisição antes do backend conseguir responder, mesmo
    // quando o fallback do Firestore acabaria funcionando.
    const res = await fetchWithTimeout(`/api/curriculum?${params}`, {
      headers: { 'Content-Type': 'application/json' },
    }, 130_000);

    if (!res.ok) {
      console.warn('[curriculumService] server returned', res.status);
      return null;
    }

    const data = await res.json();
    const categories = Array.isArray(data?.categories) ? data.categories : [];
    if (categories.length === 0) return null;

    const result = buildResult(
      categories,
      data?.subject || normalizedSubject,
      educationLevel,
      data?.fromFirestore === true ? 'firestore' : 'server',
    );

    sessionCache.set(key, result);
    return result;
  } catch (err) {
    console.warn('[curriculumService] fetch error:', err);
    return null;
  }
}

export function invalidateCurriculumCache(subject: string, level: EducationLevel): void {
  sessionCache.delete(cacheKey(subject, level));
}

export function clearCurriculumCache(): void {
  sessionCache.clear();
}
