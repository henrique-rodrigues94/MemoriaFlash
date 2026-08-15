// 📁 flashmind-ai/src/services/subjectLevelsService.ts
//
// Serviço que identifica automaticamente quais níveis de ensino fazem sentido
// para uma matéria e carrega as grades curriculares em paralelo.
// O resultado final da grade é compartilhado com a tela de geração para que
// níveis sem currículo válido possam ser desabilitados sem repetir chamadas de IA.

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

  // Se nenhuma grade respondeu, tratamos como falha de verificação e não
  // bloqueamos opções por causa de uma possível falha de rede/servidor.
  const verificationFailed = completedLevels.length > 0 && successfulLevels.length === 0;

  window.dispatchEvent(new CustomEvent('memoriaflash:curriculum-verified', {
    detail: {
      subject: subject.trim(),
      availableLevels: successfulLevels.map(level => level.level),
      verificationFailed,
    },
  }));
}

/** Identifica via IA quais níveis de ensino fazem sentido para a matéria. */
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
 * Carrega as grades dos níveis identificados em paralelo.
 * Ao terminar, publica no browser quais níveis possuem currículo realmente
 * disponível. A StudioView continua responsável por exibir a grade do nível
 * selecionado; este evento serve apenas para o seletor de nível.
 */
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

/** Invalida cache de níveis para uma matéria. */
export function invalidateLevelsCache(subject: string): void {
  const key = normalizeKey(subject);
  levelsCache.delete(key);
  levelsCacheTime.delete(key);
}
