import { UserStats } from '../types';

export const FREE_AI_CARD_LIMIT = 200;

/**
 * UI helper only. The authoritative daily quota is enforced by the backend.
 * `aiCardsGeneratedToday` is synchronized from the backend after each request.
 */
export function generatedAICardsCount(stats: UserStats): number {
  const value = Number((stats as UserStats & { aiCardsGeneratedToday?: number }).aiCardsGeneratedToday);
  return Math.max(0, Number.isFinite(value) ? value : 0);
}

export function remainingAICards(stats: UserStats): number {
  if (stats.isPro) return Number.POSITIVE_INFINITY;
  return Math.max(0, FREE_AI_CARD_LIMIT - generatedAICardsCount(stats));
}

export function canGenerateAICards(stats: UserStats, requestedCount: number): boolean {
  if (stats.isPro) return requestedCount > 0;
  return requestedCount > 0 && requestedCount <= remainingAICards(stats);
}
