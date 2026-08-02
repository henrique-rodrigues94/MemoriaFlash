/**
 * Cliente de IA multi-provedor direto no browser.
 * Ordem de tentativa: Groq → OpenRouter → Gemini
 * Configure as chaves VITE_* no .env para ativar cada provedor.
 *
 * Groq     (grátis): https://console.groq.com/keys
 * OpenRouter (grátis): https://openrouter.ai/keys
 * Gemini   (grátis): https://aistudio.google.com/apikey
 */

// ─── Utilitários ─────────────────────────────────────────────────────────────

function getEnv(key: string): string | null {
  return (import.meta as any).env?.[key] || null;
}

function parseJSON(raw: string): unknown {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // tenta direto
  try { return JSON.parse(text); } catch { /* continua */ }
  // extrai primeiro objeto/array balanceado
  for (const start of ['{', '[']) {
    const idx = text.indexOf(start);
    if (idx === -1) continue;
    const close = start === '{' ? '}' : ']';
    let depth = 0;
    for (let i = idx; i < text.length; i++) {
      if (text[i] === start) depth++;
      if (text[i] === close) { depth--; if (depth === 0) { try { return JSON.parse(text.slice(idx, i + 1)); } catch { break; } } }
    }
  }
  throw new Error('JSON inválido na resposta da IA');
}

// ─── Groq ────────────────────────────────────────────────────────────────────

export function isGroqConfigured() { return !!getEnv('VITE_GROQ_API_KEY'); }

async function callGroq(system: string, user: string, model?: string): Promise<unknown> {
  const apiKey = getEnv('VITE_GROQ_API_KEY');
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY não configurada');

  const m = model || getEnv('VITE_GROQ_MODEL') || 'llama-3.3-70b-versatile';

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: m,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system + '\nResponda APENAS com JSON válido, sem markdown.' },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Groq ${res.status}: ${(err as any)?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return parseJSON(data?.choices?.[0]?.message?.content || '');
}

// ─── OpenRouter ───────────────────────────────────────────────────────────────

export function isOpenRouterConfigured() { return !!getEnv('VITE_OPENROUTER_API_KEY'); }

