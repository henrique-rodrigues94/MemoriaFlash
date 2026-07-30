import React, { useState } from 'react';
import { Target, Sparkles, Plus } from 'lucide-react';

export function QuizView() {
  const [subject, setSubject] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [cardCount, setCardCount] = useState(25);

  const handleAddTopic = () => {
    if (newTopic.trim()) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 text-slate-100">
      {/* CARD PRINCIPAL DO QUIZ */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6">
        {/* Banner/Header da Aba Quiz */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-3 rounded-xl text-center font-bold text-white flex items-center justify-center gap-2 shadow-lg">
          <Target className="w-5 h-5" />
          Quiz Diagnóstico com IA
        </div>

        {/* Campo 1: Matéria / Assunto */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">📖 MATÉRIA / ASSUNTO:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex: Direito Constitucional, Anatomia Humana, Python para Ciência de Dados..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        {/* Campo 2: Tópicos de Estudo Relacionados */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">📚 Tópicos de Estudo Relacionados</label>
            <span className="text-xs text-slate-500">Clique para incluir/excluir</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Adicionar tópico específico..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition text-sm"
            />
            <button
              onClick={handleAddTopic}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>

          {topics.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {topics.map((tp, idx) => (
                <span key={idx} className="bg-slate-800 text-amber-400 text-xs px-3 py-1.5 rounded-lg border border-slate-700">{tp}</span>
              ))}
            </div>
          )}
        </div>

        {/* Campo 3: Quantidade de Cards */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">QUANTIDADE DE CARDS</label>
          <select
            value={cardCount}
            onChange={(e) => setCardCount(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition"
          >
            <option value={10}>10 Flashcards</option>
            <option value={15}>15 Flashcards</option>
            <option value={25}>25 Flashcards (Recomendado)</option>
            <option value={40}>40 Flashcards</option>
          </select>
        </div>

        {/* Bloco Explicativo do Quiz */}
        <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4 text-slate-300 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Target className="w-4 h-4" />
            Como funciona o Quiz Diagnóstico com IA?
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            A IA gerará 4 questões sobre <strong className="text-slate-200">"{subject || 'seu assunto'}"</strong>. Ao responder, a IA fará uma análise imediata das suas lacunas e criará flashcards focando exatamente nos tópicos onde você precisa melhorar!
          </p>

          <button className="w-full mt-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm">
            <Sparkles className="w-4 h-4" />
            Iniciar Quiz Diagnóstico Agora
          </button>
        </div>

      </div>
    </div>
  );
}
