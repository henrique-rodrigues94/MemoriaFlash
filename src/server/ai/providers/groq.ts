import { AIProvider, AIProviderError, GenerateJSONParams } from '../types';
import { buildJSONInstruction, extractJSON } from '../jsonUtils';

// Groq: inferência extremamente rápida (LPU), camada gratuita generosa.
// Crie uma chave grátis em https://console.groq.com/keys
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// Lido na hora da chamada (lazy) — ver comentário em openrouter.ts.
function getModel(): string {
  return process.env.GROQ_MODEL || DEFAULT_MODEL;
}

// Garante um número mínimo de tentativas ao receber 429 (rate limit). O erro
// do Groq indica "retry in Xs" (TPM/daily resetam em segundos), então em vez
// de desistir na primeira tentativa, aguardamos e tentamos de novo.
async function callGroqOnce(apiKey: string, body: Record<string, unknown>): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (res.status === 429) {
      // Extrai o tempo sugerido de retry do corpo de erro, se existir.
      const errBody = await res.text().catch(() => '');
      let retryAfter = 5; // padrão seguro
      const match = errBody.match(/try again in (\d+(?:\.\d+)?)s/i);
      if (match) retryAfter = Math.min(30, Math.ceil(parseFloat(match[1])) + 1);
      const aiErr = new AIProviderError(
        `Groq HTTP 429: ${errBody.slice(0, 300)}`,
        'groq',
        true,
        429
      );
      (aiErr as any).retryAfterSeconds = retryAfter;
      throw aiErr;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new AIProviderError(`Groq HTTP ${res.status}: ${body}`, 'groq', res.status === 429, res.status);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return extractJSON(content);
  } catch (err: any) {
    if (err instanceof AIProviderError) throw err;
    const aborted = err?.name === 'AbortError';
    throw new AIProviderError(aborted ? 'Groq: timeout' : err?.message || 'Falha ao chamar Groq', 'groq');
  } finally {
    clearTimeout(timeout);
  }
}

// Adiciona um campo auxiliar para o orquestrador poder ler o retry sugerido.
export function getGroqRetrySeconds(err: unknown): number {
  return (err as any)?.retryAfterSeconds ?? 0;
}

export const groqProvider: AIProvider = {
  id: 'groq',
  label: 'Groq (gratuito)',
  tier: 'free',
  isConfigured: () => !!process.env.GROQ_API_KEY,

  async generateJSON(params: GenerateJSONParams): Promise<unknown> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new AIProviderError('GROQ_API_KEY não configurada', 'groq');

    const body = {
      model: getModel(),
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxOutputTokens ?? 8192,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: params.systemPrompt + buildJSONInstruction(params.schemaHint) },
        { role: 'user', content: params.userPrompt },
      ],
    };

    // Até 3 tentativas no total, aguardando o retry sugerido entre elas.
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await callGroqOnce(apiKey, body);
      } catch (err: any) {
        const is429 = err instanceof AIProviderError && err.isRateLimited;
        if (!is429 || attempt === MAX_ATTEMPTS) throw err;
        const wait = getGroqRetrySeconds(err);
        console.warn(`[Groq] Rate limit (tentativa ${attempt}/${MAX_ATTEMPTS}). Aguardando ${wait}s antes de tentar de novo...`);
        await new Promise((resolve) => setTimeout(resolve, wait * 1000));
      }
    }
    throw new AIProviderError('Groq: falha após múltiplas tentativas', 'groq');
  },
};
