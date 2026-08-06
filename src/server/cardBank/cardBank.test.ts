import { describe, it, expect } from 'vitest';
import { getBucketId, getCardsFromBank, saveCardsToBank } from './cardBank';

describe('getBucketId', () => {
  it('é determinístico para os mesmos parâmetros', () => {
    const a = getBucketId('Direito Penal', 'Legítima Defesa', 'concurso', 'medium');
    const b = getBucketId('Direito Penal', 'Legítima Defesa', 'concurso', 'medium');
    expect(a).toBe(b);
  });

  it('ignora diferenças de maiúsculas/acentos/pontuação', () => {
    const a = getBucketId('Direito Penal', 'Legítima Defesa', 'concurso', 'medium');
    const b = getBucketId('  direito penal  ', 'legitima defesa!!', 'concurso', 'medium');
    expect(a).toBe(b);
  });

  it('gera IDs diferentes para matéria, tópico, nível ou dificuldade diferentes', () => {
    const base = getBucketId('Direito Penal', 'Legítima Defesa', 'concurso', 'medium');
    expect(getBucketId('Direito Civil', 'Legítima Defesa', 'concurso', 'medium')).not.toBe(base);
    expect(getBucketId('Direito Penal', 'Dolo e Culpa', 'concurso', 'medium')).not.toBe(base);
    expect(getBucketId('Direito Penal', 'Legítima Defesa', 'faculdade', 'medium')).not.toBe(base);
    expect(getBucketId('Direito Penal', 'Legítima Defesa', 'concurso', 'hard')).not.toBe(base);
  });
});

describe('getCardsFromBank / saveCardsToBank sem Firebase Admin configurado', () => {
  it('getCardsFromBank retorna [] sem lançar erro', async () => {
    const cards = await getCardsFromBank('Direito Penal', 'Legítima Defesa', 'concurso', 'medium', 25);
    expect(cards).toEqual([]);
  });

  it('saveCardsToBank não lança erro (no-op silencioso)', async () => {
    await expect(
      saveCardsToBank('Direito Penal', 'Legítima Defesa', 'concurso', 'medium', [
        { front: 'Pergunta?', back: 'Resposta', explanation: 'Explicação', topic: 'Legítima Defesa', difficulty: 'medium' },
      ])
    ).resolves.toBeUndefined();
  });
});
