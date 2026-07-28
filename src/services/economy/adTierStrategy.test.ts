import { describe, it, expect } from 'vitest';
import { detectAdTier, shouldPrioritizeRewardedVideo, getRegionalPricing } from './adTierStrategy';

describe('detectAdTier', () => {
  it('classifica mercados de eCPM alto como tier1', () => {
    expect(detectAdTier('en-US')).toBe('tier1');
    expect(detectAdTier('de-DE')).toBe('tier1');
    expect(detectAdTier('ja')).toBe('tier1');
  });

  it('classifica mercados intermediários como tier2', () => {
    expect(detectAdTier('fr-FR')).toBe('tier2');
    expect(detectAdTier('it')).toBe('tier2');
  });

  it('classifica o Brasil como tier3', () => {
    expect(detectAdTier('pt-BR')).toBe('tier3');
  });

  it('cai em tier4 (volume) para locales não mapeados', () => {
    expect(detectAdTier('hi-IN')).toBe('tier4');
    expect(detectAdTier('xx-ZZ')).toBe('tier4');
  });

  it('é case-insensitive', () => {
    expect(detectAdTier('PT-br')).toBe('tier3');
  });
});

describe('shouldPrioritizeRewardedVideo', () => {
  it('prioriza vídeo recompensado em tiers de eCPM alto (1 e 2)', () => {
    expect(shouldPrioritizeRewardedVideo('tier1')).toBe(true);
    expect(shouldPrioritizeRewardedVideo('tier2')).toBe(true);
  });

  it('prioriza intersticial (volume) em tiers de eCPM baixo (3 e 4)', () => {
    expect(shouldPrioritizeRewardedVideo('tier3')).toBe(false);
    expect(shouldPrioritizeRewardedVideo('tier4')).toBe(false);
  });
});

describe('getRegionalPricing', () => {
  it('cada tier tem um preço mensal e anual definidos e coerentes entre si', () => {
    (['tier1', 'tier2', 'tier3', 'tier4'] as const).forEach((tier) => {
      const pricing = getRegionalPricing(tier);
      expect(pricing.monthlyPrice).toBeTruthy();
      expect(pricing.annualTotalPrice).toBeTruthy();
      expect(pricing.annualMonthlyEquivalent).toBeTruthy();
      expect(pricing.annualDiscountPercent).toBeGreaterThan(0);
    });
  });

  it('tier1 usa dólar e tier3 (Brasil) usa real', () => {
    expect(getRegionalPricing('tier1').currencyLabel).toBe('$');
    expect(getRegionalPricing('tier3').currencyLabel).toBe('R$');
  });
});
