import {
  StudyPlan,
  StudyPlanGoal,
  StudyPlanSubject,
  StudyPlanSessionSlot,
  StudyPlanSession,
  StudyPlanReview,
  StudyPlanDailyActivity,
  Deck,
} from '../types';
import { todayKey } from './economy/economyConstants';

// ============================================================================
// Plano de Estudos — persistência + scheduler inteligente local.
// ----------------------------------------------------------------------------
// Guarda o plano em localStorage (chave `flashmind_study_plan_v1`) e monta o
// cronograma semanal distribuindo os slots pelas matérias de acordo com o
// peso/prioridade. A IA (via API) pode depois reajustar o plano, mas a base
// funciona 100% offline com regras simples e previsíveis.
// ============================================================================

const STORAGE_KEY = 'flashmind_study_plan_v1';

export function getStoredStudyPlan(): StudyPlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStudyPlan(plan: StudyPlan): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...plan, updatedAt: new Date().toISOString() }));
  } catch (e) {
    console.error('Failed to save study plan', e);
  }
}

export function clearStudyPlan(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ─── Helpers de data ─────────────────────────────────────────────────────────

export const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAY_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

/** Dia da semana (0=domingo…6=sábado) de uma data YYYY-MM-DD. */
export function weekdayOf(dateKey: string): number {
  return new Date(dateKey + 'T12:00:00').getDay();
}

/** Adiciona `days` dias a uma data YYYY-MM-DD e devolve YYYY-MM-DD. */
export function addDays(dateKey: string, days: number): string {
  const d = new Date(dateKey + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

// ─── Criação do plano ────────────────────────────────────────────────────────

interface NewPlanInput {
  goal: StudyPlanGoal;
  dailyTimeMin: number;
  activeWeekdays: number[];
  slots: StudyPlanSessionSlot[];
  subjects: StudyPlanSubject[];
}

export function createStudyPlan(input: NewPlanInput): StudyPlan {
  const now = new Date().toISOString();
  const sessions = buildWeeklySchedule(input.subjects, input.slots);
  return {
    id: `plan-${Date.now()}`,
    goal: input.goal,
    dailyTimeMin: input.dailyTimeMin,
    activeWeekdays: input.activeWeekdays,
    slots: input.slots,
    subjects: input.subjects,
    sessions,
    reviews: [],
    activity: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Scheduler: distribui matérias pelos slots com base no peso ──────────────

/**
 * Monta o cronograma semanal concreto. Para cada slot (dia+horário), escolhe a
 * matéria que "deve" receber mais tempo segundo a prioridade acumulada e
 * reserva uma fração do slot proporcional ao peso. A última fração vira
 * revisão (SRS).
 */
export function buildWeeklySchedule(
  subjects: StudyPlanSubject[],
  slots: StudyPlanSessionSlot[]
): StudyPlanSession[] {
  if (subjects.length === 0 || slots.length === 0) return [];

  const totalPriority = subjects.reduce((s, subj) => s + subj.priority, 0) || 1;
  const sessions: StudyPlanSession[] = [];

  slots.forEach((slot, slotIdx) => {
    // Determina quantos blocos cabem no slot (mín. 15 min por bloco).
    const blockMin = 15;
    const maxBlocks = Math.max(1, Math.floor(slot.durationMin / blockMin));
    const subjectCount = Math.min(subjects.length, maxBlocks - 1); // deixa 1 bloco p/ revisão
    const subjectBlocks = Math.max(1, subjectCount);
    const reviewBlocks = 1;

    // Distribui os blocos de matéria proporcionalmente aos pesos.
    const byPriority = [...subjects].sort((a, b) => b.priority - a.priority);
    const chosen: StudyPlanSubject[] = [];
    for (let i = 0; i < subjectBlocks; i++) {
      chosen.push(byPriority[(slotIdx + i) % byPriority.length]);
    }

    const totalBlocks = subjectBlocks + reviewBlocks;
    const perBlock = Math.floor(slot.durationMin / totalBlocks);

    chosen.forEach((subj) => {
      sessions.push({
        id: `session-${slot.id}-${subj.id}`,
        subjectId: subj.id,
        objective: `Estudar ${subj.name}`,
        plannedMin: perBlock,
        spentMin: 0,
        cardsReviewed: 0,
        questionsAnswered: 0,
        notes: '',
        status: 'scheduled',
      });
    });

    // Bloco de revisão (SRS) — distribui entre matérias com cards atrasados.
    sessions.push({
      id: `session-${slot.id}-review`,
      subjectId: 'review',
      objective: 'Revisão espaçada (SRS)',
      plannedMin: slot.durationMin - perBlock * subjectBlocks,
      spentMin: 0,
      cardsReviewed: 0,
      questionsAnswered: 0,
      notes: '',
      status: 'scheduled',
    });
  });

  return sessions;
}

// ─── Sessões de HOJE ─────────────────────────────────────────────────────────

export function getTodaySessions(plan: StudyPlan): StudyPlanSession[] {
  return getSessionsForDate(plan, todayKey());
}

/** Sessões de um dia específico (pela chave YYYY-MM-DD). */
export function getSessionsForDate(plan: StudyPlan, dateKey: string): StudyPlanSession[] {
  const wd = weekdayOf(dateKey);
  const datePrefix = dateKey;
  return plan.sessions.filter((s) => {
    // A sessão pertence ao dia se o dia da semana do slot casa com wd.
    const slot = plan.slots.find((sl) => s.id.includes(`session-${sl.id}-`));
    if (!slot) return false;
    return slot.weekday === wd;
  });
}

/** Marca uma sessão como concluída e registra a atividade do dia. */
export function completeSession(
  plan: StudyPlan,
  sessionId: string,
  data: { spentMin?: number; cardsReviewed?: number; questionsAnswered?: number; notes?: string }
): StudyPlan {
  const sessions = plan.sessions.map((s) =>
    s.id === sessionId
      ? {
          ...s,
          status: 'done' as const,
          completedDate: todayKey(),
          spentMin: data.spentMin ?? s.plannedMin,
          cardsReviewed: data.cardsReviewed ?? s.cardsReviewed,
          questionsAnswered: data.questionsAnswered ?? s.questionsAnswered,
          notes: data.notes ?? s.notes,
        }
      : s
  );

  const session = sessions.find((s) => s.id === sessionId);
  const activity = upsertTodayActivity(plan.activity, {
    status: 'done',
    minutesStudied: session?.spentMin ?? 0,
    sessionsCompleted: 1,
    cardsReviewed: session?.cardsReviewed ?? 0,
    questionsAnswered: session?.questionsAnswered ?? 0,
  });

  return { ...plan, sessions, activity, updatedAt: new Date().toISOString() };
}

// ─── Revisões (SRS) ─────────────────────────────────────────────────────────

/** Revisões pendentes para hoje (ou para uma data). */
export function getDueReviews(plan: StudyPlan, dateKey: string = todayKey()): StudyPlanReview[] {
  return plan.reviews.filter((r) => !r.completed && r.dueDate <= dateKey);
}

export function completeReview(plan: StudyPlan, reviewId: string): StudyPlan {
  const reviews = plan.reviews.map((r) =>
    r.id === reviewId ? { ...r, completed: true, completedDate: todayKey() } : r
  );
  const activity = upsertTodayActivity(plan.activity, { status: 'done', reviewsCompleted: 1 });
  return { ...plan, reviews, activity, updatedAt: new Date().toISOString() };
}

/** Agenda uma revisão de uma matéria para daqui a `inDays` dias. */
export function scheduleReview(
  plan: StudyPlan,
  subjectId: string,
  cardCount: number,
  inDays: number,
  deckId?: string
): StudyPlan {
  const review: StudyPlanReview = {
    id: `review-${Date.now()}`,
    subjectId,
    deckId,
    dueDate: addDays(todayKey(), inDays),
    cardCount,
    completed: false,
  };
  return { ...plan, reviews: [...plan.reviews, review], updatedAt: new Date().toISOString() };
}

// ─── Atividade diária (calendário) ───────────────────────────────────────────

function upsertTodayActivity(
  activity: StudyPlanDailyActivity[],
  patch: Partial<StudyPlanDailyActivity> & { status: 'done' | 'partial' | 'missed' }
): StudyPlanDailyActivity[] {
  const key = todayKey();
  const existing = activity.find((a) => a.dateKey === key);
  if (existing) {
    return activity.map((a) =>
      a.dateKey === key ? { ...a, ...patch, minutesStudied: a.minutesStudied + (patch.minutesStudied ?? 0) } : a
    );
  }
  return [
    ...activity,
    {
      dateKey: key,
      status: patch.status,
      minutesStudied: patch.minutesStudied ?? 0,
      sessionsCompleted: patch.sessionsCompleted ?? 0,
      reviewsCompleted: patch.reviewsCompleted ?? 0,
      cardsReviewed: patch.cardsReviewed ?? 0,
      questionsAnswered: patch.questionsAnswered ?? 0,
    },
  ];
}

// ─── Estatísticas do dashboard ───────────────────────────────────────────────

export interface PlanStats {
  todayMinutes: number;
  todayGoalMinutes: number;
  weekMinutes: number;
  weekSessions: number;
  weekReviews: number;
  monthMinutes: number;
  monthCards: number;
  monthQuestions: number;
  monthSessions: number;
}

export function computePlanStats(plan: StudyPlan, dateKey: string = todayKey()): PlanStats {
  const weekStart = addDays(dateKey, -6);
  const monthStart = dateKey.slice(0, 8) + '01';

  const activity = plan.activity.filter((a) => a.dateKey <= dateKey);

  const inRange = (a: StudyPlanDailyActivity, start: string) => a.dateKey >= start && a.dateKey <= dateKey;

  const week = activity.filter((a) => inRange(a, weekStart));
  const month = activity.filter((a) => inRange(a, monthStart));
  const today = activity.find((a) => a.dateKey === dateKey);

  return {
    todayMinutes: today?.minutesStudied ?? 0,
    todayGoalMinutes: plan.dailyTimeMin,
    weekMinutes: week.reduce((s, a) => s + a.minutesStudied, 0),
    weekSessions: week.reduce((s, a) => s + a.sessionsCompleted, 0),
    weekReviews: week.reduce((s, a) => s + a.reviewsCompleted, 0),
    monthMinutes: month.reduce((s, a) => s + a.minutesStudied, 0),
    monthCards: month.reduce((s, a) => s + a.cardsReviewed, 0),
    monthQuestions: month.reduce((s, a) => s + a.questionsAnswered, 0),
    monthSessions: month.reduce((s, a) => s + a.sessionsCompleted, 0),
  };
}

/** Aproveitamento médio por matéria (últimos 7 dias) — base para a IA recomendar. */
export function computeSubjectPerformance(
  plan: StudyPlan,
  decks: Deck[],
  dateKey: string = todayKey()
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const subj of plan.subjects) {
    const deck = decks.find((d) => subj.deckIds?.includes(d.id));
    if (deck && deck.cards.length > 0) {
      const mastered = deck.cards.filter((c) => c.reps >= 3).length;
      map[subj.id] = Math.round((mastered / deck.cards.length) * 100);
    } else {
      map[subj.id] = 0;
    }
  }
  return map;
}

/** Recomendação simples de revisão (baseada em cards atrasados dos decks). */
export function buildRecommendations(plan: StudyPlan, decks: Deck[]): { subjectName: string; reason: string }[] {
  const recs: { subjectName: string; reason: string }[] = [];
  const due = getDueReviews(plan);
  for (const subj of plan.subjects) {
    const deck = decks.find((d) => subj.deckIds?.includes(d.id));
    if (!deck) continue;
    const dueCards = deck.cards.filter((c) => {
      if (!c.dueDate) return true;
      return new Date(c.dueDate) <= new Date();
    }).length;
    if (dueCards > 0) {
      recs.push({
        subjectName: subj.name,
        reason: `${dueCards} card(s) para revisar (repetição espaçada).`,
      });
    }
  }
  for (const r of due) {
    const subj = plan.subjects.find((s) => s.id === r.subjectId);
    recs.push({
      subjectName: subj?.name ?? 'Revisão',
      reason: `Última revisão pendente há mais de 1 dia.`,
    });
  }
  return recs.slice(0, 5);
}
