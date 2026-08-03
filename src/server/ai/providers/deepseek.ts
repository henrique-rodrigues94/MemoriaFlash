import { AIProvider, AIProviderError, GenerateJSONParams } from '../types';
import { buildJSONInstruction, extractJSON } from '../jsonUtils';

// DeepSeek: excelente qualidade a custo muito baixo (~$0.07/1M tokens).
// API compatível com OpenAI — fácil de integrar.
// Crie sua chave em: https://platform.deepseek.com/api_keys
// Modelos: deepseek-chat (V3, melhor custo-benefício), deepseek-reasoner (R1, raciocínio)
const DEFAULT_MODEL = 'deepseek-chat';
const ENDPOINT = 'https://api.deepseek.com/chat/completions';

// Lido na hora da chamada (lazy) para respeitar o .env carregado no boot.
function getModel(): string {
  return process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;
}

export const deepseekProvider: AIProvider = {
  id: 'deepseek',
  label: 'DeepSeek (pago, custo baixo)',
  tier: 'paid',
  isConfigured: () => !!process.env.DEEPSEEK_API_KEY,

  async generateJSON(params: GenerateJSONParams): Promise<unknown> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new AIProviderError('DEEPSEEK_API_KEY não configurada', 'deepseek');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 30000);

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: getModel(),
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxOutputTokens ?? 8192,
          response_format: { type: 'json_object' },
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
          `DeepSeek HTTP ${res.status}: ${body}`,
          'deepseek',
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
        aborted ? 'DeepSeek: timeout' : err?.message || 'Falha ao chamar DeepSeek',
        'deepseek'
      );
    } finally {
      clearTimeout(timeout);
    }
  },
};
