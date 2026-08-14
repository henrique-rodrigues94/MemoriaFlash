// Regras de monetização e indicação do MemoriaFlash.
// A geração por IA não usa mais créditos: usuários gratuitos têm um
// limite acumulado de 200 cards gerados; usuários PRO têm geração ilimitada.

export const ECONOMY = {
  // --- Intersticial ---
  MAX_INTERSTITIALS_PER_DAY: 4,
  MIN_INTERSTITIAL_GAP_MS: 3 * 60 * 1000,

  // --- Indicação ---
  REFERRAL_WELCOME_BONUS: 15,
  REFERRAL_REFERRER_BONUS: 30,
} as const;

export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
