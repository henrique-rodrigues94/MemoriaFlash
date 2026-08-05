// 📁 flashmind-ai/src/components/ScannerView.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Play,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Lock,
  FlipHorizontal,
  CircleDot,
  Search,
  Tag,
  Hash,
  ChevronRight,
  Check,
  Layers,
  ScanLine,
} from 'lucide-react';
import { Deck, UserStats } from '../types';
import { hasEnoughCredits } from '../services/economy/creditsEngine';
import { ECONOMY } from '../services/economy/economyConstants';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CapturedItem {
  id: string;
  type: 'image' | 'document';
  name: string;
  previewUrl?: string;
  base64?: string;
  extractedText?: string;
  file: File;
}

interface AnalyzedTopic {
  id: string;
  title: string;
  description: string;
  cardEstimate: number;
}

interface AnalysisResult {
  subject: string;
  subjectDescription: string;
  topics: AnalyzedTopic[];
  totalEstimate: number;
  extractedContent: string;
}

type Step = 'collect' | 'analyzing' | 'review' | 'generating' | 'done' | 'error';

interface ScannerViewProps {
  onSaveNewDeck: (deck: Deck) => void;
  stats?: UserStats;
  onDeductCredit?: (amount?: number) => void;
  onOpenAdMob?: () => void;
  onOpenSubscription?: () => void;
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

async function extractTextFromPDF(file: File): Promise<string> {
  try {
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
    return textPages.join('\n\n') || `[PDF: ${file.name} — sem texto extraível, use a câmera para fotografar as páginas]`;
  } catch (err) {
    console.warn('Falha ao extrair PDF:', err);
    return `[PDF: ${file.name} — não foi possível extrair texto automaticamente]`;
  }
}

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
  if (type.startsWith('text/') || ['txt', 'md', 'json'].includes(ext)) return extractTextFromTxt(file);
  if (type === 'application/pdf' || ext === 'pdf') return extractTextFromPDF(file);
  if (type.includes('word') || type.includes('openxmlformats') || ['doc', 'docx'].includes(ext)) return extractTextFromDOCX(file);
  try { return await file.text(); } catch { return `[Arquivo: ${file.name}]`; }
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

function captureFrameFromVideo(video: HTMLVideoElement): File {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const [, b64] = dataUrl.split(',');
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return new File([bytes], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
}

// ─── Camera Modal ─────────────────────────────────────────────────────────────

interface CameraModalProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

function CameraModal({ onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(false);

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setReady(false);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setError('Permissão de câmera negada. Autorize o acesso nas configurações do navegador.');
      else if (err.name === 'NotFoundError') setError('Nenhuma câmera encontrada neste dispositivo.');
      else setError(`Não foi possível acessar a câmera: ${err.message || err.name}`);
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFlip = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  const handleCapture = () => {
    if (!videoRef.current || !ready) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    onCapture(captureFrameFromVideo(videoRef.current));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 z-10">
        <button type="button" onClick={onClose} className="flex items-center gap-2 text-white/80 hover:text-white transition">
          <X className="w-5 h-5" /><span className="text-sm">Fechar</span>
        </button>
        <span className="text-white text-sm font-semibold">Fotografar Página</span>
        <button type="button" onClick={handleFlip} className="text-white/80 hover:text-white transition" title="Virar câmera">
          <FlipHorizontal className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        {flash && <div className="absolute inset-0 bg-white opacity-70 pointer-events-none" />}
        {ready && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-white/40 rounded-lg w-[80%] h-[75%] relative">
              {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                <div key={i} className={`absolute w-6 h-6 border-white border-2 ${pos} ${
                  i < 2 ? (i === 0 ? 'border-r-0 border-b-0 rounded-tl-sm' : 'border-l-0 border-b-0 rounded-tr-sm')
                        : (i === 2 ? 'border-r-0 border-t-0 rounded-bl-sm' : 'border-l-0 border-t-0 rounded-br-sm')
                }`} />
              ))}
              <p className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-white/70 text-xs whitespace-nowrap">Centralize o documento</p>
            </div>
          </div>
        )}
        {!ready && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-white/70 text-sm">Iniciando câmera…</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 p-6 text-center">
            <AlertCircle className="w-10 h-10 text-rose-400" />
            <p className="text-white text-sm leading-relaxed">{error}</p>
            <button type="button" onClick={() => startCamera(facingMode)} className="px-4 py-2 bg-white/10 text-white rounded-xl text-sm hover:bg-white/20 transition">Tentar novamente</button>
          </div>
        )}
      </div>
      <div className="bg-black py-6 flex items-center justify-center gap-8">
        <div className="w-12" />
        <button type="button" onClick={handleCapture} disabled={!ready}
          className="w-16 h-16 rounded-full bg-white border-4 border-white/30 flex items-center justify-center shadow-lg disabled:opacity-40 active:scale-90 transition-transform">
          <CircleDot className="w-8 h-8 text-black" />
        </button>
        <button type="button" onClick={handleFlip} disabled={!ready}
          className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition disabled:opacity-40">
          <FlipHorizontal className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ─── Topic Selector Card ──────────────────────────────────────────────────────

interface TopicCardProps {
  topic: AnalyzedTopic;
  selected: boolean;
  onToggle: () => void;
}

function TopicCard({ topic, selected, onToggle }: TopicCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
        selected
          ? 'bg-purple-600/20 border-purple-500/60 shadow-sm shadow-purple-900/20'
          : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
          selected ? 'bg-purple-600 border-purple-500' : 'border-slate-600'
        }`}>
          {selected && <Check className="w-3 h-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-tight ${selected ? 'text-purple-200' : 'text-slate-200'}`}>
            {topic.title}
          </p>
          {topic.description && (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{topic.description}</p>
          )}
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 mt-0.5 ${
          selected ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-500'
        }`}>
          ~{topic.cardEstimate}
        </span>
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ScannerView({ onSaveNewDeck, stats, onDeductCredit, onOpenAdMob }: ScannerViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraFallbackRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>('collect');
  const [items, setItems] = useState<CapturedItem[]>([]);
  const itemsRef = useRef<CapturedItem[]>([]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const [subject, setSubject] = useState('');
  const [cardCount, setCardCount] = useState(25);
  const [statusMsg, setStatusMsg] = useState('');
  const [generatedCards, setGeneratedCards] = useState<any[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [processingLabel, setProcessingLabel] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [hasGetUserMedia, setHasGetUserMedia] = useState(false);

  // Analysis state
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());

  useEffect(() => { setHasGetUserMedia(!!(navigator.mediaDevices?.getUserMedia)); }, []);

  const noCredits = !!stats && !stats.isPro && (stats.aiCredits || 0) < cardCount * ECONOMY.COST_GENERATE_DECK;

  // ── Add / Remove items ────────────────────────────────────────────────────

  const addItem = useCallback(async (file: File) => {
    const id = `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (isImageFile(file)) {
      const previewUrl = URL.createObjectURL(file);
      const base64 = await fileToBase64(file);
      setItems(prev => [...prev, { id, type: 'image', name: file.name, previewUrl, base64, file }]);
    } else {
      setItems(prev => [...prev, { id, type: 'document', name: file.name, file }]);
    }
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  useEffect(() => {
    return () => { itemsRef.current.forEach(i => { if (i.previewUrl) URL.revokeObjectURL(i.previewUrl); }); };
  }, []);

  // ── File picker ───────────────────────────────────────────────────────────

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const f of files) await addItem(f);
    if (e.target) e.target.value = '';
  };

  const handleCameraCapture = async (file: File) => {
    setShowCamera(false);
    await addItem(file);
  };

  const openCamera = () => {
    if (hasGetUserMedia) setShowCamera(true);
    else cameraFallbackRef.current?.click();
  };

  const handleFallbackCamera = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const f of files) await addItem(f);
    if (e.target) e.target.value = '';
  };

  // ── Step 1: Analyze document ──────────────────────────────────────────────

  const analyzeItems = async () => {
    if (!items.length) return;
    setStep('analyzing');
    setProcessingLabel('Extraindo conteúdo dos arquivos…');

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

      setProcessingLabel('IA identificando matéria e tópicos…');

      const res = await fetch('/api/gemini/scanner-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, texts, subjectHint: subject.trim(), language: 'pt' }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `Erro do servidor (${res.status})`);
      }

      const data: AnalysisResult = await res.json();
      setAnalysisResult(data);
      // Pre-seleciona todos os tópicos
      setSelectedTopicIds(new Set(data.topics.map(t => t.id)));
      // Aplica matéria identificada se o usuário não digitou nada
      if (!subject.trim() && data.subject) setSubject(data.subject);
      setStep('review');
    } catch (err: any) {
      setStatusMsg(err?.message || 'Ocorreu um erro ao analisar o documento.');
      setStep('error');
    }
  };

  // ── Step 2: Generate flashcards ───────────────────────────────────────────

  const generateCards = async () => {
    if (!analysisResult) return;

    const estimatedCost = cardCount * ECONOMY.COST_GENERATE_DECK;
    if (stats && !hasEnoughCredits(stats, estimatedCost)) {
      if (onOpenAdMob) onOpenAdMob();
      return;
    }

    setStep('generating');
    setProcessingLabel('Gerando flashcards com IA…');

    try {
      const selectedTopics = analysisResult.topics
        .filter(t => selectedTopicIds.has(t.id))
        .map(t => t.title);

      const res = await fetch('/api/gemini/scanner-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [],
          texts: [],
          subject: subject.trim() || analysisResult.subject,
          count: cardCount,
          selectedTopics,
          extractedContent: analysisResult.extractedContent,
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

      const deckTitle = (subject.trim() || analysisResult.subject || items[0]?.name.replace(/\.[^.]+$/, '') || 'Documento Escaneado').trim();

      const normalized = raw.map((card: any, idx: number) => ({
        ...card,
        id: card.id || `scanner-card-${Date.now()}-${idx}`,
        subject: card.subject || deckTitle,
        topic: card.topic || deckTitle,
        difficulty: card.difficulty || 'medium',
        reps: 0, interval: 0, efactor: 2.5,
        dueDate: new Date().toISOString(),
      }));

      const deck: Deck = {
        id: `deck-scanner-${Date.now()}`,
        title: deckTitle,
        category: subject.trim() || analysisResult.subject || 'Scanner',
        description: `Deck gerado pelo Scanner a partir de ${items.length} arquivo(s)`,
        color: '#8b5cf6',
        accentBorder: 'border-purple-500',
        cards: normalized,
        createdAt: new Date().toISOString(),
      };

      onSaveNewDeck(deck);
      const actualCost = normalized.length * ECONOMY.COST_GENERATE_DECK;
      if (stats && !stats.isPro && onDeductCredit) onDeductCredit(actualCost);
      setGeneratedCards(normalized);
      setStep('done');
    } catch (err: any) {
      setStatusMsg(err?.message || 'Ocorreu um erro inesperado.');
      setStep('error');
    }
  };

  // ── Topic toggle helpers ──────────────────────────────────────────────────

  const toggleTopic = (id: string) => {
    setSelectedTopicIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (analysisResult) setSelectedTopicIds(new Set(analysisResult.topics.map(t => t.id)));
  };

  const selectNone = () => setSelectedTopicIds(new Set());

  // Estimated cards based on selected topics
  const selectedEstimate = analysisResult
    ? analysisResult.topics.filter(t => selectedTopicIds.has(t.id)).reduce((s, t) => s + t.cardEstimate, 0)
    : 0;

  // ── Reset ─────────────────────────────────────────────────────────────────

  const reset = () => {
    items.forEach(i => { if (i.previewUrl) URL.revokeObjectURL(i.previewUrl); });
    setItems([]);
    setGeneratedCards([]);
    setSubject('');
    setCardCount(25);
    setStep('collect');
    setStatusMsg('');
    setExpandedCard(null);
    setAnalysisResult(null);
    setSelectedTopicIds(new Set());
  };

  const retryAfterError = () => {
    setStatusMsg('');
    // Se já temos análise, volta pra review; senão volta pra collect
    setStep(analysisResult ? 'review' : 'collect');
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <>
      {showCamera && <CameraModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
      <input ref={cameraFallbackRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleFallbackCamera} />

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5 text-slate-100">

        {/* Header */}
        <div className="scanner-header rounded-2xl border border-purple-400/40 p-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="scanner-icon p-3 rounded-2xl border border-purple-400/40">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <h3 className="scanner-title text-xl font-bold tracking-tight">Scanner & Upload</h3>
              <p className="scanner-subtitle text-sm mt-0.5">
                Envie documentos — a IA identifica a matéria, lista os tópicos e gera flashcards
              </p>
            </div>
          </div>

          {/* Progress steps */}
          {(step !== 'collect' && step !== 'error') && (
            <div className="mt-4 flex items-center gap-1">
              {[
                { key: 'collect', label: 'Upload', icon: Upload },
                { key: 'review', label: 'Tópicos', icon: Tag },
                { key: 'done', label: 'Cards', icon: Sparkles },
              ].map((s, i, arr) => {
                const stepOrder = ['collect', 'analyzing', 'review', 'generating', 'done'];
                const currentIdx = stepOrder.indexOf(step);
                const sIdx = stepOrder.indexOf(s.key === 'collect' ? 'collect' : s.key === 'review' ? 'review' : 'done');
                const isDone = currentIdx > sIdx;
                const isActive = currentIdx === sIdx || (s.key === 'review' && step === 'analyzing') || (s.key === 'done' && step === 'generating');
                const Icon = s.icon;
                return (
                  <React.Fragment key={s.key}>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      isDone ? 'text-emerald-400' : isActive ? 'text-purple-300 bg-purple-500/10' : 'text-slate-600'
                    }`}>
                      {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                      {s.label}
                    </div>
                    {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Credits banner */}
        {stats && !stats.isPro && (
          <div className={`rounded-xl p-3.5 flex items-center justify-between gap-3 border ${
            (stats.aiCredits || 0) > 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-amber-500/10 border-amber-500/30'
          }`}>
            <div className="flex items-center gap-2">
              {(stats.aiCredits || 0) > 0
                ? <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                : <Lock className="w-4 h-4 text-amber-400 shrink-0" />}
              <div>
                <p className={`text-xs font-bold ${(stats.aiCredits || 0) > 0 ? 'text-blue-300' : 'text-amber-300'}`}>
                  {(stats.aiCredits || 0) > 0
                    ? `${stats.aiCredits} crédito${(stats.aiCredits || 0) !== 1 ? 's' : ''} disponível`
                    : 'Sem créditos — assista um vídeo para ganhar'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {(stats.aiCredits || 0) > 0
                    ? `${ECONOMY.COST_GENERATE_DECK} crédito por card · esta geração custa ${cardCount * ECONOMY.COST_GENERATE_DECK} créditos`
                    : 'Assista um vídeo curto e ganhe créditos de IA'}
                </p>
              </div>
            </div>
            {(stats.aiCredits || 0) === 0 && onOpenAdMob && (
              <button type="button" onClick={onOpenAdMob}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold whitespace-nowrap hover:bg-amber-500/30 transition">
                <Play className="w-3.5 h-3.5 fill-current" /> Ganhar créditos
              </button>
            )}
          </div>
        )}

        {/* ─── STEP: collect ─── */}
        {step === 'collect' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-5">
            {/* Upload zone */}
            <div onClick={() => fileInputRef.current?.click()}
              className="group relative overflow-hidden border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-7 text-center bg-slate-950/40 transition cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition" />
              <div className="relative">
                <div className="w-14 h-14 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:text-purple-300 transition">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-white font-semibold text-base">Clique para fazer upload</h4>
                <p className="text-xs text-slate-400 mt-1">PDF, Word (.docx), TXT, Markdown, JPG, PNG</p>
              </div>
              <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.json,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={handleFilePick} />
            </div>

            <button type="button" onClick={openCamera}
              className="w-full bg-gradient-to-r from-emerald-600/25 to-teal-600/25 text-emerald-300 hover:from-emerald-600/40 hover:to-teal-600/40 border border-emerald-500/30 px-4 py-3.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95">
              <Camera className="w-5 h-5" />
              {items.length > 0 ? 'Fotografar Mais uma Página' : hasGetUserMedia ? 'Abrir Câmera — Fotografar Página' : 'Tirar Foto com a Câmera'}
            </button>

            {/* Items grid */}
            {items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Arquivos selecionados ({items.length})</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {items.map(item => (
                    <div key={item.id} className="relative aspect-square group">
                      {item.type === 'image' && item.previewUrl ? (
                        <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover rounded-xl border border-slate-700" />
                      ) : (
                        <div className="w-full h-full bg-blue-500/10 border border-blue-500/20 rounded-xl flex flex-col items-center justify-center gap-1 p-2">
                          <FileText className="w-6 h-6 text-blue-400 shrink-0" />
                          <span className="text-[9px] text-blue-300 text-center leading-tight line-clamp-2 break-all">{item.name}</span>
                        </div>
                      )}
                      <button type="button" onClick={() => removeItem(item.id)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-rose-600/80 transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subject hint */}
            {items.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  📖 Matéria / Assunto (opcional — a IA identifica automaticamente)
                </label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value.toUpperCase())}
                  placeholder="EX: DIREITO CONSTITUCIONAL, ANATOMIA…"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition text-sm uppercase" />
              </div>
            )}

            {/* Analyze button */}
            {items.length > 0 && (
              <button type="button" onClick={analyzeItems}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 text-sm">
                <Search className="w-5 h-5" />
                Analisar Documento — Identificar Tópicos
              </button>
            )}

            {/* Empty state */}
            {items.length === 0 && (
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4 text-sm text-purple-200">
                <p className="font-medium flex items-center gap-2"><Sparkles className="w-4 h-4 shrink-0" /> Como funciona</p>
                <ul className="mt-2 space-y-1.5 text-xs text-purple-200/80 list-none">
                  <li>📷 <strong>Câmera:</strong> fotografe páginas de livros, apostilas ou lousa.</li>
                  <li>📄 <strong>Upload:</strong> envie PDF, Word, TXT ou imagens salvas.</li>
                  <li>🔍 <strong>Análise:</strong> a IA identifica a matéria e lista todos os tópicos do documento.</li>
                  <li>✅ <strong>Seleção:</strong> escolha quais tópicos quer transformar em flashcards.</li>
                  <li>🤖 <strong>Geração:</strong> flashcards criados com foco exato no conteúdo selecionado.</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP: analyzing ─── */}
        {step === 'analyzing' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-10 shadow-2xl flex flex-col items-center justify-center gap-6 text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <ScanLine className="w-10 h-10 text-indigo-400 animate-pulse" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center animate-bounce">
                <Search className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold text-lg">Analisando documento…</h4>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">{processingLabel || 'Identificando matéria, tópicos e estrutura do conteúdo…'}</p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* ─── STEP: review — Topic Selection ─── */}
        {step === 'review' && analysisResult && (
          <div className="space-y-4">
            {/* Subject identified */}
            <div className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-500/15 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-0.5">Matéria identificada</p>
                  <h4 className="text-white font-bold text-lg leading-tight">{analysisResult.subject}</h4>
                  {analysisResult.subjectDescription && (
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">{analysisResult.subjectDescription}</p>
                  )}
                </div>
              </div>

              {/* Editable subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Ajustar nome da matéria</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value.toUpperCase())}
                  placeholder={analysisResult.subject.toUpperCase()}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition text-sm uppercase" />
              </div>
            </div>

            {/* Topics */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <h4 className="text-white font-semibold text-sm">Tópicos encontrados</h4>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-xs font-bold border border-purple-500/20">
                    {analysisResult.topics.length}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAll} className="text-xs text-indigo-400 hover:text-indigo-200 transition">Todos</button>
                  <span className="text-slate-700">·</span>
                  <button type="button" onClick={selectNone} className="text-xs text-slate-500 hover:text-slate-300 transition">Nenhum</button>
                </div>
              </div>

              <div className="space-y-2">
                {analysisResult.topics.map(topic => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    selected={selectedTopicIds.has(topic.id)}
                    onToggle={() => toggleTopic(topic.id)}
                  />
                ))}
              </div>

              {/* Summary */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                <Hash className="w-4 h-4 text-slate-500" />
                <p className="text-xs text-slate-400">
                  <span className="text-slate-200 font-semibold">{selectedTopicIds.size}</span> de {analysisResult.topics.length} tópicos selecionados ·
                  estimativa: <span className="text-purple-300 font-semibold">~{selectedEstimate} cards</span>
                </p>
              </div>
            </div>

            {/* Card count + Generate */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Quantidade de flashcards</label>
                <div className="grid grid-cols-3 gap-2">
                  {[25, 50, 100].map(n => (
                    <button key={n} type="button" onClick={() => setCardCount(n)}
                      className={`py-3 rounded-xl text-sm font-semibold border transition ${
                        cardCount === n
                          ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      }`}>
                      {n}
                      {n === 25 && <span className="block text-[10px] opacity-70 mt-0.5">Rápido</span>}
                      {n === 50 && <span className="block text-[10px] opacity-70 mt-0.5">Completo</span>}
                      {n === 100 && <span className="block text-[10px] opacity-70 mt-0.5">Intensivo</span>}
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" onClick={generateCards}
                disabled={noCredits || selectedTopicIds.size === 0}
                className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                {noCredits ? (
                  <><Lock className="w-5 h-5" /> Sem Créditos — Assista um Anúncio</>
                ) : selectedTopicIds.size === 0 ? (
                  <><AlertCircle className="w-5 h-5" /> Selecione ao menos 1 tópico</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Gerar {cardCount} Flashcards — {selectedTopicIds.size} tópico{selectedTopicIds.size !== 1 ? 's' : ''}</>
                )}
              </button>

              <button type="button" onClick={reset} className="w-full text-xs text-slate-600 hover:text-slate-400 transition py-1">
                ↩ Voltar e adicionar mais arquivos
              </button>
            </div>
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
              <h4 className="text-white font-bold text-lg">IA gerando flashcards…</h4>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">{processingLabel}</p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
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
                {items.length > 0 && (
                  <p className="text-xs text-emerald-400/80 mt-2">
                    Seus {items.length} arquivo{items.length !== 1 ? 's' : ''} foram preservados.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={retryAfterError}
                className="flex items-center gap-2 text-sm text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 px-4 py-2.5 rounded-xl transition">
                <RotateCcw className="w-4 h-4" /> Tentar Novamente
              </button>
              <button type="button" onClick={reset} className="text-xs text-slate-500 hover:text-slate-300 px-3 py-2.5 transition">
                Começar do zero
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP: done ─── */}
        {step === 'done' && generatedCards.length > 0 && (
          <div className="space-y-4">
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-500/15 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-emerald-300 font-bold">{generatedCards.length} flashcards gerados e salvos!</h4>
                <p className="text-sm text-emerald-200/70 mt-0.5">Seu deck está disponível na biblioteca.</p>
              </div>
              <button type="button" onClick={reset}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-2 rounded-lg transition shrink-0">
                <RotateCcw className="w-3.5 h-3.5" /> Novo scan
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-400" /> Flashcards gerados
                </h4>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-xs font-bold border border-purple-500/20">
                  {generatedCards.length} cards
                </span>
              </div>
              {generatedCards.map((card, index) => {
                const isExpanded = expandedCard === card.id;
                return (
                  <div key={card.id || index} className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden hover:border-purple-500/30 transition">
                    <button type="button" onClick={() => setExpandedCard(isExpanded ? null : card.id)} className="w-full text-left p-4 flex items-start gap-3">
                      <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-lg px-2 py-1 shrink-0 mt-0.5">
                        #{index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] uppercase tracking-wider text-slate-500 truncate mb-1">{card.topic || 'Tópico'}</p>
                        <p className="text-sm text-white leading-snug">{card.front || card.question || '—'}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 mt-1" />}
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
    </>
  );
}
