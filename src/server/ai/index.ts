import { AIOrchestrator } from './AIOrchestrator';
import { geminiProvider } from './providers/gemini';
import { groqProvider } from './providers/groq';
import { openaiProvider } from './providers/openai';
import { AIProvider } from './types';

// ============================================================================
// FILA DE PROVEDORES
// ─────────────────────────────────────────────────────────────────────────────
//   1. Google Gemini (gratuito)  — PROVEDOR PRINCIPAL (camada gratuita AI Studio)
//   2. Groq (gratuito)           — FALLBACK GRATUITO (usa GROQ_API_KEY)
//   3. OpenAI ChatGPT            — FALLBACK PAGO (usa OPENAI_API_KEY)
//
// Para adicionar outros no futuro, importe aqui e inclua no array abaixo
// (Adapter Pattern).
// ============================================================================

const orderedProviders: AIProvider[] = [geminiProvider, groqProvider, openaiProvider];

export const aiOrchestrator = new AIOrchestrator(orderedProviders);

export * from './types';
