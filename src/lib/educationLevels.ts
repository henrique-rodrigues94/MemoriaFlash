// 📁 flashmind-ai/src/lib/educationLevels.ts
/**
 * Níveis de ensino disponíveis para geração de flashcards.
 *
 * A tela de geração usa duas fontes para decidir o que pode ser selecionado:
 * 1. IA (/api/subject-levels) para identificar os níveis realmente pertinentes.
 * 2. Grade curricular (/api/curriculum) para confirmar que existe conteúdo
 *    utilizável naquele nível.
 *
 * Enquanto a verificação online não termina, mantemos uma heurística local
 * como fallback para não bloquear o usuário por uma falha momentânea da API.
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

// Resultado confirmado pela IA + grade curricular.
const verifiedLevelsCache = new Map<string, { levels: EducationLevel[]; at: number }>();
const pendingChecks = new Map<string, ReturnType<typeof setTimeout>>();

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function matchesAny(s: string, terms: string[]): boolean {
  return terms.some(term => s === term || s.includes(term));
}

// Matérias clássicas da Educação Básica.
const ESCOLA_SUBJECTS = [
  'matematica', 'portugues', 'lingua portuguesa', 'redacao', 'gramatica', 'literatura',
  'biologia', 'fisica', 'quimica', 'ciencias', 'ciencias naturais',
  'historia', 'geografia', 'filosofia', 'sociologia',
  'ingles', 'espanhol', 'frances', 'lingua estrangeira',
  'artes', 'educacao fisica', 'ensino religioso',
  'algebra', 'geometria', 'trigonometria', 'estatistica', 'probabilidade',
  'informatica', 'tecnologia', 'educacao financeira',
];

// Assuntos que não pertencem normalmente ao currículo da Educação Básica.
const NON_ESCOLA_SUBJECTS = [
  'direito', 'medicina', 'enfermagem', 'odontologia', 'farmacia', 'veterinaria',
  'engenharia', 'arquitetura', 'urbanismo', 'administracao', 'contabilidade',
  'ciencias contabeis', 'economia', 'financas', 'psicologia', 'fisioterapia',
  'nutricao', 'fonoaudiologia', 'terapia ocupacional', 'jornalismo',
  'publicidade', 'relacoes publicas', 'marketing',
  'direito penal', 'direito civil', 'direito constitucional', 'direito administrativo',
  'direito tributario', 'direito trabalhista', 'direito empresarial', 'processo civil',
  'processo penal', 'processo do trabalho', 'medicina veterinaria',
  'ciencia da computacao', 'sistemas de informacao', 'engenharia de software',
  'anatomia', 'fisiologia humana', 'farmacologia', 'patologia', 'semiologia medica',
  'bioquimica', 'microbiologia', 'imunologia', 'histologia', 'embriologia',
];

const CONCURSO_SIGNALS = [
  'concurso', 'edital', 'banca examinadora', 'prova objetiva', 'questoes de concurso',
  'cespe', 'cebraspe', 'fgv', 'fcc', 'vunesp', 'ibfc', 'instituto ao cp',
  'direito penal', 'direito civil', 'direito constitucional', 'direito administrativo',
  'direito tributario', 'direito trabalhista', 'direito previdenciario',
  'direito processual', 'direito eleitoral', 'direito ambiental', 'legislacao especial',
  'jurisprudencia', 'raciocinio logico', 'atualidades', 'conhecimentos gerais',
  'conhecimentos bancarios', 'administracao publica', 'gestao publica',
  'policia federal', 'policia civil', 'policia militar', 'policia rodoviaria federal',
  'prf', 'receita federal', 'tribunal de contas', 'tribunal de justica',
  'ministerio publico', 'defensoria publica', 'inss', 'tj', 'trf', 'tre', 'trt', 'oab',
  'perito criminal', 'pericia criminal', 'auditor fiscal', 'analista judiciario',
];

const TECNICO_SIGNALS = [
  'tecnico em', 'curso tecnico', 'eletrotecnica', 'eletronica', 'eletrica',
  'mecanica industrial', 'mecatronica', 'automacao industrial', 'edificacoes',
  'seguranca do trabalho', 'enfermagem tecnica', 'tecnico de enfermagem',
  'refrigeracao', 'climatizacao', 'soldagem', 'solda', 'hidraulica predial',
  'manutencao industrial', 'redes de computadores', 'informatica tecnica',
  'desenvolvimento de sistemas', 'nr-10', 'nr-35', 'nr10', 'nr35',
];

/**
 * Heurística local usada somente como fallback enquanto a verificação da IA
 * ainda não respondeu.
 */
