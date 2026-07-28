import { Type } from '@google/genai';
import { aiOrchestrator } from '../index';
import { withCache, CACHE_TTL } from '../cache/aiCache';

export async function suggestTopicsTask(args: { title: string; language?: string }) {
  const { title, language = 'pt' } = args;
  const langInstruction = language === 'pt' ? 'em Português' : `in ${language}`;

  const systemPrompt = `Você é um assistente pedagógico especialista em currículo educacional.`;
  const userPrompt = `Gere de 5 a 7 tópicos e sub-temas de estudo essenciais sobre o assunto "${title}" ${langInstruction}.`;
  const schemaHint = `{ "topics": string[] } — de 5 a 7 strings curtas.`;

  const geminiSchema = {
    type: Type.OBJECT,
    properties: { topics: { type: Type.ARRAY, items: { type: Type.STRING } } },
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
