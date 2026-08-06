// 📁 flashmind-ai/src/services/curriculumService.ts
//
// Serviço de currículo: busca do banco de dados (Firestore, via servidor).
// A IA gera automaticamente pra qualquer matéria quando não há dados salvos.
// Resultado é cacheado em memória por sessão para evitar requisições repetidas.
//
// FLUXO:
//  1. Checa cache em memória (instantâneo)
//  2. GET /api/curriculum?subject=X&level=Y  →  servidor checa Firestore
//  3. Se não existir no Firestore: servidor chama IA → salva no Firestore → devolve
//  4. Frontend armazena em memória para a sessão

import { EducationLevel } from '../lib/educationLevels';

export interface CurriculumCategory {
  category: string;
  topics: string[];
}

export interface CurriculumResult {
  categories: CurriculumCategory[];
  fromCache: boolean;
  subject: string;
  educationLevel: EducationLevel;
}

// ─── In-memory session cache ──────────────────────────────────────────────────
const sessionCache = new Map<string, CurriculumResult>();

function cacheKey(subject: string, level: EducationLevel): string {
  return `${subject.toLowerCase().trim()}__${level}`;
}

/**
 * Busca currículo do banco de dados.
 * Se não existir, o servidor gera via IA e persiste automaticamente.
 */
export async function fetchCurriculum(
  subject: string,
  educationLevel: EducationLevel,
): Promise<CurriculumResult | null> {
  if (!subject.trim()) return null;

  const key = cacheKey(subject, educationLevel);

  // 1. Cache em memória da sessão
  if (sessionCache.has(key)) {
    return sessionCache.get(key)!;
  }

  try {
    const params = new URLSearchParams({ subject: subject.trim(), level: educationLevel });
    const res = await fetch(`/api/curriculum?${params}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      console.warn('[curriculumService] server returned', res.status);
      return null;
    }

    const data = await res.json();

    if (!Array.isArray(data?.categories) || data.categories.length === 0) {
      return null;
    }

    const result: CurriculumResult = {
      categories: data.categories,
      fromCache: data.fromFirestore === true,
      subject: subject.trim(),
      educationLevel,
    };

    sessionCache.set(key, result);
    return result;
  } catch (err) {
    console.warn('[curriculumService] fetch error:', err);
    return null;
  }
}

/** Remove um currículo do cache de sessão (força re-fetch). */
export function invalidateCurriculumCache(subject: string, level: EducationLevel): void {
  sessionCache.delete(cacheKey(subject, level));
}

/** Limpa todo o cache de sessão. */
export function clearCurriculumCache(): void {
  sessionCache.clear();
}
