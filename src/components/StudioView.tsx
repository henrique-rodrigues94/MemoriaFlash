import React, { useState } from 'react';
import { Sparkles, FileText, Wand2, Plus } from 'lucide-react';

export function StudioView() {
  const [mainTab, setMainTab] = useState<'ai' | 'manual'>('ai');
  const [generatorMode, setGeneratorMode] = useState<'direct' | 'scanner'>('direct');

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
      <div className="flex justify-center">
        <div className="inline-flex bg-slate-900/80 p-1 rounded-full border border-slate-800">
          <button
            onClick={() => setMainTab('ai')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              mainTab === 'ai' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            Gerador IA
          </button>
          <button
            onClick={() => setMainTab('manual')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              mainTab === 'manual' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            Manual
          </button>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800/80 mb-6">
          <button
            onClick={() => setGeneratorMode('direct')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
              generatorMode === 'direct' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            Geração Direta por Tópicos
          </button>

          <button
            onClick={() => setGeneratorMode('scanner')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
              generatorMode === 'scanner' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            Scanner / Upload de Documento
          </button>
        </div>

        {generatorMode === 'direct' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">📖 MATÉRIA / ASSUNTO:</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Direito Constitucional, Anatomia Humana, Python para Ciência de Dados..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

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
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition text-sm"
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
                    <span key={idx} className="bg-slate-800 text-blue-400 text-xs px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">{tp}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">QUANTIDADE DE CARDS</label>
              <select
                value={cardCount}
                onChange={(e) => setCardCount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              >
                <option value={10}>10 Flashcards</option>
                <option value={15}>15 Flashcards</option>
                <option value={25}>25 Flashcards (Recomendado)</option>
                <option value={40}>40 Flashcards</option>
              </select>
            </div>

            <button className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-base">
              <Sparkles className="w-5 h-5" /> Gerar Flashcards com IA
            </button>
          </div>
        )}

        {generatorMode === 'scanner' && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-8 text-center bg-slate-950/40 transition cursor-pointer group">
              <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-white font-medium text-base">Arraste ou clique para fazer upload</h4>
              <p className="text-xs text-slate-400 mt-1">PDF, Word (.docx), TXT, Markdown, EPUB</p>
              <button className="mt-4 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 px-5 py-2 rounded-xl text-xs font-semibold transition">Selecionar Arquivo</button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">📖 MATÉRIA / ASSUNTO (OPCIONAL):</label>
              <input type="text" placeholder="Ex: Direito Constitucional, Anatomia Humana..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition" />
            </div>

            <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-base"><Sparkles className="w-5 h-5" /> Gerar Flashcards do Documento</button>
          </div>
        )}

      </div>
    </div>
  );
}
