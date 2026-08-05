import { describe, it, expect } from 'vitest';
import { explanationJustRepeatsAnswer, normalizeForDedup } from './generateFlashcards';

describe('explanationJustRepeatsAnswer', () => {
  it('detecta explicação que é essencialmente só a resposta repetida com pouco enfeite', () => {
    expect(
      explanationJustRepeatsAnswer('Paris', '📘 Explicação: Paris. 💡 Curiosidade: Paris.')
    ).toBe(true);
  });

  it('detecta quando a explicação é literalmente idêntica à resposta', () => {
    expect(explanationJustRepeatsAnswer('A mitocôndria', 'A mitocôndria')).toBe(true);
  });

  it('não marca como repetição quando a explicação acrescenta conteúdo genuíno', () => {
    expect(
      explanationJustRepeatsAnswer(
        'Paris',
        '📘 Explicação: Paris é sede do governo francês desde o século III. 💡 Curiosidade: A Torre Eiffel foi construída em 1889 e era vista como provisória.'
      )
    ).toBe(false);
  });

  it('não marca como repetição quando a resposta não aparece na explicação', () => {
    expect(
      explanationJustRepeatsAnswer('4', '📘 Explicação: A soma de 2 mais 2 resulta nesse valor porque a adição agrupa unidades.')
    ).toBe(false);
  });

  it('lida com strings vazias sem lançar erro', () => {
    expect(explanationJustRepeatsAnswer('', '')).toBe(false);
    expect(explanationJustRepeatsAnswer('Paris', '')).toBe(false);
    expect(explanationJustRepeatsAnswer('', 'Algum texto')).toBe(false);
  });

  it('ignora diferenças de acentuação, pontuação e maiúsculas/minúsculas', () => {
    expect(explanationJustRepeatsAnswer('São Paulo', 'SAO. paulo!!!')).toBe(true);
  });
});

describe('normalizeForDedup', () => {
  it('remove acentos, pontuação e normaliza espaços', () => {
    expect(normalizeForDedup('  É a Mitocôndria, certo?!  ')).toBe('e a mitocondria certo');
  });

  it('lida com string vazia ou undefined-like', () => {
    expect(normalizeForDedup('')).toBe('');
  });
});
