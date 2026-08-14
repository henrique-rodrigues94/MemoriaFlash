import { UserStats } from '../../types';
import { ECONOMY } from './economyConstants';

function last24hCount(timestamps: number[] | undefined): number {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return (timestamps || []).filter((t) => t > cutoff).length;
}

export function canShowInterstitial(stats: UserStats): boolean {
  if (stats.isPro) return false;
  const timestamps = stats.interstitialTimestamps || [];
  if (last24hCount(timestamps) >= ECONOMY.MAX_INTERSTITIALS_PER_DAY) return false;
  const last = timestamps[timestamps.length - 1];
  return !last || Date.now() - last >= ECONOMY.MIN_INTERSTITIAL_GAP_MS;
}

export function applyInterstitialShown(stats: UserStats): UserStats {
  const timestamps = [...(stats.interstitialTimestamps || []), Date.now()].filter((t) => t > Date.now() - 24 * 60 * 60 * 1000);
  return { ...stats, interstitialTimestamps: timestamps };
}

// Compatibilidade com versões antigas. A nova estratégia não utiliza créditos
// nem rewarded ads; estas funções não concedem nem consomem nada.
export function canWatchRewardedAd(_stats: UserStats): boolean { return false; }
export function rewardedAdsRemainingToday(_stats: UserStats): number { return 0; }
export function computeNextAdReward(_stats: UserStats): number { return 0; }
export function applyRewardedAdWatched(stats: UserStats): { updated: UserStats; creditsEarned: number } {
  return { updated: stats, creditsEarned: 0 };
}
export function applyDailyFreeGrantIfNeeded(stats: UserStats): UserStats { return stats; }
export function hasEnoughCredits(_stats: UserStats, _amount: number): boolean { return true; }
export function applySpendCredits(stats: UserStats, _amount: number): UserStats { return stats; }
