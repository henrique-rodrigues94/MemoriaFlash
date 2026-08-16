import React, { useState } from 'react';
import { CheckCircle2, HelpCircle, Layers, PlusCircle, Sparkles, Trash2 } from 'lucide-react';
import { Flashcard } from '../types';
import { findClosestMatch } from '../lib/spellCheck';

interface ManualCardFormProps {
  existingDecks: string[];
  subjects: string[];
  onAddCardDirectly: (card: Flashcard, deckName: string) => void;
}

export const ManualCardForm: React.FC<ManualCardFormProps> = ({ existingDecks, subjects, onAddCardDirectly }) => {
  const [deckName, setDeckName] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [addedCards, setAddedCards] = useState<Flashcard[]>([]);
  const [deckSuggestion, setDeckSuggestion] = useState<string | null>(null);
  const [subjectSuggestion, setSubjectSuggestion] = useState<string | null>(null);

  const changeDeck = (value: string) => {
    const next = value.toUpperCase();
    setDeckName(next);
    setDeckSuggestion(findClosestMatch(next, existingDecks));
  };

  const changeSubject = (value: string) => {
    const next = value.toUpperCase();
    setSubject(next);
    setSubjectSuggestion(findClosestMatch(next, subjects));
  };

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    if (!deckName.trim() || !subject.trim() || !front.trim() || !back.trim()) {
      alert('Preencha NOME DO BARALHO, MATÉRIA / ASSUNTO, PERGUNTA e RESPOSTA.');
      return;
    }
    const card: Flashcard = {
      id: `manual-card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      subject: subject.trim().toUpperCase(),
      topic: topic.trim().toUpperCase() || 'GERAL',
      front: front.trim(),
      back: back.trim(),
      difficulty: 'medium',
      reps: 0,
      interval: 0,
      efactor: 2.5,
      dueDate: new Date().toISOString(),
    };
    onAddCardDirectly(card, deckName.trim().toUpperCase());
    setAddedCards(current => [...current, card]);
    setFront('');
    setBack('');
  };

  return (
    <div className="space-y-5 text-left">
      <form onSubmit={handleAdd} className="space-y-4">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"><Layers className="h-4 w-4" /> NOME DO BARALHO *</label>
          <input value={deckName} onChange={e => changeDeck(e.target.value)} list="manual-existing-decks" placeholder="DIGITE OU SELECIONE UM BARALHO EXISTENTE..." className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold uppercase text-slate-900 outline-none focus:border-[#6658f5] dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <datalist id="manual-existing-decks">{existingDecks.map((item, index) => <option key={`${item}-${index}`} value={item.toUpperCase()} />)}</datalist>
          {deckSuggestion && deckSuggestion.toUpperCase() !== deckName.trim().toUpperCase() && <button type="button" onClick={() => changeDeck(deckSuggestion!)} className="mt-2 flex items-center gap-2 text-xs font-bold text-[#6658f5]"><Sparkles className="h-3.5 w-3.5" /> VOCÊ QUIS DIZER {deckSuggestion.toUpperCase()}?</button>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">MATÉRIA / ASSUNTO *</label>
          <input value={subject} onChange={e => changeSubject(e.target.value)} list="manual-subjects" placeholder="EX.: DIREITO PENAL, BIOLOGIA..." className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold uppercase text-slate-900 outline-none focus:border-[#6658f5] dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          <datalist id="manual-subjects">{subjects.map((item, index) => <option key={`${item}-${index}`} value={item.toUpperCase()} />)}</datalist>
          {subjectSuggestion && subjectSuggestion.toUpperCase() !== subject.trim().toUpperCase() && <button type="button" onClick={() => changeSubject(subjectSuggestion!)} className="mt-2 flex items-center gap-2 text-xs font-bold text-[#6658f5]"><Sparkles className="h-3.5 w-3.5" /> VOCÊ QUIS DIZER {subjectSuggestion.toUpperCase()}?</button>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">TÓPICO DE ESTUDO</label>
          <input value={topic} onChange={e => setTopic(e.target.value.toUpperCase())} placeholder="EX.: MORFOLOGIA, HOMICÍDIO, MITOCÔNDRIA..." className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold uppercase text-slate-900 outline-none focus:border-[#6658f5] dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"><HelpCircle className="h-4 w-4 text-amber-500" /> PERGUNTA (FRENTE) *</label>
          <textarea rows={3} value={front} onChange={e => setFront(e.target.value)} placeholder="DIGITE A PERGUNTA DO CARD..." className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#6658f5] dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> RESPOSTA (VERSO) *</label>
          <textarea rows={3} value={back} onChange={e => setBack(e.target.value)} placeholder="DIGITE A RESPOSTA DO CARD..." className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#6658f5] dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </div>

        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6658f5] py-4 text-sm font-black text-white shadow-lg shadow-[#6658f5]/20"><PlusCircle className="h-5 w-5" /> ADICIONAR CARD</button>
      </form>

      {addedCards.length > 0 && <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
        <div className="flex items-center justify-between"><h3 className="text-sm font-black text-emerald-800 dark:text-emerald-200">CARDS ADICIONADOS ({addedCards.length})</h3><button type="button" onClick={() => setAddedCards([])} className="text-[11px] font-bold text-slate-500 hover:text-rose-500">LIMPAR LISTA</button></div>
        {addedCards.map((card, index) => <article key={card.id} className="rounded-xl border border-emerald-200 bg-white p-3 dark:border-emerald-900 dark:bg-slate-900"><div className="flex items-start gap-2"><span className="text-[10px] font-black text-emerald-600">#{index + 1}</span><div className="min-w-0 flex-1"><p className="text-xs font-black text-slate-900 dark:text-white">{card.front}</p><p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">{card.back}</p><p className="mt-1 text-[10px] font-bold uppercase text-slate-400">{card.topic}</p></div><button type="button" aria-label="Remover da lista" onClick={() => setAddedCards(current => current.filter(item => item.id !== card.id))} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></div></article>)}
      </section>}
    </div>
  );
};
