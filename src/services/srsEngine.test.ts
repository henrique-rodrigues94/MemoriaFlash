import { describe, it, expect } from 'vitest';
import { calculateSM2, getDueCardCount, computeDeckMastery, countMasteredCards } from './srsEngine';
import { Flashcard, Deck } from '../types';

function baseCard(overrides: Partial<Flashcard> = {}): Flashcard { return { id: 'c1', front: 'Pergunta', back: 'Resposta', topic: 'Geral', reps: 0, interval: 0, efactor: 2.5, dueDate: new Date().toISOString(), ...overrides } as Flashcard; }

describe('calculateSM2 (algoritmo de repetição espaçada)', () => {
  it('primeira revisão "easy" agenda para quatro dias e conta como 1 repetição', () => {
    const result = calculateSM2(baseCard(), 'easy');
    expect(result.reps).toBe(1);
    expect(result.interval).toBe(4);
    expect(result.efactor).toBeGreaterThanOrEqual(2.5);
  });
  it('segunda revisão correta salta o intervalo para 6 dias', () => {
    const afterFirst = calculateSM2(baseCard(), 'good');
    const afterSecond = calculateSM2({ reps: afterFirst.reps, interval: afterFirst.interval, efactor: afterFirst.efactor }, 'good');
    expect(afterSecond.reps).toBe(2); expect(afterSecond.interval).toBe(6);
  });
  it('resposta "hard" nunca reduz efactor abaixo de 1.3', () => {
    let card = { reps: 0, interval: 0, efactor: 1.3 };
    for (let i = 0; i < 5; i++) { const result = calculateSM2(card, 'hard'); card = { reps: result.reps, interval: result.interval, efactor: result.efactor }; }
    expect(card.efactor).toBeGreaterThanOrEqual(1.3);
  });
  it('resposta "hard" reseta repetições e intervalo para reforçar o cartão', () => {
    const afterGoodTwice = calculateSM2(calculateSM2(baseCard(), 'good') as any, 'good');
    const afterHard = calculateSM2({ reps: afterGoodTwice.reps, interval: afterGoodTwice.interval, efactor: afterGoodTwice.efactor }, 'hard');
    expect(afterHard.reps).toBe(0); expect(afterHard.interval).toBe(1);
  });
  it('dueDate calculado fica no futuro proporcional ao intervalo', () => {
    const result = calculateSM2({ reps: 1, interval: 6, efactor: 2.5 }, 'good');
    const due = new Date(result.dueDate); const now = new Date();
    const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThan(0);
  });
});

describe('getDueCardCount', () => {
  it('conta cartões sem dueDate como vencidos', () => expect(getDueCardCount([baseCard({ dueDate: undefined as any }), baseCard({ dueDate: undefined as any })])).toBe(2));
  it('não conta cartões com dueDate no futuro', () => { const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(); expect(getDueCardCount([baseCard({ dueDate: future })])).toBe(0); });
  it('conta cartões com dueDate no passado', () => { const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); expect(getDueCardCount([baseCard({ dueDate: past }), baseCard({ dueDate: past })])).toBe(2); });
  it('deck vazio não tem cartões vencidos', () => expect(getDueCardCount([])).toBe(0));
});

describe('computeDeckMastery', () => {
  it('deck vazio tem 0%', () => expect(computeDeckMastery([])).toBe(0));
  it('deck nunca estudado tem piso de 10%', () => expect(computeDeckMastery([baseCard({ reps: 0 }), baseCard({ reps: 0 })])).toBe(10));
  it('deck totalmente dominado chega a 100%', () => expect(computeDeckMastery([baseCard({ reps: 5 }), baseCard({ reps: 5 })])).toBe(100));
  it('nunca ultrapassa 100%', () => expect(computeDeckMastery([baseCard({ reps: 20 })])).toBeLessThanOrEqual(100));
});

function baseDeck(cards: Flashcard[], overrides: Partial<Deck> = {}): Deck { return { id: 'd1', title: 'Deck Teste', category: 'Geral', description: '', cards, color: '#000', accentBorder: '#000', ...overrides }; }

describe('countMasteredCards', () => {
  it('não conta cards com reps < 3', () => expect(countMasteredCards([baseDeck([baseCard({ reps: 0 }), baseCard({ id: 'c2', reps: 2 })])])).toBe(0));
  it('conta cards com reps >= 3', () => expect(countMasteredCards([baseDeck([baseCard({ id: 'c1', reps: 3 }), baseCard({ id: 'c2', reps: 5 }), baseCard({ id: 'c3', reps: 1 })])])).toBe(2));
  it('soma cards dominados em múltiplos decks', () => expect(countMasteredCards([baseDeck([baseCard({ id: 'c1', reps: 3 })], { id: 'd1' }), baseDeck([baseCard({ id: 'c2', reps: 4 }), baseCard({ id: 'c3', reps: 0 })], { id: 'd2' })])).toBe(2));
  it('lista vazia retorna 0', () => expect(countMasteredCards([])).toBe(0));
});
