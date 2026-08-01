import { Type } from '@google/genai';
import { aiOrchestrator } from '../index';
import { withCache, CACHE_TTL } from '../cache/aiCache';
import { extractArrayField } from '../jsonUtils';

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
    selectedTopics.length > 0
      ? ` Foque OBRIGATORIAMENTE nos seguintes subtópicos: ${selectedTopics.join(', ')}.`
      : '';

  const systemPrompt = `Você é o FlashMind AI, um assistente especialista em criação de flashcards educativos de alta retenção baseados no método de repetição espaçada (SRS SM-2).
Crie exatamente ${count} flashcards sobre o tema/conteúdo "${prompt}" ${langInstruction}.${topicsStr}
Nível de dificuldade dos cartões: ${difficulty} ('easy' - conceitos fundamentais, 'medium' - aplicação prática, 'hard' - exceções e aprofundamento, 'expert' - alto nível técnico e bancas de concurso).
Cada flashcard deve conter:
- front: Uma PERGUNTA clara, concisa e instigante sobre o conteúdo — NUNCA repita a resposta na pergunta.
- back: A RESPOSTA completa e diferente da pergunta, com explicação sucinta e 2-3 pontos-chave em tópicos.
- explanation: Uma EXPLICAÇÃO DIDÁTICA do conceito com pelo menos 1 EXEMPLO PRÁTICO do mundo real (comece com "📘 Explicação:" e inclua "💡 Exemplo:").
- topic: Subtópico específico relacionado ao card.
- difficulty: Dificuldade estimada ('${difficulty}').
REGRA CRÍTICA: O campo "front" deve ser uma PERGUNTA e o campo "back" deve ser a RESPOSTA. Eles jamais devem ter o mesmo texto.`;

  // O userPrompt agora inclui os tópicos selecionados explicitamente
  const userPromptFull =
    selectedTopics.length > 0
      ? `Tema: ${prompt}\nSubtópicos prioritários: ${selectedTopics.join(', ')}\nGere ${count} flashcards com perguntas e respostas distintas entre si.\nINCLUA em cada card o campo "explanation" com uma explicação didática e um exemplo prático.`
      : `Tema: ${prompt}\nGere ${count} flashcards com perguntas e respostas distintas entre si.\nINCLUA em cada card o campo "explanation" com uma explicação didática e um exemplo prático.`;

  const schemaHint = `[{ "front": string, "back": string, "explanation": string, "topic": string, "difficulty": "easy"|"medium"|"hard"|"expert" }, ...] — um array com exatamente ${count} objetos (\"cards\").`;

  const geminiSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        front: { type: Type.STRING },
        back: { type: Type.STRING },
        explanation: { type: Type.STRING },
        topic: { type: Type.STRING },
        difficulty: { type: Type.STRING },
      },
      required: ['front', 'back', 'topic'],
    },
  };

  const result = await withCache(
    'generateFlashcards',
    { prompt, count, language, difficulty, selectedTopics },
    CACHE_TTL.FLASHCARDS,
    async () => {
      const { data, providerUsed } = await aiOrchestrator.generateJSON({
        systemPrompt,
        userPrompt: userPromptFull,
        schemaHint,
        geminiSchema,
      });
      const cards = extractArrayField(data, ['cards', 'flashcards']);
      return { cards, providerUsed };
    }
  );

  return { ...result, providerUsed: result.cacheHit ? 'cache' : result.providerUsed };
}
