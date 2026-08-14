import { UserStats } from '../../types';
import { ECONOMY } from './economyConstants';

function last24hCount(timestamps: number[] | undefined): number {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return (timestamps || []).filter((t) => t > cutoff).length;
}

/** Controle de frequência para anúncios intersticiais dos usuários gratuitos. */
export function canShowInterstitial(stats: UserStats): boolean {
  if (stats.isPro) return false;
  const timestamps = stats.interstitialTimestamps || [];
  if (last24hCount(timestamps) >= ECONOMY.MAX_INTERSTITIALS_PER_DAY) return false;
  const last = timestamps[timestamps.length - 1];
  return !last || Date.now() - last >= ECONOMY.MIN_INTERSTITIAL_GAP_MS;
}

export function applyInterstitialShown(stats: UserStats): UserStats {
  const timestamps = [...(stats.interstitialTimestamps || []), Date.now()].filter(
    (t) => t > Date.now() - 24 * 60 * 60 * 1000,
  );
  return { ...stats, interstitialTimestamps: timestamps };
}
