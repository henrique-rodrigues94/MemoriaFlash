import { Deck, UserStats, VoiceSettings, VoiceHistoryItem, TeacherClass } from '../types';

const STORAGE_KEYS = {
  DECKS: 'flashmind_decks_v2',
  STATS: 'flashmind_stats_v2',
  VOICE_SETTINGS: 'flashmind_voice_settings_v2',
  VOICE_HISTORY: 'flashmind_voice_history_v2',
  CLASSES: 'flashmind_classes_v2',
  ONBOARDING_DONE: 'flashmind_onboarding_completed',
  DEMO_REMOVED: 'flashmind_demo_removed_v1',
  LAST_STUDIED_DECK_ID: 'flashmind_last_studied_deck_id',
  LAST_STUDIED_AT: 'flashmind_last_studied_at',
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

const INITIAL_VOICE_SETTINGS: VoiceSettings = {
  wakeWordEnabled: true,
  voicePersona: 'female',
  speechSpeed: 1.2,
  speechPitch: 1.0,
  language: 'pt',
  sensitivityEnabled: true,
  onDevicePrivacy: false,
};

const INITIAL_VOICE_HISTORY: VoiceHistoryItem[] = [];

const INITIAL_CLASSES: TeacherClass[] = [];

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

export function getVoiceSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VOICE_SETTINGS);
    if (!raw) return INITIAL_VOICE_SETTINGS;
    return JSON.parse(raw);
  } catch {
    return INITIAL_VOICE_SETTINGS;
  }
}

export function saveVoiceSettings(settings: VoiceSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.VOICE_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save voice settings', e);
  }
}

export function getVoiceHistory(): VoiceHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VOICE_HISTORY);
    if (!raw) return INITIAL_VOICE_HISTORY;
    return JSON.parse(raw);
  } catch {
    return INITIAL_VOICE_HISTORY;
  }
}

export function saveVoiceHistory(history: VoiceHistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.VOICE_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save voice history', e);
  }
}

export function getStoredClasses(): TeacherClass[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLASSES);
    if (!raw) return INITIAL_CLASSES;
    return JSON.parse(raw);
  } catch {
    return INITIAL_CLASSES;
  }
}

export function saveStoredClasses(classes: TeacherClass[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
  } catch (e) {
    console.error('Failed to save classes', e);
  }
}

export function isOnboardingDone(): boolean {
  return localStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE) === 'true';
}

export function setOnboardingDone(done: boolean): void {
  localStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, done ? 'true' : 'false');
}

/** Retorna o id do último baralho estudado (ou null se nunca estudou). */
export function getLastStudiedDeckId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_STUDIED_DECK_ID);
  } catch {
    return null;
  }
}

/** Salva o id do baralho que acabou de ser estudado (para "Continuar de onde parou"). */
export function saveLastStudiedDeck(deckId: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_STUDIED_DECK_ID, deckId);
    localStorage.setItem(STORAGE_KEYS.LAST_STUDIED_AT, new Date().toISOString());
  } catch (e) {
    console.error('Failed to save last studied deck', e);
  }
}

/** Retorna o timestamp (ISO) do último estudo, ou null. */
export function getLastStudiedAt(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_STUDIED_AT);
  } catch {
    return null;
  }
}
