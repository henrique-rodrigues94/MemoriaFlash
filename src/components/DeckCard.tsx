// 📁 flashmind-ai/src/components/DeckCard.tsx
import React from 'react';
import { Play, Pencil, Brain, Zap, CheckCircle2 } from 'lucide-react';
import { Deck } from '../types';
import { getDueCardCount, computeDeckMastery } from '../services/srsEngine';

interface DeckCardProps {
  deck: Deck;
  onManageDeck: (deck: Deck) => void;
  onStartStudySession: (deck: Deck) => void;
}

export const DeckCard: React.FC<DeckCardProps> = ({ deck, onManageDeck, onStartStudySession }) => {
  const dueCount  = getDueCardCount(deck.cards);
  const mastery   = computeDeckMastery(deck.cards);
  const total     = deck.cards.length;
  const mastered  = deck.cards.filter(c => (c.reps || 0) >= 3).length;
  const newCards  = deck.cards.filter(c => !c.reps || c.reps === 0).length;

  const masteryColor = mastery >= 70
    ? 'from-emerald-500 to-teal-500'
    : mastery >= 40
      ? 'from-blue-500 to-indigo-500'
      : 'from-amber-500 to-orange-500';

  return (
    <div className="glass-card rounded-2xl border border-[#424754]/20 hover:border-[#adc6ff]/30 transition-all flex flex-col shadow-lg group overflow-hidden">

      {/* Barra de progresso no topo */}
      <div className="h-1 w-full bg-[#122131]">
        <div
          className={`h-full bg-gradient-to-r ${masteryColor} transition-all duration-700`}
          style={{ width: `${mastery}%` }}
        />
      </div>

      <div className="p-5 flex flex-col flex-1 justify-between">
        <div className="space-y-2">
          {/* Tags */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-[#122131] text-[#adc6ff] text-[10px] font-mono border border-[#adc6ff]/20 truncate max-w-[60%]">
              {deck.category}
            </span>
            {dueCount > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-extrabold flex items-center gap-1">
                <Zap className="w-3 h-3" /> {dueCount} pendente{dueCount !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Em dia
              </span>
            )}
          </div>

          {/* Título */}
          <h3
            onClick={() => onManageDeck(deck)}
            className="text-base font-bold text-white group-hover:text-[#adc6ff] transition-colors cursor-pointer leading-snug"
          >
            {deck.title}
          </h3>

          {/* Descrição */}
          {deck.description && (
            <p className="text-xs text-[#8c91a0] line-clamp-2">{deck.description}</p>
          )}
        </div>

        {/* Stats + actions */}
        <div className="mt-4 pt-4 border-t border-[#424754]/20 space-y-3">
          {/* Mini stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-sm font-extrabold text-white">{total}</div>
              <div className="text-[9px] text-slate-600 uppercase font-bold">Total</div>
            </div>
            <div>
              <div className="text-sm font-extrabold text-emerald-400">{mastered}</div>
              <div className="text-[9px] text-slate-600 uppercase font-bold">Dominados</div>
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-400">{newCards}</div>
              <div className="text-[9px] text-slate-600 uppercase font-bold">Novos</div>
            </div>
          </div>

          {/* Mastery bar */}
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-slate-600 flex items-center gap-1">
                <Brain className="w-3 h-3" /> Domínio
              </span>
              <span className={`font-bold ${mastery >= 70 ? 'text-emerald-400' : mastery >= 40 ? 'text-blue-400' : 'text-amber-400'}`}>
                {mastery}%
              </span>
            </div>
            <div className="w-full bg-[#122131] h-1.5 rounded-full overflow-hidden">
              <div
                className={`bg-gradient-to-r ${masteryColor} h-full rounded-full transition-all duration-700`}
                style={{ width: `${mastery}%` }}
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              id={`btn-edit-deck-${deck.id}`}
              onClick={() => onManageDeck(deck)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#8c91a0] hover:bg-[#122131] hover:text-white transition-colors cursor-pointer"
            >
              <Pencil className="w-3 h-3" /> Editar
            </button>

            <button
              id={`btn-study-deck-${deck.id}`}
              onClick={() => onStartStudySession(deck)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all cursor-pointer ${
                dueCount > 0
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              {dueCount > 0 ? `Revisar ${dueCount}` : 'Estudar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
