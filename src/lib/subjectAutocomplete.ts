// 📁 flashmind-ai/src/lib/subjectAutocomplete.ts
/**
 * Autocomplete de matérias: quando o usuário digita um termo amplo
 * ("Direito", "Medicina"...), sugerimos as subáreas mais estudadas dentro
 * dele, em vez de deixá-lo só com o termo genérico. Isso ajuda a IA a gerar
 * conteúdo mais específico e também alimenta a recomendação de nível de
 * ensino (ex.: "Direito Penal" recomenda Faculdade/Concurso).
 */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Termo amplo (normalizado) → subáreas mais estudadas, em Português "de exibição". */
const SUBJECT_VARIANTS: Record<string, string[]> = {
  direito: [
    'Direito Penal', 'Direito Civil', 'Direito Constitucional', 'Direito Administrativo',
    'Direito Tributário', 'Direito Trabalhista', 'Direito Processual Civil',
    'Direito Processual Penal', 'Direito Empresarial', 'Direito Previdenciário',
    'Direito Ambiental', 'Direito Eleitoral', 'Direito Internacional',
  ],
  medicina: [
    'Anatomia Humana', 'Fisiologia', 'Farmacologia', 'Patologia', 'Semiologia Médica',
    'Cardiologia', 'Pediatria', 'Ginecologia e Obstetrícia', 'Clínica Médica', 'Cirurgia Geral',
  ],
  engenharia: [
    'Engenharia Civil', 'Engenharia Elétrica', 'Engenharia Mecânica', 'Engenharia de Produção',
    'Engenharia Química', 'Engenharia de Software', 'Resistência dos Materiais', 'Cálculo Estrutural',
  ],
  administracao: [
    'Administração de Empresas', 'Administração Pública', 'Gestão de Pessoas', 'Marketing',
    'Gestão Financeira', 'Logística', 'Empreendedorismo',
  ],
  enfermagem: [
    'Enfermagem Obstétrica', 'Enfermagem Pediátrica', 'Enfermagem em UTI',
    'Semiologia e Semiotécnica', 'Farmacologia para Enfermagem', 'Saúde Pública',
  ],
  contabilidade: [
    'Contabilidade Geral', 'Contabilidade de Custos', 'Contabilidade Tributária',
    'Análise de Balanços', 'Auditoria Contábil',
  ],
  informatica: [
    'Lógica de Programação', 'Redes de Computadores', 'Banco de Dados',
    'Sistemas Operacionais', 'Segurança da Informação',
  ],
  matematica: [
    'Álgebra', 'Geometria Plana e Espacial', 'Trigonometria', 'Funções e Gráficos',
    'Estatística e Probabilidade', 'Cálculo Diferencial e Integral',
  ],
};

/**
 * Dado o texto digitado, retorna sugestões específicas quando o termo bate
 * (por prefixo ou substring) com uma das matérias amplas do mapa curado.
 * Retorna [] quando não há correspondência — quem chama deve então cair de
 * volta nas matérias já usadas pelo próprio usuário (existingSubjects).
 */
export function getCuratedSubjectSuggestions(query: string): string[] {
  const q = normalize(query);
  if (q.length < 3) return [];

  for (const [broadTerm, variants] of Object.entries(SUBJECT_VARIANTS)) {
    if (broadTerm.startsWith(q) || q.startsWith(broadTerm) || q.includes(broadTerm)) {
      return variants;
    }
  }
  return [];
}
