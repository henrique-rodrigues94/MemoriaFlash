import { AIProvider, AIProviderError, GenerateJSONParams } from '../types';
import { buildJSONInstruction, extractJSON } from '../jsonUtils';

// OpenRouter: agrega dezenas de modelos, vários com tag ":free" (custo zero).
// Crie uma chave grátis em https://openrouter.ai/keys
// A lista de modelos gratuitos muda com frequência — ajuste OPENROUTER_MODEL
// no .env caso o modelo padrão seja descontinuado. Veja modelos disponíveis
// em https://openrouter.ai/models?max_price=0
const MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export const openRouterProvider: AIProvider = {
  id: 'openrouter',
  label: `OpenRouter (${MODEL}, gratuito)`,
  tier: 'free',
  isConfigured: () => !!process.env.OPENROUTER_API_KEY,

  async generateJSON(params: GenerateJSONParams): Promise<unknown> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new AIProviderError('OPENROUTER_API_KEY não configurada', 'openrouter');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 25000);

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.APP_URL || 'https://flashmind.ai',
          'X-Title': 'FlashMind AI',
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: params.temperature ?? 0.7,
          messages: [
            { role: 'system', content: params.systemPrompt + buildJSONInstruction(params.schemaHint) },
            { role: 'user', content: params.userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new AIProviderError(`OpenRouter HTTP ${res.status}: ${body}`, 'openrouter', res.status === 429, res.status);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      return extractJSON(content);
    } catch (err: any) {
      if (err instanceof AIProviderError) throw err;
      const aborted = err?.name === 'AbortError';
      throw new AIProviderError(aborted ? 'OpenRouter: timeout' : err?.message || 'Falha ao chamar OpenRouter', 'openrouter');
    } finally {
      clearTimeout(timeout);
    }
  },
};
