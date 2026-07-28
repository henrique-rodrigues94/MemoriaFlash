import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  rewardedAdsRemainingToday,
  canWatchRewardedAd,
  computeNextAdReward,
  applyRewardedAdWatched,
  applyDailyFreeGrantIfNeeded,
  canShowInterstitial,
  applyInterstitialShown,
  hasEnoughCredits,
  applySpendCredits,
} from './creditsEngine';
import { ECONOMY } from './economyConstants';
import { UserStats } from '../../types';

function baseStats(overrides: Partial<UserStats> = {}): UserStats {
  return {
    name: 'Teste',
    avatar: '',
    streakDays: 0,
    dailyGoalTotal: 20,
    dailyGoalCompleted: 0,
    totalCardsMastered: 0,
    timeStudiedHours: 0,
    retentionRate: 0,
    xp: 0,
    globalRank: 0,
    aiCredits: 0,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Vídeo recompensado — limite diário e streak', () => {
  it('usuário sem histórico pode assistir e ganha a recompensa base', () => {
    const stats = baseStats();
    expect(canWatchRewardedAd(stats)).toBe(true);
    expect(computeNextAdReward(stats)).toBe(10);
  });

  it('respeita o limite diário máximo de anúncios (anti-banimento do AdMob)', () => {
    let stats = baseStats();
    for (let i = 0; i < ECONOMY.MAX_REWARDED_ADS_PER_DAY; i++) {
      expect(canWatchRewardedAd(stats)).toBe(true);
      stats = applyRewardedAdWatched(stats).updated;
    }
    expect(canWatchRewardedAd(stats)).toBe(false);
    expect(rewardedAdsRemainingToday(stats)).toBe(0);
  });

  it('assistir dias seguidos aumenta a recompensa (streak)', () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
    let stats = baseStats();
    let watch = applyRewardedAdWatched(stats);
    expect(watch.creditsEarned).toBe(10); // dia 1
    stats = watch.updated;
    expect(stats.adWatchStreakDays).toBe(1);

    vi.setSystemTime(new Date('2026-01-02T10:00:00Z'));
    watch = applyRewardedAdWatched(stats);
    expect(watch.updated.adWatchStreakDays).toBe(2);
    stats = watch.updated;

    vi.setSystemTime(new Date('2026-01-05T10:00:00Z')); // pulou 2 dias — quebra o streak
    watch = applyRewardedAdWatched(stats);
    expect(watch.updated.adWatchStreakDays).toBe(1);
    expect(watch.creditsEarned).toBe(10);
  });

  it('streak de 7+ dias paga o valor máximo (25 créditos)', () => {
    vi.useFakeTimers();
    let stats = baseStats();
    for (let day = 1; day <= 7; day++) {
      vi.setSystemTime(new Date(`2026-01-${String(day).padStart(2, '0')}T10:00:00Z`));
      stats = applyRewardedAdWatched(stats).updated;
    }
    expect(stats.adWatchStreakDays).toBe(7);
    expect(computeNextAdReward(stats)).toBe(25);
  });
});

describe('Crédito diário gratuito', () => {
  it('concede o bônus diário apenas uma vez por dia', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T08:00:00Z'));

    let stats = baseStats();
    stats = applyDailyFreeGrantIfNeeded(stats);
    expect(stats.aiCredits).toBe(ECONOMY.DAILY_FREE_CREDITS);

    // Chamando de novo no mesmo dia não concede duas vezes.
    stats = applyDailyFreeGrantIfNeeded(stats);
    expect(stats.aiCredits).toBe(ECONOMY.DAILY_FREE_CREDITS);

    // No dia seguinte, concede de novo.
    vi.setSystemTime(new Date('2026-01-02T08:00:00Z'));
    stats = applyDailyFreeGrantIfNeeded(stats);
    expect(stats.aiCredits).toBe(ECONOMY.DAILY_FREE_CREDITS * 2);
  });
});

describe('Intersticial — frequency capping anti-banimento', () => {
  it('respeita o intervalo mínimo entre exibições', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));

    let stats = baseStats();
    expect(canShowInterstitial(stats)).toBe(true);
    stats = applyInterstitialShown(stats);

    // Menos de 3 minutos depois: não pode mostrar de novo.
    vi.setSystemTime(new Date('2026-01-01T10:01:00Z'));
    expect(canShowInterstitial(stats)).toBe(false);

    // Passado o intervalo mínimo: pode mostrar de novo.
    vi.setSystemTime(new Date('2026-01-01T10:05:00Z'));
    expect(canShowInterstitial(stats)).toBe(true);
  });

  it('respeita o limite diário de intersticiais', () => {
    vi.useFakeTimers();
    let stats = baseStats();
    const start = new Date('2026-01-01T00:00:00Z').getTime();

    for (let i = 0; i < ECONOMY.MAX_INTERSTITIALS_PER_DAY; i++) {
      vi.setSystemTime(new Date(start + i * (ECONOMY.MIN_INTERSTITIAL_GAP_MS + 1000)));
      expect(canShowInterstitial(stats)).toBe(true);
      stats = applyInterstitialShown(stats);
    }

    vi.setSystemTime(new Date(start + ECONOMY.MAX_INTERSTITIALS_PER_DAY * (ECONOMY.MIN_INTERSTITIAL_GAP_MS + 1000)));
    expect(canShowInterstitial(stats)).toBe(false);
  });
});

describe('Gasto de créditos', () => {
  it('usuário gratuito com créditos suficientes pode gastar', () => {
    const stats = baseStats({ aiCredits: 5 });
    expect(hasEnoughCredits(stats, 3)).toBe(true);
    const updated = applySpendCredits(stats, 3);
    expect(updated.aiCredits).toBe(2);
  });

  it('usuário gratuito sem créditos suficientes não pode gastar', () => {
    const stats = baseStats({ aiCredits: 1 });
    expect(hasEnoughCredits(stats, 3)).toBe(false);
  });

  it('créditos nunca ficam negativos', () => {
    const stats = baseStats({ aiCredits: 1 });
    const updated = applySpendCredits(stats, 5);
    expect(updated.aiCredits).toBe(0);
  });

  it('usuário PRO tem créditos ilimitados (gasto não desconta nada)', () => {
    const stats = baseStats({ aiCredits: 0, isPro: true });
    expect(hasEnoughCredits(stats, 999)).toBe(true);
    const updated = applySpendCredits(stats, 999);
    expect(updated.aiCredits).toBe(0); // não desconta de usuário PRO
  });
});
