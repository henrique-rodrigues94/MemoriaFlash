import { GoogleGenAI } from '@google/genai';
import { AIProvider, AIProviderError, GenerateJSONParams } from '../types';

// Modelo válido e atual com camada gratuita generosa via Google AI Studio.
// (O scaffold original referenciava "gemini-3.6-flash", que não existe —
// corrigido aqui. Se a Google lançar um modelo mais novo, troque só esta linha.)
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!client) {
    client = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'flashmind-ai' } } });
  }
  return client;
}

export const geminiProvider: AIProvider = {
  id: 'gemini',
  label: 'Google Gemini (gratuito)',
  tier: 'free',
  isConfigured: () => !!process.env.GEMINI_API_KEY,

  async generateJSON(params: GenerateJSONParams): Promise<unknown> {
    const ai = getClient();
    if (!ai) throw new AIProviderError('GEMINI_API_KEY não configurada', 'gemini');

    try {
      const config: Record<string, unknown> = {
        systemInstruction: params.systemPrompt,
        responseMimeType: 'application/json',
      };
      if (params.geminiSchema) {
        config.responseSchema = params.geminiSchema;
      }

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: params.userPrompt,
        config,
      });

      const text = response.text;
      if (!text) throw new Error('Resposta vazia do Gemini');
      return JSON.parse(text);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const isRateLimited = status === 429 || /quota|rate.?limit/i.test(err?.message || '');
      throw new AIProviderError(err?.message || 'Falha ao chamar Gemini', 'gemini', isRateLimited, status);
    }
  },
};