async function callOpenRouter(system: string, user: string, model?: string): Promise<unknown> {
  const apiKey = getEnv('VITE_OPENROUTER_API_KEY');
  if (!apiKey) throw new Error('VITE_OPENROUTER_API_KEY não configurada');

  const m = model || getEnv('VITE_OPENROUTER_MODEL') || 'meta-llama/llama-3.1-8b-instruct:free';

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'MemoriaFlash',
    },
    body: JSON.stringify({
      model: m,
      temperature: 0.7,
      messages: [
        { role: 'system', content: system + '\nResponda APENAS com JSON válido, sem markdown.' },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenRouter ${res.status}: ${(err as any)?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return parseJSON(data?.choices?.[0]?.message?.content || '');
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

export function isGeminiConfigured() { return !!getEnv('VITE_GEMINI_API_KEY'); }

// mantém export antigo para compatibilidade
export const isGeminiClientConfigured = isGeminiConfigured;

async function callGemini(system: string, user: string): Promise<unknown> {
  const apiKey = getEnv('VITE_GEMINI_API_KEY');
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada');

  const model = getEnv('VITE_GEMINI_MODEL') || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { response_mime_type: 'application/json', temperature: 0.7, maxOutputTokens: 4096 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini ${res.status}: ${(err as any)?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Resposta vazia do Gemini');
  return parseJSON(text);
}

// ─── Orquestrador browser (Groq → OpenRouter → Gemini) ───────────────────────

export function isAnyProviderConfigured(): boolean {
  return isGroqConfigured() || isOpenRouterConfigured() || isGeminiConfigured();
}

async function callBestProvider(system: string, user: string): Promise<unknown> {
  const providers: Array<{ name: string; fn: () => Promise<unknown>; check: () => boolean }> = [
    { name: 'Groq',       check: isGroqConfigured,       fn: () => callGroq(system, user) },
    { name: 'OpenRouter', check: isOpenRouterConfigured, fn: () => callOpenRouter(system, user) },
    { name: 'Gemini',     check: isGeminiConfigured,     fn: () => callGemini(system, user) },
  ];

  const errors: string[] = [];
  for (const p of providers) {
    if (!p.check()) continue;
    try {
      const result = await p.fn();
      console.log(`[aiClient] Respondido por ${p.name}`);
      return result;
    } catch (err: any) {
      console.warn(`[aiClient] ${p.name} falhou:`, err.message);
      errors.push(`${p.name}: ${err.message}`);
    }
  }
  throw new Error(`Todos os provedores falharam. ${errors.join(' | ')}`);
}

// ─── Tarefas de alto nível ───────────────────────────────────────────────────

export async function clientSuggestTopics(title: string, language = 'pt'): Promise<string[]> {
  const lang = language === 'pt' ? 'em Português' : `in ${language}`;

  const system = `Você é um assistente pedagógico especialista em currículo educacional.
Retorne APENAS JSON com o campo "topics": array de 6 a 8 subtópicos ESPECÍFICOS e REAIS do assunto.
NÃO use frases genéricas como "Fundamentos de X". Cada item deve ser um subtema real e nomeado.`;

  const user = `Liste 6 a 8 subtópicos específicos sobre "${title}" ${lang}.
Exemplo — se for "Anatomia Humana": ["Sistema Cardiovascular","Sistema Nervoso Central","Ossos do Crânio","Músculos Esqueléticos","Sistema Digestório","Sistema Respiratório"]
Exemplo — se for "Direito Constitucional": ["Princípios Fundamentais","Direitos e Garantias Fundamentais","Organização do Estado","Processo Legislativo","Controle de Constitucionalidade"]
Responda APENAS: { "topics": ["...", "..."] }`;

  const data = await callBestProvider(system, user) as any;
  return data?.topics ?? [];
}

export async function clientGenerateFlashcards(
  prompt: string,
  count = 25,
  language = 'pt',
  difficulty = 'medium',
  selectedTopics: string[] = []
): Promise<any[]> {
  const lang = language === 'pt' ? 'em Português' : `in ${language}`;
  const topicsStr = selectedTopics.length > 0
    ? ` Foque OBRIGATORIAMENTE nos subtópicos: ${selectedTopics.join(', ')}.`
    : '';

  const system = `Você é o MemoriaFlash, especialista em flashcards educativos de alta retenção (SRS SM-2).
Crie exatamente ${count} flashcards sobre "${prompt}" ${lang}.${topicsStr}
Nível de dificuldade: ${difficulty}.
REGRA CRÍTICA: "front" = PERGUNTA específica e objetiva. "back" = RESPOSTA completa e diferente da pergunta.
Os campos front e back JAMAIS podem ter o mesmo texto.
Responda APENAS com JSON: { "cards": [{"front":"...","back":"...","topic":"...","difficulty":"${difficulty}"},...] }`;

  const user = selectedTopics.length > 0
    ? `Tema: ${prompt}\nSubtópicos: ${selectedTopics.join(', ')}\nGere ${count} flashcards com perguntas e respostas distintas.`
    : `Tema: ${prompt}\nGere ${count} flashcards com perguntas e respostas distintas e detalhadas.`;

  const data = await callBestProvider(system, user) as any;
  return Array.isArray(data) ? data : (data?.cards ?? []);
}

export async function clientGenerateQuiz(topic: string, count = 4, language = 'pt'): Promise<any[]> {
  const lang = language === 'pt' ? 'em Português' : `in ${language}`;

  const system = `Você é um professor criando questões de múltipla escolha.
Responda APENAS com JSON: { "quiz": [{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."},...] }`;

  const user = `Crie ${count} questões de múltipla escolha sobre "${topic}" ${lang} com 4 alternativas cada.`;

  const data = await callBestProvider(system, user) as any;
  return Array.isArray(data) ? data : (data?.quiz ?? []);
}

// Exporta geminiClient compat
export { clientSuggestTopics as geminiSuggestTopics, clientGenerateFlashcards as geminiGenerateFlashcards, clientGenerateQuiz as geminiGenerateQuiz };
