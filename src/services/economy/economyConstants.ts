// ============================================================================
// Regras de negócio da economia de créditos do MemoriaFlash.
// Centralizar aqui evita "números mágicos" espalhados pelos componentes e
// facilita ajustar a estratégia de monetização sem caçar cada tela.
// ============================================================================

export const ECONOMY = {
  // Créditos gratuitos concedidos automaticamente 1x por dia (login/abertura do app).
  DAILY_FREE_CREDITS: 5,

  // --- Vídeo recompensado (rewarded) ---
  // Créditos base por anúncio assistido, com bônus de streak (dias seguidos assistindo).
  AD_REWARD_BASE: 10,
  AD_REWARD_STREAK_TIERS: [
    { minDay: 7, credits: 25 },
    { minDay: 4, credits: 15 },
    { minDay: 1, credits: 10 },
  ],
  // Limite diário de vídeos recompensados. A Google recomenda manter entre
  // 3-6/dia; o teto de 8 é a margem de segurança antes de risco de banimento
  // por "atividade inválida" na conta AdMob.
  MAX_REWARDED_ADS_PER_DAY: 8,
  RECOMMENDED_REWARDED_ADS_PER_DAY: 6,

  // --- Intersticial ---
  MAX_INTERSTITIALS_PER_DAY: 4,
  MIN_INTERSTITIAL_GAP_MS: 3 * 60 * 1000, // 1 a cada 3 min, no mínimo

  // --- Indicação (referral) ---
  REFERRAL_WELCOME_BONUS: 15, // quem foi indicado ganha ao entrar
  REFERRAL_REFERRER_BONUS: 30, // quem indicou ganha quando o indicado ativa a conta

  // --- Custo de ações em créditos de IA ---
  COST_GENERATE_DECK: 1, // custo em créditos POR CARD gerado (não por lote/geração)
} as const;

export function todayKey(date: Date = new Date()): string {
  // Chave de dia local (YYYY-MM-DD) — evita problemas de fuso horário do ISO/UTC.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
