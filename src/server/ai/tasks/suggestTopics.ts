import { Type } from '@google/genai';
import { aiOrchestrator } from '../index';
import { withCache, CACHE_TTL } from '../cache/aiCache';
import { extractArrayField } from '../jsonUtils';

export type EducationLevel = 'escola' | 'faculdade' | 'concurso' | 'tecnico';

const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  escola: 'Educação Básica / Escola (Ensino Fundamental e Médio, currículo brasileiro/BNCC)',
  faculdade: 'Ensino Superior / Faculdade (nível universitário/graduação)',
  concurso: 'Preparação para Concurso Público (nível de banca examinadora — questões objetivas estilo CESPE/FGV/FCC, foco em lei seca e jurisprudência/entendimento consolidado quando aplicável)',
  tecnico: 'Curso Técnico / Ensino Técnico Profissionalizante (nível técnico, prático e voltado para o mercado de trabalho)',
};

export async function suggestTopicsTask(args: {
  title: string;
  language?: string;
  educationLevel?: EducationLevel;
}) {
  const { title, language = 'pt', educationLevel = 'escola' } = args;
  const langInstruction = language === 'pt' ? 'em Português' : `in ${language}`;
  const levelLabel = EDUCATION_LEVEL_LABELS[educationLevel] || EDUCATION_LEVEL_LABELS.escola;

  const systemPrompt = `Você é um assistente pedagógico especialista em currículo educacional.
Sua tarefa é sugerir subtópicos e sub-temas de estudo relevantes para um determinado assunto, ADEQUADOS a um nível de ensino específico.
REGRA CRÍTICA: Retorne APENAS subtópicos específicos relacionados ao assunto "${title}" que sejam efetivamente relevantes para "${levelLabel}".
NÃO retorne frases genéricas como "Fundamentos de X" ou "Revisão Geral".
NÃO inclua subtópicos avançados demais (de outro nível) nem básicos demais para o nível pedido.
Cada tópico deve ser um subtema REAL, específico do assunto e do nível de ensino solicitados.`;

  const userPrompt = `Liste de 6 a 8 subtópicos e sub-temas de estudo ESPECÍFICOS e REAIS sobre o assunto "${title}", cobrindo o conteúdo programático típico de "${levelLabel}" ${langInstruction}.
Exemplos de calibragem por nível:
- "Matemática" em Escola: tópicos como "Frações e Números Decimais", "Equações do 1º Grau", "Geometria Plana e Espacial".
- "Matemática" em Faculdade: tópicos como "Cálculo Diferencial e Integral", "Álgebra Linear e Matrizes", "Estatística Descritiva".
- "Direito Constitucional" em Concurso: tópicos como "Controle de Constitucionalidade", "Direitos e Garantias Fundamentais (lei seca)", "Organização dos Poderes — pontos mais cobrados em prova objetiva".
- "Eletrônica" em Técnico: tópicos práticos como "Leitura de Multímetro", "Montagem de Circuitos Básicos", "Normas de Segurança NR-10".
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
