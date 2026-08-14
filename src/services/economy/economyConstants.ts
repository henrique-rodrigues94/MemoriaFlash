// Monetização atual: anúncios normais para contas gratuitas e geração por IA
// limitada a 200 cards. PRO possui geração ilimitada e não recebe anúncios.
export const ECONOMY = {
  MAX_INTERSTITIALS_PER_DAY: 4,
  MIN_INTERSTITIAL_GAP_MS: 3 * 60 * 1000,
  REFERRAL_WELCOME_BONUS: 15,
  REFERRAL_REFERRER_BONUS: 30,

  // Compatibilidade temporária com componentes antigos. Não representam
  // créditos reais e não são usados pela nova tela de geração.
  DAILY_FREE_CREDITS: 0,
  AD_REWARD_BASE: 0,
  AD_REWARD_STREAK_TIERS: [] as { minDay: number; credits: number }[],
  MAX_REWARDED_ADS_PER_DAY: 0,
  RECOMMENDED_REWARDED_ADS_PER_DAY: 0,
  COST_GENERATE_DECK: 0,
} as const;

export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
