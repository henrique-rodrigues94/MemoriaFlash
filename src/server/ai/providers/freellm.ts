import { AIProvider, AIProviderError, GenerateJSONParams } from '../types';
import { buildJSONInstruction, extractJSON } from '../jsonUtils';

// FreeLLM: endpoint público sem autenticação para prototipagem.
// Baseado em https://api.freellm.com — sem necessidade de chave de API.
// Limite: baixo throughput, bom para desenvolvimento/fallback emergencial.
// Ative com FREELLM_ENABLED=true no .env
const MODEL = process.env.FREELLM_MODEL || 'llama3-8b';
const ENDPOINT = 'https://api.freellm.com/v1/chat/completions';

export const freeLLMProvider: AIProvider = {
  id: 'freellm',
  label: `FreeLLM (${MODEL}, sem chave)`,
  tier: 'free',
  isConfigured: () => process.env.FREELLM_ENABLED === 'true',

  async generateJSON(params: GenerateJSONParams): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 20000);

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          temperature: params.temperature ?? 0.7,
          messages: [
            {
              role: 'system',
              content: params.systemPrompt + buildJSONInstruction(params.schemaHint),
            },
            { role: 'user', content: params.userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new AIProviderError(
          `FreeLLM HTTP ${res.status}: ${body}`,
          'freellm',
          res.status === 429,
          res.status
        );
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      return extractJSON(content);
    } catch (err: any) {
      if (err instanceof AIProviderError) throw err;
      const aborted = err?.name === 'AbortError';
      throw new AIProviderError(
        aborted ? 'FreeLLM: timeout' : err?.message || 'Falha ao chamar FreeLLM',
        'freellm'
      );
    } finally {
      clearTimeout(timeout);
    }
  },
};
