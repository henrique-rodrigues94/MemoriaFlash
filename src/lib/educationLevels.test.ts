import { describe, it, expect } from 'vitest';
import { getAvailableEducationLevels, recommendEducationLevel } from './educationLevels';

describe('getAvailableEducationLevels', () => {
  it('libera todos os níveis para assunto vazio ou muito curto', () => {
    expect(getAvailableEducationLevels('')).toEqual(['escola', 'faculdade', 'concurso', 'tecnico']);
    expect(getAvailableEducationLevels('ab')).toEqual(['escola', 'faculdade', 'concurso', 'tecnico']);
  });

  it('libera todos os níveis para matérias escolares clássicas', () => {
    expect(getAvailableEducationLevels('Matemática')).toContain('escola');
    expect(getAvailableEducationLevels('Biologia')).toContain('escola');
  });

  it('remove "escola" para matérias de nível superior/profissional', () => {
    const levels = getAvailableEducationLevels('Direito Penal');
    expect(levels).not.toContain('escola');
    expect(levels).toEqual(expect.arrayContaining(['faculdade', 'concurso', 'tecnico']));
  });

  it('remove "escola" independente de maiúsculas/acentos', () => {
    expect(getAvailableEducationLevels('DIREITO')).not.toContain('escola');
    expect(getAvailableEducationLevels('médicina')).not.toContain('escola');
  });

  it('libera todos os níveis para assuntos desconhecidos (fallback permissivo)', () => {
    expect(getAvailableEducationLevels('Xadrez Avançado')).toEqual([
      'escola', 'faculdade', 'concurso', 'tecnico',
    ]);
  });
});

describe('recommendEducationLevel', () => {
  it('recomenda "concurso" para ramos do Direito tipicamente cobrados em prova objetiva', () => {
    expect(recommendEducationLevel('Direito Penal')).toBe('concurso');
    expect(recommendEducationLevel('Direito Constitucional')).toBe('concurso');
  });

  it('recomenda "concurso" quando o assunto menciona concurso/edital/banca diretamente', () => {
    expect(recommendEducationLevel('Concurso INSS - Raciocínio Lógico')).toBe('concurso');
  });

  it('recomenda "tecnico" para áreas técnicas/profissionalizantes', () => {
    expect(recommendEducationLevel('Eletrônica')).toBe('tecnico');
    expect(recommendEducationLevel('Segurança do Trabalho')).toBe('tecnico');
  });

  it('recomenda "escola" para matérias escolares clássicas', () => {
    expect(recommendEducationLevel('Matemática')).toBe('escola');
    expect(recommendEducationLevel('Biologia')).toBe('escola');
  });

  it('usa "faculdade" como fallback para assuntos desconhecidos/genéricos', () => {
    expect(recommendEducationLevel('Xadrez Avançado')).toBe('faculdade');
  });

  it('nunca recomenda um nível fora da lista de disponíveis', () => {
    const available = ['faculdade', 'concurso', 'tecnico'] as const;
    const rec = recommendEducationLevel('Direito Penal', [...available]);
    expect(available).toContain(rec);
    expect(rec).not.toBe('escola');
  });
});
