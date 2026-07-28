import { UserStats } from '../../types';
import { ECONOMY, todayKey } from './economyConstants';

// ============================================================================
// Motor de créditos — funções puras (sem efeitos colaterais / sem React).
// Toda a lógica de "quantos créditos", "pode assistir outro anúncio agora?"
// e "streak de dias seguidos" mora aqui, testável isoladamente.
// ============================================================================

function last24hCount(timestamps: number[] | undefined): number {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return (timestamps || []).filter((t) => t > cutoff).length;
}

export function rewardedAdsWatchedToday(stats: UserStats): number {
  return last24hCount(stats.adWatchTimestamps);
}

export function rewardedAdsRemainingToday(stats: UserStats): number {
  return Math.max(0, ECONOMY.MAX_REWARDED_ADS_PER_DAY - rewardedAdsWatchedToday(stats));
}

export function canWatchRewardedAd(stats: UserStats): boolean {
  return rewardedAdsRemainingToday(stats) > 0;
}

/** Calcula quantos créditos o PRÓXIMO anúncio vai pagar, considerando o streak atual. */
export function computeNextAdReward(stats: UserStats): number {
  const streak = computeStreakAfterWatch(stats).streakDays;
  const tier = ECONOMY.AD_REWARD_STREAK_TIERS.find((t) => streak >= t.minDay);
  return tier ? tier.credits : ECONOMY.AD_REWARD_BASE;
}

function computeStreakAfterWatch(stats: UserStats): { streakDays: number; today: string } {
  const today = todayKey();
  const last = stats.lastAdWatchDay;
  if (!last) return { streakDays: 1, today };

  if (last === today) {
    // Já assistiu hoje — streak não muda até assistir de novo amanhã.
    return { streakDays: stats.adWatchStreakDays || 1, today };
  }

  const yesterday = todayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  if (last === yesterday) {
    return { streakDays: (stats.adWatchStreakDays || 0) + 1, today };
  }

  // Quebrou a sequência.
  return { streakDays: 1, today };
}

/** Aplica a recompensa de um anúncio assistido. Retorna o novo UserStats + créditos ganhos. */
export function applyRewardedAdWatched(stats: UserStats): { updated: UserStats; creditsEarned: number } {
  const creditsEarned = computeNextAdReward(stats);
  const { streakDays, today } = computeStreakAfterWatch(stats);
  const timestamps = [...(stats.adWatchTimestamps || []), Date.now()].filter(
    (t) => t > Date.now() - 24 * 60 * 60 * 1000
  );

  const updated: UserStats = {
    ...stats,
    aiCredits: (stats.aiCredits || 0) + creditsEarned,
    adWatchTimestamps: timestamps,
    adWatchStreakDays: streakDays,
    lastAdWatchDay: today,
  };

  return { updated, creditsEarned };
}

/** Concede o crédito diário gratuito (1x por dia), se ainda não foi concedido hoje. */
export function applyDailyFreeGrantIfNeeded(stats: UserStats): UserStats {
  const today = todayKey();
  if (stats.lastDailyGrantDay === today) return stats;
  return {
    ...stats,
    aiCredits: (stats.aiCredits || 0) + ECONOMY.DAILY_FREE_CREDITS,
    lastDailyGrantDay: today,
  };
}

// --- Intersticial (frequency capping anti-banimento) ---

export function canShowInterstitial(stats: UserStats): boolean {
  const timestamps = stats.interstitialTimestamps || [];
  const todayCount = last24hCount(timestamps);
  if (todayCount >= ECONOMY.MAX_INTERSTITIALS_PER_DAY) return false;

  const last = timestamps[timestamps.length - 1];
  if (last && Date.now() - last < ECONOMY.MIN_INTERSTITIAL_GAP_MS) return false;

  return true;
}

export function applyInterstitialShown(stats: UserStats): UserStats {
  const timestamps = [...(stats.interstitialTimestamps || []), Date.now()].filter(
    (t) => t > Date.now() - 24 * 60 * 60 * 1000
  );
  return { ...stats, interstitialTimestamps: timestamps };
}

// --- Gasto de créditos ---

export function hasEnoughCredits(stats: UserStats, amount: number): boolean {
  return !!stats.isPro || (stats.aiCredits || 0) >= amount;
}

export function applySpendCredits(stats: UserStats, amount: number): UserStats {
  if (stats.isPro) return stats;
  return { ...stats, aiCredits: Math.max(0, (stats.aiCredits || 0) - amount) };
}
