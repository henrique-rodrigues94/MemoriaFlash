import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Flashcard } from '../types';

const addDocMock = vi.fn(async (...args: unknown[]) => ({ id: 'feedback-1', args }));

vi.mock('firebase/firestore', () => ({
  addDoc: (...args: unknown[]) => addDocMock(...args),
  collection: (...args: unknown[]) => args,
}));

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: { uid: 'user-1', isAnonymous: false } },
  db: {},
}));

vi.mock('./storage', () => ({
  getStoredDecks: () => [],
}));

function aiCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'ai-card-1',
    front: 'Pergunta gerada por IA',
    back: 'Resposta',
    topic: 'Biologia',
    subject: 'Biologia Celular',
    source: 'ai',
    reps: 0,
    interval: 0,
    efactor: 2.5,
    dueDate: new Date().toISOString(),
    ...overrides,
  };
}

describe('submitStudyCardFeedback', () => {
  beforeEach(() => {
    addDocMock.mockClear();
  });

  it('rejeita cards criados manualmente — o relato serve apenas para curadoria de conteúdo de IA', async () => {
    const { submitStudyCardFeedback } = await import('./studyCardFeedback');
    const manualCard = aiCard({ id: 'manual-card-1', source: 'manual' });

    await expect(
      submitStudyCardFeedback({ reason: 'wrong_answer', card: manualCard })
    ).rejects.toThrow(/não podem ser relatados/i);

    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('envia o feedback normalmente para um card gerado por IA', async () => {
    const { submitStudyCardFeedback } = await import('./studyCardFeedback');
    const card = aiCard();

    await submitStudyCardFeedback({ reason: 'confusing_question', card, comment: 'Explicação confusa', subject: 'Biologia Celular', deckId: 'deck-1' });

    expect(addDocMock).toHaveBeenCalledTimes(1);
    const call = addDocMock.mock.calls[0] as unknown[];
    const payload = call[1];
    expect(payload).toMatchObject({
      reportType: 'card_problem',
      cardId: 'ai-card-1',
      reason: 'confusing_question',
      comment: 'Explicação confusa',
      deckId: 'deck-1',
    });
  });

  it('cards antigos sem "source" (decks anteriores a este campo) são tratados como IA e podem ser relatados', async () => {
    const { submitStudyCardFeedback } = await import('./studyCardFeedback');
    const legacyCard = aiCard({ id: 'legacy-card-1', source: undefined });

    await submitStudyCardFeedback({ reason: 'other', card: legacyCard });

    expect(addDocMock).toHaveBeenCalledTimes(1);
  });
});
