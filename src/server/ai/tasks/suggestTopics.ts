import { Type } from '@google/genai';
import { aiOrchestrator } from '../index';
import { withCache, CACHE_TTL } from '../cache/aiCache';

export async function suggestTopicsTask(args: { title: string; language?: string }) {
  const { title, language = 'pt' } = args;
  const langInstruction = language === 'pt' ? 'em Português' : `in ${language}`;

  const systemPrompt = `Você é um assistente pedagógico especialista em currículo educacional.
Sua tarefa é sugerir subtópicos e sub-temas de estudo relevantes para um determinado assunto.
REGRA CRÍTICA: Retorne APENAS subtópicos específicos relacionados ao assunto "${title}". 
NÃO retorne frases genéricas como "Fundamentos de X" ou "Revisão Geral".
Cada tópico deve ser um subtema REAL e específico do assunto solicitado.`;

  const userPrompt = `Liste de 6 a 8 subtópicos e sub-temas de estudo ESPECÍFICOS e REAIS sobre o assunto "${title}" ${langInstruction}.
Por exemplo, se o assunto for "Anatomia Humana", os subtópicos seriam: "Sistema Cardiovascular", "Sistema Nervoso Central", "Ossos do Crânio", etc.
Se o assunto for "Direito Constitucional", seriam: "Princípios Fundamentais", "Direitos e Garantias Fundamentais", "Organização do Estado", etc.
Retorne subtópicos ESPECÍFICOS para "${title}".`;

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

  const result = await withCache('suggestTopics', { title, language }, CACHE_TTL.TOPICS, async () => {
    const { data, providerUsed } = await aiOrchestrator.generateJSON({
      systemPrompt,
      userPrompt,
      schemaHint,
      geminiSchema,
    });
    const topics = (data as any)?.topics ?? (Array.isArray(data) ? data : []);
    return { topics, providerUsed };
  });

  return { ...result, providerUsed: result.cacheHit ? 'cache' : result.providerUsed };
}
