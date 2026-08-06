import { describe, it, expect } from 'vitest';
import { getCuratedCurriculum } from './curriculumTopics';

describe('getCuratedCurriculum', () => {
  it('retorna o currículo de Matemática Fundamental com categorias e subtópicos', () => {
    const curriculum = getCuratedCurriculum('Matemática', 'fundamental');
    expect(curriculum).not.toBeNull();
    expect(curriculum!.length).toBeGreaterThan(0);
    const allTopics = curriculum!.flatMap(c => c.topics);
    expect(allTopics).toContain('Teorema de Pitágoras');
    expect(allTopics).toContain('Equações do 2º grau (Fórmula de Bhaskara)');
  });

  it('retorna o currículo de Matemática Médio, diferente do Fundamental', () => {
    const medio = getCuratedCurriculum('Matemática', 'medio');
    const fundamental = getCuratedCurriculum('Matemática', 'fundamental');
    expect(medio).not.toBeNull();
    const medioTopics = medio!.flatMap(c => c.topics);
    expect(medioTopics).toContain('Função exponencial e equações exponenciais');
    expect(medioTopics).toContain('Números Complexos'.length > 0 ? 'Plano de Argand-Gauss e forma trigonométrica dos complexos' : '');
    expect(medio).not.toEqual(fundamental);
  });

  it('não é sensível a maiúsculas/acentos na matéria', () => {
    expect(getCuratedCurriculum('MATEMATICA', 'fundamental')).toEqual(getCuratedCurriculum('matemática', 'fundamental'));
  });

  it('retorna null para matéria sem currículo curado', () => {
    expect(getCuratedCurriculum('Direito Penal', 'concurso')).toBeNull();
  });

  it('retorna null para nível sem currículo curado dentro de uma matéria conhecida', () => {
    expect(getCuratedCurriculum('Matemática', 'concurso')).toBeNull();
  });
});
