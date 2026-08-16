import React from 'react';
import { Deck, UserStats } from '../types';
import { StudioView } from './StudioView';

interface CurriculumPlannerViewProps {
  decks: Deck[];
  stats: UserStats;
  onSaveNewDeck: (deck: Deck) => void;
  onOpenSubscription?: () => void;
  onOpenAdvanced?: () => void;
}

/**
 * O gerador avançado antigo foi removido do fluxo do usuário.
 * A tela de planejamento agora usa o mesmo estúdio único, com apenas:
 * 1) GERAR COM IA
 * 2) MANUAL
 *
 * Isso evita duas experiências diferentes para a mesma tarefa e mantém
 * banco compartilhado -> grade -> IA como uma única lógica de geração.
 */
export const CurriculumPlannerView: React.FC<CurriculumPlannerViewProps> = ({ decks, stats, onSaveNewDeck, onOpenSubscription }) => (
  <StudioView
    decks={decks}
    stats={stats}
    currentLanguage="pt"
    onSaveNewDeck={onSaveNewDeck}
    onOpenSubscription={onOpenSubscription}
  />
);
