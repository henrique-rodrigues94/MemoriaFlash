import { describe, it, expect } from 'vitest';
import { calculateSM2, getDueCardCount, computeDeckMastery } from './srsEngine';
import { Flashcard } from '../types';

function baseCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'c1',
    front: 'Pergunta',
    back: 'Resposta',
    topic: 'Geral',
    reps: 0,
    interval: 0,
    efactor: 2.5,
    dueDate: new Date().toISOString(),
    ...overrides,
  } as Flashcard;
}

describe('calculateSM2 (algoritmo de repetição espaçada)', () => {
  it('primeira revisão "easy" agenda para o dia seguinte e conta como 1 repetição', () => {
    const result = calculateSM2(baseCard(), 'easy');
    expect(result.reps).toBe(1);
    expect(result.interval).toBe(1);
    expect(result.efactor).toBeGreaterThanOrEqual(2.5);
  });

  it('segunda revisão correta salta o intervalo para 6 dias (regra clássica do SM-2)', () => {
    const afterFirst = calculateSM2(baseCard(), 'good');
    const afterSecond = calculateSM2({ reps: afterFirst.reps, interval: afterFirst.interval, efactor: afterFirst.efactor }, 'good');
    expect(afterSecond.reps).toBe(2);
    expect(afterSecond.interval).toBe(6);
  });

  it('resposta "hard" reduz o fator de facilidade mas nunca abaixo de 1.3', () => {
    let card = { reps: 0, interval: 0, efactor: 1.3 };
    // Várias respostas difíceis seguidas não podem derrubar o efactor abaixo do piso.
    for (let i = 0; i < 5; i++) {
      const result = calculateSM2(card, 'hard');
      card = { reps: result.reps, interval: result.interval, efactor: result.efactor };
    }
    expect(card.efactor).toBeGreaterThanOrEqual(1.3);
  });

  it('resposta "hard" (q < 3) reseta repetições e intervalo para reforçar o cartão logo', () => {
    const afterGoodTwice = calculateSM2(
      calculateSM2(baseCard(), 'good') as any,
      'good'
    );
    const afterHard = calculateSM2(
      { reps: afterGoodTwice.reps, interval: afterGoodTwice.interval, efactor: afterGoodTwice.efactor },
      'hard'
    );
    expect(afterHard.reps).toBe(0);
    expect(afterHard.interval).toBe(1);
  });

  it('dueDate calculado fica no futuro proporcional ao intervalo', () => {
    const result = calculateSM2({ reps: 1, interval: 6, efactor: 2.5 }, 'good');
    const due = new Date(result.dueDate);
    const now = new Date();
    const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThan(0);
  });
});

describe('getDueCardCount', () => {
  it('conta cartões sem dueDate como vencidos (nunca estudados)', () => {
    const cards = [baseCard({ dueDate: undefined as any }), baseCard({ dueDate: undefined as any })];
    expect(getDueCardCount(cards)).toBe(2);
  });

  it('não conta cartões com dueDate no futuro', () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const cards = [baseCard({ dueDate: future })];
    expect(getDueCardCount(cards)).toBe(0);
  });

  it('conta cartões com dueDate no passado', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const cards = [baseCard({ dueDate: past }), baseCard({ dueDate: past })];
    expect(getDueCardCount(cards)).toBe(2);
  });

  it('deck vazio não tem cartões vencidos', () => {
    expect(getDueCardCount([])).toBe(0);
  });
});

describe('computeDeckMastery', () => {
  it('deck vazio tem 0% de maestria', () => {
    expect(computeDeckMastery([])).toBe(0);
  });

  it('deck nunca estudado (reps=0 em todos) tem o piso mínimo de 10%', () => {
    const cards = [baseCard({ reps: 0 }), baseCard({ reps: 0 })];
    expect(computeDeckMastery(cards)).toBe(10);
  });

  it('deck totalmente dominado (5 reps em todos) chega a 100%', () => {
    const cards = [baseCard({ reps: 5 }), baseCard({ reps: 5 })];
    expect(computeDeckMastery(cards)).toBe(100);
  });

  it('nunca ultrapassa 100% mesmo com reps acima do esperado', () => {
    const cards = [baseCard({ reps: 20 })];
    expect(computeDeckMastery(cards)).toBeLessThanOrEqual(100);
  });
});
