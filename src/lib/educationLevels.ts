// 📁 flashmind-ai/src/lib/educationLevels.ts
/**
 * Níveis de ensino disponíveis para gerar flashcards.
 *
 * 'fundamental' → Ensino Fundamental (1º ao 9º ano). Matérias escolares
 *                 clássicas: Matemática, Biologia, História…
 * 'medio'       → Ensino Médio (1º ao 3º ano).
 * 'faculdade'   → Ensino Superior / Graduação. Cursos como Direito, Medicina,
 *                 Engenharia, Administração, etc.
 * 'concurso'    → Preparação para concursos públicos (questões estilo banca
 *                 examinadora — CESPE, FGV, FCC…).
 * 'tecnico'     → Curso técnico / profissionalizante (nível técnico, prático).
 */
export type EducationLevel = 'fundamental' | 'medio' | 'faculdade' | 'concurso' | 'tecnico';

export const EDUCATION_LEVEL_META: { value: EducationLevel; label: string; icon: string }[] = [
  { value: 'fundamental', label: 'Fundamental', icon: '🏫' },
  { value: 'medio', label: 'Médio', icon: '📘' },
  { value: 'faculdade', label: 'Faculdade', icon: '🎓' },
  { value: 'concurso', label: 'Concurso', icon: '🏛️' },
  { value: 'tecnico', label: 'Técnico', icon: '🛠️' },
];

const ALL_LEVELS: EducationLevel[] = ['fundamental', 'medio', 'faculdade', 'concurso', 'tecnico'];

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

// ── Matérias tipicamente da Educação Básica (Fundamental + Médio) ──────────
// Se o assunto digitado casar com uma dessas, tanto 'fundamental' quanto
// 'medio' ficam disponíveis/recomendados — a mesma matéria (ex.: Matemática)
// é estudada nos dois, só que com conteúdo diferente por nível.

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
// regulamentada, área técnica avançada), 'fundamental' e 'medio' são
// desabilitados — essas matérias não fazem parte do currículo da Educação
// Básica.

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
 *    remove 'fundamental' e 'medio' da lista (mantém faculdade/concurso/técnico).
 *  - Assunto bate com uma matéria escolar clássica → todos os níveis
 *    continuam liberados (ex.: "Matemática" existe em fundamental, médio E faculdade).
 *  - Assunto desconhecido (não bate com nenhuma lista) → libera todos,
 *    por segurança (preferimos não travar o usuário por falso negativo).
 */
export function getAvailableEducationLevels(subject: string): EducationLevel[] {
  const s = normalize(subject);
  if (s.length < 3) return ALL_LEVELS;

  const matchesNonEscola = matchesAny(s, NON_ESCOLA_SUBJECTS);
  if (matchesNonEscola) return ALL_LEVELS.filter((level) => level !== 'fundamental' && level !== 'medio');

  return ALL_LEVELS;
}

/**
 * Recomenda, em ordem de prioridade, os níveis de ensino plausíveis para o
 * assunto digitado — dentro do conjunto de níveis disponíveis. Diferente de
 * `getAvailableEducationLevels` (que só bloqueia o que é claramente
 * incoerente), esta função tenta ACERTAR a(s) intenção(ões) mais comuns de
 * quem digitou aquele assunto.
 *
 * Pode retornar mais de um nível quando vários são igualmente plausíveis —
 * ex.: "Matemática" retorna Fundamental + Médio (a mesma matéria existe nos
 * dois, com conteúdo diferente); "Direito Penal" retorna Concurso +
 * Faculdade; "Eletrônica" sozinha costuma ser curso Técnico.
 *
 * A lista nunca inclui um nível fora de `available` e nunca vem vazia.
 */
export function recommendEducationLevels(
  subject: string,
  available: EducationLevel[] = ALL_LEVELS,
): EducationLevel[] {
  const s = normalize(subject);
  const ranked: EducationLevel[] = [];
  const add = (level: EducationLevel) => {
    if (available.includes(level) && !ranked.includes(level)) ranked.push(level);
  };

  if (s.length >= 3) {
    const isConcurso = matchesAny(s, CONCURSO_SIGNALS);
    const isTecnico = matchesAny(s, TECNICO_SIGNALS);
    const isEscola = matchesAny(s, ESCOLA_SUBJECTS);

    if (isConcurso) add('concurso');
    if (isTecnico) add('tecnico');
    if (isEscola) {
      add('fundamental');
      add('medio');
    }

    // Assunto profissional/específico (ex.: um ramo do Direito) sem sinal de
    // Escola: a Faculdade é sempre uma leitura plausível ADICIONAL ao que já
    // foi detectado (ex.: Direito Penal → Concurso + Faculdade).
    if (!isEscola && (isConcurso || isTecnico)) add('faculdade');
  }

  // Nada bateu com nenhum sinal conhecido → fallback único em Faculdade
  // (leitura mais genérica e segura para um assunto não reconhecido).
  if (ranked.length === 0) add('faculdade');

  return ranked.length > 0 ? ranked : [available[0]];
}

/**
 * Atalho: retorna apenas o nível de maior prioridade de `recommendEducationLevels`.
 */
export function recommendEducationLevel(
  subject: string,
  available: EducationLevel[] = ALL_LEVELS,
): EducationLevel {
  return recommendEducationLevels(subject, available)[0];
}
