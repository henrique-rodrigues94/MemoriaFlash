import { describe, it, expect } from 'vitest';
import { getAvailableEducationLevels, recommendEducationLevels, recommendEducationLevel } from './educationLevels';

const ALL = ['fundamental', 'medio', 'faculdade', 'concurso', 'tecnico'];

describe('getAvailableEducationLevels', () => {
  it('mantém todos os níveis no DOM para que a UI possa desabilitar os incompatíveis', () => {
    expect(getAvailableEducationLevels('')).toEqual(ALL);
    expect(getAvailableEducationLevels('Matemática')).toEqual(ALL);
    expect(getAvailableEducationLevels('Direito Penal')).toEqual(ALL);
  });
});

describe('recommendEducationLevels', () => {
  it('recomenda fundamental + medio + faculdade para matérias escolares clássicas', () => {
    expect(recommendEducationLevels('Matemática')).toEqual(['fundamental', 'medio', 'faculdade']);
    expect(recommendEducationLevels('Biologia')).toEqual(['fundamental', 'medio', 'faculdade']);
  });

  it('recomenda concurso + faculdade para ramos do Direito cobrados em prova objetiva', () => {
    expect(recommendEducationLevels('Direito Penal')).toEqual(['concurso', 'faculdade']);
    expect(recommendEducationLevels('Direito Constitucional')).toEqual(['concurso', 'faculdade']);
  });

  it('recomenda concurso quando o assunto menciona concurso/edital/banca diretamente', () => {
    expect(recommendEducationLevels('Concurso INSS - Raciocínio Lógico')[0]).toBe('concurso');
  });

  it('recomenda técnico para áreas técnicas/profissionalizantes', () => {
    expect(recommendEducationLevels('Eletrônica')).toEqual(['tecnico']);
    expect(recommendEducationLevels('Segurança do Trabalho')).toEqual(['tecnico']);
  });

  it('usa faculdade como fallback para assuntos desconhecidos', () => {
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
