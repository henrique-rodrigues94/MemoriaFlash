import { Flashcard, RatingGrade } from '../types';

export interface SRSUpdateResult {
  reps: number;
  interval: number;
  efactor: number;
  dueDate: string;
  lastReviewed: string;
}

export function calculateSM2(
  card: Pick<Flashcard, 'reps' | 'interval' | 'efactor'>,
  rating: RatingGrade
): SRSUpdateResult {
  // Convert rating to grade (q: 0..5)
  // hard = 2, good = 4, easy = 5
  let q = 4;
  if (rating === 'hard') q = 2;
  if (rating === 'good') q = 4;
  if (rating === 'easy') q = 5;

  let efactor = card.efactor || 2.5;
  let reps = card.reps || 0;
  let interval = card.interval || 0;

  // New EF calculation
  efactor = efactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (efactor < 1.3) efactor = 1.3;

  if (q < 3) {
    // If answer was hard/incorrect, reset repetitions & interval to 1
    reps = 0;
    interval = 1;
  } else {
    if (reps === 0) {
      interval = 1;
    } else if (reps === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * efactor);
    }
    reps += 1;
  }

  const now = new Date();
  const nextDueDate = new Date();
  nextDueDate.setDate(now.getDate() + interval);

  return {
    reps,
    interval,
    efactor: Number(efactor.toFixed(2)),
    dueDate: nextDueDate.toISOString(),
    lastReviewed: now.toISOString(),
  };
}

export function getDueCardCount(cards: Flashcard[]): number {
  const now = new Date();
  return cards.filter((card) => {
    if (!card.dueDate) return true;
    return new Date(card.dueDate) <= now;
  }).length;
}

export function computeDeckMastery(cards: Flashcard[]): number {
  if (!cards.length) return 0;
  const totalReps = cards.reduce((sum, c) => sum + (c.reps || 0), 0);
  const maxPotentialReps = cards.length * 5;
  const percentage = Math.min(100, Math.round((totalReps / maxPotentialReps) * 100));
  return Math.max(10, percentage);
}
