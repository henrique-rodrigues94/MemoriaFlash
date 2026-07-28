import { Deck, UserStats, VoiceSettings, VoiceHistoryItem, TeacherClass } from '../types';

const STORAGE_KEYS = {
  DECKS: 'flashmind_decks_v2',
  STATS: 'flashmind_stats_v2',
  VOICE_SETTINGS: 'flashmind_voice_settings_v2',
  VOICE_HISTORY: 'flashmind_voice_history_v2',
  CLASSES: 'flashmind_classes_v2',
  ONBOARDING_DONE: 'flashmind_onboarding_completed',
};

const INITIAL_DECKS: Deck[] = [
  {
    id: 'deck-law-basics',
    title: 'Law Basics - Direito Constitucional',
    category: 'Direito & Legislação',
    description: 'Conceitos fundamentais de Direito Constitucional, remédios constitucionais e prazos processuais.',
    color: '#adc6ff',
    accentBorder: 'border-l-primary',
    cards: [
      {
        id: 'card-law-1',
        front: 'O que é o algoritmo SM-2 e como ele se aplica aos flashcards?',
        back: 'O SuperMemo-2 (SM-2) é um algoritmo de repetição espaçada que calcula o intervalo ideal para revisar cada cartão com base na facilidade e no histórico de acertos do estudante.',
        topic: 'Algoritmos SRS',
        difficulty: 'medium',
        reps: 1,
        interval: 1,
        efactor: 2.5,
        dueDate: new Date().toISOString(),
      },
      {
        id: 'card-law-2',
        front: 'O que é Habeas Corpus e qual a sua finalidade constitucional?',
        back: 'Garantia constitucional destinada a proteger a liberdade de locomoção contra violência, coação, ilegalidade ou abuso de poder.\n\n• Pode ser preventivo ou repressivo\n• Isento de custas processuais\n• Não exige advogado para impetração',
        topic: 'Remédios Constitucionais',
        difficulty: 'hard',
        reps: 0,
        interval: 0,
        efactor: 2.3,
        dueDate: new Date().toISOString(),
      },
      {
        id: 'card-law-3',
        front: 'Quais são os Princípios Fundamentais da República (Art. 1º da CF/88)?',
        back: 'SO-CI-DI-VA-PLU:\n1. Soberania\n2. Cidadania\n3. Dignidade da pessoa humana\n4. Valores sociais do trabalho e da livre iniciativa\n5. Pluralismo político',
        topic: 'Princípios Fundamentais',
        difficulty: 'easy',
        reps: 3,
        interval: 6,
        efactor: 2.6,
        dueDate: new Date().toISOString(),
      },
      {
        id: 'card-law-4',
        front: 'Diferencie Mandado de Segurança Individual de Coletivo.',
        back: 'O individual protege direito líquido e certo individual. O coletivo pode ser impetrado por partidos com representação no Congresso, entidades de classe ou sindicatos em favor de seus membros.',
        topic: 'Remédios Constitucionais',
        difficulty: 'medium',
        reps: 2,
        interval: 3,
        efactor: 2.4,
        dueDate: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'deck-medical-terms',
    title: 'Medical Terms & Anatomy',
    category: 'Medicina & Saúde',
    description: 'Terminologia médica essencial, anatomia, fisiologia e patologia clínica.',
    color: '#ffb786',
    accentBorder: 'border-l-tertiary',
    cards: [
      {
        id: 'card-med-1',
        front: 'Qual a diferença entre Isquemia e Infarto?',
        back: 'Isquemia é a redução temporária ou inadequação do fluxo sanguíneo a um tecido. Infarto é a necrose celular irreversível decorrente da falta prolongada de oxigenação.',
        topic: 'Patologia',
        difficulty: 'medium',
        reps: 4,
        interval: 12,
        efactor: 2.7,
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      },
      {
        id: 'card-med-2',
        front: 'Descreva a função do Nó Sinoatrial (Nó SA) no coração.',
        back: 'É o marca-passo natural do coração, responsável por gerar os impulsos elétricos primários que iniciam a contração atrial e ventricular em ritmo sinusal.',
        topic: 'Cardiologia',
        difficulty: 'easy',
        reps: 5,
        interval: 15,
        efactor: 2.8,
        dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
      },
    ],
  },
  {
    id: 'deck-ux-design',
    title: 'UX Design Principles',
    category: 'Design & Tecnologia',
    description: 'Heurísticas de Jakob Nielsen, Teoria da Carga Cognitiva e Design de Interação.',
    color: '#D8EFEF',
    accentBorder: 'border-l-soft-mint/60',
    cards: [
      {
        id: 'card-ux-1',
        front: 'O que dita a Lei de Fitts no Design de Interfaces?',
        back: 'O tempo necessário para alcançar um alvo é proporcional à distância até ele e inversamente proporcional ao seu tamanho.\n\n• Botões primários devem ser grandes e acessíveis\n• Cantos da tela possuem tempo de acesso zero',
        topic: 'Leis da UX',
        difficulty: 'medium',
        reps: 1,
        interval: 1,
        efactor: 2.5,
        dueDate: new Date().toISOString(),
      },
      {
        id: 'card-ux-2',
        front: 'Qual a 1ª Heurística de Nielsen?',
        back: 'Visibilidade do Status do Sistema: O sistema deve sempre manter os usuários informados sobre o que está acontecendo por meio de feedback apropriado em tempo razoável.',
        topic: 'Heurísticas',
        difficulty: 'easy',
        reps: 3,
        interval: 8,
        efactor: 2.6,
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      },
    ],
  },
  {
    id: 'deck-organic-chem',
    title: 'Organic Chemistry',
    category: 'Química & Biologia',
    description: 'Mecanismos de reação SN1 vs SN2, substituição nucleofílica e estereoquímica.',
    color: '#60a5fa',
    accentBorder: 'border-l-primary-container',
    cards: [
      {
        id: 'card-chem-1',
        front: 'Explique a diferença entre o mecanismo SN1 e SN2 em álcoois.',
        back: 'SN1 é monomolecular, ocorre em duas etapas com formação de carbocátion intermediário (favorecida por solventes próticos polares e substratos terciários).\nSN2 é bimolecular, ocorre em etapa única concertada com inversão de configuração (favorecida por substratos primários).',
        topic: 'Substituição Nucleofílica',
        difficulty: 'hard',
        reps: 0,
        interval: 0,
        efactor: 2.2,
        dueDate: new Date().toISOString(),
      },
    ],
  },
];

const INITIAL_STATS: UserStats = {
  name: 'Estudante FlashMind',
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
