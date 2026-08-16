import { warmSubjectCatalog, findCachedSubjectSuggestions } from '../services/firestoreCurriculumCache';

function normalize(text: string): string { return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim(); }
const SUBJECT_VARIANTS: Record<string, string[]> = {
  direito: ['Direito Penal', 'Direito Civil', 'Direito Constitucional', 'Direito Administrativo', 'Direito Tributário', 'Direito Trabalhista', 'Direito Processual Civil', 'Direito Processual Penal', 'Direito Empresarial', 'Direito Previdenciário', 'Direito Ambiental', 'Direito Eleitoral', 'Direito Internacional'],
  medicina: ['Anatomia Humana', 'Fisiologia', 'Farmacologia', 'Patologia', 'Semiologia Médica', 'Cardiologia', 'Pediatria', 'Ginecologia e Obstetrícia', 'Clínica Médica', 'Cirurgia Geral'],
  engenharia: ['Engenharia Civil', 'Engenharia Elétrica', 'Engenharia Mecânica', 'Engenharia de Produção', 'Engenharia Química', 'Engenharia de Software', 'Resistência dos Materiais', 'Cálculo Estrutural'],
  administracao: ['Administração de Empresas', 'Administração Pública', 'Gestão de Pessoas', 'Marketing', 'Gestão Financeira', 'Logística', 'Empreendedorismo'],
  enfermagem: ['Enfermagem Obstétrica', 'Enfermagem Pediátrica', 'Enfermagem em UTI', 'Semiologia e Semiotécnica', 'Farmacologia para Enfermagem', 'Saúde Pública'],
  contabilidade: ['Contabilidade Geral', 'Contabilidade de Custos', 'Contabilidade Tributária', 'Análise de Balanços', 'Auditoria Contábil'],
  informatica: ['Lógica de Programação', 'Redes de Computadores', 'Banco de Dados', 'Sistemas Operacionais', 'Segurança da Informação'],
  matematica: ['Álgebra', 'Geometria Plana e Espacial', 'Trigonometria', 'Funções e Gráficos', 'Estatística e Probabilidade', 'Cálculo Diferencial e Integral'],
};
const COMMON_SUBJECTS = ['Matemática', 'Português', 'Redação', 'Gramática', 'Literatura', 'Biologia', 'Física', 'Química', 'Ciências', 'História', 'Geografia', 'Filosofia', 'Sociologia', 'Inglês', 'Espanhol', 'Informática', 'Direito', 'Medicina', 'Engenharia', 'Administração', 'Enfermagem', 'Contabilidade'];
function dedupeNormalized(values: string[]): string[] { const map = new Map<string, string>(); values.forEach(value => { const key = normalize(value); if (key && !map.has(key)) map.set(key, value.trim()); }); return Array.from(map.values()); }
export function getSubjectCorrectionCandidates(): string[] { return dedupeNormalized([...COMMON_SUBJECTS, ...Object.keys(SUBJECT_VARIANTS).map(value => value[0].toUpperCase() + value.slice(1)), ...Object.values(SUBJECT_VARIANTS).flat()]); }

let firestoreSubjects: string[] = [];
void warmSubjectCatalog().then(async () => {
  const all: string[] = [];
  for (const sample of COMMON_SUBJECTS) all.push(...await findCachedSubjectSuggestions(sample));
  firestoreSubjects = dedupeNormalized(all);
}).catch(() => undefined);

export function getCuratedSubjectSuggestions(query: string): string[] {
  const q = normalize(query); if (q.length < 2) return [];
  const firestoreMatches = firestoreSubjects.filter(item => normalize(item).includes(q));
  const curated: string[] = [];
  for (const [broadTerm, variants] of Object.entries(SUBJECT_VARIANTS)) if (broadTerm.startsWith(q) || q.startsWith(broadTerm) || q.includes(broadTerm)) curated.push(...variants);
  return dedupeNormalized([...firestoreMatches, ...curated]).slice(0, 12);
}
