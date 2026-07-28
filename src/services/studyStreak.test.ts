import { describe, it, expect, vi, afterEach } from 'vitest';
import { applyStudySessionCompleted, isStreakAtRiskToday } from './studyStreak';
import { UserStats } from '../types';

function baseStats(overrides: Partial<UserStats> = {}): UserStats {
  return {
    name: 'Teste',
    avatar: '',
    streakDays: 0,
    dailyGoalTotal: 20,
    dailyGoalCompleted: 0,
    totalCardsMastered: 0,
    timeStudiedHours: 0,
    retentionRate: 0,
    xp: 0,
    globalRank: 0,
    aiCredits: 0,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('applyStudySessionCompleted — corrige o bug do streak que nunca era atualizado', () => {
  it('primeira sessão de estudo de todas define streak = 1', () => {
    const stats = baseStats({ streakDays: 0 });
    const updated = applyStudySessionCompleted(stats, 10);
    expect(updated.streakDays).toBe(1);
    expect(updated.dailyGoalCompleted).toBe(10);
  });

  it('estudar de novo no MESMO dia não incrementa o streak, mas soma a meta diária', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T09:00:00Z'));

    let stats = applyStudySessionCompleted(baseStats(), 5);
    expect(stats.streakDays).toBe(1);
    expect(stats.dailyGoalCompleted).toBe(5);

    vi.setSystemTime(new Date('2026-01-01T18:00:00Z')); // mais tarde, mesmo dia
    stats = applyStudySessionCompleted(stats, 5);
    expect(stats.streakDays).toBe(1); // não duplica o streak no mesmo dia
    expect(stats.dailyGoalCompleted).toBe(10); // soma no total do dia
  });

  it('estudar em dias consecutivos incrementa o streak', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T09:00:00Z'));
    let stats = applyStudySessionCompleted(baseStats(), 5);
    expect(stats.streakDays).toBe(1);

    vi.setSystemTime(new Date('2026-01-02T09:00:00Z'));
    stats = applyStudySessionCompleted(stats, 5);
    expect(stats.streakDays).toBe(2);

    vi.setSystemTime(new Date('2026-01-03T09:00:00Z'));
    stats = applyStudySessionCompleted(stats, 5);
    expect(stats.streakDays).toBe(3);
  });

  it('pular um dia (ou mais) reseta o streak para 1', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T09:00:00Z'));
    let stats = applyStudySessionCompleted(baseStats(), 5);
    stats = applyStudySessionCompleted({ ...stats, streakDays: 5 }, 5); // simula streak alto

    vi.setSystemTime(new Date('2026-01-04T09:00:00Z')); // pulou 2 dias
    stats = applyStudySessionCompleted(stats, 5);
    expect(stats.streakDays).toBe(1);
  });

  it('a meta diária concluída (dailyGoalCompleted) reseta a cada novo dia', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T09:00:00Z'));
    let stats = applyStudySessionCompleted(baseStats(), 20);
    expect(stats.dailyGoalCompleted).toBe(20);

    vi.setSystemTime(new Date('2026-01-02T09:00:00Z'));
    stats = applyStudySessionCompleted(stats, 3);
    expect(stats.dailyGoalCompleted).toBe(3); // não é 23 — resetou no novo dia
  });
});

describe('isStreakAtRiskToday', () => {
  it('não está em risco se ainda não tem nenhum streak', () => {
    expect(isStreakAtRiskToday(baseStats({ streakDays: 0 }))).toBe(false);
  });

  it('está em risco se tem streak mas ainda não estudou hoje', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T09:00:00Z'));
    const stats = applyStudySessionCompleted(baseStats(), 5);

    vi.setSystemTime(new Date('2026-01-02T09:00:00Z')); // novo dia, ainda não estudou
    expect(isStreakAtRiskToday(stats)).toBe(true);
  });

  it('não está em risco se já estudou hoje', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T09:00:00Z'));
    const stats = applyStudySessionCompleted(baseStats(), 5);
    expect(isStreakAtRiskToday(stats)).toBe(false);
  });
});
