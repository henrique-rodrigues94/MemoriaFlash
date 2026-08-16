export type RatingGrade = 'hard' | 'good' | 'easy';

export interface Flashcard {
  id: string; front: string; back: string; topic?: string; subject?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert'; explanation?: string; curiosity?: string;
  reps: number; interval: number; efactor: number; dueDate: string; lastReviewed?: string;
}

export interface Deck {
  id: string; title: string; category: string; description: string; cards: Flashcard[];
  color: string; accentBorder: string; iconName?: string; isPublic?: boolean; createdAt?: string;
}

export interface DailyActivity { dateKey: string; cardsReviewed: number; xpEarned: number; minutesStudied: number; }

export interface UserStats {
  name: string; avatar: string; streakDays: number; bestStreakDays?: number;
  dailyGoalTotal: number; dailyGoalCompleted: number; totalCardsMastered: number;
  timeStudiedHours: number; retentionRate: number; xp: number; globalRank: number;
  // Histórico acumulado (não limita mais a geração gratuita).
  aiCardsGenerated?: number;
  // Cota gratuita atual: 200 cards por dia. Fonte de verdade: backend.
  aiCardsGeneratedToday?: number;
  aiCardsGenerationDay?: string;
  aiCardsDailyLimit?: number;
  aiCardsDailyResetTimeZone?: string;
  aiCardsGeneratedLastUpdatedAt?: string;
  isPro?: boolean; proPlanType?: 'monthly' | 'annual' | 'referral'; proExpiryDate?: string;
  playPurchaseToken?: string; playProductId?: string; billingLastVerifiedAt?: string;
  lastStudyDateKey?: string; activityLog?: DailyActivity[];
  interstitialTimestamps?: number[];

  // Campos legados de dados antigos. A interface atual não exibe nem utiliza
  // créditos como moeda do aplicativo.
  aiCredits?: number;
  adWatchTimestamps?: number[];
  adWatchStreakDays?: number;
  lastAdWatchDay?: string;
  lastDailyGrantDay?: string;

  referralCode?: string; referredByCode?: string; referralCount?: number;
  referralProDaysEarned?: number;
}

export interface QuizQuestion { question: string; options: string[]; correctIndex: number; explanation: string; }
export type ActiveTab = 'home' | 'explore' | 'quiz' | 'scanner' | 'cards' | 'stats' | 'profile' | 'create';
