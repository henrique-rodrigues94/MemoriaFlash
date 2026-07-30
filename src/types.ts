export type RatingGrade = 'hard' | 'good' | 'easy';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic?: string;
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

export interface VoiceSettings {
  wakeWordEnabled: boolean;
  voicePersona: 'female' | 'male' | 'neutral' | 'custom';
  selectedVoiceURI?: string;
  speechSpeed: number;
  speechPitch?: number;
  language: string;
  sensitivityEnabled: boolean;
  onDevicePrivacy: boolean;
}

export interface VoiceHistoryItem {
  id: string;
  timestamp: string;
  userMessage: string;
  aiResponse: string;
  voicePersona: string;
  status: 'success' | 'warning' | 'error';
  suggestedCard?: {
    front: string;
    back: string;
  };
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DuelState {
  id: string;
  opponentName: string;
  opponentBadge: string;
  opponentAvatar: string;
  userPoints: number;
  opponentPoints: number;
  currentRound: number;
  totalRounds: number;
  isUserTurn: boolean;
  currentTurnName: string;
  questionIndex: number;
  questions: QuizQuestion[];
  timeLeft: number;
  status: 'lobby' | 'playing' | 'completed';
  winner?: 'user' | 'opponent' | 'tie';
  rewardXP: number;
  rewardCoins: number;
}

export interface WeaknessCategory {
  title: string;
  subCategory: string;
  errorFrequency: number;
  avgResponseTimeSec: number;
  severity: 'CRITICAL' | 'MODERATE' | 'LOW';
}

export interface RecoveryPlanDay {
  dayNumber: number;
  dayLabel: string;
  title: string;
  focusBadge: string;
  description: string;
  cardCount?: number;
}

export interface StudentProgress {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  masteryPercent: number;
  studyTimeFormatted: string;
  lastActive: string;
}

export interface TeacherClass {
  id: string;
  name: string;
  category: string;
  studentCount: number;
  averageMasteryPercent: number;
  bgImageUrl: string;
  code: string;
  students: StudentProgress[];
}

export type ActiveTab = 'home' | 'explore' | 'quiz' | 'create' | 'stats' | 'profile' | 'duel';