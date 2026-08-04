import { UserStats, DailyActivity } from '../types';
import { todayKey } from './economy/economyConstants';

/** Máximo de dias mantidos no histórico de atividade (usado pelo heatmap de 28 dias). */
const MAX_ACTIVITY_LOG_DAYS = 90;

// ============================================================================
// Rastreamento da sequência de estudo (streakDays).
// ----------------------------------------------------------------------------
// BUG CORRIGIDO: no código original, `streakDays` era inicializado com `1` e
// nunca mais era atualizado em lugar nenhum do app — ou seja, o número
// exibido no Dashboard e em StatsView era sempre o valor inicial (ou o que
// estivesse salvo de uma sessão antiga), nunca refletindo o uso real.
// Esta função aplica a mesma lógica de "streak por dia" já usada em
// `services/economy/creditsEngine.ts` para o streak de anúncios, agora para
// sessões de estudo — e também corrige `dailyGoalCompleted`, que antes
// acumulava para sempre em vez de resetar a cada novo dia.
// ============================================================================

/** Resumo mínimo de uma sessão de estudo necessário para atualizar as estatísticas. */
export interface StudySessionOutcome {
  /** Quantos cards foram avaliados como "hard" nesta sessão. */
  hardCount: number;
  /** Quantos cards foram avaliados como "good" ou "easy" nesta sessão. */
  correctCount: number;
  /** XP ganho nesta sessão. */
  xpEarned: number;
  /** Minutos estudados nesta sessão. */
  minutesStudied: number;
}

/**
 * Insere/atualiza a entrada de hoje no `activityLog`, somando aos valores já
 * registrados no dia (caso o usuário faça múltiplas sessões no mesmo dia) e
 * descartando entradas com mais de MAX_ACTIVITY_LOG_DAYS dias para não deixar
 * o documento crescer indefinidamente.
 */
function appendActivityLog(
  log: DailyActivity[] | undefined,
  today: string,
  cardsReviewed: number,
  xpEarned: number,
  minutesStudied: number
): DailyActivity[] {
  const existing = log || [];
  const cutoff = todayKey(new Date(Date.now() - MAX_ACTIVITY_LOG_DAYS * 24 * 60 * 60 * 1000));
  const pruned = existing.filter((d) => d.dateKey >= cutoff && d.dateKey !== today);

  const todayEntry = existing.find((d) => d.dateKey === today);
  const merged: DailyActivity = {
    dateKey: today,
    cardsReviewed: (todayEntry?.cardsReviewed || 0) + cardsReviewed,
    xpEarned: (todayEntry?.xpEarned || 0) + xpEarned,
    minutesStudied: (todayEntry?.minutesStudied || 0) + minutesStudied,
  };

  return [...pruned, merged];
}

export function applyStudySessionCompleted(
  stats: UserStats,
  cardsReviewedCount: number,
  outcome?: StudySessionOutcome
): UserStats {
  const today = todayKey();
  const isNewDay = stats.lastStudyDateKey !== today;

  let streakDays = stats.streakDays || 0;
  if (isNewDay) {
    const yesterday = todayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    streakDays = stats.lastStudyDateKey === yesterday ? streakDays + 1 : 1;
  }
  // Primeira sessão de estudo do usuário (nenhum histórico ainda).
  if (!stats.lastStudyDateKey) streakDays = 1;

  // BUG CORRIGIDO: bestStreakDays nunca era persistido — StatsView calculava
  // Math.max(bestStreakDays, streakDays) a cada render, mas como o campo nunca
  // era salvo, o recorde se perdia assim que a sequência atual quebrava e
  // recomeçava do zero. Agora o maior valor já visto é gravado permanentemente.
  const bestStreakDays = Math.max(stats.bestStreakDays || 0, streakDays);

  const dailyGoalCompleted = isNewDay ? cardsReviewedCount : stats.dailyGoalCompleted + cardsReviewedCount;

  // BUG CORRIGIDO: activityLog, retentionRate e timeStudiedHours nunca eram
  // atualizados em nenhum lugar do app — o heatmap de consistência, a
  // "Atividade Recente" e a "Retenção Média" em StatsView sempre mostravam
  // dados vazios ou o valor inicial (100%, 0h). Agora cada sessão concluída
  // alimenta esses três campos com dados reais de uso.
  let activityLog = stats.activityLog;
  let retentionRate = stats.retentionRate;
  let timeStudiedHours = stats.timeStudiedHours;

  if (outcome) {
    activityLog = appendActivityLog(
      stats.activityLog,
      today,
      cardsReviewedCount,
      outcome.xpEarned,
      outcome.minutesStudied
    );

    // Retenção = média móvel entre a taxa de acerto histórica e a da sessão
    // atual, ponderada pelo tamanho da sessão. Isso suaviza sessões pequenas
    // (ex.: 1 card errado) sem deixar a métrica travada no valor inicial.
    const sessionTotal = outcome.hardCount + outcome.correctCount;
    if (sessionTotal > 0) {
      const sessionRetention = (outcome.correctCount / sessionTotal) * 100;
      const previousWeight = 0.7;
      const hasHistory = stats.lastStudyDateKey !== undefined;
      retentionRate = hasHistory
        ? Math.round(stats.retentionRate * previousWeight + sessionRetention * (1 - previousWeight))
        : Math.round(sessionRetention);
    }

    timeStudiedHours = Number((stats.timeStudiedHours + outcome.minutesStudied / 60).toFixed(2));
  }

  return {
    ...stats,
    streakDays,
    bestStreakDays,
    dailyGoalCompleted,
    lastStudyDateKey: today,
    activityLog,
    retentionRate,
    timeStudiedHours,
  };
}

/** Usado pela UI para exibir um aviso amigável ("estude hoje para não perder sua sequência"). */
export function isStreakAtRiskToday(stats: UserStats): boolean {
  return stats.lastStudyDateKey !== todayKey() && (stats.streakDays || 0) > 0;
}
