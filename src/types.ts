// src/types.ts
export type RatingGrade = 'hard' | 'good' | 'easy';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
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
  aiCredits: number;
  isPro?: boolean;
  proPlanType?: 'monthly' | 'annual';
  lastStudyDateKey?: string;
  activityLog?: DailyActivity[];
  adWatchTimestamps?: number[];
  adWatchStreakDays?: number;
  lastAdWatchDay?: string;
  interstitialTimestamps?: number[];
  lastDailyGrantDay?: string;
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

// Remove 'duel' and 'profile' (profile não é usado) – ajuste conforme necessário
export type ActiveTab = 'home' | 'explore' | 'create' | 'stats' | 'voice' | 'teacher';
// Nota: 'explore' já foi removido do BottomNav, mas mantido no tipo para compatibilidade; você pode removê-lo se quiser.
// Se não houver mais referência a 'explore' em lugar nenhum, pode removê-lo também.