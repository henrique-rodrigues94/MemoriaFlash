import { AIProvider, AIProviderError, GenerateJSONParams } from '../types';
import { extractJSON } from '../jsonUtils';

// Provedor PAGO opcional — usado apenas se OPENAI_API_KEY estiver configurada.
// Ative com AI_PRIORITIZE_PAID=true no .env para usá-lo antes dos gratuitos
// (ex: em produção, quando qualidade > custo). Caso contrário, só entra em
// ação se TODOS os provedores gratuitos falharem — upgrade transparente sem
// alterar nenhuma linha de código do app.
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export const openaiProvider: AIProvider = {
  id: 'openai',
  label: `OpenAI (${MODEL}, pago)`,
  tier: 'paid',
  isConfigured: () => !!process.env.OPENAI_API_KEY,

  async generateJSON(params: GenerateJSONParams): Promise<unknown> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new AIProviderError('OPENAI_API_KEY não configurada', 'openai');

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
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: params.systemPrompt + `\n\nResponda apenas com JSON válido no formato:\n${params.schemaHint}` },
            { role: 'user', content: params.userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new AIProviderError(`OpenAI HTTP ${res.status}: ${body}`, 'openai', res.status === 429, res.status);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      return extractJSON(content);
    } catch (err: any) {
      if (err instanceof AIProviderError) throw err;
      const aborted = err?.name === 'AbortError';
      throw new AIProviderError(aborted ? 'OpenAI: timeout' : err?.message || 'Falha ao chamar OpenAI', 'openai');
    } finally {
      clearTimeout(timeout);
    }
  },
};
