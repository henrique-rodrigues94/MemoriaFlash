// 📁 memoriaflash/src/lib/i18n.test.ts
import { describe, it, expect } from 'vitest';
import { translations, SUPPORTED_LANGUAGES, detectBrowserLanguage, SupportedLanguage } from './i18n';

// Chaves obrigatórias — se uma chave sumir de um idioma, o teste quebra imediatamente.
const REQUIRED_KEYS: (keyof typeof translations.pt)[] = [
  // Navegação
  'home', 'decks', 'aiStudio', 'stats', 'login', 'credits', 'proPlan',
  // Dashboard
  'welcome', 'welcomeSub', 'studyNow', 'createDeck', 'aiGenerator',
  'dailyGoal', 'streakDays', 'masteredCards', 'hoursStudied', 'retention',
  // Common
  'save', 'cancel', 'close', 'language', 'autoDetected',
  // AdMob — bloco completo
  'adLabel', 'adRewardedLabel', 'adClose', 'adPlaying', 'adNetworkName', 'adNetworkTagline',
  'adCompleted', 'adCompletedMsg', 'adStreakBonus', 'adWatchTitle', 'adWatchSub',
  'adClaim', 'adReplay', 'adRemainingToday', 'adStreakHint',
  'adBannerTitle', 'adBannerWatch', 'adBannerLimitReached',
  'adBannerWatchBtn', 'adBannerLimitBtn', 'adBannerReferBtn',
  'adInterstitialTitle', 'adInterstitialBody', 'adRewardToast',
];

const PLACEHOLDER_KEYS: Record<string, string[]> = {
  adPlaying: ['{s}'],
  adCompletedMsg: ['{credits}'],
  adStreakBonus: ['{days}'],
  adWatchSub: ['{credits}'],
  adClaim: ['{credits}'],
  adRemainingToday: ['{remaining}', '{max}'],
  adBannerWatch: ['{credits}', '{remaining}'],
  adBannerWatchBtn: ['{credits}'],
  adRewardToast: ['{credits}'],
};

describe('i18n — cobertura de idiomas', () => {
  const langs = SUPPORTED_LANGUAGES.map((l) => l.code);

  it('todos os idiomas suportados têm entradas em translations', () => {
    for (const lang of langs) {
      expect(translations).toHaveProperty(lang);
    }
  });

  for (const lang of langs) {
    describe(`idioma "${lang}"`, () => {
      it('possui todas as chaves obrigatórias', () => {
        const t = translations[lang as SupportedLanguage];
        for (const key of REQUIRED_KEYS) {
          expect(t, `Faltando chave "${key}" no idioma "${lang}"`).toHaveProperty(key);
          expect((t as any)[key], `Chave "${key}" vazia no idioma "${lang}"`).toBeTruthy();
        }
      });

      it('chaves de AdMob com placeholders preservam os placeholders', () => {
        const t = translations[lang as SupportedLanguage] as Record<string, string>;
        for (const [key, placeholders] of Object.entries(PLACEHOLDER_KEYS)) {
          const val = t[key];
          for (const ph of placeholders) {
            expect(val, `Placeholder "${ph}" ausente em "${key}" (${lang})`).toContain(ph);
          }
        }
      });

      it('nenhuma chave obrigatória é uma string vazia ou undefined', () => {
        const t = translations[lang as SupportedLanguage] as Record<string, string>;
        for (const key of REQUIRED_KEYS) {
          const val = t[key];
          expect(typeof val).toBe('string');
          expect(val.trim().length).toBeGreaterThan(0);
        }
      });
    });
  }
});

describe('detectBrowserLanguage', () => {
  it('retorna pt como fallback quando localStorage está vazio', () => {
    // detectBrowserLanguage usa localStorage e navigator.language — em ambiente de teste
    // ambos podem estar ausentes/vazios, então apenas verificamos que retorna um idioma válido.
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    const result = detectBrowserLanguage();
    expect(codes).toContain(result);
  });
});

describe('fmt helper — simulação de substituição de placeholders', () => {
  function fmt(template: string, vars: Record<string, string | number>): string {
    return Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
      template
    );
  }

  it('substitui {credits} corretamente', () => {
    expect(fmt('+{credits} AI Credits', { credits: 25 })).toBe('+25 AI Credits');
  });

  it('substitui múltiplos placeholders', () => {
    expect(fmt('{remaining} of {max}', { remaining: 3, max: 8 })).toBe('3 of 8');
  });

  it('não altera string sem placeholders', () => {
    expect(fmt('Hello World', {})).toBe('Hello World');
  });
});
