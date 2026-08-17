import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeCacheKey } from './aiCache';

describe('computeCacheKey — normalização', () => {
  it('gera a MESMA chave para textos equivalentes com espaços/maiúsculas diferentes', () => {
    const a = computeCacheKey('generateFlashcards', { prompt: '  Mitose Celular  ', count: 6, language: 'pt' });
    const b = computeCacheKey('generateFlashcards', { prompt: 'mitose celular', count: 6, language: 'PT' });
    expect(a).toBe(b);
  });

  it('gera a MESMA chave independente da ordem dos itens em arrays', () => {
    const a = computeCacheKey('generateFlashcards', { prompt: 'x', selectedTopics: ['b', 'a'] });
    const b = computeCacheKey('generateFlashcards', { prompt: 'x', selectedTopics: ['a', 'b'] });
    expect(a).toBe(b);
  });

  it('gera chaves DIFERENTES para prompts diferentes', () => {
    const a = computeCacheKey('generateFlashcards', { prompt: 'mitose' });
    const b = computeCacheKey('generateFlashcards', { prompt: 'meiose' });
    expect(a).not.toBe(b);
  });

  it('gera chaves DIFERENTES para tarefas (taskId) diferentes, mesmo com o mesmo payload', () => {
    const a = computeCacheKey('generateFlashcards', { prompt: 'x' });
    const b = computeCacheKey('suggestTopics', { prompt: 'x' });
    expect(a).not.toBe(b);
  });

  it('a chave inclui o taskId como prefixo (facilita depuração no console do Firestore)', () => {
    expect(computeCacheKey('suggestTopics', { title: 'a' })).toMatch(/^suggestTopics_/);
  });
});

describe('withCache — comportamento sem Firebase Admin configurado', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('ignora o cache e chama o gerador normalmente quando o Admin SDK não está configurado', async () => {
    vi.doMock('../../firebaseAdmin', () => ({ getAdminFirestore: () => null }));
    const { withCache } = await import('./aiCache');

    let generatorCalls = 0;
    const generator = async () => {
      generatorCalls++;
      return { value: 'gerado' };
    };

    const result1 = await withCache('task', { x: 1 }, 1000, generator);
    const result2 = await withCache('task', { x: 1 }, 1000, generator);

    expect(generatorCalls).toBe(2); // sem cache, chama sempre
    expect(result1.cacheHit).toBe(false);
    expect(result2.cacheHit).toBe(false);
    expect(result1.value).toBe('gerado');
  });
});
