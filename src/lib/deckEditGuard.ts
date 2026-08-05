// ============================================================================
// Helpers puros usados pelo DeckManagerModal para (a) detectar se há
// alterações não salvas antes de fechar/navegar, e (b) validar a edição de
// um cartão antes de aceitar o salvamento. Extraídos como funções puras para
// serem testáveis sem precisar montar o componente React.
// ============================================================================

import { Deck, Flashcard } from '../types';

/** Verdadeiro se o título ou a lista de cartões foram alterados em relação ao deck original. */
export function isDeckDirty(original: Deck, currentTitle: string, currentCards: Flashcard[]): boolean {
  if (currentTitle.trim() !== original.title) return true;
  return JSON.stringify(currentCards) !== JSON.stringify(original.cards);
}

export interface CardEditValidation {
  valid: boolean;
  error?: string;
}

/** Valida os campos de um cartão antes de salvar a edição (pergunta/resposta não podem ficar em branco). */
export function validateCardEdit(front: string, back: string): CardEditValidation {
  if (!front.trim() || !back.trim()) {
    return { valid: false, error: 'Pergunta e resposta não podem ficar em branco.' };
  }
  return { valid: true };
}
