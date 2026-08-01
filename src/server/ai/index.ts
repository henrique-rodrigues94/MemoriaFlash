import { AIOrchestrator } from './AIOrchestrator';
import { geminiProvider } from './providers/gemini';
import { groqProvider } from './providers/groq';
import { openRouterProvider } from './providers/openrouter';
import { huggingFaceProvider } from './providers/huggingface';
import { cohereProvider } from './providers/cohere';
import { openaiProvider } from './providers/openai';
import { deepseekProvider } from './providers/deepseek';
import { anthropicProvider } from './providers/anthropic';
import { freeLLMProvider } from './providers/freellm';
import { localFallbackProvider } from './providers/localFallback';
import { AIProvider } from './types';

// ============================================================================
// FILA DE PROVEDORES
// ─────────────────────────────────────────────────────────────────────────────
// Gratuitos (em ordem de qualidade/velocidade):
//   1. Gemini 2.5 Flash  — melhor qualidade gratuita, suporta 32k tokens out
//   2. Groq Llama 3.3    — ultra-rápido, bom para respostas curtas
//   3. DeepSeek Chat     — qualidade excelente, preço muito baixo
//   4. OpenRouter :free  — agrega modelos gratuitos de vários labs
//   5. Hugging Face      — fallback open-source
//   6. Cohere            — fallback trial
//   7. FreeLLM           — sem chave, último recurso sem custo
//
// Pagos (usados quando AI_PRIORITIZE_PAID=true ou todos gratuitos falharem):
//   8. OpenAI GPT-4o-mini
//   9. Anthropic Claude
//
// Local (nunca falha, gera conteúdo heurístico offline):
//  10. LocalFallback
// ============================================================================

const freeProviders: AIProvider[] = [
  geminiProvider,
  groqProvider,
  deepseekProvider,   // barato o suficiente para tratar como "free" em uso normal
  openRouterProvider,
  huggingFaceProvider,
  cohereProvider,
  freeLLMProvider,
];

const paidProviders: AIProvider[] = [
  openaiProvider,
  anthropicProvider,
];

const prioritizePaid = process.env.AI_PRIORITIZE_PAID === 'true';

const orderedProviders: AIProvider[] = prioritizePaid
  ? [...paidProviders, ...freeProviders, localFallbackProvider]
  : [...freeProviders, ...paidProviders, localFallbackProvider];

export const aiOrchestrator = new AIOrchestrator(orderedProviders);

export * from './types';
