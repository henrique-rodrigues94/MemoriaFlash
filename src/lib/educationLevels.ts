// 📁 flashmind-ai/src/lib/educationLevels.ts
/**
 * Níveis de ensino disponíveis para gerar flashcards.
 *
 * 'escola'    → Educação Básica (fusão de Ensino Fundamental + Ensino Médio).
 *               Matérias escolares clássicas: Matemática, Biologia, História…
 * 'faculdade' → Ensino Superior / Graduação. Cursos como Direito, Medicina,
 *               Engenharia, Administração, etc.
 * 'concurso'  → Preparação para concursos públicos (questões estilo banca
 *               examinadora — CESPE, FGV, FCC…).
 * 'tecnico'   → Curso técnico / profissionalizante (nível técnico, prático).
 */
export type EducationLevel = 'escola' | 'faculdade' | 'concurso' | 'tecnico';

export const EDUCATION_LEVEL_META: { value: EducationLevel; label: string; icon: string }[] = [
  { value: 'escola', label: 'Escola', icon: '🏫' },
  { value: 'faculdade', label: 'Faculdade', icon: '🎓' },
  { value: 'concurso', label: 'Concurso', icon: '🏛️' },
  { value: 'tecnico', label: 'Técnico', icon: '🛠️' },
];

// ── Normalização ────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .trim();
}

function matchesAny(s: string, terms: string[]): boolean {
  return terms.some((term) => s.includes(term));
}

// ── Matérias tipicamente da Educação Básica (Escola) ────────────────────────
// Se o assunto digitado casar com uma dessas, 'escola' é permitido/recomendado.

const ESCOLA_SUBJECTS = [
  'matematica', 'portugues', 'lingua portuguesa', 'redacao', 'gramatica', 'literatura',
  'biologia', 'fisica', 'quimica', 'ciencias', 'ciencias naturais',
  'historia', 'geografia', 'filosofia', 'sociologia',
  'ingles', 'espanhol', 'lingua estrangeira',
  'artes', 'educacao fisica', 'ensino religioso',
  'algebra', 'geometria', 'trigonometria', 'estatistica basica',
];

// ── Assuntos tipicamente de nível Superior/Profissional ─────────────────────
// Se o assunto casar com um desses (curso de graduação, profissão
// regulamentada, área técnica avançada), 'escola' é desabilitado — essas
// matérias não fazem parte do currículo do Ensino Fundamental/Médio.

const NON_ESCOLA_SUBJECTS = [
  'direito', 'medicina', 'enfermagem', 'odontologia', 'farmacia', 'veterinaria',
  'engenharia', 'arquitetura', 'urbanismo',
  'administracao', 'contabilidade', 'ciencias contabeis', 'economia', 'financas',
  'psicologia', 'fisioterapia', 'nutricao', 'fonoaudiologia', 'terapia ocupacional',
  'jornalismo', 'publicidade', 'relacoes publicas', 'marketing',
  'direito penal', 'direito civil', 'direito constitucional', 'direito administrativo',
  'direito tributario', 'direito trabalhista', 'direito empresarial', 'processo civil',
  'processo penal', 'medicina veterinaria', 'ciencia da computacao', 'sistemas de informacao',
  'anatomia', 'fisiologia humana', 'farmacologia', 'patologia', 'semiologia medica',
];

// ── Sinais de "Concurso Público" ─────────────────────────────────────────────
// Ramos do Direito e temas quase sempre estudados visando prova objetiva de
// banca (CESPE/FGV/FCC/Vunesp…), além de menções diretas a concurso/edital
// e nomes de órgãos/carreiras públicas comuns em editais brasileiros.

const CONCURSO_SIGNALS = [
  'concurso', 'edital', 'banca examinadora', 'prova objetiva', 'cespe', 'cebraspe', 'fgv', 'fcc', 'vunesp', 'ibfc',
  'direito penal', 'direito civil', 'direito constitucional', 'direito administrativo',
  'direito tributario', 'direito trabalhista', 'direito previdenciario', 'direito processual',
  'direito eleitoral', 'direito ambiental', 'legislacao especial', 'jurisprudencia',
  'raciocinio logico', 'atualidades', 'conhecimentos gerais', 'conhecimentos bancarios',
  'policia federal', 'policia civil', 'policia militar', 'policia rodoviaria federal', 'prf',
  'receita federal', 'tribunal de contas', 'tribunal de justica', 'ministerio publico',
  'defensoria publica', 'inss', 'tj', 'trf', 'tre', 'trt', 'oab',
];

// ── Sinais de "Curso Técnico" ────────────────────────────────────────────────

const TECNICO_SIGNALS = [
  'tecnico em', 'curso tecnico', 'eletrotecnica', 'eletronica', 'eletrica basica',
  'mecanica industrial', 'mecatronica', 'automacao industrial', 'edificacoes',
  'seguranca do trabalho', 'enfermagem tecnica', 'auxiliar de enfermagem',
  'refrigeracao', 'climatizacao', 'solda', 'hidraulica predial', 'manutencao industrial',
  'redes de computadores', 'informatica basica', 'nr-10', 'nr-35', 'nr10', 'nr35',
];

/**
 * Retorna quais níveis de ensino fazem sentido para o assunto digitado.
 *
 * Heurística:
 *  - Assunto vazio/curto → libera todos (usuário ainda está digitando).
 *  - Assunto bate com algo claramente de nível superior/profissional →
 *    remove 'escola' da lista (mantém faculdade/concurso/técnico).
 *  - Assunto bate com uma matéria escolar clássica → todos os níveis
 *    continuam liberados (ex.: "Matemática" existe em todos os níveis).
 *  - Assunto desconhecido (não bate com nenhuma lista) → libera todos,
 *    por segurança (preferimos não travar o usuário por falso negativo).
 */
export function getAvailableEducationLevels(subject: string): EducationLevel[] {
  const all: EducationLevel[] = ['escola', 'faculdade', 'concurso', 'tecnico'];
  const s = normalize(subject);
  if (s.length < 3) return all;

  const matchesNonEscola = matchesAny(s, NON_ESCOLA_SUBJECTS);
  if (matchesNonEscola) return all.filter((level) => level !== 'escola');

  return all;
}

/**
 * Recomenda o nível de ensino mais provável para o assunto digitado, dentro
 * do conjunto de níveis disponíveis. Diferente de `getAvailableEducationLevels`
 * (que só bloqueia o que é claramente incoerente), esta função tenta ACERTAR
 * a intenção mais comum de quem digitou aquele assunto — ex.: "Direito Penal"
 * quase sempre é estudado visando concurso público, não uma aula de faculdade
 * genérica; "Eletrônica" sozinha costuma ser curso técnico.
 *
 * Prioridade de detecção: Concurso > Técnico > Escola > Faculdade (fallback).
 * Retorna sempre um valor presente em `available`.
 */
export function recommendEducationLevel(
  subject: string,
  available: EducationLevel[] = ['escola', 'faculdade', 'concurso', 'tecnico'],
): EducationLevel {
  const s = normalize(subject);
  const pick = (level: EducationLevel): EducationLevel | null =>
    available.includes(level) ? level : null;

  if (s.length >= 3) {
    if (matchesAny(s, CONCURSO_SIGNALS)) {
      const level = pick('concurso');
      if (level) return level;
    }
    if (matchesAny(s, TECNICO_SIGNALS)) {
      const level = pick('tecnico');
      if (level) return level;
    }
    if (matchesAny(s, ESCOLA_SUBJECTS)) {
      const level = pick('escola');
      if (level) return level;
    }
  }

  return pick('faculdade') || pick('escola') || available[0];
}
