import React from 'react';
import { Play } from 'lucide-react';
import { Deck } from '../types';
import { getDueCardCount, computeDeckMastery } from '../services/srsEngine';

interface DeckCardProps {
  deck: Deck;
  onManageDeck: (deck: Deck) => void;
  onStartStudySession: (deck: Deck) => void;
}

// Card de deck reutilizável — usado tanto na prévia da Home quanto na
// biblioteca completa (DecksLibraryView), evitando duplicar o mesmo markup
// em dois lugares (o que já causou o bug de Home e Baralhos ficarem
// acidentalmente idênticos).
export const DeckCard: React.FC<DeckCardProps> = ({ deck, onManageDeck, onStartStudySession }) => {
  const dueCount = getDueCardCount(deck.cards);
  const mastery = computeDeckMastery(deck.cards);

  return (
    <div className="glass-card rounded-2xl p-5 border border-[#424754]/20 hover:border-[#adc6ff]/40 transition-all flex flex-col justify-between group shadow-lg">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="px-2.5 py-0.5 rounded-md bg-[#122131] text-[#adc6ff] text-[10px] font-mono border border-[#adc6ff]/20">
            {deck.category}
          </span>
          {dueCount > 0 ? (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-extrabold animate-pulse">
              {dueCount} Pendentes
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
              Em Dia
            </span>
          )}
        </div>

        <h3
          onClick={() => onManageDeck(deck)}
          className="text-base font-bold text-white group-hover:text-[#adc6ff] transition-colors cursor-pointer"
        >
          {deck.title}
        </h3>
        <p className="text-xs text-[#8c91a0] line-clamp-2 mt-1">{deck.description}</p>
      </div>

      <div className="mt-5 pt-4 border-t border-[#424754]/20 space-y-3">
        <div>
          <div className="flex justify-between text-[11px] text-[#8c91a0] mb-1 font-medium">
            <span>{deck.cards.length} cartões no total</span>
            <span className="text-[#adc6ff] font-bold">{mastery}% Dominado</span>
          </div>
          <div className="w-full bg-[#122131] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] h-full rounded-full transition-all duration-700"
              style={{ width: `${mastery}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            id={`btn-edit-deck-${deck.id}`}
            onClick={() => onManageDeck(deck)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#c2c6d6] hover:bg-[#122131] hover:text-white transition-colors cursor-pointer"
          >
            Editar Cards
          </button>

          <button
            id={`btn-study-deck-${deck.id}`}
            onClick={() => onStartStudySession(deck)}
            className="px-4 py-2 rounded-xl bg-[#4d8eff] hover:bg-[#3b82f6] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#4d8eff]/20 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" /> Estudar Agora
          </button>
        </div>
      </div>
    </div>
  );
};
