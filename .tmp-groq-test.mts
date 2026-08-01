import dotenv from 'dotenv';
dotenv.config();
import { groqProvider } from './src/server/ai/providers/groq.ts';
const systemPrompt = `Você é o FlashMind AI, um assistente especialista em criação de flashcards educativos de alta retenção baseados no método de repetição espaçada (SRS SM-2).
Crie exatamente 2 flashcards sobre o tema/conteúdo "Biologia" em Português.
Cada flashcard deve conter:
- front: Uma PERGUNTA clara, concisa e instigante sobre o conteúdo — NUNCA repita a resposta na pergunta.
- back: A RESPOSTA completa e diferente da pergunta, com explicação sucinta e 2-3 pontos-chave em tópicos.
- topic: Subtópico específico relacionado ao card.
- difficulty: Dificuldade estimada (medium).
REGRA CRÍTICA: O campo "front" deve ser uma PERGUNTA e o campo "back" deve ser a RESPOSTA. Eles jamais devem ter o mesmo texto.`;
const userPrompt = `Tema: Biologia\nSubtópicos prioritários: Células\nGere 2 flashcards com perguntas e respostas distintas entre si.`;
const schemaHint = `[{ "front": string, "back": string, "topic": string, "difficulty": "easy"|"medium"|"hard"|"expert" }, ...] — um array com exatamente 2 objetos ("cards").`;
const res = await groqProvider.generateJSON({ systemPrompt, userPrompt, schemaHint, maxOutputTokens: 4096, timeoutMs: 30000 });
console.log(JSON.stringify(res, null, 2));
