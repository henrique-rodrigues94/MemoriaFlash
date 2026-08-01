import React, { useRef, useState, useCallback } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  X,
  Plus,
  Play,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Deck } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CapturedItem {
  id: string;
  type: 'image' | 'document';
  name: string;
  previewUrl?: string;
  base64?: string;       // for images
  extractedText?: string; // for documents
  file: File;
}

type Step = 'collect' | 'confirm' | 'generating' | 'done' | 'error';

interface ScannerViewProps {
  onSaveNewDeck: (deck: Deck) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function extractTextFromTxt(file: File): Promise<string> {
  return file.text();
}

/** Extrai texto de PDF usando pdf.js via CDN (carregado dinamicamente). */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Carrega pdfjsLib via CDN se ainda não estiver disponível
    if (!(window as any).pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const pdfjsLib = (window as any).pdfjsLib;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const textPages: string[] = [];

    for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      if (text.trim()) textPages.push(`[Página ${i}]\n${text}`);
    }

    return textPages.join('\n\n') || `[PDF: ${file.name} — sem texto extraível, considere usar câmera para fotografar as páginas]`;
  } catch (err) {
    console.warn('Falha ao extrair PDF:', err);
    return `[PDF: ${file.name} — não foi possível extrair texto automaticamente]`;
  }
}

/** Extrai texto de DOCX usando mammoth via CDN. */
async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    if (!(window as any).mammoth) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const mammoth = (window as any).mammoth;
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || `[DOCX: ${file.name} — sem texto extraível]`;
  } catch (err) {
    console.warn('Falha ao extrair DOCX:', err);
    return `[DOCX: ${file.name} — não foi possível extrair texto automaticamente]`;
  }
}

async function extractDocumentText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const type = file.type;

  if (type.startsWith('text/') || ['txt', 'md', 'json'].includes(ext)) {
    return extractTextFromTxt(file);
  }
  if (type === 'application/pdf' || ext === 'pdf') {
    return extractTextFromPDF(file);
  }
  if (type.includes('word') || type.includes('openxmlformats') || ['doc', 'docx'].includes(ext)) {
    return extractTextFromDOCX(file);
  }
  // fallback: tenta ler como texto
  try { return await file.text(); } catch { return `[Arquivo: ${file.name}]`; }
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

