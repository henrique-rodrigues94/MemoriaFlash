// src/server/schemas/index.ts
import { z } from 'zod';

// ============================================================================
// UTILITÁRIOS DE SANITIZAÇÃO
// ============================================================================

/**
 * Sanitiza uma string: remove espaços extras no início/fim e substitui múltiplos espaços por um.
 */
export const sanitizeString = (value: string): string => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
};

/**
 * Sanitiza um email: remove espaços e converte para minúsculas.
 */
export const sanitizeEmail = (value: string): string => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

/**
 * Sanitiza um objeto de forma recursiva (aplica sanitizeString em todas as strings).
 */
export const sanitizeObject = <T>(obj: T): T => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as any;
  }
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (value && typeof value === 'object') {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
};

// ============================================================================
// SCHEMAS PARA REQUISIÇÕES
// ============================================================================

// --- AI Routes ---
export const generateFlashcardsSchema = z.object({
  body: z.object({
    prompt: z.string().min(10, 'O prompt deve ter pelo menos 10 caracteres'),
    topic: z.string().optional(),
    numberOfCards: z.number().int().min(1).max(50).default(10),
  }),
});

export const suggestTopicsSchema = z.object({
  body: z.object({
    subject: z.string().min(3, 'Assunto deve ter pelo menos 3 caracteres'),
  }),
});

// --- Referral Routes ---
export const createReferralSchema = z.object({
  body: z.object({
    referredEmail: z.string().email('E-mail inválido'),
  }),
});

// --- Health (opcional, sem validação) ---

// ============================================================================
// TIPOS INFERIDOS (para usar nos controllers)
// ============================================================================

export type GenerateFlashcardsBody = z.infer<typeof generateFlashcardsSchema>['body'];
export type SuggestTopicsBody = z.infer<typeof suggestTopicsSchema>['body'];
export type CreateReferralBody = z.infer<typeof createReferralSchema>['body'];