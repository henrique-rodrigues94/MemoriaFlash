/**
 * Cliente Gemini direto no browser (client-side).
 * Chamado quando o servidor não consegue atingir a API (bloqueio de rede,
 * chave ausente/inválida no servidor, etc.).
 *
 * Configure VITE_GEMINI_API_KEY no .env para ativar.
 * Chave gratuita: https://aistudio.google.com/apikey
 */

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function getClientKey(): string | null {
  // Suporte a ambas as formas: VITE_ (Vite) e variável hardcoded de fallback
  return (
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    null
  );
}

export function isGeminiClientConfigured(): boolean {
  return !!getClientKey();
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getClientKey();
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada');

  const url = `${GEMINI_ENDPOINT}?key=${apiKey}`;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = (errData as any)?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Gemini API error: ${msg}`);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Resposta vazia do Gemini');
  return text;
}

function parseJSON(raw: string): unknown {
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) text = fenceMatch[1].trim();
  return JSON.parse(text);
}

// ─── Suggest Topics ─────────────────────────────────────────────────────────

export async function geminiSuggestTopics(
  title: string,
  language: string = 'pt'
): Promise<string[]> {
  const langInstruction = language === 'pt' ? 'em Português' : `in ${language}`;

  const systemPrompt = `Você é um assistente pedagógico especialista em currículo educacional.
Retorne APENAS um JSON com o campo "topics" contendo um array de 6 a 8 subtópicos ESPECÍFICOS e REAIS do assunto solicitado.
NÃO use frases genéricas. Cada item deve ser um subtema real e específico.`;

  const userPrompt = `Liste 6 a 8 subtópicos específicos sobre "${title}" ${langInstruction}.
Exemplo: se for "Anatomia Humana" → ["Sistema Cardiovascular", "Sistema Nervoso Central", "Ossos do Crânio", ...]
Responda APENAS com JSON: { "topics": ["...", "..."] }`;

  const raw = await callGemini(systemPrompt, userPrompt);
  const data = parseJSON(raw) as any;
  return data?.topics ?? [];
}

// ─── Generate Flashcards ─────────────────────────────────────────────────────

export async function geminiGenerateFlashcards(
  prompt: string,
  count: number = 25,
  language: string = 'pt',
  difficulty: string = 'medium',
  selectedTopics: string[] = []
): Promise<any[]> {
  const langInstruction = language === 'pt' ? 'em Português' : `in ${language}`;
  const topicsStr =
    selectedTopics.length > 0
      ? ` Foque OBRIGATORIAMENTE nos subtópicos: ${selectedTopics.join(', ')}.`
      : '';

  const systemPrompt = `Você é o MemoriaFlash, especialista em criação de flashcards educativos de alta retenção (SRS SM-2).
Crie exatamente ${count} flashcards sobre "${prompt}" ${langInstruction}.${topicsStr}
Nível de dificuldade: ${difficulty}.
REGRA CRÍTICA: "front" deve ser uma PERGUNTA e "back" deve ser a RESPOSTA — jamais iguais.
Responda APENAS com um array JSON: [{"front":"...","back":"...","topic":"...","difficulty":"${difficulty}"},...]`;

  const userPrompt =
    selectedTopics.length > 0
      ? `Tema: ${prompt}\nSubtópicos: ${selectedTopics.join(', ')}\nGere ${count} flashcards com perguntas e respostas distintas.`
      : `Tema: ${prompt}\nGere ${count} flashcards com perguntas e respostas distintas.`;

  const raw = await callGemini(systemPrompt, userPrompt);
  const data = parseJSON(raw) as any;
  return Array.isArray(data) ? data : data?.cards ?? [];
}

// ─── Generate Quiz ───────────────────────────────────────────────────────────

export async function geminiGenerateQuiz(
  topic: string,
  count: number = 4,
  language: string = 'pt'
): Promise<any[]> {
  const langInstruction = language === 'pt' ? 'em Português' : `in ${language}`;

  const systemPrompt = `Você é um professor criando questões de múltipla escolha.
Responda APENAS com JSON: [{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."},...]`;

  const userPrompt = `Crie ${count} questões de múltipla escolha sobre "${topic}" ${langInstruction}.`;

  const raw = await callGemini(systemPrompt, userPrompt);
  const data = parseJSON(raw) as any;
  return Array.isArray(data) ? data : data?.quiz ?? [];
}
