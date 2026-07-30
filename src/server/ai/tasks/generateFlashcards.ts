import { Type } from '@google/genai';
import { aiOrchestrator } from '../index';
import { withCache, CACHE_TTL } from '../cache/aiCache';

export async function generateFlashcardsTask(args: {
  prompt: string;
  count?: number;
  language?: string;
  difficulty?: string;
  selectedTopics?: string[];
}) {
  const { prompt, count = 6, language = 'pt', difficulty = 'medium', selectedTopics = [] } = args;

  const langInstruction = language === 'pt' ? 'em Português' : `in ${language}`;
  const topicsStr =
    selectedTopics.length > 0 ? ` Priorize os subtópicos: ${selectedTopics.join(', ')}.` : '';

  const systemPrompt = `Você é o FlashMind AI, um assistente especialista em criação de flashcards educativos de alta retenção baseados no método de repetição espaçada (SRS SM-2).
Crie exatamente ${count} flashcards sobre o tema/conteúdo "${prompt}" ${langInstruction}.${topicsStr}
Cada flashcard deve conter:
- front: Uma pergunta clara, concisa e instigante.
- back: Uma resposta completa com explicação sucinta e 2-3 pontos-chave em tópicos para facilidade de memorização.
- explanation: Uma explicação detalhada do conceito com um EXEMPLO PRÁTICO do mundo real, clara e didática. Comece com "📘 Explicação:" e depois "💡 Exemplo Prático:".
- curiosity: Uma curiosidade fascinante, surpreendente ou inusitada relacionada ao tema. Deve ser genuinamente interessante e memorável. Comece com "🌟 Curiosidade:".
- topic: Subtópico específico do assunto.
- difficulty: Use sempre "medium".`;

  const schemaHint = `[{ "front": string, "back": string, "explanation": string, "curiosity": string, "topic": string, "difficulty": string }, ...] — um array com exatamente ${count} objetos.`;

  const geminiSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        front: { type: Type.STRING },
        back: { type: Type.STRING },
        explanation: { type: Type.STRING },
        curiosity: { type: Type.STRING },
        topic: { type: Type.STRING },
        difficulty: { type: Type.STRING },
      },
      required: ['front', 'back', 'topic', 'explanation', 'curiosity'],
    },
  };

  const result = await withCache(
    'generateFlashcards',
    { prompt, count, language, difficulty, selectedTopics },
    CACHE_TTL.FLASHCARDS,
    async () => {
      const { data, providerUsed } = await aiOrchestrator.generateJSON({
        systemPrompt,
        userPrompt: prompt,
        schemaHint,
        geminiSchema,
      });
      const cards = Array.isArray(data) ? data : (data as any)?.cards ?? [];
      return { cards, providerUsed };
    }
  );

  return { ...result, providerUsed: result.cacheHit ? 'cache' : result.providerUsed };
}
