import { UserStats } from '../types';

export const FREE_AI_CARD_LIMIT = 200;

export function generatedAICardsCount(stats: UserStats): number {
  return Math.max(0, Number(stats.aiCardsGenerated) || 0);
}

export function remainingAICards(stats: UserStats): number {
  if (stats.isPro) return Number.POSITIVE_INFINITY;
  return Math.max(0, FREE_AI_CARD_LIMIT - generatedAICardsCount(stats));
}

export function canGenerateAICards(stats: UserStats, requestedCount: number): boolean {
  if (stats.isPro) return true;
  return requestedCount > 0 && requestedCount <= remainingAICards(stats);
}
