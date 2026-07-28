import { Type } from '@google/genai';
import { aiOrchestrator } from '../index';

export async function quizDiagnosticTask(args: {
  topic: string;
  userAnswers?: { question: string; topic: string; isCorrect: boolean; selectedOption: string }[];
  count?: number;
  difficulty?: string;
  language?: string;
}) {
  const { topic, userAnswers = [], count = 6, difficulty = 'medium', language = 'pt' } = args;
  const langInstruction = language === 'pt' ? 'em Português' : `in ${language}`;

  const systemPrompt = `Você é o mentor diagnóstico do FlashMind AI.
O aluno realizou um quiz de avaliação inicial sobre "${topic}".
Respostas do aluno:
${JSON.stringify(userAnswers, null, 2)}

Sua tarefa:
1. Identifique os tópicos que o aluno domina e os tópicos onde o aluno apresentou lacunas/erros.
2. Escreva uma análise diagnóstica pedagógica motivadora em 'diagnosticSummary'.
3. Crie exatamente ${count} flashcards direcionados para reforçar prioritariamente os tópicos onde o aluno errou ou demonstrou dúvida no nível de dificuldade ${difficulty} ${langInstruction}.`;

  const schemaHint = `{ "diagnosticSummary": string, "masteredTopics": string[], "weakTopics": string[], "cards": [{ "front": string, "back": string, "topic": string, "difficulty": string }] }`;

  const geminiSchema = {
    type: Type.OBJECT,
    properties: {
      diagnosticSummary: { type: Type.STRING },
      masteredTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
      weakTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
      cards: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING },
            topic: { type: Type.STRING },
            difficulty: { type: Type.STRING },
          },
          required: ['front', 'back', 'topic'],
        },
      },
    },
    required: ['diagnosticSummary', 'masteredTopics', 'weakTopics', 'cards'],
  };

  const { data, providerUsed } = await aiOrchestrator.generateJSON({
    systemPrompt,
    userPrompt: `Analise o desempenho e gere os flashcards de recuperação.`,
    schemaHint,
    geminiSchema,
  });

  return { ...(data as object), providerUsed };
}
