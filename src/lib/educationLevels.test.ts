import { describe, it, expect } from 'vitest';
import { getAvailableEducationLevels, recommendEducationLevels, recommendEducationLevel } from './educationLevels';

const ALL = ['fundamental', 'medio', 'faculdade', 'concurso', 'tecnico'];

describe('getAvailableEducationLevels', () => {
  it('libera todos os níveis para assunto vazio ou muito curto', () => {
    expect(getAvailableEducationLevels('')).toEqual(ALL);
    expect(getAvailableEducationLevels('ab')).toEqual(ALL);
  });

  it('libera fundamental e medio para matérias escolares clássicas', () => {
    expect(getAvailableEducationLevels('Matemática')).toEqual(expect.arrayContaining(['fundamental', 'medio']));
    expect(getAvailableEducationLevels('Biologia')).toEqual(expect.arrayContaining(['fundamental', 'medio']));
  });

  it('remove fundamental e medio para matérias de nível superior/profissional', () => {
    const levels = getAvailableEducationLevels('Direito Penal');
    expect(levels).not.toContain('fundamental');
    expect(levels).not.toContain('medio');
    expect(levels).toEqual(expect.arrayContaining(['faculdade', 'concurso', 'tecnico']));
  });

  it('remove fundamental/medio independente de maiúsculas/acentos', () => {
    expect(getAvailableEducationLevels('DIREITO')).not.toContain('fundamental');
    expect(getAvailableEducationLevels('médicina')).not.toContain('medio');
  });

  it('libera todos os níveis para assuntos desconhecidos (fallback permissivo)', () => {
    expect(getAvailableEducationLevels('Xadrez Avançado')).toEqual(ALL);
  });
});

describe('recommendEducationLevels', () => {
  it('recomenda fundamental + medio para matérias escolares clássicas', () => {
    expect(recommendEducationLevels('Matemática')).toEqual(['fundamental', 'medio']);
    expect(recommendEducationLevels('Biologia')).toEqual(['fundamental', 'medio']);
  });

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

  it('usa "faculdade" como fallback único para assuntos desconhecidos/genéricos', () => {
    expect(recommendEducationLevels('Xadrez Avançado')).toEqual(['faculdade']);
  });

  it('nunca recomenda um nível fora da lista de disponíveis', () => {
    const available = ['faculdade', 'concurso', 'tecnico'] as const;
    const rec = recommendEducationLevels('Direito Penal', [...available]);
    expect(rec.every(l => (available as readonly string[]).includes(l))).toBe(true);
    expect(rec).not.toContain('fundamental');
    expect(rec).not.toContain('medio');
  });

  it('recommendEducationLevel (singular) retorna o topo da lista ranqueada', () => {
    expect(recommendEducationLevel('Direito Penal')).toBe('concurso');
    expect(recommendEducationLevel('Matemática')).toBe('fundamental');
  });
});
