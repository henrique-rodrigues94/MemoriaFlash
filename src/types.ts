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

// ─── Plano de Estudos (StudyPlan) ────────────────────────────────────────────

export type StudyGoalType = 'concurso' | 'faculdade' | 'enem';

export interface StudyPlanGoal {
  type: StudyGoalType;
  title: string;
  /** Detalhes específicos do objetivo (cargo/estado/banca/data da prova, etc.). */
  details: string;
  /** Data da prova/evento (YYYY-MM-DD), se houver. */
  examDate?: string;
}

export interface StudyPlanSubject {
  id: string;
  name: string;
  /** Peso/prioridade da matéria (0–100). A IA usa isso ao montar o cronograma. */
  priority: number;
  /** IDs dos decks associados (opcional — liga a matéria aos cards existentes). */
  deckIds?: string[];
}

export interface StudyPlanSessionSlot {
  id: string;
  /** Dia da semana: 0=domingo … 6=sábado */
  weekday: number;
  /** HH:mm (ex.: "08:00") */
  time: string;
  /** Minutos dedicados. */
  durationMin: number;
}

export interface StudyPlanSession {
  id: string;
  subjectId: string;
  deckId?: string;
  objective: string;
  /** Tempo previsto em minutos. */
  plannedMin: number;
  /** Tempo realizado em minutos. */
  spentMin: number;
  cardsReviewed: number;
  questionsAnswered: number;
  notes: string;
  /** Data (YYYY-MM-DD) em que a sessão foi realizada. */
  completedDate?: string;
  status: 'scheduled' | 'done' | 'skipped';
}

export interface StudyPlanReview {
  id: string;
  subjectId: string;
  deckId?: string;
  dueDate: string; // YYYY-MM-DD
  cardCount: number;
  completed: boolean;
  completedDate?: string;
}

export interface StudyPlanDailyActivity {
  dateKey: string; // YYYY-MM-DD
  status: 'done' | 'partial' | 'missed';
  minutesStudied: number;
  sessionsCompleted: number;
  reviewsCompleted: number;
  cardsReviewed: number;
  questionsAnswered: number;
}

export interface StudyPlan {
  id: string;
  goal: StudyPlanGoal;
  /** Minutos disponíveis por dia. */
  dailyTimeMin: number;
  /** Dias da semana ativos (0=domingo … 6=sábado). */
  activeWeekdays: number[];
  /** Horários de estudo (slots semanais). */
  slots: StudyPlanSessionSlot[];
  subjects: StudyPlanSubject[];
  /** Sessões realizadas/cronograma semanal concreto. */
  sessions: StudyPlanSession[];
  reviews: StudyPlanReview[];
  /** Atividade diária (histórico para calendário/estatísticas). */
  activity: StudyPlanDailyActivity[];
  createdAt: string;
  updatedAt: string;
}

export type ActiveTab = 'home' | 'explore' | 'quiz' | 'scanner' | 'cards' | 'stats' | 'profile' | 'create';