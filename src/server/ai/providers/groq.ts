import { AIProvider, AIProviderError, GenerateJSONParams } from '../types';
import { buildJSONInstruction, extractJSON } from '../jsonUtils';

// Groq: inferência extremamente rápida (LPU), camada gratuita generosa.
// Crie uma chave grátis em https://console.groq.com/keys
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export const groqProvider: AIProvider = {
  id: 'groq',
  label: 'Groq (Llama 3.3, gratuito)',
  tier: 'free',
  isConfigured: () => !!process.env.GROQ_API_KEY,

  async generateJSON(params: GenerateJSONParams): Promise<unknown> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new AIProviderError('GROQ_API_KEY não configurada', 'groq');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 20000);

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: params.temperature ?? 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: params.systemPrompt + buildJSONInstruction(params.schemaHint) },
            { role: 'user', content: params.userPrompt },
          ],
        }),
        signal: controller.signal,
      });

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
  },
};
