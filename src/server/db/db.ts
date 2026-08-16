// 📁 flashmind-ai/src/server/db/db.ts
// Camada centralizada de acesso ao Firestore.

import { getAdminFirestore } from '../firebaseAdmin';
import {
  SubjectDoc, CurriculumDoc, CardBucketDoc, BankCard,
  EducationLevel, CardContentType,
  subjectId, curriculumId, bucketId,
  normalizeText, shortHash,
  makeTtl, isExpired, TTL_DAYS,
} from './firestoreSchema';

export type { BankCard, EducationLevel, CardContentType };
export type { SubjectDoc, CurriculumDoc, CardBucketDoc };

export async function getSubjectLevels(subject: string): Promise<{ data: SubjectDoc; fromCache: true } | null> {
  const db = getAdminFirestore(); if (!db) return null;
  try { const snap = await db.collection('subjects').doc(subjectId(subject)).get(); if (!snap.exists) return null; const doc = snap.data() as SubjectDoc; if (isExpired(doc.ttlAt)) return null; return { data: doc, fromCache: true }; }
  catch (err: any) { console.warn('[db] getSubjectLevels error:', err?.message); return null; }
}

export async function saveSubjectLevels(subject: string, levels: SubjectDoc['levels'], providerUsed: string): Promise<void> {
  const db = getAdminFirestore(); if (!db) return;
  try { await db.collection('subjects').doc(subjectId(subject)).set({ subject: subject.trim(), normalized: normalizeText(subject), levels, updatedAt: new Date().toISOString(), ttlAt: makeTtl(TTL_DAYS.SUBJECT_LEVELS), providerUsed }); }
  catch (err: any) { console.warn('[db] saveSubjectLevels error:', err?.message); }
}

export async function getCurriculum(subject: string, level: EducationLevel): Promise<{ data: CurriculumDoc; fromCache: true } | null> {
  const db = getAdminFirestore(); if (!db) return null;
  try { const snap = await db.collection('curricula').doc(curriculumId(subject, level)).get(); if (!snap.exists) return null; const doc = snap.data() as CurriculumDoc; if (isExpired(doc.ttlAt)) return null; return { data: doc, fromCache: true }; }
  catch (err: any) { console.warn('[db] getCurriculum error:', err?.message); return null; }
}

export async function saveCurriculum(subject: string, level: EducationLevel, categories: CurriculumDoc['categories'], providerUsed: string): Promise<void> {
  const db = getAdminFirestore(); if (!db) return;
  try {
    const totalTopics = categories.length;
    const totalSubtopics = categories.reduce((sum, category) => sum + category.topics.length, 0);
    const topicTree = categories.map(category => ({ topic: category.category, subtopics: [...category.topics] }));
    const doc: CurriculumDoc = {
      subject: subject.trim(), level, categories, topicTree,
      topicCount: totalTopics, subtopicCount: totalSubtopics,
      totalTopics: totalSubtopics, totalSubtopics,
      version: 2, contentVersion: 'curriculum-v2',
      updatedAt: new Date().toISOString(), ttlAt: makeTtl(TTL_DAYS.CURRICULUM), providerUsed,
    };
    await db.collection('curricula').doc(curriculumId(subject, level)).set(doc);
  } catch (err: any) { console.warn('[db] saveCurriculum error:', err?.message); }
}

export async function getCardBucket(subject: string, topic: string, level: EducationLevel, cardType: CardContentType, limit: number): Promise<{ cards: BankCard[]; stale: boolean }> {
  const db = getAdminFirestore(); if (!db || limit <= 0) return { cards: [], stale: true };
  try {
    const id = bucketId(subject, topic, level, cardType); const snap = await db.collection('cardBuckets').doc(id).get();
    if (!snap.exists) return { cards: [], stale: true }; const doc = snap.data() as CardBucketDoc; const stale = isExpired(doc.ttlAt);
    const cards: BankCard[] = Array.isArray(doc.cards) ? [...doc.cards] : [];
    for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
    return { cards: cards.slice(0, limit), stale };
  } catch (err: any) { console.warn('[db] getCardBucket error:', err?.message); return { cards: [], stale: true }; }
}

export async function saveCardBucket(subject: string, topic: string, level: EducationLevel, cardType: CardContentType, newCards: Omit<BankCard, 'id'>[], providerUsed: string): Promise<void> {
  const db = getAdminFirestore(); if (!db || newCards.length === 0) return;
  try {
    const id = bucketId(subject, topic, level, cardType); const ref = db.collection('cardBuckets').doc(id); const snap = await ref.get();
    const existing = new Map<string, BankCard>(); if (snap.exists) { const doc = snap.data() as CardBucketDoc; (doc.cards || []).forEach(c => existing.set(c.id, c)); }
    let added = 0;
    for (const card of newCards) { const front = (card.front || '').trim(); if (!front) continue; const cardId = shortHash(normalizeText(front)); if (!existing.has(cardId)) { existing.set(cardId, { ...card, id: cardId }); added++; } }
    if (added === 0 && snap.exists) return;
    const allCards = Array.from(existing.values());
    await ref.set({ subject: subject.trim(), topic: topic.trim(), level, cardType, cards: allCards, cardCount: allCards.length, updatedAt: new Date().toISOString(), ttlAt: makeTtl(TTL_DAYS.CARD_BUCKET), providerUsed, version: 2, contentVersion: 'cards-v2' } satisfies CardBucketDoc);
  } catch (err: any) { console.warn('[db] saveCardBucket error:', err?.message); }
}

export async function getBucketStats(subject: string, topics: string[], level: EducationLevel, cardType: CardContentType = 'definition'): Promise<Array<{ topic: string; cardCount: number; stale: boolean; bucketId: string }>> {
  const db = getAdminFirestore(); if (!db || topics.length === 0) return [];
  return Promise.all(topics.map(async topic => {
    try { const id = bucketId(subject, topic, level, cardType); const snap = await db.collection('cardBuckets').doc(id).get(); if (!snap.exists) return { topic, cardCount: 0, stale: true, bucketId: id }; const doc = snap.data() as CardBucketDoc; return { topic, cardCount: doc.cardCount ?? (doc.cards?.length ?? 0), stale: isExpired(doc.ttlAt), bucketId: id }; }
    catch { return { topic, cardCount: 0, stale: true, bucketId: '' }; }
  }));
}

export async function prefetchCardBuckets(subject: string, topics: string[], level: EducationLevel, cardType: CardContentType): Promise<Map<string, { cards: BankCard[]; stale: boolean }>> {
  const db = getAdminFirestore(); const result = new Map<string, { cards: BankCard[]; stale: boolean }>(); if (!db || topics.length === 0) return result;
  await Promise.all(topics.map(async topic => { const id = bucketId(subject, topic, level, cardType); try { const snap = await db.collection('cardBuckets').doc(id).get(); if (!snap.exists) { result.set(id, { cards: [], stale: true }); return; } const doc = snap.data() as CardBucketDoc; result.set(id, { cards: Array.isArray(doc.cards) ? doc.cards : [], stale: isExpired(doc.ttlAt) }); } catch { result.set(id, { cards: [], stale: true }); } }));
  return result;
}
