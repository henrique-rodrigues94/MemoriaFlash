import React, { useState } from 'react';
import { PlusCircle, HelpCircle, CheckCircle2, Layers } from 'lucide-react';
import { Flashcard } from '../types';

interface ManualCardFormProps {
  existingDecks: string[];
  subjects: string[];
  onAddCardDirectly: (card: Flashcard, deckName: string) => void;
}

export const ManualCardForm: React.FC<ManualCardFormProps> = ({
  existingDecks,
  subjects,
  onAddCardDirectly,
}) => {
  const [deckName, setDeckName] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();

    if (!deckName.trim()) {
      alert('Por favor, informe o Nome do Baralho.');
      return;
    }

    if (!subject.trim() || !front.trim() || !back.trim()) {
      alert('Por favor, preencha a Matéria, a Pergunta e a Resposta.');
      return;
    }

    const newCard: Flashcard = {
      id: `manual-card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      subject: subject.trim(),
      topic: topic.trim() || 'Geral',
      front: front.trim(),
      back: back.trim(),
      difficulty: 'medium',
      reps: 0,
      interval: 0,
      efactor: 2.5,
      dueDate: new Date().toISOString(),
    };

    // Grava o card atribuindo ao Nome do Baralho digitado/selecionado
    onAddCardDirectly(newCard, deckName.trim());

    // Limpa a Pergunta e Resposta para facilitar o cadastro do próximo card do mesmo baralho
    setFront('');
    setBack('');
  };

  return (
    <form onSubmit={handleAddCard} className="space-y-4 text-left">
      {/* Nome do Baralho (Com Autocomplete) */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-blue-400" /> NOME DO BARALHO *
        </label>
        <input
          type="text"
          placeholder="DIGITE OU SELECIONE UM BARALHO EXISTENTE..."
          value={deckName}
          onChange={(e) => setDeckName(e.target.value.toUpperCase())}
          list="existing-decks-list"
          className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white placeholder-[#8c91a0] focus:outline-none focus:border-[#60a5fa] text-sm font-semibold uppercase"
        />
        <datalist id="existing-decks-list">
          {existingDecks.map((deckTitle, i) => (
            <option key={i} value={deckTitle} />
          ))}
        </datalist>
      </div>

      {/* Matéria / Assunto */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5">
          💻 MATÉRIA / ASSUNTO *
        </label>
        <input
          type="text"
          placeholder="EX: DIREITO PENAL, BIOLOGIA..."
          value={subject}
          onChange={(e) => setSubject(e.target.value.toUpperCase())}
          list="subjects-list"
          className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white placeholder-[#8c91a0] focus:outline-none focus:border-[#60a5fa] text-sm uppercase"
        />
        <datalist id="subjects-list">
          {subjects.map((sub, i) => (
            <option key={i} value={sub} />
          ))}
        </datalist>
      </div>

      {/* Tópico */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5">
          🏷️ TÓPICO DE ESTUDO
        </label>
        <input
          type="text"
          placeholder="Ex: Homicídio, Mitocôndria..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white placeholder-[#8c91a0] focus:outline-none focus:border-[#60a5fa] text-sm"
        />
      </div>

      {/* Pergunta */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> PERGUNTA (FRENTE) *
        </label>
        <textarea
          rows={2}
          placeholder="Digite a pergunta do card..."
          value={front}
          onChange={(e) => setFront(e.target.value)}
          className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white placeholder-[#8c91a0] focus:outline-none focus:border-[#60a5fa] text-sm resize-none"
        />
      </div>

      {/* Resposta */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> RESPOSTA (VERSO) *
        </label>
        <textarea
          rows={2}
          placeholder="Digite a resposta do card..."
          value={back}
          onChange={(e) => setBack(e.target.value)}
          className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white placeholder-[#8c91a0] focus:outline-none focus:border-[#60a5fa] text-sm resize-none"
        />
      </div>

      {/* BOTÃO ADICIONAR CARD */}
      <button
        type="submit"
        className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
      >
        <PlusCircle className="w-5 h-5" /> Adicionar Card
      </button>
    </form>
  );
};