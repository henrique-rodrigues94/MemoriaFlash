// Monetização atual: anúncios para contas gratuitas e geração por IA limitada
// a 200 cards. PRO possui geração ilimitada e não recebe anúncios.
export const ECONOMY = {
  MAX_INTERSTITIALS_PER_DAY: 4,
  MIN_INTERSTITIAL_GAP_MS: 3 * 60 * 1000,

  // Indicação: quando um novo usuário entra pelo código de outro usuário e
  // começa a usar o app, o indicador recebe 3 dias de PRO. Não há créditos.
  REFERRAL_PRO_REWARD_DAYS: 3,

  // Campos legados mantidos apenas para compatibilidade com dados antigos.
  // Não são exibidos nem utilizados como moeda na interface atual.
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
