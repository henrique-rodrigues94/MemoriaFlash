import React, { useState } from 'react';
import { Camera, Upload, Sparkles } from 'lucide-react';

export function ScannerView() {
  const [subject, setSubject] = useState('');
  const [cardCount, setCardCount] = useState(25);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 text-slate-100">
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6">
        
        {/* Cabeçalho do Scanner */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Scanner / Upload de Documento</h3>
            <p className="text-xs text-slate-400">
              PDF, Word, TXT, imagem/foto de livro ou revista — a IA gera flashcards automaticamente
            </p>
          </div>
        </div>

        {/* Área de Drag & Drop / Seleção de Arquivo */}
        <div className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-8 text-center bg-slate-950/40 transition cursor-pointer group">
          <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
            <Upload className="w-6 h-6" />
          </div>
          <h4 className="text-white font-medium text-base">Arraste ou clique para fazer upload / tirar foto</h4>
          <p className="text-xs text-slate-400 mt-1">PDF, Word (.docx), TXT, Markdown, EPUB, JPG, PNG</p>
          
          <button className="mt-4 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 px-5 py-2 rounded-xl text-xs font-semibold transition">
            Selecionar Arquivo
          </button>
        </div>

        {/* Campo Matéria / Assunto */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            📖 MATÉRIA / ASSUNTO (OPCIONAL):
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex: Direito Constitucional, Anatomia Humana, Python..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition text-sm"
          />
        </div>

        {/* Quantidade de Cards */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            QUANTIDADE DE CARDS
          </label>
          <select 
            value={cardCount}
            onChange={(e) => setCardCount(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition text-sm"
          >
            <option value={10}>10 Flashcards</option>
            <option value={25}>25 Flashcards (Recomendado)</option>
            <option value={40}>40 Flashcards</option>
          </select>
        </div>

        {/* Botão de Ação */}
        <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-base">
          <Sparkles className="w-5 h-5" />
          Gerar Flashcards do Documento
        </button>

      </div>
    </div>
  );
}