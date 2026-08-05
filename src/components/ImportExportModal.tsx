import React, { useRef, useState } from 'react';
import {
  X,
  Download,
  Upload,
  FileJson,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Deck } from '../types';
import {
  ExportFormat,
  exportDeck,
  exportAllDecksAsJSON,
  downloadTextFile,
  parseImportFile,
  toNewFlashcards,
  ImportResult,
} from '../lib/cardImportExport';

interface ImportExportModalProps {
  decks: Deck[];
  onClose: () => void;
  /** Cria ou mescla um deck (mesma função usada para salvar decks gerados por IA/manual). */
  onSaveDeck: (deck: Deck) => void;
}

type Tab = 'export' | 'import';

const FORMAT_OPTIONS: { id: ExportFormat; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: 'json', label: 'MemoriaFlash (JSON)', hint: 'Preserva todo o progresso — ideal para backup', icon: <FileJson className="w-4 h-4" /> },
  { id: 'csv', label: 'CSV', hint: 'Abre no Excel/Google Sheets', icon: <FileSpreadsheet className="w-4 h-4" /> },
  { id: 'anki', label: 'Anki (.txt)', hint: 'Importar direto em Arquivo → Importar no Anki', icon: <FileText className="w-4 h-4" /> },
  { id: 'quizlet', label: 'Quizlet / genérico (.txt)', hint: 'Termo + definição separados por TAB', icon: <FileText className="w-4 h-4" /> },
];

