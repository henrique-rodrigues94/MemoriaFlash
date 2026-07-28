import { AIProvider, AIProviderError, GenerateJSONParams } from '../types';
import { buildJSONInstruction, extractJSON } from '../jsonUtils';

// Hugging Face Inference (router OpenAI-compatible), camada gratuita com
// limite de requisições. Crie um token grátis (read) em
// https://huggingface.co/settings/tokens
const MODEL = process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct';
const ENDPOINT = 'https://router.huggingface.co/v1/chat/completions';

export const huggingFaceProvider: AIProvider = {
  id: 'huggingface',
  label: `Hugging Face (${MODEL}, gratuito)`,
  tier: 'free',
  isConfigured: () => !!process.env.HUGGINGFACE_API_KEY,

  async generateJSON(params: GenerateJSONParams): Promise<unknown> {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) throw new AIProviderError('HUGGINGFACE_API_KEY não configurada', 'huggingface');

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
        throw new AIProviderError(`Hugging Face HTTP ${res.status}: ${body}`, 'huggingface', res.status === 429, res.status);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      return extractJSON(content);
    } catch (err: any) {
      if (err instanceof AIProviderError) throw err;
      const aborted = err?.name === 'AbortError';
      throw new AIProviderError(aborted ? 'Hugging Face: timeout' : err?.message || 'Falha ao chamar Hugging Face', 'huggingface');
    } finally {
      clearTimeout(timeout);
    }
  },
};
