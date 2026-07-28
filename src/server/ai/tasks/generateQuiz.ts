import { Type } from '@google/genai';
import { aiOrchestrator } from '../index';
import { withCache, CACHE_TTL } from '../cache/aiCache';

export async function generateQuizTask(args: { topic?: string; count?: number; language?: string }) {
  const { topic = 'Conhecimentos Gerais e Ciência', count = 5, language = 'pt' } = args;
  const langInstruction = language === 'pt' ? 'em Português' : `in ${language}`;

  const systemPrompt = `Você é o gerador de questões do FlashMind Duel Arena.
Gere ${count} perguntas de múltipla escolha competitivas sobre o tema "${topic}" ${langInstruction}.
Cada questão deve ter exatamente 4 alternativas (A, B, C, D) e indicar o índice correto (0 para A, 1 para B, 2 para C, 3 para D).`;

  const schemaHint = `[{ "question": string, "options": string[4], "correctIndex": number, "explanation": string }, ...] — exatamente ${count} itens ("quiz").`;

  const geminiSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING },
        options: { type: Type.ARRAY, items: { type: Type.STRING } },
        correctIndex: { type: Type.INTEGER },
        explanation: { type: Type.STRING },
      },
      required: ['question', 'options', 'correctIndex', 'explanation'],
    },
  };

  const result = await withCache('generateQuiz', { topic, count, language }, CACHE_TTL.QUIZ, async () => {
    const { data, providerUsed } = await aiOrchestrator.generateJSON({
      systemPrompt,
      userPrompt: `Gere um quiz desafiador de ${count} perguntas sobre ${topic}.`,
      schemaHint,
      geminiSchema,
    });
    const quiz = Array.isArray(data) ? data : (data as any)?.quiz ?? [];
    return { quiz, providerUsed };
  });

  return { ...result, providerUsed: result.cacheHit ? 'cache' : result.providerUsed };
}
