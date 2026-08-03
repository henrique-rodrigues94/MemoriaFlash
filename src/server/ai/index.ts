import { AIOrchestrator } from './AIOrchestrator';
import { geminiProvider } from './providers/gemini';
import { deepseekProvider } from './providers/deepseek';
import { openaiProvider } from './providers/openai';
import { groqProvider } from './providers/groq';
import { AIProvider } from './types';

// ============================================================================
// FILA DE PROVEDORES
// ─────────────────────────────────────────────────────────────────────────────
//   1. Google Gemini (gratuito)  — PROVEDOR PRINCIPAL (camada gratuita AI Studio)
//   2. DeepSeek                  — SEGUNDO (custo muito baixo, ~$0.07/1M tokens)
//   3. OpenAI ChatGPT            — TERCEIRO (fallback pago)
//   4. Groq (gratuito)           — REDE DE SEGURANÇA GRATUITA (usa GROQ_API_KEY)
//
// O orquestrador tenta cada um em ordem; o primeiro que responder vence.
// Provedores sem chave configurada são pulados automaticamente.
// ============================================================================

const orderedProviders: AIProvider[] = [
  geminiProvider,
  deepseekProvider,
  openaiProvider,
  groqProvider,
];

export const aiOrchestrator = new AIOrchestrator(orderedProviders);

export * from './types';
