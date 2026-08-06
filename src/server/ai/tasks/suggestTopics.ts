import { Type } from '@google/genai';
import { aiOrchestrator } from '../index';
import { withCache, CACHE_TTL } from '../cache/aiCache';
import { extractArrayField } from '../jsonUtils';

export type EducationLevel = 'fundamental' | 'medio' | 'faculdade';

const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  fundamental: 'Ensino Fundamental (6º ao 9º ano, currículo brasileiro/BNCC)',
  medio: 'Ensino Médio (currículo brasileiro/BNCC)',
  faculdade: 'Ensino Superior / Faculdade (nível universitário/graduação)',
};

export async function suggestTopicsTask(args: {
  title: string;
  language?: string;
  educationLevel?: EducationLevel;
}) {
  const { title, language = 'pt', educationLevel = 'medio' } = args;
  const langInstruction = language === 'pt' ? 'em Português' : `in ${language}`;
  const levelLabel = EDUCATION_LEVEL_LABELS[educationLevel] || EDUCATION_LEVEL_LABELS.medio;

  const systemPrompt = `Você é um assistente pedagógico especialista em currículo educacional.
Sua tarefa é sugerir subtópicos e sub-temas de estudo relevantes para um determinado assunto, ADEQUADOS a um nível de ensino específico.
REGRA CRÍTICA: Retorne APENAS subtópicos específicos relacionados ao assunto "${title}" que sejam efetivamente ensinados no nível "${levelLabel}".
NÃO retorne frases genéricas como "Fundamentos de X" ou "Revisão Geral".
NÃO inclua subtópicos avançados demais (que só aparecem em níveis superiores) nem básicos demais (de níveis anteriores) para o nível pedido.
Cada tópico deve ser um subtema REAL, específico do assunto e do nível de ensino solicitados.`;

  const userPrompt = `Liste de 6 a 8 subtópicos e sub-temas de estudo ESPECÍFICOS e REAIS sobre o assunto "${title}", cobrindo o conteúdo programático típico do nível "${levelLabel}" ${langInstruction}.
Por exemplo, se o assunto for "Anatomia Humana" no Ensino Médio, os subtópicos seriam: "Sistema Cardiovascular", "Sistema Nervoso Central", "Ossos do Crânio", etc.
Se o assunto for "Matemática" no Ensino Fundamental, seriam tópicos como "Frações e Números Decimais", "Equações do 1º Grau", "Geometria Plana e Espacial", etc — nunca conteúdo de Cálculo ou nível universitário.
Se o assunto for "Matemática" na Faculdade, seriam tópicos como "Cálculo Diferencial e Integral", "Álgebra Linear e Matrizes", "Estatística Descritiva", etc.
Retorne subtópicos ESPECÍFICOS para "${title}" no nível "${levelLabel}".`;

  const schemaHint = `{ "topics": string[] } — de 6 a 8 strings com subtópicos específicos do assunto.`;

  const geminiSchema = {
    type: Type.OBJECT,
    properties: {
      topics: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        minItems: 6,
        maxItems: 8,
      },
    },
    required: ['topics'],
  };

  const result = await withCache('suggestTopics', { title, language, educationLevel }, CACHE_TTL.TOPICS, async () => {
    const { data, providerUsed } = await aiOrchestrator.generateJSON({
      systemPrompt,
      userPrompt,
      schemaHint,
      geminiSchema,
    });
    const topics = Array.isArray((data as any)?.topics)
      ? (data as any).topics
      : extractArrayField(data, ['topics', 'suggestions']);
    return { topics, providerUsed };
  });

  return { ...result, providerUsed: result.cacheHit ? 'cache' : result.providerUsed };
}
