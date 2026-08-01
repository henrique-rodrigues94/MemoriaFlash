import { describe, it, expect } from 'vitest';
import { extractArrayField } from './jsonUtils';

describe('extractArrayField', () => {
  it('extrai um array da chave preferida quando a resposta vem embrulhada em cards', () => {
    const result = extractArrayField({ cards: [{ front: 'Pergunta?' }] }, ['cards', 'flashcards']);
    expect(result).toEqual([{ front: 'Pergunta?' }]);
  });

  it('suporta respostas em flashcards quando o provedor usa outro nome de chave', () => {
    const result = extractArrayField({ flashcards: [{ front: 'Pergunta?' }] }, ['cards', 'flashcards']);
    expect(result).toEqual([{ front: 'Pergunta?' }]);
  });

  it('retorna um array quando o payload é diretamente um array', () => {
    const result = extractArrayField([{ front: 'Pergunta?' }], ['cards', 'flashcards']);
    expect(result).toEqual([{ front: 'Pergunta?' }]);
  });
});
