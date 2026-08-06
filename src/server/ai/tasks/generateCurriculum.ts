// 📁 flashmind-ai/src/server/ai/tasks/generateCurriculum.ts
import { Type } from '@google/genai';
import { aiOrchestrator } from '../index';
import { withCache, CACHE_TTL } from '../cache/aiCache';

export type EducationLevel = 'fundamental' | 'medio' | 'faculdade' | 'concurso' | 'tecnico';

export interface CurriculumCategory {
  category: string;
  topics: string[];
}

const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  fundamental: 'Ensino Fundamental (1º ao 9º ano, BNCC brasileira)',
  medio:       'Ensino Médio (1º ao 3º ano, BNCC, ENEM/vestibular)',
  faculdade:   'Ensino Superior / Graduação universitária',
  concurso:    'Concurso Público (banca CESPE/FGV/FCC — lei seca, questões objetivas)',
  tecnico:     'Curso Técnico Profissionalizante (prático, mercado de trabalho)',
};

/**
 * Gera um currículo completo e estruturado (categorias + subtópicos) para
 * qualquer matéria + nível de ensino usando IA.
 * O resultado é armazenado no Firestore para não pagar IA duas vezes.
 */
export async function generateCurriculumTask(args: {
  subject: string;
  educationLevel: EducationLevel;
  language?: string;
}): Promise<{ categories: CurriculumCategory[]; providerUsed: string; cacheHit?: boolean }> {
  const { subject, educationLevel, language = 'pt' } = args;
  const levelLabel = EDUCATION_LEVEL_LABELS[educationLevel] ?? EDUCATION_LEVEL_LABELS.medio;
  const langInstruction = language === 'pt' ? 'em Português do Brasil' : `in ${language}`;

  const systemPrompt = `Você é um especialista em currículo educacional brasileiro.
Sua tarefa é gerar uma grade curricular COMPLETA, estruturada em categorias e subtópicos, para uma matéria específica e nível de ensino.
REGRAS:
- Retorne APENAS JSON válido, sem markdown, sem comentários.
- As categorias devem cobrir TODA a grade programática típica da matéria para o nível.
- Cada categoria deve ter entre 3 e 8 subtópicos ESPECÍFICOS (não genéricos).
- Subtópicos devem ser conteúdos REAIS cobrados/ensinados no nível pedido.
- NÃO crie subtópicos como "Revisão Geral", "Fundamentos de X" sem especificidade.
- Para Concurso Público: foque nos tópicos mais cobrados pelas principais bancas.
- Para Técnico: foque em competências práticas e normas técnicas aplicáveis.`;

  const userPrompt = `Gere a grade curricular completa para a matéria "${subject}" no nível "${levelLabel}" ${langInstruction}.
Retorne JSON no formato:
{
  "categories": [
    {
      "category": "Nome da Categoria (ex: Álgebra, Funções, Termodinâmica)",
      "topics": ["Subtópico 1 específico", "Subtópico 2 específico", ...]
    }
  ]
}
De 4 a 10 categorias, cada uma com 3 a 8 subtópicos reais.`;

  const geminiSchema = {
    type: Type.OBJECT,
    properties: {
      categories: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            topics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              minItems: 2,
              maxItems: 10,
            },
          },
          required: ['category', 'topics'],
        },
        minItems: 3,
        maxItems: 12,
      },
    },
    required: ['categories'],
  };

  const schemaHint = `{ "categories": [{ "category": string, "topics": string[] }] }`;

  const result = await withCache(
    'generateCurriculum',
    { subject: subject.toLowerCase().trim(), educationLevel },
    CACHE_TTL.TOPICS * 10, // Cache currículo por muito mais tempo (é estável)
    async () => {
      const { data, providerUsed } = await aiOrchestrator.generateJSON({
        systemPrompt,
        userPrompt,
        schemaHint,
        geminiSchema,
      });

      let categories: CurriculumCategory[] = [];
      if (Array.isArray((data as any)?.categories)) {
        categories = (data as any).categories.filter(
          (c: any) => c?.category && Array.isArray(c?.topics) && c.topics.length > 0,
        );
      }

      if (categories.length === 0) {
        throw new Error('IA não retornou categorias válidas para o currículo.');
      }

      return { categories, providerUsed };
    },
  );

  return {
    categories: result.categories,
    providerUsed: result.cacheHit ? 'cache' : result.providerUsed,
    cacheHit: result.cacheHit,
  };
}