function isDocumentFile(file: File): boolean {
  return !isImageFile(file);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ScannerView({ onSaveNewDeck }: ScannerViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>('collect');
  const [items, setItems] = useState<CapturedItem[]>([]);
  const [subject, setSubject] = useState('');
  const [cardCount, setCardCount] = useState(25);
  const [statusMsg, setStatusMsg] = useState('');
  const [generatedCards, setGeneratedCards] = useState<any[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [processingLabel, setProcessingLabel] = useState('');

  // ── Add items ──────────────────────────────────────────────────────────────

  const addItem = useCallback(async (file: File) => {
    const id = `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (isImageFile(file)) {
      const previewUrl = URL.createObjectURL(file);
      const base64 = await fileToBase64(file);
      setItems(prev => [...prev, { id, type: 'image', name: file.name, previewUrl, base64, file }]);
    } else {
      setItems(prev => [...prev, { id, type: 'document', name: file.name, file }]);
      // extração acontece na hora de processar
    }
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  // ── File picker handlers ───────────────────────────────────────────────────

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const f of files) await addItem(f);
    if (e.target) e.target.value = '';
  };

  const handleCameraPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const f of files) await addItem(f);
    if (e.target) e.target.value = '';
  };

  // ── Process ────────────────────────────────────────────────────────────────

  const processItems = async () => {
    if (!items.length) return;
    setStep('generating');

    try {
      const images: string[] = [];
      const texts: string[] = [];

      for (const item of items) {
        setProcessingLabel(`Processando: ${item.name}…`);
        if (item.type === 'image' && item.base64) {
          images.push(item.base64);
        } else {
          setProcessingLabel(`Extraindo texto de: ${item.name}…`);
          const text = await extractDocumentText(item.file);
          texts.push(`=== ${item.name} ===\n${text}`);
        }
      }

      setProcessingLabel('Enviando para a IA gerar flashcards…');

      const res = await fetch('/api/gemini/scanner-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          texts,
          subject: subject.trim(),
          count: cardCount,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `Erro do servidor (${res.status})`);
      }

      const data = await res.json();
      const raw: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.cards)
          ? data.cards
          : Array.isArray(data?.flashcards)
            ? data.flashcards
            : [];

      if (!raw.length) throw new Error('Nenhum flashcard foi gerado. Tente novamente.');

      const deckTitle = (subject.trim() || items[0]?.name.replace(/\.[^.]+$/, '') || 'Documento Escaneado').trim();

      const normalized = raw.map((card: any, idx: number) => ({
        ...card,
        id: card.id || `scanner-card-${Date.now()}-${idx}`,
        subject: card.subject || deckTitle,
        topic: card.topic || deckTitle,
        difficulty: card.difficulty || 'medium',
        reps: 0,
        interval: 0,
        efactor: 2.5,
        dueDate: new Date().toISOString(),
      }));

      const deck: Deck = {
        id: `deck-scanner-${Date.now()}`,
        title: deckTitle,
        category: subject.trim() || 'Scanner',
        description: `Deck gerado pelo Scanner a partir de ${items.length} arquivo(s)`,
        color: '#8b5cf6',
        accentBorder: 'border-purple-500',
        cards: normalized,
        createdAt: new Date().toISOString(),
      };

      onSaveNewDeck(deck);
      setGeneratedCards(normalized);
      setStep('done');
    } catch (err: any) {
      setStatusMsg(err?.message || 'Ocorreu um erro inesperado.');
      setStep('error');
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────

  const reset = () => {
    items.forEach(i => { if (i.previewUrl) URL.revokeObjectURL(i.previewUrl); });
    setItems([]);
    setGeneratedCards([]);
    setSubject('');
    setCardCount(25);
    setStep('collect');
    setStatusMsg('');
    setExpandedCard(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5 text-slate-100">

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/60 via-slate-900/70 to-slate-900/40 p-6 shadow-2xl backdrop-blur-md">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/15 border border-purple-500/30 text-purple-300 rounded-2xl shadow-lg shadow-purple-500/10">
            <Camera className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Scanner & Upload</h3>
            <p className="text-sm text-slate-400 mt-0.5">
              Fotografe páginas ou envie PDF/Word/TXT — a IA extrai e gera flashcards
            </p>
          </div>
        </div>
      </div>

      {/* ─── STEP: collect ─── */}
      {(step === 'collect' || step === 'confirm') && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-5">

          {/* Upload zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group relative overflow-hidden border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-7 text-center bg-slate-950/40 transition cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition" />
            <div className="relative">
              <div className="w-14 h-14 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:text-purple-300 transition">
                <Upload className="w-7 h-7" />
              </div>
              <h4 className="text-white font-semibold text-base">Clique ou arraste para fazer upload</h4>
              <p className="text-xs text-slate-400 mt-1">PDF, Word (.docx), TXT, Markdown, JPG, PNG</p>
              <button
                type="button"
                className="mt-4 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 px-5 py-2 rounded-xl text-xs font-semibold transition"
              >
                Selecionar Arquivo(s)
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.json,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleFilePick}
            />
          </div>

          {/* Camera button */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="w-full bg-gradient-to-r from-emerald-600/25 to-teal-600/25 text-emerald-300 hover:from-emerald-600/40 hover:to-teal-600/40 border border-emerald-500/30 px-4 py-3.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
          >
            <Camera className="w-5 h-5" />
            Abrir Câmera — Fotografar Página
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraPick}
          />

          {/* Items list */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Arquivos selecionados ({items.length})
                </p>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar foto
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-3 group hover:border-purple-500/30 transition"
                  >
                    {item.type === 'image' && item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded-lg shrink-0 border border-slate-700"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {item.type === 'image' ? '📷 Imagem / Foto' : '📄 Documento'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-slate-600 hover:text-rose-400 transition opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Image previews grid */}
          {items.some(i => i.type === 'image') && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pré-visualização das fotos
              </p>
              <div className="grid grid-cols-3 gap-2">
                {items.filter(i => i.type === 'image').map(item => (
                  <div key={item.id} className="relative aspect-square">
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-xl border border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-rose-600/80 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {/* Add more button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-emerald-400 transition"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-[10px]">Mais</span>
                </button>
              </div>
            </div>
          )}

          {/* Settings — only show when items exist */}
          {items.length > 0 && (
            <>
              {/* Subject */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  📖 Matéria / Assunto (opcional)
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Ex: Direito Constitucional, Anatomia, Python…"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition text-sm"
                />
              </div>

              {/* Card count */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Quantidade de flashcards
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[25, 50, 100].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCardCount(n)}
                      className={`py-3 rounded-xl text-sm font-semibold border transition ${
                        cardCount === n
                          ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      }`}
                    >
                      {n}
                      {n === 25 && <span className="block text-[10px] opacity-70 mt-0.5">Rápido</span>}
                      {n === 50 && <span className="block text-[10px] opacity-70 mt-0.5">Completo</span>}
                      {n === 100 && <span className="block text-[10px] opacity-70 mt-0.5">Intensivo</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <button
                type="button"
                onClick={processItems}
                className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 text-sm"
              >
                <Play className="w-5 h-5" />
                Gerar {cardCount} Flashcards com IA
              </button>
            </>
          )}

          {/* Empty state tip */}
          {items.length === 0 && (
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4 text-sm text-purple-200">
              <p className="font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                Como funciona
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-purple-200/80 list-none">
                <li>📷 <strong>Câmera:</strong> fotografe páginas de livros, apostilas ou lousa. Adicione quantas fotos quiser antes de gerar.</li>
                <li>📄 <strong>Upload:</strong> envie PDF, Word, TXT ou imagens salvas. Múltiplos arquivos são suportados.</li>
                <li>🤖 <strong>IA:</strong> extrai o conteúdo, identifica matéria e tópicos, e gera seus flashcards automaticamente.</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ─── STEP: generating ─── */}
      {step === 'generating' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-10 shadow-2xl flex flex-col items-center justify-center gap-6 text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold text-lg">IA processando…</h4>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">{processingLabel || 'Analisando conteúdo e gerando flashcards…'}</p>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── STEP: error ─── */}
      {step === 'error' && (
        <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-rose-300 font-semibold">Ocorreu um erro</h4>
              <p className="text-sm text-slate-400 mt-1">{statusMsg}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 px-4 py-2.5 rounded-xl transition"
          >
            <RotateCcw className="w-4 h-4" />
            Tentar Novamente
          </button>
        </div>
      )}

      {/* ─── STEP: done ─── */}
      {step === 'done' && generatedCards.length > 0 && (
        <div className="space-y-4">
          {/* Success banner */}
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-emerald-500/15 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="text-emerald-300 font-bold">
                {generatedCards.length} flashcards gerados e salvos!
              </h4>
              <p className="text-sm text-emerald-200/70 mt-0.5">
                Seu deck foi criado e está disponível na biblioteca.
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-2 rounded-lg transition shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Novo scan
            </button>
          </div>

          {/* Cards list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                Flashcards gerados
              </h4>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-xs font-bold border border-purple-500/20">
                {generatedCards.length} cards
              </span>
            </div>

            {generatedCards.map((card, index) => {
              const isExpanded = expandedCard === card.id;
              return (
                <div
                  key={card.id || index}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden hover:border-purple-500/30 transition"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                    className="w-full text-left p-4 flex items-start gap-3"
                  >
                    <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-lg px-2 py-1 shrink-0 mt-0.5">
                      #{index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-slate-500 truncate mb-1">
                        {card.topic || 'Tópico'}
                      </p>
                      <p className="text-sm text-white leading-snug">
                        {card.front || card.question || '—'}
                      </p>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
                      : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
                    }
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2 border-t border-slate-800 pt-3">
                      <div className="text-sm text-slate-300">
                        <span className="text-emerald-400 font-semibold text-xs uppercase tracking-wider">Resposta: </span>
                        {card.back || card.answer || '—'}
                      </div>
                      {card.explanation && (
                        <div className="text-xs text-slate-400 bg-slate-900/60 rounded-lg p-3 border border-slate-800 mt-2 leading-relaxed">
                          {card.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
