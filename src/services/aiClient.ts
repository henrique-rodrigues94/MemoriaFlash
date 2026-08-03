/**
 * Cliente de IA direto no browser (fallback quando o servidor falha).
 * Provedor: Google Gemini (grátis).
 * Configure VITE_GEMINI_API_KEY no .env para ativar.
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

// ─── Orquestrador browser (Gemini) ───────────────────────────────────────────

export function isAnyProviderConfigured(): boolean {
  return isGeminiConfigured();
}

async function callBestProvider(system: string, user: string): Promise<unknown> {
  if (!isGeminiConfigured()) {
    throw new Error('VITE_GEMINI_API_KEY não configurada');
  }
  try {
    const result = await callGemini(system, user);
    console.log('[aiClient] Respondido por Gemini');
    return result;
  } catch (err: any) {
    console.warn('[aiClient] Gemini falhou:', err.message);
    throw new Error(`Gemini: ${err.message}`);
  }
}

// ─── Tarefas de alto nível ───────────────────────────────────────────────────

export async function clientGenerateQuiz(topic: string, count = 4, language = 'pt'): Promise<any[]> {
  const lang = language === 'pt' ? 'em Português' : `in ${language}`;

  const system = `Você é um professor criando questões de múltipla escolha.
Responda APENAS com JSON: { "quiz": [{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."},...] }`;

  const user = `Crie ${count} questões de múltipla escolha sobre "${topic}" ${lang} com 4 alternativas cada.`;

  const data = await callBestProvider(system, user) as any;
  return Array.isArray(data) ? data : (data?.quiz ?? []);
}
