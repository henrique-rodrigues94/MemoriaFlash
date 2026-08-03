import { Deck, UserStats } from '../types';

const STORAGE_KEYS = {
  DECKS: 'flashmind_decks_v2',
  STATS: 'flashmind_stats_v2',
  ONBOARDING_DONE: 'flashmind_onboarding_completed',
  DEMO_REMOVED: 'flashmind_demo_removed_v1',
};

// IDs dos decks de demonstração que devem ser removidos na migração
const DEMO_DECK_IDS = new Set([
  'deck-law-basics',
  'deck-medical-terms',
  'deck-ux-design',
  'deck-organic-chem',
]);

/** Remove os decks de demonstração do localStorage se ainda estiverem presentes. */
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
  } catch {
    /* silencia erros de parse */
  }
}

// Executa a migração uma vez ao carregar o módulo
removeDemoDecksIfNeeded();

const INITIAL_DECKS: Deck[] = [];

const INITIAL_STATS: UserStats = {
  name: 'Estudante MemoriaFlash',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  streakDays: 1,
  dailyGoalTotal: 20,
  dailyGoalCompleted: 0,
  totalCardsMastered: 0,
  timeStudiedHours: 0,
  retentionRate: 100,
  xp: 0,
  globalRank: 1,
  aiCredits: 15,
  isPro: false,
};

export function getStoredDecks(): Deck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DECKS);
    if (!raw) return INITIAL_DECKS;
    return JSON.parse(raw);
  } catch {
    return INITIAL_DECKS;
  }
}

export function saveStoredDecks(decks: Deck[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(decks));
  } catch (e) {
    console.error('Failed to save decks', e);
  }
}

export function getStoredStats(): UserStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) return INITIAL_STATS;
    const parsed = JSON.parse(raw);
    if (parsed.aiCredits === undefined) {
      parsed.aiCredits = 15;
    }
    return parsed;
  } catch {
    return INITIAL_STATS;
  }
}

export function saveStoredStats(stats: UserStats): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats', e);
  }
}

export function isOnboardingDone(): boolean {
  return localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE) === 'true';
}

export function setOnboardingDone(done: boolean): void {
  localStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, done ? 'true' : 'false');
}

export function saveLastStudiedDeck(deckId: string): void {
  try {
    localStorage.setItem('flashmind_last_studied_deck', deckId);
  } catch { /* ignore */ }
}

export function getLastStudiedDeck(): string | null {
  return localStorage.getItem('flashmind_last_studied_deck');
}
