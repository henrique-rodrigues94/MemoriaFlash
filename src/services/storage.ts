import { Deck, UserStats } from '../types';

const STORAGE_KEYS = {
  DECKS: 'flashmind_decks_v2',
  STATS: 'flashmind_stats_v2',
  ONBOARDING_DONE: 'flashmind_onboarding_v2_completed',
  DEMO_REMOVED: 'flashmind_demo_removed_v1',
  LAST_STUDIED_DECK: 'flashmind_last_studied_deck',
};

const DEMO_DECK_IDS = new Set(['deck-law-basics', 'deck-medical-terms', 'deck-ux-design', 'deck-organic-chem']);

function removeDemoDecksIfNeeded(): void {
  if (localStorage.getItem(STORAGE_KEYS.DEMO_REMOVED)) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DECKS);
    if (raw) {
      const decks: Deck[] = JSON.parse(raw);
      const filtered = decks.filter((d) => !DEMO_DECK_IDS.has(d.id));
      localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(filtered));
    }
    localStorage.setItem(STORAGE_KEYS.DEMO_REMOVED, '1');
  } catch { /* silencia erros de parse */ }
}

removeDemoDecksIfNeeded();
const INITIAL_DECKS: Deck[] = [];

const INITIAL_STATS: UserStats = {
  name: 'Estudante MemoriaFlash',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  streakDays: 1, dailyGoalTotal: 20, dailyGoalCompleted: 0, totalCardsMastered: 0,
  timeStudiedHours: 0, retentionRate: 100, xp: 0, globalRank: 1,
  aiCardsGenerated: 0, aiCardsGeneratedToday: 0, isPro: false,
};

function normalizeStoredStats(stats: UserStats): UserStats {
  const result = { ...stats };
  if (result.isPro === true) {
    const expiry = result.proExpiryDate ? Date.parse(result.proExpiryDate) : NaN;
    if (!Number.isFinite(expiry) || expiry <= Date.now()) {
      result.isPro = false;
      result.proPlanType = undefined;
      result.proExpiryDate = undefined;
    }
  }
  if (result.aiCardsGenerated === undefined) result.aiCardsGenerated = 0;
  if (result.aiCardsGeneratedToday === undefined) result.aiCardsGeneratedToday = 0;
  return result;
}

export function getStoredDecks(): Deck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DECKS);
    if (!raw) return INITIAL_DECKS;
    const decks = JSON.parse(raw);
    return Array.isArray(decks) ? decks : INITIAL_DECKS;
  } catch { return INITIAL_DECKS; }
}

export function saveStoredDecks(decks: Deck[]): void {
  try { localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(decks)); }
  catch (e) { console.error('Failed to save decks', e); }
}

export function getStoredStats(): UserStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) return INITIAL_STATS;
    const parsed = JSON.parse(raw) as UserStats;
    delete (parsed as any).aiCredits;
    return normalizeStoredStats(parsed);
  } catch { return INITIAL_STATS; }
}

export function saveStoredStats(stats: UserStats): void {
  try { localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(normalizeStoredStats(stats))); }
  catch (e) { console.error('Failed to save stats', e); }
}

export function clearStoredUserData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.DECKS);
    localStorage.removeItem(STORAGE_KEYS.STATS);
    localStorage.removeItem(STORAGE_KEYS.LAST_STUDIED_DECK);
    localStorage.removeItem(STORAGE_KEYS.ONBOARDING_DONE);
  } catch (e) {
    console.warn('[Storage] Não foi possível limpar todos os dados locais:', e);
  }
}

export function isOnboardingDone(): boolean {
  return localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE) === 'true';
}

export function setOnboardingDone(done: boolean): void {
  localStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, done ? 'true' : 'false');
}

export function saveLastStudiedDeck(deckId: string): void {
  try { localStorage.setItem(STORAGE_KEYS.LAST_STUDIED_DECK, deckId); }
  catch { /* ignore storage errors */ }
}

export function getLastStudiedDeck(): string | null {
  try { return localStorage.getItem(STORAGE_KEYS.LAST_STUDIED_DECK); }
  catch { return null; }
}
