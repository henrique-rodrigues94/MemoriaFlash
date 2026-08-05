import { describe, it, expect } from 'vitest';
import { isDeckDirty, validateCardEdit } from './deckEditGuard';
import { Deck, Flashcard } from '../types';

function card(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'c1',
    front: 'Pergunta',
    back: 'Resposta',
    reps: 0,
    interval: 0,
    efactor: 2.5,
    dueDate: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function deck(cards: Flashcard[], overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'd1',
    title: 'Meu Deck',
    category: 'Geral',
    description: '',
    cards,
    color: '#000',
    accentBorder: '#000',
    ...overrides,
  };
}

describe('isDeckDirty', () => {
  it('não está dirty quando nada mudou', () => {
    const original = deck([card()]);
    expect(isDeckDirty(original, original.title, original.cards)).toBe(false);
  });

  it('detecta mudança no título', () => {
    const original = deck([card()]);
    expect(isDeckDirty(original, 'Outro Título', original.cards)).toBe(true);
  });

  it('ignora espaços em branco extras no título (trim)', () => {
    const original = deck([card()]);
    expect(isDeckDirty(original, `  ${original.title}  `, original.cards)).toBe(false);
  });

  it('detecta cartão adicionado', () => {
    const original = deck([card()]);
    const withNewCard = [...original.cards, card({ id: 'c2' })];
    expect(isDeckDirty(original, original.title, withNewCard)).toBe(true);
  });

  it('detecta cartão removido', () => {
    const original = deck([card({ id: 'c1' }), card({ id: 'c2' })]);
    expect(isDeckDirty(original, original.title, [original.cards[0]])).toBe(true);
  });

  it('detecta edição de texto em um cartão existente', () => {
    const original = deck([card({ front: 'Original' })]);
    const edited = [{ ...original.cards[0], front: 'Editado' }];
    expect(isDeckDirty(original, original.title, edited)).toBe(true);
  });

  it('detecta mudança de ordem dos cartões como dirty (JSON muda)', () => {
    const c1 = card({ id: 'c1' });
    const c2 = card({ id: 'c2' });
    const original = deck([c1, c2]);
    expect(isDeckDirty(original, original.title, [c2, c1])).toBe(true);
  });
});

describe('validateCardEdit', () => {
  it('aceita pergunta e resposta preenchidas', () => {
    expect(validateCardEdit('Qual a capital?', 'Brasília')).toEqual({ valid: true });
  });

  it('rejeita pergunta vazia', () => {
    const result = validateCardEdit('', 'Resposta');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejeita resposta vazia', () => {
    const result = validateCardEdit('Pergunta', '');
    expect(result.valid).toBe(false);
  });

  it('rejeita quando ambos os campos só têm espaços em branco', () => {
    const result = validateCardEdit('   ', '   ');
    expect(result.valid).toBe(false);
  });
});
