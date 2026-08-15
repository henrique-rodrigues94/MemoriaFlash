import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type FeedbackReason =
  | 'confusing_question'
  | 'wrong_answer'
  | 'bad_explanation'
  | 'too_easy'
  | 'too_hard'
  | 'duplicate_content'
  | 'outdated_content'
  | 'other';

export interface CardProblemContext {
  cardId: string;
  bucketId?: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
  level?: string;
  cardType?: string;
  difficulty?: string;
  question?: string;
  answer?: string;
  explanation?: string;
  curiosity?: string;
  deckId?: string;
  deckTitle?: string;
  sessionId?: string;
  cardPosition?: number;
  sessionTotal?: number;
  sessionProgress?: number;
  sessionStartedAt?: string;
  page?: string;
  appVersion?: string;
  platform?: string;
}

export async function reportCardProblem(
  context: CardProblemContext,
  reason: FeedbackReason = 'other',
  comment?: string,
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('É necessário estar autenticado para relatar um problema.');
  if (!context.cardId?.trim()) throw new Error('Card inválido para relatório.');

  const normalizedComment = comment?.trim().slice(0, 500) || undefined;
  const payload = {
    ...context,
    userId: user.uid,
    rating: 'problem' as const,
    reportType: 'card_problem' as const,
    reason,
    ...(normalizedComment ? { comment: normalizedComment } : {}),
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'cardFeedback'), payload);
  return ref.id;
}
