import { AIProvider, AIProviderError, GenerateJSONParams } from '../types';
import { extractJSON } from '../jsonUtils';

// Anthropic Claude: alta qualidade, especialmente para raciocínio e instrução.
// Crie sua chave em: https://console.anthropic.com/
// Modelos: claude-3-5-haiku-20241022 (rápido/barato), claude-3-5-sonnet-20241022 (melhor)
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';

export const anthropicProvider: AIProvider = {
  id: 'anthropic',
  label: `Anthropic Claude (${MODEL}, pago)`,
  tier: 'paid',
  isConfigured: () => !!process.env.ANTHROPIC_API_KEY,

  async generateJSON(params: GenerateJSONParams): Promise<unknown> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new AIProviderError('ANTHROPIC_API_KEY não configurada', 'anthropic');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 30000);

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: params.maxOutputTokens ?? 8192,
          temperature: params.temperature ?? 0.7,
          system:
            params.systemPrompt +
            `\n\nVocê DEVE responder APENAS com JSON válido no formato a seguir, sem markdown, sem explicações:\n${params.schemaHint}`,
          messages: [{ role: 'user', content: params.userPrompt }],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new AIProviderError(
          `Anthropic HTTP ${res.status}: ${body}`,
          'anthropic',
          res.status === 429,
          res.status
        );
      }

      const data = await res.json();
      const content = data?.content?.[0]?.text;
      return extractJSON(content);
    } catch (err: any) {
      if (err instanceof AIProviderError) throw err;
      const aborted = err?.name === 'AbortError';
      throw new AIProviderError(
        aborted ? 'Anthropic: timeout' : err?.message || 'Falha ao chamar Anthropic',
        'anthropic'
      );
    } finally {
      clearTimeout(timeout);
    }
  },
};
