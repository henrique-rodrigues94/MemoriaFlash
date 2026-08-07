// 📁 flashmind-ai/src/server/ai/tasks/identifySubjectLevels.ts
//
// Identifica automaticamente quais níveis de ensino fazem sentido para
// uma determinada matéria/assunto digitado pelo usuário.
//
// A IA retorna apenas os níveis relevantes com uma breve justificativa,
// evitando que o usuário precise selecionar manualmente.
//
// Exemplos esperados:
//   "Biologia"         → ['fundamental','medio','faculdade','concurso']
//   "Perito Criminal"  → ['concurso','faculdade']
//   "Inglês"           → ['fundamental','medio','faculdade','tecnico']
//   "Cálculo"          → ['medio','faculdade']
//   "NR-10"            → ['tecnico','concurso']
//   "Direito Penal"    → ['faculdade','concurso']

import { Type } from '@google/genai';
import { aiOrchestrator } from '../index';
import { withCache, CACHE_TTL } from '../cache/aiCache';
import { EducationLevel } from './generateCurriculum';

export interface SubjectLevelInfo {
  level: EducationLevel;
  label: string;
  icon: string;
  reason: string; // breve justificativa (ex: "cobrado no ENEM e vestibulares")
  priority: number; // 1 = principal, 2 = secundário, 3 = possível
}

export interface SubjectLevelsResult {
  levels: SubjectLevelInfo[];
  subjectNormalized: string; // matéria como a IA entendeu (útil para display)
  providerUsed: string;
}

const LEVEL_META: Record<EducationLevel, { label: string; icon: string }> = {
  fundamental: { label: 'Fundamental',  icon: '🏫' },
  medio:       { label: 'Médio',        icon: '📘' },
  faculdade:   { label: 'Faculdade',    icon: '🎓' },
  concurso:    { label: 'Concurso',     icon: '🏛️' },
  tecnico:     { label: 'Técnico',      icon: '🛠️' },
};

const ALL_LEVELS: EducationLevel[] = ['fundamental','medio','faculdade','concurso','tecnico'];

export async function identifySubjectLevelsTask(subject: string): Promise<SubjectLevelsResult> {
  const cacheKey = subject.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const systemPrompt = `Você é um especialista em educação brasileira e concursos públicos.
Sua tarefa: dado um assunto/matéria, identificar quais níveis de ensino essa matéria pertence no Brasil.

NÍVEIS DISPONÍVEIS:
- "fundamental": Ensino Fundamental (1º ao 9º ano, BNCC). Matérias escolares básicas.
- "medio": Ensino Médio (1º ao 3º ano, BNCC, ENEM/vestibular). Matérias da educação básica avançadas.
- "faculdade": Ensino Superior / Graduação universitária. Cursos de graduação, pós, especializações.
- "concurso": Concurso Público. Matérias cobradas por bancas (CESPE, FGV, FCC, VUNESP, IBFC etc.).
- "tecnico": Curso Técnico Profissionalizante (SENAI, SENAC, ETECs). Foco prático/mercado de trabalho.

REGRAS:
- Retorne SOMENTE os níveis onde essa matéria REALMENTE existe/é cobrada.
- Uma matéria pode ter múltiplos níveis (ex: Biologia existe no fundamental, médio, faculdade E concurso).
- Matérias escolares básicas (Matemática, Português, História, Geografia, Ciências) → fundamental + médio + possivelmente concurso.
- Matérias de graduação específicas (Anatomia, Cálculo Avançado, Direito Processual) → faculdade + possivelmente concurso.
- Carreiras/cargos públicos (Perito Criminal, Delegado, Auditor Fiscal) → concurso + faculdade.
- Idiomas (Inglês, Espanhol, Francês) → todos os níveis exceto raramente 'tecnico' puro.
- Normas técnicas (NR-10, NR-35, Soldagem, Eletrotécnica) → tecnico + possivelmente concurso.
- "priority": 1 = nível principal/mais comum, 2 = secundário importante, 3 = também possível.
- "reason": frase curta em português explicando por que esse nível é relevante (máx. 60 caracteres).
- Retorne APENAS JSON válido, sem markdown.`;

  const userPrompt = `Matéria/assunto: "${subject}"

Identifique os níveis de ensino relevantes e retorne JSON:
{
  "subjectNormalized": "nome da matéria como você entendeu (ex: Perito Criminal, Biologia Celular)",
  "levels": [
    {
      "level": "concurso",
      "priority": 1,
      "reason": "principal área de atuação é em concursos de Polícia"
    },
    {
      "level": "faculdade",
      "priority": 2,
      "reason": "conteúdo também cobrado em Criminologia/Ciências Forenses"
    }
  ]
}
Ordene do maior priority (1) para o menor. Inclua apenas níveis genuinamente relevantes.`;

  const geminiSchema = {
    type: Type.OBJECT,
    properties: {
      subjectNormalized: { type: Type.STRING },
      levels: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            level:    { type: Type.STRING },
            priority: { type: Type.NUMBER },
            reason:   { type: Type.STRING },
          },
          required: ['level', 'priority', 'reason'],
        },
        minItems: 1,
        maxItems: 5,
      },
    },
    required: ['subjectNormalized', 'levels'],
  };

  const cached = await withCache(
    'identifySubjectLevels',
    { subject: cacheKey },
    CACHE_TTL.TOPICS * 5,
    async () => {
      const { data, providerUsed } = await aiOrchestrator.generateJSON({
        systemPrompt,
        userPrompt,
        schemaHint: `{ "subjectNormalized": string, "levels": [{ "level": EducationLevel, "priority": number, "reason": string }] }`,
        geminiSchema,
      });

      const raw = data as any;
      const rawLevels: Array<{ level: string; priority: number; reason: string }> =
        Array.isArray(raw?.levels) ? raw.levels : [];

      // Filtra só níveis válidos e garante ordem por priority
      const validLevels = rawLevels
        .filter(l => ALL_LEVELS.includes(l.level as EducationLevel))
        .sort((a, b) => a.priority - b.priority);

      if (validLevels.length === 0) {
        // Fallback: pelo menos faculdade
        return { subjectNormalized: subject, levels: [{ level: 'faculdade', priority: 1, reason: 'nível padrão' }], providerUsed };
      }

      return {
        subjectNormalized: (raw?.subjectNormalized as string) || subject,
        levels: validLevels,
        providerUsed,
      };
    },
  );

  const levels: SubjectLevelInfo[] = cached.levels.map((l: any) => ({
    level: l.level as EducationLevel,
    label: LEVEL_META[l.level as EducationLevel]?.label ?? l.level,
    icon:  LEVEL_META[l.level as EducationLevel]?.icon ?? '📚',
    reason: l.reason ?? '',
    priority: l.priority ?? 2,
  }));

  return {
    levels,
    subjectNormalized: cached.subjectNormalized,
    providerUsed: cached.cacheHit ? 'cache' : cached.providerUsed,
  };
}
