import { AIProvider, AIProviderError, GenerateJSONParams } from '../types';
import { buildJSONInstruction, extractJSON } from '../jsonUtils';

// Cohere: possui camada gratuita (trial key) generosa para prototipagem.
// Crie uma chave grátis em https://dashboard.cohere.com/api-keys
const MODEL = process.env.COHERE_MODEL || 'command-r';
const ENDPOINT = 'https://api.cohere.com/v2/chat';

export const cohereProvider: AIProvider = {
  id: 'cohere',
  label: 'Cohere Command-R (gratuito)',
  tier: 'free',
  isConfigured: () => !!process.env.COHERE_API_KEY,

  async generateJSON(params: GenerateJSONParams): Promise<unknown> {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) throw new AIProviderError('COHERE_API_KEY não configurada', 'cohere');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 25000);

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
          max_tokens: params.maxOutputTokens ?? 8192,
          messages: [
            { role: 'system', content: params.systemPrompt + buildJSONInstruction(params.schemaHint) },
            { role: 'user', content: params.userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new AIProviderError(`Cohere HTTP ${res.status}: ${body}`, 'cohere', res.status === 429, res.status);
      }

      const data = await res.json();
      const content = data?.message?.content?.[0]?.text ?? data?.text;
      return extractJSON(content);
    } catch (err: any) {
      if (err instanceof AIProviderError) throw err;
      const aborted = err?.name === 'AbortError';
      throw new AIProviderError(aborted ? 'Cohere: timeout' : err?.message || 'Falha ao chamar Cohere', 'cohere');
    } finally {
      clearTimeout(timeout);
    }
  },
};
