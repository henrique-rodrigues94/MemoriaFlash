import { describe, it, expect } from 'vitest';
import { getAvailableEducationLevels, recommendEducationLevels, recommendEducationLevel } from './educationLevels';

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

describe('recommendEducationLevels', () => {
  it('recomenda concurso + faculdade para ramos do Direito cobrados em prova objetiva', () => {
    expect(recommendEducationLevels('Direito Penal')).toEqual(['concurso', 'faculdade']);
    expect(recommendEducationLevels('Direito Constitucional')).toEqual(['concurso', 'faculdade']);
  });

  it('recomenda concurso quando o assunto menciona concurso/edital/banca diretamente', () => {
    expect(recommendEducationLevels('Concurso INSS - Raciocínio Lógico')[0]).toBe('concurso');
  });

  it('recomenda técnico + faculdade para áreas técnicas/profissionalizantes', () => {
    expect(recommendEducationLevels('Eletrônica')).toEqual(['tecnico', 'faculdade']);
    expect(recommendEducationLevels('Segurança do Trabalho')).toEqual(['tecnico', 'faculdade']);
  });

  it('recomenda somente escola para matérias escolares clássicas', () => {
    expect(recommendEducationLevels('Matemática')).toEqual(['escola']);
    expect(recommendEducationLevels('Biologia')).toEqual(['escola']);
  });

  it('usa "faculdade" como fallback único para assuntos desconhecidos/genéricos', () => {
    expect(recommendEducationLevels('Xadrez Avançado')).toEqual(['faculdade']);
  });

  it('nunca recomenda um nível fora da lista de disponíveis', () => {
    const available = ['faculdade', 'concurso', 'tecnico'] as const;
    const rec = recommendEducationLevels('Direito Penal', [...available]);
    expect(rec.every(l => (available as readonly string[]).includes(l))).toBe(true);
    expect(rec).not.toContain('escola');
  });

  it('recommendEducationLevel (singular) retorna o topo da lista ranqueada', () => {
    expect(recommendEducationLevel('Direito Penal')).toBe('concurso');
    expect(recommendEducationLevel('Matemática')).toBe('escola');
  });
});
