export type RatingGrade = 'hard' | 'good' | 'easy';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic?: string;
  subject?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  explanation?: string;
  curiosity?: string;
  reps: number;
  interval: number;
  efactor: number;
  dueDate: string;
  lastReviewed?: string;
}

export interface Deck {
  id: string;
  title: string;
  category: string;
  description: string;
  cards: Flashcard[];
  color: string;
  accentBorder: string;
  iconName?: string;
  isPublic?: boolean;
  createdAt?: string;
}

export interface DailyActivity {
  dateKey: string;
  cardsReviewed: number;
  xpEarned: number;
  minutesStudied: number;
}

export interface UserStats {
  name: string;
  avatar: string;
  streakDays: number;
  bestStreakDays?: number;
  dailyGoalTotal: number;
  dailyGoalCompleted: number;
  totalCardsMastered: number;
  timeStudiedHours: number;
  retentionRate: number;
  xp: number;
  globalRank: number;
  /** Quantidade total de cards gerados por IA. O backend controla este campo. */
  aiCardsGenerated?: number;
  isPro?: boolean;
  proPlanType?: 'monthly' | 'annual';
  proExpiryDate?: string;
  playPurchaseToken?: string;
  playProductId?: string;
  billingLastVerifiedAt?: string;
  lastStudyDateKey?: string;
  activityLog?: DailyActivity[];

  // Programa de indicação (mantido separado da geração de cards).
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