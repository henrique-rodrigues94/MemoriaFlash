export type RatingGrade = 'hard' | 'good' | 'easy';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
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

export interface UserStats {
  name: string;
  avatar: string;
  streakDays: number;
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

  // --- Economia de créditos por anúncio (AdMob rewarded) ---
  /** Últimos timestamps (epoch ms) em que um vídeo recompensado foi assistido (usado para o limite diário). */
  adWatchTimestamps?: number[];
  /** Dias consecutivos assistindo pelo menos 1 anúncio (streak de recompensa crescente). */
  adWatchStreakDays?: number;
  /** Data (YYYY-MM-DD, fuso local) do último anúncio assistido — usado para calcular o streak. */
  lastAdWatchDay?: string;
  /** Timestamps dos intersticiais mostrados hoje (frequency capping anti-banimento). */
  interstitialTimestamps?: number[];
  /** Data (YYYY-MM-DD) do último crédito diário gratuito concedido. */
  lastDailyGrantDay?: string;

  // --- Programa de indicação (referral) ---
  /** Código de indicação único deste usuário (gerado a partir do uid). */
  referralCode?: string;
  /** Código de quem indicou este usuário (se aplicável). */
  referredByCode?: string;
  /** Quantidade de amigos indicados que já foram recompensados. */
  referralCount?: number;
  /** Total de créditos ganhos via indicação. */
  referralCreditsEarned?: number;
}

export interface VoiceSettings {
  wakeWordEnabled: boolean;
  voicePersona: 'female' | 'male' | 'neutral' | 'custom';
  selectedVoiceURI?: string;
  speechSpeed: number; // e.g., 0.5 to 2.0
  speechPitch?: number; // e.g., 0.5 to 1.5
  language: string;    // 'pt' | 'en' | 'es' | 'fr' | 'de'
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
  errorFrequency: number; // e.g. 42%
  avgResponseTimeSec: number; // e.g. 8.4s
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

export type ActiveTab = 'home' | 'explore' | 'create' | 'stats' | 'profile' | 'voice' | 'duel' | 'teacher';
