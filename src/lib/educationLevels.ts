// 📁 flashmind-ai/src/lib/educationLevels.ts
/**
 * Níveis de ensino usados na geração de flashcards.
 *
 * A IA identifica os níveis pertinentes e o subjectLevelsService confirma a
 * existência da grade curricular. O resultado final é compartilhado com este
 * módulo por um evento do navegador, evitando uma segunda chamada à IA.
 */
export type EducationLevel = 'fundamental' | 'medio' | 'faculdade' | 'concurso' | 'tecnico';

export const EDUCATION_LEVEL_META: { value: EducationLevel; label: string; icon: string }[] = [
  { value: 'fundamental', label: 'Fundamental', icon: '🏫' },
  { value: 'medio', label: 'Médio', icon: '📘' },
  { value: 'faculdade', label: 'Faculdade', icon: '🎓' },
  { value: 'concurso', label: 'Concurso', icon: '🏛️' },
  { value: 'tecnico', label: 'Técnico', icon: '🛠️' },
];

const ALL_LEVELS: EducationLevel[] = EDUCATION_LEVEL_META.map(level => level.value);
const VERIFIED_CACHE_MS = 10 * 60 * 1000;
const verifiedLevelsCache = new Map<string, { levels: EducationLevel[]; at: number }>();

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function matchesAny(s: string, terms: string[]): boolean {
  return terms.some(term => s === term || s.includes(term));
}

const ESCOLA_SUBJECTS = [
  'matematica', 'portugues', 'lingua portuguesa', 'redacao', 'gramatica', 'literatura',
  'biologia', 'fisica', 'quimica', 'ciencias', 'ciencias naturais',
  'historia', 'geografia', 'filosofia', 'sociologia', 'ingles', 'espanhol', 'frances',
  'lingua estrangeira', 'artes', 'educacao fisica', 'ensino religioso',
  'algebra', 'geometria', 'trigonometria', 'estatistica', 'probabilidade',
  'informatica', 'tecnologia', 'educacao financeira',
];

const NON_ESCOLA_SUBJECTS = [
  'direito', 'medicina', 'enfermagem', 'odontologia', 'farmacia', 'veterinaria',
  'engenharia', 'arquitetura', 'urbanismo', 'administracao', 'contabilidade',
  'ciencias contabeis', 'economia', 'financas', 'psicologia', 'fisioterapia',
  'nutricao', 'fonoaudiologia', 'terapia ocupacional', 'jornalismo', 'publicidade',
  'relacoes publicas', 'marketing', 'direito penal', 'direito civil',
  'direito constitucional', 'direito administrativo', 'direito tributario',
  'direito trabalhista', 'direito empresarial', 'processo civil', 'processo penal',
  'processo do trabalho', 'ciencia da computacao', 'sistemas de informacao',
  'engenharia de software', 'anatomia', 'fisiologia humana', 'farmacologia',
  'patologia', 'semiologia medica', 'bioquimica', 'microbiologia', 'imunologia',
  'histologia', 'embriologia',
];

const CONCURSO_SIGNALS = [
  'concurso', 'edital', 'banca examinadora', 'prova objetiva', 'questoes de concurso',
  'cespe', 'cebraspe', 'fgv', 'fcc', 'vunesp', 'ibfc', 'direito penal', 'direito civil',
  'direito constitucional', 'direito administrativo', 'direito tributario',
  'direito trabalhista', 'direito previdenciario', 'direito processual',
  'direito eleitoral', 'direito ambiental', 'legislacao especial', 'jurisprudencia',
  'raciocinio logico', 'atualidades', 'conhecimentos gerais', 'conhecimentos bancarios',
  'administracao publica', 'gestao publica', 'policia federal', 'policia civil',
  'policia militar', 'policia rodoviaria federal', 'prf', 'receita federal',
  'tribunal de contas', 'tribunal de justica', 'ministerio publico',
  'defensoria publica', 'inss', 'tj', 'trf', 'tre', 'trt', 'oab', 'perito criminal',
  'pericia criminal', 'auditor fiscal', 'analista judiciario',
];

const TECNICO_SIGNALS = [
  'tecnico em', 'curso tecnico', 'eletrotecnica', 'eletronica', 'eletrica',
  'mecanica industrial', 'mecatronica', 'automacao industrial', 'edificacoes',
  'seguranca do trabalho', 'enfermagem tecnica', 'tecnico de enfermagem',
  'refrigeracao', 'climatizacao', 'soldagem', 'solda', 'hidraulica predial',
  'manutencao industrial', 'redes de computadores', 'informatica tecnica',
  'desenvolvimento de sistemas', 'nr-10', 'nr-35', 'nr10', 'nr35',
];

