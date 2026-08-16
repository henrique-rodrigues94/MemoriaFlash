import { collection, doc, getDoc, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { EducationLevel } from '../lib/educationLevels';

export interface CachedCurriculumCategory { category: string; topics: string[]; }
export interface CachedCurriculum { subject: string; level: EducationLevel; categories: CachedCurriculumCategory[]; totalTopics: number; totalSubtopics?: number; version?: number; updatedAt?: string; ttlAt?: number; providerUsed?: string; }
export interface CachedSubjectLevel { level: EducationLevel; label: string; icon: string; reason: string; priority: number; }
function normalizeText(text: string): string { return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim(); }
async function shortHash(text: string): Promise<string> { const bytes = new TextEncoder().encode(text); const digest = await crypto.subtle.digest('SHA-1', bytes); return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 16); }
function isValidTtl(ttlAt: unknown): boolean { return typeof ttlAt !== 'number' || ttlAt === 0 || ttlAt > Date.now(); }
function sanitizeCategories(value: unknown): CachedCurriculumCategory[] {
  if (!Array.isArray(value)) return [];
  return value.map((category: any) => ({
    category: typeof category?.category === 'string' ? category.category.trim() : '',
    topics: Array.isArray(category?.topics) ? Array.from(new Set(category.topics.filter((topic: unknown): topic is string => typeof topic === 'string' && topic.trim()).map((topic: string) => topic.trim()))) : [],
  })).filter(category => category.category && category.topics.length > 0);
}

let subjectCatalogCache: { subjects: string[]; fetchedAt: number } | null = null;
async function loadSubjectCatalog(): Promise<string[]> {
  if (subjectCatalogCache && Date.now() - subjectCatalogCache.fetchedAt <= 60 * 60 * 1000) return subjectCatalogCache.subjects;
  try {
    const snapshot = await getDocs(query(collection(db, 'subjects'), limit(500)));
    const unique = new Map<string, string>();
    snapshot.docs.forEach(item => { const value = String((item.data() as any)?.subject || '').trim(); const key = normalizeText(value); if (key && !unique.has(key)) unique.set(key, value); });
    subjectCatalogCache = { subjects: Array.from(unique.values()), fetchedAt: Date.now() };
    return subjectCatalogCache.subjects;
  } catch (error) { console.warn('[firestoreCurriculumCache] subject catalog read failed:', error); return subjectCatalogCache?.subjects || []; }
}
export async function warmSubjectCatalog(): Promise<void> { await loadSubjectCatalog(); }
export async function findCachedSubjectSuggestions(input: string): Promise<string[]> { const all = await loadSubjectCatalog(); const queryText = normalizeText(input); if (queryText.length < 2) return []; return all.filter(subject => normalizeText(subject).includes(queryText)).slice(0, 12); }

export async function getCachedSubjectLevels(subject: string): Promise<CachedSubjectLevel[] | null> {
  const normalized = normalizeText(subject); if (!normalized) return null;
  try { const id = await shortHash(normalized); const snapshot = await getDoc(doc(db, 'subjects', id)); if (!snapshot.exists()) return null; const data = snapshot.data() as any; if (!isValidTtl(data?.ttlAt) || !Array.isArray(data?.levels)) return null; const levels = data.levels.filter((level: any) => level?.level && typeof level.label === 'string' && typeof level.priority === 'number'); return levels.length ? levels : null; }
  catch (error) { console.warn('[firestoreCurriculumCache] subject read failed:', error); return null; }
}

export async function getCachedCurriculum(subject: string, level: EducationLevel): Promise<CachedCurriculum | null> {
  const normalized = normalizeText(subject); if (!normalized) return null;
  try {
    const id = await shortHash(`${normalized}|${level}`); const snapshot = await getDoc(doc(db, 'curricula', id)); if (!snapshot.exists()) return null;
    const data = snapshot.data() as any; const categories = sanitizeCategories(data?.categories);
    // Currículo sem version 2 é legado e precisa passar pelo servidor para ser regenerado sem limites.
    if (Number(data?.version || 0) !== 2 || !isValidTtl(data?.ttlAt) || categories.length === 0) return null;
    return { subject: typeof data.subject === 'string' ? data.subject : subject.trim(), level, categories, totalTopics: Number(data?.totalTopics || categories.reduce((total, category) => total + category.topics.length, 0)), totalSubtopics: Number(data?.totalSubtopics || categories.reduce((total, category) => total + category.topics.length, 0)), version: 2, updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined, ttlAt: data.ttlAt, providerUsed: typeof data.providerUsed === 'string' ? data.providerUsed : undefined };
  } catch (error) { console.warn('[firestoreCurriculumCache] curriculum read failed:', error); return null; }
}
