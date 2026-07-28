import { AIOrchestrator } from './AIOrchestrator';
import { geminiProvider } from './providers/gemini';
import { groqProvider } from './providers/groq';
import { openRouterProvider } from './providers/openrouter';
import { huggingFaceProvider } from './providers/huggingface';
import { cohereProvider } from './providers/cohere';
import { openaiProvider } from './providers/openai';
import { localFallbackProvider } from './providers/localFallback';
import { AIProvider } from './types';

// ============================================================================
// FILA DE PROVEDORES — esta é a ÚNICA lista que você precisa editar para
// mudar a estratégia de fallback do app inteiro.
//
// Ordem padrão: gratuitos primeiro (na ordem de qualidade/velocidade),
// depois o pago opcional (se configurado), e por último o gerador local
// (que nunca falha). Defina AI_PRIORITIZE_PAID=true no .env para usar o
// provedor pago primeiro, mesmo com os gratuitos disponíveis.
// ============================================================================
const freeProviders: AIProvider[] = [geminiProvider, groqProvider, openRouterProvider, huggingFaceProvider, cohereProvider];
const paidProviders: AIProvider[] = [openaiProvider];

const prioritizePaid = process.env.AI_PRIORITIZE_PAID === 'true';

const orderedProviders: AIProvider[] = prioritizePaid
  ? [...paidProviders, ...freeProviders, localFallbackProvider]
  : [...freeProviders, ...paidProviders, localFallbackProvider];

export const aiOrchestrator = new AIOrchestrator(orderedProviders);

export * from './types';
