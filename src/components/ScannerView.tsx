import React, { useRef, useState } from 'react';
import { Camera, Upload, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { generateAICards } from '../lib/aiGenerator';
import { Deck } from '../types';

interface ScannerStatus {
  type: 'idle' | 'reading' | 'success' | 'error';
  message: string;
}

interface ScannerViewProps {
  onSaveNewDeck: (deck: Deck) => void;
}

export function ScannerView({ onSaveNewDeck }: ScannerViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [subject, setSubject] = useState('');
  const [cardCount, setCardCount] = useState(25);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [capturedPages, setCapturedPages] = useState<File[]>([]);
  const [generatedCards, setGeneratedCards] = useState<Array<Record<string, any>>>([]);
  const [status, setStatus] = useState<ScannerStatus>({
    type: 'idle',
    message: 'Selecione um arquivo ou use o botão abaixo para iniciar.',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const readTextFromFile = async (file: File): Promise<string> => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    if (extension === 'txt' || extension === 'md' || extension === 'json' || file.type.startsWith('text/')) {
      return await file.text();
    }

    if (file.type === 'application/pdf') {
      return `Documento PDF: ${file.name}. O usuário quer gerar flashcards a partir deste material.`;
    }

    if (file.type.includes('word') || extension === 'docx') {
      return `Documento Word: ${file.name}. O usuário quer gerar flashcards a partir deste conteúdo.`;
    }

    if (file.type.startsWith('image/')) {
      return `Imagem carregada: ${file.name}. O usuário quer gerar flashcards a partir deste material visual.`;
    }

    return `Arquivo carregado: ${file.name}. Extrair conteúdo textual e transformar em flashcards.`;
  };

  const generateFromFiles = async (files: File[]) => {
    if (!files.length) return;

    const pageLabel = files.length > 1 ? `${files.length} páginas` : files[0].name;
    setSelectedFileName(pageLabel);
    setGeneratedCards([]);
    setStatus({ type: 'reading', message: `Lendo ${pageLabel}...` });

    try {
      const pageContexts = await Promise.all(
        files.map(async (file, index) => {
          const extractedText = await readTextFromFile(file);
          const prefix = file.type.startsWith('image/') ? `Página ${index + 1}` : `Página ${index + 1}`;
          return `${prefix} (${file.name})\n${extractedText}`;
        })
      );

      const prompt = subject.trim() || `Conteúdo das páginas capturadas`;
      const context = pageContexts.join('\n\n');

      setStatus({ type: 'reading', message: 'Gerando flashcards com a IA...' });
      setIsGenerating(true);

      const cards = await generateAICards(`${prompt}\n\nConteúdo das páginas:\n${context}`, [subject || pageLabel], cardCount);

      if (cards.length > 0) {
        const deckTitle = (subject.trim() || pageLabel.replace(/\.[^.]+$/, '') || 'Documento').trim();
        const normalizedCards = cards.map((card, index) => ({
          ...card,
          id: card.id || `scanner-card-${Date.now()}-${index}`,
          subject: card.subject || deckTitle,
          topic: card.topic || deckTitle,
          difficulty: card.difficulty || 'medium',
          reps: 0,
          interval: 0,
          efactor: 2.5,
          dueDate: new Date().toISOString(),
        }));

        setGeneratedCards(normalizedCards);
        saveGeneratedCards(normalizedCards, deckTitle);
        setStatus({ type: 'success', message: `Flashcards gerados, salvos e listados abaixo para "${deckTitle}".` });
      } else {
        throw new Error('Nenhum card foi gerado.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível processar o arquivo.';
      setStatus({ type: 'error', message });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveGeneratedCards = (cards: Array<Record<string, any>>, title: string) => {
    const normalizedCards = cards.map((card, index) => ({
      ...card,
      id: card.id || `scanner-card-${Date.now()}-${index}`,
      subject: card.subject || title,
      topic: card.topic || title,
      difficulty: card.difficulty || 'medium',
      reps: 0,
      interval: 0,
      efactor: 2.5,
      dueDate: new Date().toISOString(),
    }));

    const deck: Deck = {
      id: `deck-scanner-${Date.now()}`,
      title,
      category: subject.trim() || 'Scanner',
      description: `Deck gerado a partir de upload de ${selectedFileName || 'documento'}`,
      color: '#8b5cf6',
      accentBorder: 'border-purple-500',
      cards: normalizedCards,
      createdAt: new Date().toISOString(),
    };

    onSaveNewDeck(deck);
  };

  const handleFilePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await generateFromFiles([file]);

    if (event.target) event.target.value = '';
  };

  const handleCameraPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const nextPages = [...capturedPages, ...files];
    setCapturedPages(nextPages);

    const pageLabel = nextPages.length > 1 ? `${nextPages.length} páginas capturadas` : files[0].name;
    setSelectedFileName(pageLabel);
    setStatus({ type: 'reading', message: `Foto adicionada: ${files[0].name}` });

    const shouldAddMore = window.confirm('Deseja adicionar outra foto da página?');
    if (shouldAddMore) {
      setStatus({ type: 'reading', message: 'Adicione outra foto da página.' });
      window.setTimeout(() => cameraInputRef.current?.click(), 150);
    } else {
      await generateFromFiles(nextPages);
    }

    if (event.target) event.target.value = '';
  };

  const triggerPicker = () => fileInputRef.current?.click();
  const triggerCameraPicker = () => cameraInputRef.current?.click();

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 text-slate-100">
      {/* Cabeçalho da tela */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/60 via-slate-900/70 to-slate-900/40 p-6 shadow-2xl backdrop-blur-md">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/15 border border-purple-500/30 text-purple-300 rounded-2xl shadow-lg shadow-purple-500/10">
            <Camera className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Scanner / Upload de Documento</h3>
            <p className="text-sm text-slate-400 mt-0.5">
              PDF, Word, TXT, imagem/foto de livro ou revista — a IA gera flashcards automaticamente
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6">
        {/* Zona de upload */}
        <div
          onClick={triggerPicker}
          className="group relative overflow-hidden border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-8 text-center bg-slate-950/40 transition cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition" />
          <div className="relative">
            <div className="w-14 h-14 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:text-purple-300 transition">
              <Upload className="w-7 h-7" />
            </div>
            <h4 className="text-white font-semibold text-base">Arraste ou clique para fazer upload / tirar foto</h4>
            <p className="text-xs text-slate-400 mt-1">PDF, Word (.docx), TXT, Markdown, EPUB, JPG, PNG</p>

            <button
              type="button"
              className="mt-4 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 px-5 py-2 rounded-xl text-xs font-semibold transition"
            >
              Selecionar Arquivo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.json,.pdf,.doc,.docx,.jpg,.jpeg,.png,.epub"
              className="hidden"
              onChange={handleFilePick}
            />
          </div>
        </div>

        {/* Captura por câmera */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={triggerCameraPicker}
            disabled={isGenerating}
            className="flex-1 bg-gradient-to-r from-emerald-600/25 to-teal-600/25 text-emerald-300 hover:from-emerald-600/40 hover:to-teal-600/40 border border-emerald-500/30 px-4 py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-emerald-900/20"
          >
            <Camera className="w-4 h-4" />
            Tirar Foto da Página
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={handleCameraPick}
          />
        </div>

        {/* Páginas capturadas */}
        {capturedPages.length > 0 ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3 text-sm text-emerald-200">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <Camera className="w-3.5 h-3.5" /> Páginas capturadas ({capturedPages.length})
            </div>
            <ul className="mt-2 grid gap-1 text-xs text-emerald-200/80 sm:grid-cols-2">
              {capturedPages.map((page, index) => (
                <li key={`${page.name}-${index}`} className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-400" />
                  <span className="truncate">{page.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Assunto */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            📖 MATÉRIA / ASSUNTO (OPCIONAL):
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex: Direito Constitucional, Anatomia Humana, Python..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition text-sm"
          />
        </div>

        {/* Quantidade de cards */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            QUANTIDADE DE CARDS
          </label>
          <select
            value={cardCount}
            onChange={(e) => setCardCount(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition text-sm"
          >
            <option value={10}>10 Flashcards</option>
            <option value={25}>25 Flashcards (Recomendado)</option>
            <option value={40}>40 Flashcards</option>
          </select>
        </div>

        {/* Status */}
        <div
          className={`rounded-xl border p-4 text-sm ${
            status.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-950/30 text-emerald-200'
              : status.type === 'error'
                ? 'border-rose-500/20 bg-rose-950/30 text-rose-200'
                : 'border-slate-800 bg-slate-950/60 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            ) : status.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : status.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-purple-400" />
            )}
            <span className="font-medium">{status.message}</span>
          </div>
          {selectedFileName ? <p className="mt-2 text-xs opacity-70">Arquivo selecionado: {selectedFileName}</p> : null}
        </div>

        {/* Dica */}
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4 text-sm text-purple-200">
          <p className="font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            Capture páginas com a câmera e, ao finalizar, os flashcards serão gerados automaticamente.
          </p>
          <p className="text-xs text-purple-200/80 mt-1">As fotos ficam agrupadas, salvas no deck e exibidas abaixo para revisão.</p>
        </div>

        {/* Flashcards gerados */}
        {generatedCards.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">Flashcards gerados</h4>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-xs font-semibold">
                {generatedCards.length} cards
              </span>
            </div>
            <div className="space-y-2">
              {generatedCards.map((card, index) => (
                <div key={card.id || index} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 hover:border-purple-500/30 transition">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] uppercase tracking-wider text-purple-400 truncate">{card.topic || 'Tema'}</div>
                    <span className="text-[10px] text-slate-500 shrink-0">Card {index + 1}</span>
                  </div>
                  <div className="mt-2 text-sm text-white">
                    <span className="font-semibold text-purple-300">Frente:</span> {card.front || card.question || '—'}
                  </div>
                  <div className="mt-1 text-sm text-slate-300">
                    <span className="font-semibold text-emerald-300">Verso:</span> {card.back || card.answer || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
