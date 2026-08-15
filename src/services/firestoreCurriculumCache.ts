import { db, doc, getDoc } from '../lib/firebase';
import { EducationLevel } from '../lib/educationLevels';

/**
 * Cache público de conteúdo curricular.
 *
 * O Firestore é consultado diretamente pelo cliente para conteúdo educacional
 * genérico. Assim, quando matéria/nível já existem no banco, o aplicativo não
 * precisa nem chamar o Express nem consumir IA. O servidor continua sendo o
 * fallback responsável por gerar e persistir conteúdo novo.
 */

export interface CachedCurriculumCategory {
  category: string;
  topics: string[];
}

export interface CachedCurriculum {
  subject: string;
  level: EducationLevel;
  categories: CachedCurriculumCategory[];
  totalTopics: number;
  updatedAt?: string;
  ttlAt?: number;
  providerUsed?: string;
}

export interface CachedSubjectLevel {
  level: EducationLevel;
  label: string;
  icon: string;
  reason: string;
  priority: number;
}

function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** SHA-1 compatível com shortHash() usado no servidor. */
async function shortHash(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

function isValidTtl(ttlAt: unknown): boolean {
  return typeof ttlAt === 'number' && ttlAt > Date.now();
}

function sanitizeCategories(value: unknown): CachedCurriculumCategory[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((category: any) => ({
      category: typeof category?.category === 'string' ? category.category.trim() : '',
      topics: Array.isArray(category?.topics)
        ? category.topics.filter((topic: unknown): topic is string => typeof topic === 'string' && topic.trim().length > 0).map(topic => topic.trim())
        : [],
    }))
    .filter(category => category.category && category.topics.length > 0);
}

export async function getCachedSubjectLevels(subject: string): Promise<CachedSubjectLevel[] | null> {
  const normalized = normalizeText(subject);
  if (!normalized) return null;

  try {
    const id = await shortHash(normalized);
    const snapshot = await getDoc(doc(db, 'subjects', id));
    if (!snapshot.exists()) return null;

    const data = snapshot.data() as any;
    if (!isValidTtl(data?.ttlAt) || !Array.isArray(data?.levels)) return null;

    const levels = data.levels.filter((level: any) =>
      level?.level && typeof level.label === 'string' && typeof level.priority === 'number',
    );
    return levels.length > 0 ? levels : null;
  } catch (error) {
    console.warn('[firestoreCurriculumCache] subject read failed:', error);
    return null;
  }
}

export async function getCachedCurriculum(
  subject: string,
  level: EducationLevel,
): Promise<CachedCurriculum | null> {
  const normalized = normalizeText(subject);
  if (!normalized) return null;

  try {
    const id = await shortHash(`${normalized}|${level}`);
    const snapshot = await getDoc(doc(db, 'curricula', id));
    if (!snapshot.exists()) return null;

    const data = snapshot.data() as any;
    const categories = sanitizeCategories(data?.categories);
    if (!isValidTtl(data?.ttlAt) || categories.length === 0) return null;

    return {
      subject: typeof data.subject === 'string' ? data.subject : subject.trim(),
      level,
      categories,
      totalTopics: typeof data.totalTopics === 'number'
        ? data.totalTopics
        : categories.reduce((total, category) => total + category.topics.length, 0),
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
      ttlAt: data.ttlAt,
      providerUsed: typeof data.providerUsed === 'string' ? data.providerUsed : undefined,
    };
  } catch (error) {
    // Firestore indisponível não impede o fallback para o endpoint do servidor.
    console.warn('[firestoreCurriculumCache] curriculum read failed:', error);
    return null;
  }
}
