import { AIOrchestrator } from './AIOrchestrator';
import { geminiProvider } from './providers/gemini';
import { openaiProvider } from './providers/openai';
import { AIProvider } from './types';

// ============================================================================
// FILA DE PROVEDORES
// ─────────────────────────────────────────────────────────────────────────────
//   1. Google Gemini (gratuito)  — PROVEDOR PRINCIPAL (camada gratuita AI Studio)
//   2. OpenAI ChatGPT            — FALLBACK IMEDIATO (usa OPENAI_API_KEY)
//
// Apenas estes dois provedores são usados (decisão do usuário). Para adicionar
// outros no futuro, importe aqui e inclua no array abaixo (Adapter Pattern).
// ============================================================================

const orderedProviders: AIProvider[] = [geminiProvider, openaiProvider];

export const aiOrchestrator = new AIOrchestrator(orderedProviders);

export * from './types';
