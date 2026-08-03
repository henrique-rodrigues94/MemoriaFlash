export type RatingGrade = 'hard' | 'good' | 'easy';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic?: string;
  subject?: string;       // Matéria/assunto principal do deck
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  explanation?: string;   // Detailed explanation with practical example
  curiosity?: string;     // Interesting curiosity/fun fact about the topic
  reps: number;           // Repetition count in SM-2
  interval: number;       // Days until next review
  efactor: number;        // Easiness factor (default 2.5)
  dueDate: string;        // ISO Date string
  lastReviewed?: string;  // ISO Date string
}

export interface Deck {
  id: string;
  title: string;
  category: string;
  description: string;
  cards: Flashcard[];
  color: string; // TailWind color key or hex accent
  accentBorder: string;
  iconName?: string;
  isPublic?: boolean;
  createdAt?: string;     // ISO Date string
}

/** Registro de atividade de um único dia — usado no heatmap e estatísticas semanais. */
export interface DailyActivity {
  /** Chave do dia no formato YYYY-MM-DD (fuso local). */
  dateKey: string;
  /** Quantidade de cartões revisados naquele dia. */
  cardsReviewed: number;
  /** XP ganho naquele dia. */
  xpEarned: number;
  /** Minutos de estudo naquele dia (arredondado). */
  minutesStudied: number;
}

export interface UserStats {
  name: string;
  avatar: string;
  streakDays: number;
  /** Maior streak já alcançado — persiste mesmo após quebrar a ofensiva. */
  bestStreakDays?: number;
  dailyGoalTotal: number;
  dailyGoalCompleted: number;
  totalCardsMastered: number;
  timeStudiedHours: number;
  retentionRate: number;
  xp: number;
  globalRank: number;
  aiCredits: number;
  isPro?: boolean;
  proPlanType?: 'monthly' | 'annual';

  /** Data (YYYY-MM-DD, fuso local) da última sessão de estudo concluída — usada para calcular streakDays corretamente. */
  lastStudyDateKey?: string;

  /** Histórico de atividade diária (máx. 90 dias) — base para heatmap e XP semanal. */
  activityLog?: DailyActivity[];

  // --- Economia de créditos por anúncio (AdMob rewarded) ---
  adWatchTimestamps?: number[];
  adWatchStreakDays?: number;
  lastAdWatchDay?: string;
  interstitialTimestamps?: number[];
  lastDailyGrantDay?: string;

  // --- Programa de indicação (referral) ---
  referralCode?: string;
  referredByCode?: string;
  referralCount?: number;
  referralCreditsEarned?: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type ActiveTab = 'home' | 'explore' | 'quiz' | 'scanner' | 'cards' | 'stats' | 'profile' | 'create';