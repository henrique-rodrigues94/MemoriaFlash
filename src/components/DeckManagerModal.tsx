import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, BookOpen } from 'lucide-react';
import { Deck, Flashcard } from '../types';

interface DeckManagerModalProps {
  deck: Deck;
  onSaveDeck: (updated: Deck) => void;
  onDeleteDeck: (deckId: string) => void;
  onClose: () => void;
}

export const DeckManagerModal: React.FC<DeckManagerModalProps> = ({
  deck,
  onSaveDeck,
  onDeleteDeck,
  onClose,
}) => {
  const [cards, setCards] = useState<Flashcard[]>([...deck.cards]);
  const [title, setTitle] = useState(deck.title);
  const [category, setCategory] = useState(deck.category);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');

  // Add new card state
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddNewCard = () => {
    if (!newFront.trim() || !newBack.trim()) return;
    const card: Flashcard = {
      id: `card-${Date.now()}`,
      front: newFront,
      back: newBack,
      topic: category,
      difficulty: 'medium',
      reps: 0,
      interval: 0,
      efactor: 2.5,
      dueDate: new Date().toISOString(),
    };
    setCards([...cards, card]);
    setNewFront('');
    setNewBack('');
    setShowAddForm(false);
  };

  const handleStartEditCard = (c: Flashcard) => {
    setEditingCardId(c.id);
    setEditFront(c.front);
    setEditBack(c.back);
  };

  const handleSaveEditCard = (cId: string) => {
    setCards(
      cards.map((c) =>
        c.id === cId ? { ...c, front: editFront, back: editBack } : c
      )
    );
    setEditingCardId(null);
  };

  const handleDeleteCard = (cId: string) => {
    setCards(cards.filter((c) => c.id !== cId));
  };

  const handleSaveAll = () => {
    const updated: Deck = {
      ...deck,
      title,
      category,
      cards,
    };
    onSaveDeck(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0b1a2a] border border-[#adc6ff]/20 rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#424754]/30 pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#60a5fa]" />
            <h3 className="text-lg font-bold">Gerenciador de Deck & Cartões</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Deck metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[#8c91a0] uppercase">Título do Deck</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full mt-1 bg-[#122131] border border-[#424754]/40 rounded-xl p-2.5 text-xs text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#8c91a0] uppercase">Categoria</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 bg-[#122131] border border-[#424754]/40 rounded-xl p-2.5 text-xs text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Card List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#8c91a0] uppercase">
              Lista de Cartões ({cards.length})
            </h4>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs text-[#60a5fa] hover:underline flex items-center gap-1 font-bold"
            >
              <Plus className="w-4 h-4" /> Adicionar Cartão
            </button>
          </div>

          {showAddForm && (
            <div className="p-4 rounded-2xl bg-[#122131] border border-[#60a5fa]/40 space-y-3 animate-fade-in">
              <input
                type="text"
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                placeholder="Pergunta do cartão..."
                className="w-full bg-[#0b1a2a] border border-[#424754]/40 rounded-xl p-2.5 text-xs text-white focus:outline-none"
              />
              <textarea
                rows={2}
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                placeholder="Resposta explicativa..."
                className="w-full bg-[#0b1a2a] border border-[#424754]/40 rounded-xl p-2.5 text-xs text-white focus:outline-none"
              />
              <button
                onClick={handleAddNewCard}
                className="w-full py-2 rounded-xl bg-[#4d8eff] text-white text-xs font-bold"
              >
                Salvar Novo Cartão
              </button>
            </div>
          )}

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {cards.map((c, i) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl bg-[#0b1a2a] border border-[#424754]/30 space-y-2 text-xs"
              >
                {editingCardId === c.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editFront}
                      onChange={(e) => setEditFront(e.target.value)}
                      className="w-full bg-[#122131] border border-[#424754]/40 rounded-lg p-2 text-xs text-white"
                    />
                    <textarea
                      rows={2}
                      value={editBack}
                      onChange={(e) => setEditBack(e.target.value)}
                      className="w-full bg-[#122131] border border-[#424754]/40 rounded-lg p-2 text-xs text-white"
                    />
                    <button
                      onClick={() => handleSaveEditCard(c.id)}
                      className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold"
                    >
                      Salvar Alteração
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-[#8c91a0]">
                      <span className="font-mono text-[10px] font-bold text-[#adc6ff]">
                        #{i + 1} • Repetições SRS: {c.reps || 0}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEditCard(c)}
                          className="p-1 hover:text-white text-[#8c91a0]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCard(c.id)}
                          className="p-1 hover:text-red-400 text-[#8c91a0]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <strong className="text-[#8c91a0]">P:</strong> {c.front}
                    </div>
                    <div>
                      <strong className="text-[#8c91a0]">R:</strong> {c.back}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#424754]/30">
          <button
            onClick={() => {
              if (confirm('Tem certeza que deseja excluir este deck inteiro?')) {
                onDeleteDeck(deck.id);
                onClose();
              }
            }}
            className="px-3.5 py-2 rounded-xl text-red-400 hover:bg-red-500/10 text-xs font-bold transition-colors"
          >
            Excluir Deck
          </button>

          <button
            onClick={handleSaveAll}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/20"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};
