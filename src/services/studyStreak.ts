import { UserStats } from '../types';
import { todayKey } from './economy/economyConstants';

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

export function applyStudySessionCompleted(stats: UserStats, cardsReviewedCount: number): UserStats {
  const today = todayKey();
  const isNewDay = stats.lastStudyDateKey !== today;

  let streakDays = stats.streakDays || 0;
  if (isNewDay) {
    const yesterday = todayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    streakDays = stats.lastStudyDateKey === yesterday ? streakDays + 1 : 1;
  }
  // Primeira sessão de estudo do usuário (nenhum histórico ainda).
  if (!stats.lastStudyDateKey) streakDays = 1;

  const dailyGoalCompleted = isNewDay ? cardsReviewedCount : stats.dailyGoalCompleted + cardsReviewedCount;

  return {
    ...stats,
    streakDays,
    dailyGoalCompleted,
    lastStudyDateKey: today,
  };
}

/** Usado pela UI para exibir um aviso amigável ("estude hoje para não perder sua sequência"). */
export function isStreakAtRiskToday(stats: UserStats): boolean {
  return stats.lastStudyDateKey !== todayKey() && (stats.streakDays || 0) > 0;
}