export function getAvailableEducationLevels(subject: string): EducationLevel[] {
  const s = normalize(subject);
  if (s.length < 3) return ALL_LEVELS;

  const verified = verifiedLevelsCache.get(s);
  if (verified && Date.now() - verified.at < VERIFIED_CACHE_MS) {
    // O select precisa manter TODOS os níveis no DOM para poder desabilitar os
    // que não foram validados. A lista confirmada é aplicada pelo bridge visual.
    return ALL_LEVELS;
  }

  // Fallback local: não remove níveis quando a classificação é incerta.
  // Apenas evita Fundamental/Médio em matérias claramente superiores.
  if (matchesAny(s, NON_ESCOLA_SUBJECTS)) {
    return ALL_LEVELS.filter(level => level !== 'fundamental' && level !== 'medio');
  }

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
      // Muitas matérias escolares também aparecem no superior.
      if (s === 'matematica' || s === 'fisica' || s === 'quimica' || s === 'biologia') add('faculdade');
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

/**
 * Consulta a IA e, em seguida, confirma a existência de uma grade curricular.
 * Só níveis identificados pela IA E com grade válida ficam habilitados.
 */
async function verifySubjectLevels(subject: string): Promise<EducationLevel[] | null> {
  const key = normalize(subject);
  if (key.length < 2) return null;

  const cached = verifiedLevelsCache.get(key);
  if (cached && Date.now() - cached.at < VERIFIED_CACHE_MS) return cached.levels;

  try {
    const levelResponse = await fetch(`/api/subject-levels?subject=${encodeURIComponent(subject.trim())}`);
    if (!levelResponse.ok) return null;
    const levelData = await levelResponse.json();
    const identified: EducationLevel[] = Array.isArray(levelData?.levels)
      ? levelData.levels
          .map((item: any) => item?.level as EducationLevel)
          .filter((level: EducationLevel) => ALL_LEVELS.includes(level))
      : [];

    if (identified.length === 0) return [];

    const checks = await Promise.allSettled(
      identified.map(async level => {
        const response = await fetch(
          `/api/curriculum?subject=${encodeURIComponent(subject.trim())}&level=${encodeURIComponent(level)}`,
        );
        if (!response.ok) return { level, valid: false };
        const data = await response.json();
        const valid = Array.isArray(data?.categories)
          && data.categories.some((category: any) => Array.isArray(category?.topics) && category.topics.length > 0);
        return { level, valid };
      }),
    );

    const successfulChecks = checks.filter(result => result.status === 'fulfilled') as PromiseFulfilledResult<{ level: EducationLevel; valid: boolean }>[];

    // Se a API de currículo falhou inteira, não transformamos uma falha de
    // rede em bloqueio. Nesse caso a classificação da IA continua sendo o
    // melhor fallback disponível.
    const levels = successfulChecks.length > 0
      ? successfulChecks.filter(result => result.value.valid).map(result => result.value.level)
      : identified;

    verifiedLevelsCache.set(key, { levels, at: Date.now() });
    return levels;
  } catch {
    return null;
  }
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
    const value = option.value as EducationLevel;
    const enabled = available.has(value);
    option.disabled = !enabled;
    option.title = enabled ? '' : 'Este nível não possui uma grade curricular válida para o assunto informado.';
  });

  if (select.value && !available.has(select.value as EducationLevel) && cached.levels.length > 0) {
    const firstAvailable = cached.levels[0];
    select.value = firstAvailable;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function scheduleVerification(subject: string): void {
  const key = normalize(subject);
  if (key.length < 2) {
    applyEducationLevelOptions();
    return;
  }

  const oldTimer = pendingChecks.get(key);
  if (oldTimer) clearTimeout(oldTimer);

  const timer = setTimeout(async () => {
    pendingChecks.delete(key);
    await verifySubjectLevels(subject);
    applyEducationLevelOptions();
  }, 450);
  pendingChecks.set(key, timer);
}

/**
 * Bridge de compatibilidade da tela atual: mantém o processamento de IA e da
 * grade curricular existentes, mas transforma o resultado em opções realmente
 * habilitadas/desabilitadas no seletor e remove o antigo bloco redundante de
 * "Níveis identificados pela IA".
 *
 * Isso permite melhorar a regra sem duplicar a tela StudioView inteira.
 */
function installEducationLevelUIBridge(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if ((window as any).__memoriaFlashEducationLevelBridgeInstalled) return;
  (window as any).__memoriaFlashEducationLevelBridgeInstalled = true;

  const attachSubjectInput = () => {
    const input = document.querySelector<HTMLInputElement>('input[list="subject-suggestions"]');
    if (!input || input.dataset.levelVerificationAttached === '1') return;
    input.dataset.levelVerificationAttached = '1';
    input.addEventListener('input', () => {
      const subject = input.value.trim();
      applyEducationLevelOptions();
      scheduleVerification(subject);
    });
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
