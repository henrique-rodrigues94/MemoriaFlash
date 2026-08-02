import { Type } from '@google/genai';
import { aiOrchestrator } from '../index';

export async function voiceTutorTask(args: { question: string; contextTopic?: string; language?: string }) {
  const { question, contextTopic = 'Geral', language = 'pt' } = args;
  const langInstruction = language === 'pt' ? 'Responda em Português' : `Answer in ${language}`;

  const systemPrompt = `Você é o MemoriaFlash Voice AI Tutor, um mentor de estudos inteligente, conciso, motivador e especialista em neurociência da aprendizagem.
Tópico atual do aluno: ${contextTopic}.
${langInstruction}.
Forneça uma explicação concisa e direta (máximo 120 palavras), fácil de ser ouvida em áudio.
Além disso, se a pergunta for conceitual, gere automaticamente uma proposta de flashcard derivada da resposta para o aluno salvar.`;

  const schemaHint = `{ "answer": string, "aiInsight": string, "suggestedFlashcard"?: { "front": string, "back": string } }`;

  const geminiSchema = {
    type: Type.OBJECT,
    properties: {
      answer: { type: Type.STRING },
      aiInsight: { type: Type.STRING },
      suggestedFlashcard: {
        type: Type.OBJECT,
        properties: { front: { type: Type.STRING }, back: { type: Type.STRING } },
      },
    },
    required: ['answer', 'aiInsight'],
  };

  const { data, providerUsed } = await aiOrchestrator.generateJSON({
    systemPrompt,
    userPrompt: question,
    schemaHint,
    geminiSchema,
  });

  return { ...(data as object), providerUsed };
}
