// Serviço que identifica os níveis de uma matéria e carrega suas grades.
//
// Estratégia de custo:
// - primeiro Firestore público (1 read, sem servidor/IA);
// - somente se a matéria for nova/expirada, chama /api/subject-levels;
// - o servidor gera e persiste o resultado no Firestore para reutilização.

import { EducationLevel } from '../lib/educationLevels';
import { fetchWithTimeout } from '../lib/fetchWithTimeout';
import { CurriculumCategory, fetchCurriculum } from './curriculumService';
import { getCachedSubjectLevels } from './firestoreCurriculumCache';

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
  fromCache?: boolean;
}

const levelsCache = new Map<string, SubjectLevelsResult>();
const CACHE_MS = 10 * 60 * 1000;
const levelsCacheTime = new Map<string, number>();

function normalizeKey(subject: string): string {
  return subject.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function publishVerifiedCurriculumLevels(
  subject: string,
  state: Map<EducationLevel, LevelCurriculum>,
  allLevels: LevelInfo[],
): void {
  if (typeof window === 'undefined') return;

  const successfulLevels = allLevels.filter(levelInfo => {
    const entry = state.get(levelInfo.level);
    return Boolean(entry && !entry.error && entry.categories.length > 0);
  });

  const completedLevels = allLevels.filter(levelInfo => {
    const entry = state.get(levelInfo.level);
    return Boolean(entry && !entry.loading);
  });

  const verificationFailed = completedLevels.length > 0 && successfulLevels.length === 0;

  window.dispatchEvent(new CustomEvent('memoriaflash:curriculum-verified', {
    detail: {
      subject: subject.trim(),
      availableLevels: successfulLevels.map(level => level.level),
      verificationFailed,
    },
  }));
}

/**
 * Identifica os níveis usando Firestore primeiro.
 * A IA só entra no fluxo quando a matéria ainda não está cadastrada.
 */
export async function identifySubjectLevels(subject: string): Promise<SubjectLevelsResult | null> {
  if (!subject.trim() || subject.trim().length < 2) return null;

  const normalizedSubject = subject.trim();
  const key = normalizeKey(normalizedSubject);
  const cached = levelsCache.get(key);
  const cachedAt = levelsCacheTime.get(key) ?? 0;

  if (cached && Date.now() - cachedAt < CACHE_MS) return cached;

  // 1. Leitura direta do catálogo público do Firestore.
  const firestoreLevels = await getCachedSubjectLevels(normalizedSubject);
  if (firestoreLevels?.length) {
    const result: SubjectLevelsResult = {
      levels: firestoreLevels,
      subjectNormalized: normalizedSubject,
      fromCache: true,
    };
    levelsCache.set(key, result);
    levelsCacheTime.set(key, Date.now());
    return result;
  }

  // 2. Cache miss: somente agora o servidor pode consultar/usar IA.
  try {
    // Mesmo raciocínio do curriculumService: o backend pode tentar até 3
    // provedores de IA em sequência (até ~115s no pior caso) antes de cair no
    // fallback do Firestore, então o timeout do cliente precisa ser generoso
    // o bastante para não abortar antes disso.
    const res = await fetchWithTimeout(`/api/subject-levels?subject=${encodeURIComponent(normalizedSubject)}`, {}, 130_000);
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data?.levels) || data.levels.length === 0) return null;

    const result: SubjectLevelsResult = {
      levels: data.levels,
      subjectNormalized: data.subjectNormalized || normalizedSubject,
      fromCache: data.fromFirestore === true,
    };
    levelsCache.set(key, result);
    levelsCacheTime.set(key, Date.now());
    return result;
  } catch {
    return null;
  }
}

export async function loadAllLevelCurricula(
  subject: string,
  levels: LevelInfo[],
  onUpdate: (curricula: Map<EducationLevel, LevelCurriculum>) => void,
): Promise<void> {
  if (!subject.trim() || levels.length === 0) return;

  const state = new Map<EducationLevel, LevelCurriculum>(
    levels.map(l => [
      l.level,
      {
        level: l.level,
        label: l.label,
        icon: l.icon,
        reason: l.reason,
        categories: [],
        loading: true,
        error: false,
      },
    ]),
  );

  onUpdate(new Map(state));

  await Promise.all(
    levels.map(async levelInfo => {
      try {
        // fetchCurriculum também consulta Firestore diretamente antes do API.
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

  publishVerifiedCurriculumLevels(subject, state, levels);
}

export function invalidateLevelsCache(subject: string): void {
  const key = normalizeKey(subject);
  levelsCache.delete(key);
  levelsCacheTime.delete(key);
}
