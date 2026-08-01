import { Flashcard } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export const getAITopicSuggestions = (subject: string): string[] => {
  if (!subject.trim()) return [];
  return [
    `Conceitos Principais de ${subject}`,
    `Fundamentos de ${subject}`,
    `Aplicações Práticas`,
    `Regras e Exceções`,
    `Exercícios e Questões Frequentes`
  ];
};

export const generateAICards = async (
  subject: string,
  topics: string[],
  count: number
): Promise<Flashcard[]> => {
  if (!API_KEY) {
    throw new Error('Chave de API não configurada. Adicione VITE_GEMINI_API_KEY no arquivo .env.local.');
  }

  const topicsList = topics.length > 0 ? topics.join(', ') : 'Tópicos gerais da matéria';

  const prompt = `Você é um assistente educacional especialista em criar flashcards de alta performance para estudos.
Crie exatamente ${count} flashcards de estudo sobre a matéria "${subject}", focando nos tópicos: [${topicsList}].

REGRAS OBRIGATÓRIAS:
1. Retorne APENAS um array JSON válido sem nenhum texto descritivo antes ou depois.
2. Não utilize marcações como \`\`\`json ou \`\`\`.
3. Siga estritamente esta estrutura JSON para cada item:
[
  {
    "subject": "${subject}",
    "topic": "Nome do tópico específico",
    "front": "Pergunta objetiva e direta",
    "back": "Resposta clara",
    "explanation": "Explicação detalhada e didática do conceito",
    "example": "Exemplo prático de aplicação ou situação real",
    "curiosity": "Curiosidade, fato interessante ou dica de memorização sobre o assunto"
  }
]`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Erro na requisição da IA (${response.status})`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  const parsedCards = JSON.parse(cleanJson);

  if (!Array.isArray(parsedCards)) {
    throw new Error('A IA não retornou um formato de lista válido.');
  }

  return parsedCards.map((item: any, idx: number) => ({
    id: `ai-card-${Date.now()}-${idx}`,
    subject: item.subject || subject,
    topic: item.topic || topics[0] || subject,
    front: item.front,
    back: item.back,
    explanation: item.explanation || '',
    example: item.example || '',
    curiosity: item.curiosity || '',
    difficulty: 'medium',
    reps: 0,
    interval: 0,
    efactor: 2.5,
    dueDate: new Date().toISOString(),
  }));
};