/** Mantém os cinco níveis no DOM para que os incompatíveis possam ficar disabled. */
export function getAvailableEducationLevels(_subject: string): EducationLevel[] {
  return ALL_LEVELS;
}

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
    const isSuperior = matchesAny(s, NON_ESCOLA_SUBJECTS);

    if (isConcurso) add('concurso');
    if (isTecnico) add('tecnico');
    if (isSuperior) add('faculdade');
    if (isEscola) {
      add('fundamental');
      add('medio');
      if (['matematica', 'fisica', 'quimica', 'biologia'].includes(s)) add('faculdade');
    }
  }

  if (ranked.length === 0) add('faculdade');
  return ranked.length > 0 ? ranked : [available[0]];
}

export function recommendEducationLevel(
  subject: string,
  available: EducationLevel[] = ALL_LEVELS,
): EducationLevel {
  return recommendEducationLevels(subject, available)[0];
}

function hideLegacyDetectedLevelsBlock(): void {
  if (typeof document === 'undefined') return;

  const marker = Array.from(document.querySelectorAll('span')).find(
    node => node.textContent?.trim().toLowerCase().includes('níveis identificados pela ia'),
  );
  const container = marker?.closest('div.space-y-1') as HTMLElement | null;
  if (container) container.style.display = 'none';
}

function applyEducationLevelOptions(): void {
  if (typeof document === 'undefined') return;

  const subjectInput = document.querySelector<HTMLInputElement>('input[list="subject-suggestions"]');
  const select = document.querySelector<HTMLSelectElement>('#education-level');
  if (!select) return;

  const subject = subjectInput?.value?.trim() || '';
  const key = normalize(subject);
  const cached = verifiedLevelsCache.get(key);

  if (key.length < 2 || !cached || Date.now() - cached.at >= VERIFIED_CACHE_MS) {
    select.querySelectorAll('option').forEach(option => {
      option.disabled = false;
      option.title = '';
    });
    return;
  }

  const available = new Set(cached.levels);
  select.querySelectorAll('option').forEach(option => {
    const enabled = available.has(option.value as EducationLevel);
    option.disabled = !enabled;
    option.title = enabled ? '' : 'Este nível não possui grade curricular válida para o assunto informado.';
  });

  // Mantém o select controlado pelo React em um nível que realmente existe.
  if (select.value && !available.has(select.value as EducationLevel) && cached.levels.length > 0) {
    select.value = cached.levels[0];
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function installEducationLevelUIBridge(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if ((window as any).__memoriaFlashEducationLevelBridgeInstalled) return;
  (window as any).__memoriaFlashEducationLevelBridgeInstalled = true;

  const handleVerifiedCurriculum = (event: Event) => {
    const detail = (event as CustomEvent).detail as {
      subject?: string;
      availableLevels?: EducationLevel[];
      verificationFailed?: boolean;
    } | undefined;

    const subject = detail?.subject?.trim() || '';
    const key = normalize(subject);
    if (!key) return;

    // Falha total de servidor/rede não deve bloquear o usuário.
    if (detail?.verificationFailed) {
      verifiedLevelsCache.delete(key);
    } else {
      const levels = Array.isArray(detail?.availableLevels)
        ? detail!.availableLevels!.filter(level => ALL_LEVELS.includes(level))
        : [];
      verifiedLevelsCache.set(key, { levels, at: Date.now() });
    }

    applyEducationLevelOptions();
  };

  window.addEventListener('memoriaflash:curriculum-verified', handleVerifiedCurriculum);

  const attachSubjectInput = () => {
    const input = document.querySelector<HTMLInputElement>('input[list="subject-suggestions"]');
    if (!input) return;

    if (input.dataset.levelVerificationAttached !== '1') {
      input.dataset.levelVerificationAttached = '1';
      input.addEventListener('input', () => {
        // Ao começar uma nova matéria, não carregamos o resultado da matéria
        // anterior. O seletor fica temporariamente livre até a nova grade chegar.
        applyEducationLevelOptions();
      });
    }
  };

  const observer = new MutationObserver(() => {
    attachSubjectInput();
    hideLegacyDetectedLevelsBlock();
    applyEducationLevelOptions();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  attachSubjectInput();
  hideLegacyDetectedLevelsBlock();
  applyEducationLevelOptions();
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', installEducationLevelUIBridge, { once: true });
  } else {
    installEducationLevelUIBridge();
  }
}
