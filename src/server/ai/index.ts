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
import { AIProvider } from './types';

// ============================================================================
// FILA DE PROVEDORES
// ─────────────────────────────────────────────────────────────────────────────
//   1. Google Gemini (gratuito)  — PROVEDOR PRINCIPAL (camada gratuita AI Studio)
//   2. OpenAI ChatGPT            — FALLBACK IMEDIATO (usa OPENAI_API_KEY)
//   3. Groq Llama 3.3            — ultra-rápido, gratuito
//   4. DeepSeek Chat             — qualidade excelente, preço muito baixo
//   5. OpenRouter :free          — agrega modelos gratuitos de vários labs
//   6. Hugging Face              — fallback open-source
//   7. Cohere                    — fallback trial
//   8. FreeLLM                   — sem chave, último recurso sem custo
//   9. Anthropic Claude          — última rede de segurança paga
//
// Se AI_PRIORITIZE_PAID=true, todos os pagos vão para o início da fila.
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

// Ordem padrão: Gemini gratuito primeiro (principal), ChatGPT logo em seguida
// como fallback, e o restante como rede de segurança extra.
const orderedProviders: AIProvider[] = prioritizePaid
  ? [...paidProviders, ...freeProviders]
  : [
      geminiProvider,
      openaiProvider,
      ...freeProviders.filter((p) => p.id !== 'gemini'),
      ...paidProviders.filter((p) => p.id !== 'openai'),
    ];

export const aiOrchestrator = new AIOrchestrator(orderedProviders);

export * from './types';
