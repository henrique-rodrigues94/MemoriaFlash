import { describe, it, expect } from 'vitest';
import { canShowInterstitial, applyInterstitialShown, canWatchRewardedAd, rewardedAdsRemainingToday, computeNextAdReward, applyRewardedAdWatched, applyDailyFreeGrantIfNeeded, hasEnoughCredits, applySpendCredits } from './creditsEngine';
import { UserStats } from '../../types';
function baseStats(overrides: Partial<UserStats> = {}): UserStats { return { name: 'Teste', avatar: '', streakDays: 0, dailyGoalTotal: 20, dailyGoalCompleted: 0, totalCardsMastered: 0, timeStudiedHours: 0, retentionRate: 0, xp: 0, globalRank: 0, aiCredits: 10, ...overrides }; }

describe('creditsEngine — compatibilidade após remoção de rewarded ads/créditos', () => {
  it('mantém rewarded ads desativados', () => { const stats = baseStats(); expect(canWatchRewardedAd(stats)).toBe(false); expect(rewardedAdsRemainingToday(stats)).toBe(0); expect(computeNextAdReward(stats)).toBe(0); expect(applyRewardedAdWatched(stats).creditsEarned).toBe(0); });
  it('funções legadas de economia são no-op', () => { const stats = baseStats({ aiCredits: 3 }); expect(applyDailyFreeGrantIfNeeded(stats)).toEqual(stats); expect(hasEnoughCredits(stats, 999)).toBe(true); expect(applySpendCredits(stats, 5)).toEqual(stats); });
  it('interstitial respeita PRO e registra exibição', () => { expect(canShowInterstitial(baseStats())).toBe(true); expect(canShowInterstitial(baseStats({ isPro: true }))).toBe(false); const updated = applyInterstitialShown(baseStats()); expect(updated.interstitialTimestamps?.length).toBe(1); });
});
