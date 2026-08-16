import { describe, it, expect } from 'vitest';
import { getCuratedCurriculum } from './curriculumTopics';

describe('getCuratedCurriculum', () => {
  it('permanece desativado porque o currículo fixo foi substituído pelo sistema dinâmico', () => {
    expect(getCuratedCurriculum()).toBeNull();
  });

  it('retorna null para qualquer matéria e nível', () => {
    expect(getCuratedCurriculum()).toBeNull();
  });
});
