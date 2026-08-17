import { addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getStoredDecks } from './storage';
import type { Flashcard } from '../types';

export type StudyFeedbackReason = 'wrong_answer' | 'bad_explanation' | 'confusing_question' | 'duplicate_content' | 'outdated_content' | 'other';
export interface StudyFeedbackPayload {
  reason: StudyFeedbackReason;
  comment?: string;
  /** Card/context passed directly from the study screen state (preferred over DOM scraping). */
  card?: Flashcard;
  subject?: string;
  deckId?: string;
}

function normalize(value: string): string {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
}

async function deriveBucketId(subject: string, topic: string, level: string, cardType: string): Promise<string> {
  const value = `${normalize(subject)}|${normalize(topic)}||${level}|${cardType}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }
  return '';
}

function findCardFromStudyDom(): { card: Flashcard; subject: string; deckId: string } | null {
  const container = document.getElementById('flashcard-flip-container');
  if (!container) return null;
  const question = container.querySelector('h3')?.textContent?.trim() || '';
  if (!question) return null;
  const topic = container.querySelector('span.truncate')?.textContent?.trim() || '';
  const normalizedQuestion = normalize(question);
  for (const deck of getStoredDecks()) {
    const card = deck.cards.find(candidate => normalize(candidate.front) === normalizedQuestion || normalize(candidate.back) === normalizedQuestion);
    if (card) return { card, subject: deck.category || deck.title, deckId: deck.id };
  }
  return {
    card: { id: `unknown-${Date.now()}`, front: question, back: '', topic: topic || 'Desconhecido', reps: 0, interval: 0, efactor: 2.5, dueDate: new Date().toISOString() },
    subject: topic || 'MemoriaFlash',
    deckId: '',
  };
}

export function getCurrentStudyCard(): { card: Flashcard; subject: string; deckId: string } | null { return findCardFromStudyDom(); }

export async function submitStudyCardFeedback(payload: StudyFeedbackPayload): Promise<void> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Faça login para enviar um feedback sobre este card.');

  // Prefer the card/context passed explicitly by the caller (from React state),
  // since it's reliable in production. Only fall back to scraping the DOM
  // (legacy behaviour) if the caller didn't provide it.
  const context = payload.card
    ? { card: payload.card, subject: payload.subject || payload.card.topic || 'MemoriaFlash', deckId: payload.deckId || '' }
    : findCardFromStudyDom();
  if (!context) throw new Error('Não foi possível identificar o card atual. Tente novamente.');
  if (context.card.source === 'manual') throw new Error('Cards criados manualmente não podem ser relatados — o relato serve para curadoria de conteúdo gerado por IA.');

  const { card, subject, deckId } = context;
  const now = new Date().toISOString();
  const cardType = card.cardContentType || 'definition';
  const level = card.educationLevel || 'medio';
  const topic = card.topic || subject;
  const bucketId = card.bucketId || await deriveBucketId(subject, topic, level, cardType);
  const comment = payload.comment?.trim().slice(0, 500) || '';

  const feedback: Record<string, unknown> = {
    reportType: 'card_problem',
    cardId: card.id,
    bucketId,
    subject,
    topic,
    level,
    cardType,
    difficulty: card.difficulty || 'medium',
    rating: 'negative',
    reason: payload.reason,
    userId: user.uid,
    deckId: deckId || undefined,
    front: card.front.slice(0, 4000),
    back: card.back.slice(0, 4000),
    explanation: (card.explanation || '').slice(0, 6000),
    createdAt: now,
    status: 'pending',
    source: 'mobile-study',
  };
  if (card.subtopic) feedback.subtopic = card.subtopic;
  if (comment) feedback.comment = comment;

  await addDoc(collection(db, 'cardFeedback'), feedback);
}