export const ImportExportModal: React.FC<ImportExportModalProps> = ({ decks, onClose, onSaveDeck }) => {
  const [tab, setTab] = useState<Tab>('export');

  // --- Export state ---
  const [selectedDeckId, setSelectedDeckId] = useState<string>(decks[0]?.id || '__all__');
  const [format, setFormat] = useState<ExportFormat>('json');

  // --- Import state ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedResult, setParsedResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'new' | 'merge'>('new');
  const [targetExistingDeckId, setTargetExistingDeckId] = useState<string>(decks[0]?.id || '');
  const [newDeckName, setNewDeckName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [importDone, setImportDone] = useState<{ count: number; deckName: string } | null>(null);

  const decksWithCards = decks.filter((d) => d.cards.length > 0);

  const handleExport = () => {
    if (selectedDeckId === '__all__') {
      const { content, filename, mime } = exportAllDecksAsJSON(decksWithCards);
      downloadTextFile(filename, content, mime);
      return;
    }
    const deck = decks.find((d) => d.id === selectedDeckId);
    if (!deck) return;
    const { content, filename, mime } = exportDeck(deck, format);
    downloadTextFile(filename, content, mime);
  };

  const handleFileChosen = async (file: File) => {
    setImportError(null);
    setImportDone(null);
    setIsParsing(true);
    try {
      const text = await file.text();
      const result = parseImportFile(text, file.name);
      if (result.cards.length === 0) {
        setImportError(
          'Não encontramos nenhum card válido nesse arquivo. Verifique se ele tem colunas/campos de pergunta e resposta (front/back, question/answer, term/definition).'
        );
        setParsedResult(null);
      } else {
        setParsedResult(result);
        setNewDeckName(result.suggestedDeckName || 'Deck Importado');
      }
    } catch (err) {
      setImportError('Não foi possível ler esse arquivo. Confira se ele não está corrompido e tente novamente.');
      setParsedResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedResult) return;

    if (importMode === 'merge') {
      const targetDeck = decks.find((d) => d.id === targetExistingDeckId);
      if (!targetDeck) return;
      const newCards = toNewFlashcards(parsedResult.cards, targetDeck.category || targetDeck.title);
      onSaveDeck({ ...targetDeck, cards: [...newCards, ...targetDeck.cards] });
      setImportDone({ count: newCards.length, deckName: targetDeck.title });
    } else {
      const title = newDeckName.trim() || 'Deck Importado';
      const newCards = toNewFlashcards(parsedResult.cards, parsedResult.suggestedCategory || title);
      onSaveDeck({
        id: `deck-import-${Date.now()}`,
        title,
        category: parsedResult.suggestedCategory || title,
        description: '',
        color: '#60a5fa',
        accentBorder: 'border-l-primary',
        cards: newCards,
        createdAt: new Date().toISOString(),
      });
      setImportDone({ count: newCards.length, deckName: title });
    }

    setParsedResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatLabel: Record<ImportResult['detectedFormat'], string> = {
    'memoriaflash-json': 'Backup MemoriaFlash (JSON) — progresso será preservado',
    json: 'JSON genérico',
    csv: 'CSV',
    'anki-txt': 'Exportação do Anki (TXT)',
    'delimited-txt': 'Texto delimitado (TAB / ; / ,) — compatível com Quizlet e afins',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0b1a2a] border border-[#adc6ff]/20 rounded-3xl p-6 text-white shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Importar / Exportar Cards</h3>
              <p className="text-[11px] text-[#8c91a0]">Anki, CSV, Quizlet, JSON e mais</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#051424] p-1 rounded-xl border border-[#424754]/40">
          <button
            onClick={() => setTab('export')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              tab === 'export' ? 'bg-blue-600 text-white shadow' : 'text-[#8c91a0] hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
          <button
            onClick={() => setTab('import')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              tab === 'import' ? 'bg-blue-600 text-white shadow' : 'text-[#8c91a0] hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Importar
          </button>
        </div>

        {tab === 'export' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5">
                Deck
              </label>
              <select
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
                className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#60a5fa] text-sm cursor-pointer"
              >
                <option value="__all__">📦 Todos os decks (backup completo em JSON)</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.cards.length} cards)
                  </option>
                ))}
              </select>
            </div>

            {selectedDeckId !== '__all__' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5">
                  Formato
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {FORMAT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setFormat(opt.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                        format === opt.id
                          ? 'bg-blue-500/15 border-blue-500/50'
                          : 'bg-[#051424]/60 border-[#424754]/40 hover:border-[#424754]'
                      }`}
                    >
                      <div className={format === opt.id ? 'text-blue-400' : 'text-[#8c91a0]'}>{opt.icon}</div>
                      <div>
                        <div className="text-xs font-bold text-white">{opt.label}</div>
                        <div className="text-[10px] text-[#8c91a0]">{opt.hint}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleExport}
              disabled={decks.length === 0}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> Baixar Arquivo
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {importDone ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <div className="text-sm font-bold text-emerald-400">
                  {importDone.count} card{importDone.count !== 1 ? 's' : ''} importado{importDone.count !== 1 ? 's' : ''}!
                </div>
                <p className="text-[11px] text-[#8c91a0]">Adicionado ao deck "{importDone.deckName}"</p>
                <button
                  onClick={() => setImportDone(null)}
                  className="px-4 py-2 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs font-bold hover:bg-indigo-500/25 transition cursor-pointer"
                >
                  Importar outro arquivo
                </button>
              </div>
            ) : !parsedResult ? (
              <>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#424754]/50 hover:border-blue-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-[#051424]/40"
                >
                  {isParsing ? (
                    <Loader2 className="w-8 h-8 text-blue-400 mx-auto animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-[#60a5fa] mx-auto mb-2" />
                      <p className="text-sm font-bold text-white">Clique para escolher um arquivo</p>
                      <p className="text-[11px] text-[#8c91a0] mt-1">.json · .csv · .txt (Anki, Quizlet e outros)</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChosen(file);
                  }}
                />
                {importError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{importError}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    {parsedResult.cards.length} card{parsedResult.cards.length !== 1 ? 's' : ''} encontrado{parsedResult.cards.length !== 1 ? 's' : ''}
                  </div>
                  <p className="text-emerald-300/80">{formatLabel[parsedResult.detectedFormat]}</p>
                  {parsedResult.skippedLines > 0 && (
                    <p className="text-amber-300/90">
                      {parsedResult.skippedLines} linha{parsedResult.skippedLines !== 1 ? 's' : ''} ignorada{parsedResult.skippedLines !== 1 ? 's' : ''} (sem pergunta ou resposta).
                    </p>
                  )}
                </div>

                <div className="flex bg-[#051424] p-1 rounded-xl border border-[#424754]/40">
                  <button
                    onClick={() => setImportMode('new')}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      importMode === 'new' ? 'bg-blue-600 text-white shadow' : 'text-[#8c91a0] hover:text-white'
                    }`}
                  >
                    Criar novo deck
                  </button>
                  <button
                    onClick={() => setImportMode('merge')}
                    disabled={decksWithCards.length === 0 && decks.length === 0}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      importMode === 'merge' ? 'bg-blue-600 text-white shadow' : 'text-[#8c91a0] hover:text-white'
                    }`}
                  >
                    Adicionar a deck existente
                  </button>
                </div>

                {importMode === 'new' ? (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5">
                      Nome do novo deck
                    </label>
                    <input
                      type="text"
                      value={newDeckName}
                      onChange={(e) => setNewDeckName(e.target.value)}
                      className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white placeholder-[#8c91a0] focus:outline-none focus:border-[#60a5fa] text-sm"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#adc6ff] mb-1.5">
                      Deck de destino
                    </label>
                    <select
                      value={targetExistingDeckId}
                      onChange={(e) => setTargetExistingDeckId(e.target.value)}
                      className="w-full bg-[#051424] border border-[#424754]/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#60a5fa] text-sm cursor-pointer"
                    >
                      {decks.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} ({d.cards.length} cards)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setParsedResult(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-[#424754]/50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={importMode === 'new' ? !newDeckName.trim() : !targetExistingDeckId}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" /> Confirmar Importação
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
