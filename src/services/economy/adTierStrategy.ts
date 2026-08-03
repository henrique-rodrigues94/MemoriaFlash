// ============================================================================
// Estratégia de anúncios por região (tiers de eCPM) — baseada na documentação
// de monetização do MemoriaFlash. Sem uma API paga de geolocalização, usamos
// o idioma/locale do navegador como proxy razoável do país do usuário (o
// mesmo sinal que o AdMob usa para segmentar demanda). Ao empacotar o app
// nativamente (Capacitor/Expo), troque esta heurística por Play
// services location ou o país retornado pelo próprio SDK do AdMob.
// ============================================================================

export type AdTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';

const TIER1_LOCALES = ['en-US', 'en-GB', 'en-AU', 'en-CA', 'ja', 'de', 'de-DE', 'de-AT', 'de-CH'];
const TIER2_LOCALES = ['fr', 'fr-FR', 'ko', 'es-ES', 'it', 'nl', 'sv', 'pt-PT'];
const TIER3_LOCALES = ['pt-BR', 'es-MX', 'es-AR', 'pl', 'tr'];
// Todo o resto (inclusive fallback) cai em tier4 — estratégia de volume.

export function detectAdTier(locale: string = typeof navigator !== 'undefined' ? navigator.language : 'pt-BR'): AdTier {
  const l = locale.toLowerCase();
  if (TIER1_LOCALES.some((t) => l.startsWith(t.toLowerCase()))) return 'tier1';
  if (TIER2_LOCALES.some((t) => l.startsWith(t.toLowerCase()))) return 'tier2';
  if (TIER3_LOCALES.some((t) => l.startsWith(t.toLowerCase()))) return 'tier3';
  return 'tier4';
}

/**
 * Para tiers de eCPM alto (1 e 2), priorizamos oferecer vídeo recompensado
 * (maior receita por impressão). Para tiers de volume (3 e 4), priorizamos
 * intersticial/banner, que monetizam melhor em alto volume com eCPM baixo.
 */
export function shouldPrioritizeRewardedVideo(tier: AdTier): boolean {
  return tier === 'tier1' || tier === 'tier2';
}

export interface RegionalPricing {
  currencyLabel: string;
  monthlyPrice: string;
  annualTotalPrice: string;
  annualMonthlyEquivalent: string;
  annualDiscountPercent: number;
}

/**
 * Preços do plano PRO por tier de região, ajustados ao poder aquisitivo
 * médio de cada mercado (evita canibalizar receita cobrando preço de Tier 1
 * de usuários de Tier 3/4, e evita deixar dinheiro na mesa cobrando preço de
 * Tier 3 de usuários de Tier 1). O plano mensal do Brasil (tier3, mercado
 * padrão/maior base de usuários hoje) mantém os valores já praticados no
 * app (R$19,90 / R$149,90) — os demais tiers foram calibrados em torno
 * desse valor-base, mantendo o mesmo desconto anual (~37%).
 */
export function getRegionalPricing(tier: AdTier): RegionalPricing {
  switch (tier) {
    case 'tier1':
      return {
        currencyLabel: '$',
        monthlyPrice: '$9.99',
        annualTotalPrice: '$74.99',
        annualMonthlyEquivalent: '$6.25',
        annualDiscountPercent: 37,
      };
    case 'tier2':
      return {
        currencyLabel: '€',
        monthlyPrice: '€7.99',
        annualTotalPrice: '€59.99',
        annualMonthlyEquivalent: '€5.00',
        annualDiscountPercent: 37,
      };
    case 'tier3':
      return {
        currencyLabel: 'R$',
        monthlyPrice: 'R$ 19,90',
        annualTotalPrice: 'R$ 149,90',
        annualMonthlyEquivalent: 'R$ 12,49',
        annualDiscountPercent: 37,
      };
    default: // tier4 — mercados de volume/menor poder aquisitivo médio
      return {
        currencyLabel: 'R$',
        monthlyPrice: 'R$ 14,90',
        annualTotalPrice: 'R$ 99,90',
        annualMonthlyEquivalent: 'R$ 8,33',
        annualDiscountPercent: 44,
      };
  }
}
