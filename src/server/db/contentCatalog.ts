import { getAdminFirestore } from '../firebaseAdmin';
import {
  CardContentType,
  EducationLevel,
  curriculumId,
  bucketId,
  isExpired,
  makeTtl,
  normalizeText,
  TTL_DAYS,
} from './firestoreSchema';

export interface CatalogTopic {
  id: string;
  topic: string;
  subtopics: string[];
  cardCount: number;
  cardsByType: Partial<Record<CardContentType, number>>;
  updatedAt: string | null;
  lastGeneratedAt: string | null;
  stale: boolean;
}

export interface ContentCatalogDoc {
  subject: string;
  level: EducationLevel;
  curriculumId: string;
  curriculumUpdatedAt: string | null;
  updatedAt: string;
  ttlAt: number;
  topics: CatalogTopic[];
}

function catalogDocId(subject: string, level: EducationLevel): string {
  return curriculumId(subject, level);
}

function topicId(topic: string): string {
  return normalizeText(topic).replace(/\s+/g, '-').slice(0, 120);
}

export async function getContentCatalog(
  subject: string,
  level: EducationLevel,
): Promise<ContentCatalogDoc | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  try {
    const snap = await db.collection('contentCatalog').doc(catalogDocId(subject, level)).get();
    if (!snap.exists) return null;
    return snap.data() as ContentCatalogDoc;
  } catch (err: any) {
    console.warn('[contentCatalog] read error:', err?.message);
    return null;
  }
}

/** Inicializa/atualiza o catálogo a partir da grade curricular. */
export async function initializeContentCatalog(
  subject: string,
  level: EducationLevel,
  categories: Array<{ category: string; topics: string[] }>,
  curriculumUpdatedAt: string,
): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;

  try {
    const ref = db.collection('contentCatalog').doc(catalogDocId(subject, level));
    const existingSnap = await ref.get();
    const existing = existingSnap.exists ? existingSnap.data() as ContentCatalogDoc : null;
    const existingByTopic = new Map((existing?.topics || []).map(t => [normalizeText(t.topic), t]));

    const topics: CatalogTopic[] = [];
    for (const category of categories) {
      // Na grade atual, category representa o tópico e topics representa os sub-tópicos.
      const key = normalizeText(category.category);
      const old = existingByTopic.get(key);
      topics.push({
        id: old?.id || topicId(category.category),
        topic: category.category.trim(),
        subtopics: Array.from(new Set((category.topics || []).map(t => t.trim()).filter(Boolean))),
        cardCount: old?.cardCount || 0,
        cardsByType: old?.cardsByType || {},
        updatedAt: old?.updatedAt || null,
        lastGeneratedAt: old?.lastGeneratedAt || null,
        stale: old?.stale ?? true,
      });
    }

    const doc: ContentCatalogDoc = {
      subject: subject.trim(),
      level,
      curriculumId: curriculumId(subject, level),
      curriculumUpdatedAt,
      updatedAt: new Date().toISOString(),
      ttlAt: makeTtl(TTL_DAYS.CURRICULUM),
      topics,
    };
    await ref.set(doc, { merge: true });
  } catch (err: any) {
    console.warn('[contentCatalog] initialize error:', err?.message);
  }
}

/** Atualiza somente o tópico afetado depois que um bucket recebe cards. */
export async function updateContentCatalogFromBucket(args: {
  subject: string;
  topic: string;
  level: EducationLevel;
  cardType: CardContentType;
  cardCount: number;
  updatedAt: string;
}): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;

  try {
    const { subject, topic, level, cardType, cardCount, updatedAt } = args;
    const ref = db.collection('contentCatalog').doc(catalogDocId(subject, level));
    const snap = await ref.get();
    const current = snap.exists ? snap.data() as ContentCatalogDoc : null;
    const topics = Array.isArray(current?.topics) ? [...current!.topics] : [];
    const key = normalizeText(topic);
    let index = topics.findIndex(t => normalizeText(t.topic) === key);

    if (index < 0) {
      topics.push({
        id: topicId(topic),
        topic: topic.trim(),
        subtopics: [],
        cardCount: 0,
        cardsByType: {},
        updatedAt: null,
        lastGeneratedAt: null,
        stale: false,
      });
      index = topics.length - 1;
    }

    const previous = topics[index];
    const cardsByType = { ...(previous.cardsByType || {}), [cardType]: cardCount };
    const aggregate = Object.values(cardsByType).reduce((sum, value) => sum + Number(value || 0), 0);

    topics[index] = {
      ...previous,
      cardCount: aggregate,
      cardsByType,
      updatedAt,
      lastGeneratedAt: updatedAt,
      stale: false,
    };

    const doc: ContentCatalogDoc = {
      subject: subject.trim(),
      level,
      curriculumId: curriculumId(subject, level),
      curriculumUpdatedAt: current?.curriculumUpdatedAt || null,
      updatedAt: new Date().toISOString(),
      ttlAt: current?.ttlAt || makeTtl(TTL_DAYS.CURRICULUM),
      topics,
    };
    await ref.set(doc, { merge: true });
  } catch (err: any) {
    console.warn('[contentCatalog] bucket update error:', err?.message);
  }
}

export function catalogTopicIsStale(topic: CatalogTopic | undefined): boolean {
  return !topic || topic.stale || isExpired(topic.updatedAt ? Date.parse(topic.updatedAt) + TTL_DAYS.CARD_BUCKET * 24 * 60 * 60 * 1000 : undefined);
}
