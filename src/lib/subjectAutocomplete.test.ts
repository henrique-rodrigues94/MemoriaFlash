import { describe, it, expect } from 'vitest';
import { getCuratedSubjectSuggestions } from './subjectAutocomplete';

describe('getCuratedSubjectSuggestions', () => {
  it('sugere subáreas do Direito ao digitar "direito"', () => {
    const suggestions = getCuratedSubjectSuggestions('direito');
    expect(suggestions).toContain('Direito Penal');
    expect(suggestions).toContain('Direito Civil');
    expect(suggestions.length).toBeGreaterThan(3);
  });

  it('não é sensível a maiúsculas/acentos', () => {
    expect(getCuratedSubjectSuggestions('DIREITO')).toEqual(getCuratedSubjectSuggestions('direito'));
  });

  it('retorna vazio para termos sem correspondência curada', () => {
    expect(getCuratedSubjectSuggestions('Xadrez Avançado')).toEqual([]);
  });

  it('retorna vazio para texto muito curto', () => {
    expect(getCuratedSubjectSuggestions('di')).toEqual([]);
  });

  it('sugere subáreas de Medicina e Engenharia', () => {
    expect(getCuratedSubjectSuggestions('medicina')).toContain('Anatomia Humana');
    expect(getCuratedSubjectSuggestions('engenharia')).toContain('Engenharia Civil');
  });
});
