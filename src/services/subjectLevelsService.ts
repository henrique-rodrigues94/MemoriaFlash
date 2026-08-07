// 📁 flashmind-ai/src/services/subjectLevelsService.ts
//
// Serviço que identifica automaticamente quais níveis de ensino fazem sentido
// para uma matéria digitada pelo usuário e carrega os currículos em paralelo.
//
// FLUXO:
//  1. Usuário digita matéria (debounce 700ms)
//  2. GET /api/subject-levels?subject=X  →  IA retorna ex: ['concurso','faculdade']
//  3. Carrega currículos de TODOS os níveis em paralelo via /api/curriculum
//  4. Resultado fica em memória (sessionCache) para não re-consultar

import { EducationLevel } from '../lib/educationLevels';
import { CurriculumCategory, fetchCurriculum } from './curriculumService';

export interface LevelInfo {
  level: EducationLevel;
  label: string;
  icon: string;
  reason: string;
  priority: number;
}

export interface LevelCurriculum {
  level: EducationLevel;
  label: string;
  icon: string;
  reason: string;
  categories: CurriculumCategory[];
  loading: boolean;
  error: boolean;
}

export interface SubjectLevelsResult {
  levels: LevelInfo[];
  subjectNormalized: string;
}

// ─── Caches de sessão ─────────────────────────────────────────────────────────

const levelsCache = new Map<string, SubjectLevelsResult>();
const CACHE_MS = 10 * 60 * 1000; // 10 min
const levelsCacheTime = new Map<string, number>();

function normalizeKey(subject: string): string {
  return subject.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Identifica via IA quais níveis de ensino fazem sentido para a matéria.
 * Cacheia por 10 minutos em memória.
 */
export async function identifySubjectLevels(subject: string): Promise<SubjectLevelsResult | null> {
  if (!subject.trim() || subject.trim().length < 2) return null;

  const key = normalizeKey(subject);
  const cached = levelsCache.get(key);
  const cachedAt = levelsCacheTime.get(key) ?? 0;

  if (cached && Date.now() - cachedAt < CACHE_MS) return cached;

  try {
    const res = await fetch(`/api/subject-levels?subject=${encodeURIComponent(subject.trim())}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data?.levels) || data.levels.length === 0) return null;

    const result: SubjectLevelsResult = {
      levels: data.levels,
      subjectNormalized: data.subjectNormalized || subject,
    };
    levelsCache.set(key, result);
    levelsCacheTime.set(key, Date.now());
    return result;
  } catch {
    return null;
  }
}

/**
 * Carrega os currículos de todos os níveis identificados em PARALELO.
 * Retorna um objeto por nível — cada um pode estar carregando ou ter erro.
 *
 * Uso: chame isso e use o callback `onUpdate` para atualizar o estado do React
 * conforme cada currículo chega (os mais rápidos do cache chegam primeiro).
 */
export async function loadAllLevelCurricula(
  subject: string,
  levels: LevelInfo[],
  onUpdate: (curricula: Map<EducationLevel, LevelCurriculum>) => void,
): Promise<void> {
  if (!subject.trim() || levels.length === 0) return;

  // Estado inicial: todos carregando
  const state = new Map<EducationLevel, LevelCurriculum>(
    levels.map(l => [
      l.level,
      { level: l.level, label: l.label, icon: l.icon, reason: l.reason, categories: [], loading: true, error: false },
    ]),
  );
  onUpdate(new Map(state));

  // Carrega em paralelo
  await Promise.all(
    levels.map(async levelInfo => {
      try {
        const result = await fetchCurriculum(subject.trim(), levelInfo.level);
        const entry = state.get(levelInfo.level)!;
        entry.categories = result?.categories ?? [];
        entry.loading = false;
        entry.error = !result?.categories?.length;
      } catch {
        const entry = state.get(levelInfo.level)!;
        entry.loading = false;
        entry.error = true;
      }
      onUpdate(new Map(state));
    }),
  );
}

/** Invalida cache de níveis para uma matéria (ex: após mudança de nome). */
export function invalidateLevelsCache(subject: string): void {
  const key = normalizeKey(subject);
  levelsCache.delete(key);
  levelsCacheTime.delete(key);
}
