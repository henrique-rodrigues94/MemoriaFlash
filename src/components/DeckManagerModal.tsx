import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, BookOpen, AlertTriangle } from 'lucide-react';
import { Deck, Flashcard } from '../types';
import { isDeckDirty, validateCardEdit } from '../lib/deckEditGuard';

interface DeckManagerModalProps {
  deck: Deck;
  onSaveDeck: (updated: Deck) => void;
  onDeleteDeck: (deckId: string) => void;
  onClose: () => void;
  /** Abre a aba Cards (gerador) para adicionar cartões ao deck. */
  onOpenCards?: () => void;
}

export const DeckManagerModal: React.FC<DeckManagerModalProps> = ({
  deck,
  onSaveDeck,
  onDeleteDeck,
  onClose,
  onOpenCards,
}) => {
  const [cards, setCards] = useState<Flashcard[]>([...deck.cards]);
  const [title, setTitle] = useState(deck.title || '');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [editDifficulty, setEditDifficulty] = useState<Flashcard['difficulty']>('medium');
  const [editError, setEditError] = useState<string | null>(null);

  // Add new card state
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // BUG CORRIGIDO: todas as edições (adicionar, editar, excluir cartão) só
  // viviam no estado local `cards` — nada era persistido até o clique em
  // "Salvar Alterações". Fechar o modal pelo X, ou clicar em "Adicionar
  // Cartão" (que fecha e navega para a aba Cards quando `onOpenCards` está
  // definido), descartava silenciosamente qualquer edição feita até ali, sem
  // nenhum aviso. Agora rastreamos se há alterações não salvas...
  const isDirty = isDeckDirty(deck, title, cards);

  const buildUpdatedDeck = (): Deck => ({
    ...deck,
    title: title.trim() || deck.title,
    cards,
  });

  // ...e confirmamos antes de descartar, com opção de salvar antes de sair.
  const handleClose = () => {
    if (!isDirty) {
      onClose();
      return;
    }
    if (confirm('Você tem alterações não salvas neste deck. Deseja sair mesmo assim e perder essas alterações?')) {
      onClose();
    }
  };

  const handleAddNewCard = () => {
    if (!newFront.trim() || !newBack.trim()) return;
    const card: Flashcard = {
      id: `card-${Date.now()}`,
      front: newFront.trim(),
      back: newBack.trim(),
      // Sem tópico próprio: cai no fallback do deck.category (mesmo usado na
      // sessão de estudo), evitando criar um "tópico fantasma" igual ao
      // título do deck e fragmentar o filtro de tópicos.
      subject: deck.category,
      difficulty: 'medium',
      source: 'manual',
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
    setEditFront(c.front || '');
    setEditBack(c.back || '');
    setEditTopic(c.topic || '');
    setEditSubject(c.subject || '');
    setEditExplanation(c.explanation || '');
    setEditDifficulty(c.difficulty || 'medium');
    setEditError(null);
  };

  const handleSaveEditCard = (cId: string) => {
    // BUG CORRIGIDO: não havia validação ao editar — salvar um cartão com
    // pergunta ou resposta em branco criava um card "quebrado" que aparece
    // vazio durante o estudo. Agora bloqueia o salvamento e avisa o usuário.
    const validation = validateCardEdit(editFront, editBack);
    if (!validation.valid) {
      setEditError(validation.error || null);
      return;
    }
    setCards(
      cards.map((c) =>
        c.id === cId
          ? {
              ...c,
              front: editFront.trim(),
              back: editBack.trim(),
              topic: editTopic,
              subject: editSubject,
              explanation: editExplanation,
              difficulty: editDifficulty,
            }
          : c
      )
    );
    setEditingCardId(null);
    setEditError(null);
  };

  const handleDeleteCard = (cId: string) => {
    if (!confirm('Excluir este cartão? Essa ação não pode ser desfeita depois de salvar.')) return;
    setCards(cards.filter((c) => c.id !== cId));
    // Se o card excluído estava em edição, fecha o formulário de edição.
    if (editingCardId === cId) setEditingCardId(null);
  };

  const handleSaveAll = () => {
    onSaveDeck(buildUpdatedDeck());
    onClose();
  };

  // BUG CORRIGIDO: clicar em "Adicionar Cartão" (fluxo com IA) fechava o
  // modal e navegava para a aba Cards imediatamente, descartando qualquer
  // edição pendente nesta tela. Agora salva primeiro, e só então navega.
  const handleOpenCardsFlow = () => {
    if (onOpenCards) {
      if (isDirty) onSaveDeck(buildUpdatedDeck());
      onClose();
      onOpenCards();
    } else {
      setShowAddForm(!showAddForm);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0b1a2a] border border-[#adc6ff]/20 rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#424754]/30 pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#60a5fa]" />
            <h3 className="text-lg font-bold">Gerenciador de Deck & Cartões</h3>
            {isDirty && (
              <span
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30"
                title="Você tem alterações não salvas"
              >
                <AlertTriangle className="w-3 h-3" /> Não salvo
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Deck metadata */}
        <div>
          <label className="text-xs font-bold text-[#8c91a0] uppercase">Título do Deck</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mt-1 bg-[#122131] border border-[#424754]/40 rounded-xl p-2.5 text-xs text-white focus:outline-none"
          />
        </div>

        {/* Card List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#8c91a0] uppercase">
              Lista de Cartões ({cards.length})
            </h4>
            <button
              onClick={handleOpenCardsFlow}
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
                  <div className="space-y-3 border border-emerald-500/40 rounded-xl p-3 bg-[#122131]/70">
                    {/* Pergunta */}
                    <div>
                      <label className="text-[10px] font-bold text-[#8c91a0] uppercase">Pergunta (frente)</label>
                      <textarea
                        rows={2}
                        value={editFront}
                        onChange={(e) => setEditFront(e.target.value)}
                        className="w-full mt-1 bg-[#0b1a2a] border border-[#424754]/40 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#60a5fa]"
                      />
                    </div>

                    {/* Resposta */}
                    <div>
                      <label className="text-[10px] font-bold text-[#8c91a0] uppercase">Resposta (verso)</label>
                      <textarea
                        rows={3}
                        value={editBack}
                        onChange={(e) => setEditBack(e.target.value)}
                        className="w-full mt-1 bg-[#0b1a2a] border border-[#424754]/40 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#60a5fa]"
                      />
                    </div>

                    {/* Tópico e Matéria (mesma linha) */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-[#8c91a0] uppercase">🏷️ Tópico</label>
                        <input
                          type="text"
                          value={editTopic}
                          onChange={(e) => setEditTopic(e.target.value)}
                          className="w-full mt-1 bg-[#0b1a2a] border border-[#424754]/40 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#60a5fa]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#8c91a0] uppercase">💻 Matéria</label>
                        <input
                          type="text"
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          className="w-full mt-1 bg-[#0b1a2a] border border-[#424754]/40 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#60a5fa]"
                        />
                      </div>
                    </div>

                    {/* Explicação & Curiosidade */}
                    <div>
                      <label className="text-[10px] font-bold text-amber-400 uppercase">💡 Explicação & Curiosidade</label>
                      <textarea
                        rows={3}
                        value={editExplanation}
                        onChange={(e) => setEditExplanation(e.target.value)}
                        className="w-full mt-1 bg-[#0b1a2a] border border-amber-500/30 rounded-lg p-2 text-xs text-amber-100/90 focus:outline-none focus:border-amber-500/60"
                      />
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleSaveEditCard(c.id)}
                        className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 inline mr-1" /> Salvar Alteração
                      </button>
                      <button
                        onClick={() => {
                          setEditingCardId(null);
                          setEditError(null);
                        }}
                        className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                    {editError && (
                      <p className="text-[11px] text-rose-400 font-medium">{editError}</p>
                    )}
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        🏷️ {c.topic || 'Sem tópico'}
                      </span>
                    </div>
                    <div>
                      <strong className="text-[#8c91a0]">P:</strong> {c.front}
                    </div>
                    <div>
                      <strong className="text-[#8c91a0]">R:</strong> <span className="whitespace-pre-line">{c.back}</span>
                    </div>
                    {c.explanation && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-100/90 whitespace-pre-line">
                        <strong className="text-amber-400">💡 Explicação & Curiosidade:</strong>
                        <div className="mt-1">{c.explanation}</div>
                      </div>
                    )}
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
