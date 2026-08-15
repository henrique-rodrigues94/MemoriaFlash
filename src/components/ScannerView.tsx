import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  FlipHorizontal,
  Hash,
  Layers,
  Loader2,
  Lock,
  RotateCcw,
  ScanLine,
  Search,
  Sparkles,
  Tag,
  Upload,
  X,
} from 'lucide-react';
import { Deck, UserStats } from '../types';
import { ECONOMY } from '../services/economy/economyConstants';

interface CapturedItem {
  id: string;
  type: 'image' | 'document';
  name: string;
  previewUrl?: string;
  base64?: string;
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

const CARD_OPTIONS = [3, 5, 8, 10, 15, 20] as const;
const MAX_FILES = 20;
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function defaultCountForTopic(estimate: number): number {
  if (estimate <= 4) return 3;
  if (estimate <= 7) return 5;
  if (estimate <= 12) return 8;
  if (estimate <= 17) return 10;
  if (estimate <= 22) return 15;
  return 20;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

async function loadScript(src: string, key: string): Promise<void> {
  if ((window as any)[key]) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[data-memoriaflash="${key}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Não foi possível carregar ${key}.`)), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.memoriaflash = key;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Não foi possível carregar ${key}.`));
    document.head.appendChild(script);
  });
}

async function extractText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (file.type.startsWith('text/') || ['txt', 'md', 'markdown', 'json'].includes(ext)) {
    return file.text();
  }

  if (file.type === 'application/pdf' || ext === 'pdf') {
    await loadScript(
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
      'pdfjsLib'
    );
    const pdfjs = (window as any).pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];
    const pageLimit = Math.min(pdf.numPages, 40);
    for (let pageNo = 1; pageNo <= pageLimit; pageNo += 1) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      const text = content.items.map((item: any) => item?.str || '').join(' ').trim();
      if (text) pages.push(`[Página ${pageNo}]\n${text}`);
    }
    if (!pages.length) throw new Error(`O PDF "${file.name}" não possui texto extraível. Para PDF escaneado, fotografe as páginas com a câmera.`);
    return pages.join('\n\n');
  }

  if (ext === 'docx' || file.type.includes('word') || file.type.includes('openxmlformats')) {
    await loadScript(
      'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
      'mammoth'
    );
    const mammoth = (window as any).mammoth;
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    if (!result.value?.trim()) throw new Error(`O documento "${file.name}" não possui texto extraível.`);
    return result.value;
  }

  throw new Error(`Formato não suportado: ${file.name}`);
}

function isImage(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);
}

function CameraModal({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const start = useCallback(async (facing: 'environment' | 'user') => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setReady(false);
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('A câmera não está disponível neste dispositivo.');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setReady(true);
    } catch (err: any) {
      const message = err?.name === 'NotAllowedError'
        ? 'Permissão de câmera negada. Autorize a câmera nas configurações do MemoriaFlash.'
        : err?.name === 'NotFoundError'
          ? 'Nenhuma câmera foi encontrada.'
          : err?.message || 'Não foi possível abrir a câmera.';
      setError(message);
    }
  }, []);

  useEffect(() => {
    void start(facingMode);
    return () => streamRef.current?.getTracks().forEach(track => track.stop());
  }, [start, facingMode]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !ready || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (blob) onCapture(new File([blob], `pagina-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <button type="button" onClick={onClose} className="text-white/80 hover:text-white text-sm">Fechar</button>
        <span className="text-white text-sm font-semibold">Fotografar Página</span>
        <button type="button" disabled={!ready} onClick={() => setFacingMode(v => v === 'environment' ? 'user' : 'environment')} className="text-white disabled:opacity-40">
          <FlipHorizontal className="w-5 h-5" />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        {!ready && !error && <div className="absolute inset-0 flex items-center justify-center bg-black/70"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}
        {error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-black/80"><AlertCircle className="w-10 h-10 text-rose-400" /><p className="text-white text-sm">{error}</p><button type="button" onClick={() => void start(facingMode)} className="px-4 py-2 rounded-xl bg-white/10 text-white">Tentar novamente</button></div>}
        {ready && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-[82%] h-[72%] border-2 border-white/50 rounded-xl" /></div>}
      </div>
      <div className="bg-black py-6 flex justify-center">
        <button type="button" disabled={!ready} onClick={capture} className="w-16 h-16 rounded-full bg-white border-4 border-white/30 disabled:opacity-40 flex items-center justify-center"><Camera className="w-7 h-7 text-black" /></button>
      </div>
    </div>
  );
}

function TopicCard({ topic, selected, count, onToggle, onCount }: { topic: AnalyzedTopic; selected: boolean; count: number; onToggle: () => void; onCount: (n: number) => void }) {
  return (
    <div className={`rounded-xl border ${selected ? 'bg-purple-600/15 border-purple-500/50' : 'bg-slate-950/50 border-slate-800'}`}>
      <button type="button" onClick={onToggle} className="w-full text-left p-3.5 flex items-start gap-3">
        <span className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${selected ? 'bg-purple-600 border-purple-500' : 'border-slate-600'}`}>
          {selected && <Check className="w-3 h-3 text-white" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block text-sm font-semibold ${selected ? 'text-purple-200' : 'text-slate-200'}`}>{topic.title}</span>
          {topic.description && <span className="block text-xs text-slate-500 mt-0.5 line-clamp-2">{topic.description}</span>}
        </span>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-800 text-slate-400 shrink-0">IA~{topic.cardEstimate}</span>
      </button>
      {selected && <div className="px-3.5 pb-3.5 flex items-center gap-2 flex-wrap"><span className="text-[11px] text-slate-400">Cards:</span>{CARD_OPTIONS.map(n => <button key={n} type="button" onClick={e => { e.stopPropagation(); onCount(n); }} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${count === n ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>{n}</button>)}</div>}
    </div>
  );
}

export function ScannerView({ onSaveNewDeck, stats, onDeductCredit, onOpenAdMob }: ScannerViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraFallbackRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('collect');
  const [items, setItems] = useState<CapturedItem[]>([]);
  const [subject, setSubject] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [processingLabel, setProcessingLabel] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [generatedCards, setGeneratedCards] = useState<any[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => setHasCamera(!!navigator.mediaDevices?.getUserMedia), []);
  useEffect(() => () => items.forEach(item => item.previewUrl && URL.revokeObjectURL(item.previewUrl)), [items]);

  const totalCards = analysis?.topics.filter(t => selected.has(t.id)).reduce((sum, t) => sum + (counts[t.id] || defaultCountForTopic(t.cardEstimate)), 0) || 0;
  const requiredCredits = totalCards * ECONOMY.COST_GENERATE_DECK;
  const noCredits = !!stats && !stats.isPro && (stats.aiCredits || 0) < requiredCredits;

  const addItem = useCallback(async (file: File) => {
    if (items.length >= MAX_FILES) throw new Error(`Você pode adicionar no máximo ${MAX_FILES} arquivos por análise.`);
    if (file.size > MAX_FILE_SIZE) throw new Error(`O arquivo "${file.name}" ultrapassa o limite de 25 MB.`);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (isImage(file)) {
      setItems(prev => [...prev, { id, type: 'image', name: file.name, previewUrl: URL.createObjectURL(file), base64: undefined, file }]);
      const base64 = await fileToBase64(file);
      setItems(prev => prev.map(item => item.id === id ? { ...item, base64 } : item));
    } else {
      setItems(prev => [...prev, { id, type: 'document', name: file.name, file }]);
    }
  }, [items.length]);

  const handleFiles = async (files: File[]) => {
    setStatusMsg('');
    try {
      for (const file of files) await addItem(file);
    } catch (err: any) {
      setStatusMsg(err?.message || 'Não foi possível adicionar o arquivo.');
      setStep('error');
    }
  };

  const analyzeItems = async () => {
    if (!items.length) return;
    setStep('analyzing');
    setStatusMsg('');
    try {
      const images: string[] = [];
      const texts: string[] = [];
      for (const item of items) {
        setProcessingLabel(`Processando ${item.name}…`);
        if (item.type === 'image') {
          images.push(item.base64 || await fileToBase64(item.file));
        } else {
          texts.push(`=== ${item.name} ===\n${await extractText(item.file)}`);
        }
      }
      setProcessingLabel('IA identificando matéria e tópicos…');
      const response = await fetch('/api/gemini/scanner-analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, texts, subjectHint: subject.trim(), language: 'pt-BR' }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || `Erro do servidor (${response.status}).`);
      if (!data?.subject || !Array.isArray(data?.topics) || data.topics.length === 0) throw new Error('A IA não encontrou tópicos suficientes neste conteúdo. Tente enviar um documento mais legível ou uma foto melhor.');
      const normalized: AnalysisResult = {
        subject: String(data.subject),
        subjectDescription: String(data.subjectDescription || ''),
        topics: data.topics.map((topic: any, index: number) => ({ id: String(topic.id || `topic-${index + 1}`), title: String(topic.title || `Tópico ${index + 1}`), description: String(topic.description || ''), cardEstimate: Math.max(1, Number(topic.cardEstimate) || 5) })),
        totalEstimate: Number(data.totalEstimate) || 0,
        extractedContent: String(data.extractedContent || texts.join('\n\n')),
      };
      setAnalysis(normalized);
      setSelected(new Set(normalized.topics.map(topic => topic.id)));
      setCounts(Object.fromEntries(normalized.topics.map(topic => [topic.id, defaultCountForTopic(topic.cardEstimate)])));
      if (!subject.trim()) setSubject(normalized.subject);
      setStep('review');
    } catch (err: any) {
      setStatusMsg(err?.message || 'Ocorreu um erro ao analisar o conteúdo.');
      setStep('error');
    }
  };

  const generateCards = async () => {
    if (!analysis || selected.size === 0 || totalCards <= 0) return;
    if (noCredits) {
      onOpenAdMob?.();
      return;
    }
    setStep('generating');
    setProcessingLabel('Gerando flashcards com IA…');
    try {
      const topicsWithCounts = analysis.topics.filter(t => selected.has(t.id)).map(t => ({ title: t.title, count: counts[t.id] || defaultCountForTopic(t.cardEstimate) }));
      const response = await fetch('/api/gemini/scanner-process', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: [], texts: [], subject: subject.trim() || analysis.subject, count: totalCards, selectedTopics: topicsWithCounts.map(t => t.title), topicsWithCounts, extractedContent: analysis.extractedContent }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || `Erro do servidor (${response.status}).`);
      const raw = Array.isArray(data) ? data : Array.isArray(data?.cards) ? data.cards : Array.isArray(data?.flashcards) ? data.flashcards : [];
      if (!raw.length) throw new Error('Nenhum flashcard foi gerado. Tente novamente.');
      const deckTitle = (subject.trim() || analysis.subject || items[0]?.name.replace(/\.[^.]+$/, '') || 'Documento Escaneado').trim();
      const cards = raw.map((card: any, index: number) => ({
        ...card,
        id: card.id || `scanner-card-${Date.now()}-${index}`,
        subject: card.subject || deckTitle,
        topic: card.topic || analysis.topics.find(t => selected.has(t.id))?.title || deckTitle,
        difficulty: card.difficulty || 'medium',
        reps: 0,
        interval: 0,
        efactor: 2.5,
        dueDate: new Date().toISOString(),
      }));
      const deck: Deck = {
        id: `deck-scanner-${Date.now()}`,
        title: deckTitle,
        category: subject.trim() || analysis.subject || 'Scanner',
        description: `Deck gerado pelo Scanner a partir de ${items.length} arquivo(s)`,
        color: '#8b5cf6',
        accentBorder: 'border-purple-500',
        cards,
        createdAt: new Date().toISOString(),
      };
      onSaveNewDeck(deck);
      if (stats && !stats.isPro && onDeductCredit) onDeductCredit(cards.length * ECONOMY.COST_GENERATE_DECK);
      setGeneratedCards(cards);
      setStep('done');
    } catch (err: any) {
      setStatusMsg(err?.message || 'Ocorreu um erro ao gerar os flashcards.');
      setStep('error');
    }
  };

  const reset = () => {
    items.forEach(item => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
    setItems([]); setAnalysis(null); setSelected(new Set()); setCounts({}); setGeneratedCards([]); setExpandedCard(null); setSubject(''); setStatusMsg(''); setStep('collect');
  };

  const retry = () => setStep(analysis ? 'review' : 'collect');
  const toggleTopic = (id: string) => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  return (
    <>
      {showCamera && <CameraModal onCapture={file => { setShowCamera(false); void addItem(file); }} onClose={() => setShowCamera(false)} />}
      <input ref={cameraFallbackRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={e => { void handleFiles(Array.from(e.target.files || [])); e.currentTarget.value = ''; }} />
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5 text-slate-100">
        <div className="scanner-header rounded-2xl border border-purple-400/40 p-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="scanner-icon p-3 rounded-2xl border border-purple-400/40"><Camera className="w-7 h-7" /></div>
            <div><h3 className="scanner-title text-xl font-bold">Scanner & Upload</h3><p className="scanner-subtitle text-sm mt-0.5">Envie documentos — a IA identifica a matéria, lista os tópicos e gera flashcards</p></div>
          </div>
          {step !== 'collect' && step !== 'error' && <div className="mt-4 flex items-center gap-1 text-xs">{['Upload', 'Tópicos', 'Cards'].map((label, index) => <React.Fragment key={label}><span className="px-2.5 py-1 rounded-lg text-slate-300">{index === 0 ? <Upload className="w-3.5 h-3.5 inline mr-1" /> : index === 1 ? <Tag className="w-3.5 h-3.5 inline mr-1" /> : <Sparkles className="w-3.5 h-3.5 inline mr-1" />}{label}</span>{index < 2 && <ChevronRight className="w-3 h-3 text-slate-700" />}</React.Fragment>)}</div>}
        </div>

        {stats && !stats.isPro && <div className={`rounded-xl p-3.5 flex items-center justify-between gap-3 border ${noCredits ? 'bg-amber-500/10 border-amber-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
          <div className="flex items-center gap-2"><Sparkles className={`w-4 h-4 shrink-0 ${noCredits ? 'text-amber-400' : 'text-blue-400'}`} /><div><p className={`text-xs font-bold ${noCredits ? 'text-amber-300' : 'text-blue-300'}`}>{noCredits ? 'Sem créditos disponíveis' : `${stats.aiCredits || 0} crédito${(stats.aiCredits || 0) !== 1 ? 's' : ''} disponível`}</p><p className="text-[11px] text-slate-400">{noCredits ? 'Use a opção abaixo para obter mais créditos.' : `${ECONOMY.COST_GENERATE_DECK} crédito por card`}</p></div></div>{noCredits && onOpenAdMob && <button type="button" onClick={onOpenAdMob} className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">Ganhar créditos</button>}</div>}

        {step === 'collect' && <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5">
          <div onClick={() => fileInputRef.current?.click()} className="group border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-7 text-center bg-slate-950/40 cursor-pointer transition"><Upload className="w-7 h-7 text-purple-400 mx-auto mb-3" /><h4 className="text-white font-semibold">Clique para fazer upload</h4><p className="text-xs text-slate-400 mt-1">PDF, Word (.docx), TXT, Markdown, JPG, PNG</p><input ref={fileInputRef} type="file" multiple accept=".txt,.md,.json,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={e => { void handleFiles(Array.from(e.target.files || [])); e.currentTarget.value = ''; }} /></div>
          <button type="button" onClick={() => hasCamera ? setShowCamera(true) : cameraFallbackRef.current?.click()} className="w-full bg-gradient-to-r from-emerald-600/25 to-teal-600/25 text-emerald-300 border border-emerald-500/30 px-4 py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"><Camera className="w-5 h-5" />{items.length ? 'Fotografar Mais uma Página' : 'Abrir Câmera — Fotografar Página'}</button>

          {items.length > 0 && <><div className="space-y-2"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Arquivos selecionados ({items.length})</p><div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{items.map(item => <div key={item.id} className="relative aspect-square">{item.type === 'image' && item.previewUrl ? <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover rounded-xl border border-slate-700" /> : <div className="w-full h-full bg-blue-500/10 border border-blue-500/20 rounded-xl flex flex-col items-center justify-center p-2"><FileText className="w-6 h-6 text-blue-400" /><span className="text-[9px] text-blue-300 text-center line-clamp-2 break-all">{item.name}</span></div>}<button type="button" onClick={() => { item.previewUrl && URL.revokeObjectURL(item.previewUrl); setItems(prev => prev.filter(x => x.id !== item.id)); }} className="absolute top-1 right-1 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></div>)}</div></div>
          <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-300">Matéria / Assunto (opcional — a IA identifica automaticamente)</label><input type="text" value={subject} onChange={e => setSubject(e.target.value.toUpperCase())} placeholder="EX: DIREITO CONSTITUCIONAL, ANATOMIA…" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm uppercase" /></div>
          <button type="button" onClick={() => void analyzeItems()} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"><Search className="w-5 h-5" />Analisar Documento — Identificar Tópicos</button></>}

          {items.length === 0 && <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4 text-sm text-purple-200"><p className="font-medium flex items-center gap-2"><Sparkles className="w-4 h-4" />Como funciona</p><ul className="mt-2 space-y-1.5 text-xs text-purple-200/80"><li>📷 <strong>Câmera:</strong> fotografe páginas de livros, apostilas ou lousa.</li><li>📄 <strong>Upload:</strong> envie PDF, Word, TXT ou imagens.</li><li>🔍 <strong>Análise:</strong> a IA identifica a matéria e organiza os tópicos.</li><li>✅ <strong>Seleção:</strong> escolha os tópicos e a quantidade de cards.</li><li>🤖 <strong>Geração:</strong> os flashcards são salvos no deck criado.</li></ul></div>}
        </div>}

        {step === 'analyzing' && <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-10 flex flex-col items-center gap-5 text-center"><ScanLine className="w-12 h-12 text-indigo-400 animate-pulse" /><h4 className="text-white font-bold text-lg">Analisando documento…</h4><p className="text-sm text-slate-400">{processingLabel}</p><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>}

        {step === 'review' && analysis && <div className="space-y-4">
          <div className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-5 space-y-3"><div className="flex gap-3"><BookOpen className="w-5 h-5 text-indigo-400 mt-1" /><div><p className="text-xs font-bold uppercase text-indigo-400">Matéria identificada</p><h4 className="text-white font-bold text-lg">{analysis.subject}</h4><p className="text-sm text-slate-400 mt-1">{analysis.subjectDescription}</p></div></div><input type="text" value={subject} onChange={e => setSubject(e.target.value.toUpperCase())} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm uppercase" /></div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Layers className="w-4 h-4 text-purple-400" /><h4 className="text-white font-semibold text-sm">Tópicos encontrados</h4><span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-xs font-bold">{analysis.topics.length}</span></div><div className="flex gap-2"><button type="button" onClick={() => setSelected(new Set(analysis.topics.map(t => t.id)))} className="text-xs text-indigo-400">Todos</button><button type="button" onClick={() => setSelected(new Set())} className="text-xs text-slate-500">Nenhum</button></div></div><div className="space-y-2">{analysis.topics.map(topic => <TopicCard key={topic.id} topic={topic} selected={selected.has(topic.id)} count={counts[topic.id] || defaultCountForTopic(topic.cardEstimate)} onToggle={() => toggleTopic(topic.id)} onCount={n => setCounts(prev => ({ ...prev, [topic.id]: n }))} />)}</div><div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs text-slate-400"><Hash className="w-4 h-4" />{selected.size} de {analysis.topics.length} tópicos · <strong className="text-purple-300">{totalCards} cards</strong></div></div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4"><div className="flex justify-between text-xs text-slate-400"><span>Custo da geração</span><strong className={noCredits ? 'text-rose-400' : 'text-emerald-400'}>{requiredCredits} crédito{requiredCredits !== 1 ? 's' : ''}</strong></div><button type="button" onClick={() => void generateCards()} disabled={selected.size === 0 || totalCards === 0} className="w-full bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40">{noCredits ? <><Lock className="w-5 h-5" />Ganhar créditos</> : <><Sparkles className="w-5 h-5" />Gerar {totalCards} Flashcards</>}</button><button type="button" onClick={reset} className="w-full text-xs text-slate-600 py-1">↩ Voltar e adicionar mais arquivos</button></div>
        </div>}

        {step === 'generating' && <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-10 flex flex-col items-center gap-5 text-center"><Loader2 className="w-12 h-12 text-purple-400 animate-spin" /><h4 className="text-white font-bold text-lg">IA gerando flashcards…</h4><p className="text-sm text-slate-400">{processingLabel}</p></div>}

        {step === 'error' && <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-6 space-y-4"><div className="flex gap-3"><AlertCircle className="w-5 h-5 text-rose-400" /><div><h4 className="text-rose-300 font-semibold">Ocorreu um erro</h4><p className="text-sm text-slate-400 mt-1">{statusMsg}</p></div></div><div className="flex gap-2"><button type="button" onClick={retry} className="flex items-center gap-2 text-sm text-slate-300 border border-slate-700 px-4 py-2.5 rounded-xl"><RotateCcw className="w-4 h-4" />Tentar novamente</button><button type="button" onClick={reset} className="text-xs text-slate-500 px-3">Começar do zero</button></div></div>}

        {step === 'done' && generatedCards.length > 0 && <div className="space-y-4"><div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 flex items-start gap-4"><CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" /><div className="flex-1"><h4 className="text-emerald-300 font-bold">{generatedCards.length} flashcards gerados e salvos!</h4><p className="text-sm text-emerald-200/70">Seu deck está disponível na biblioteca.</p></div><button type="button" onClick={reset} className="text-xs text-slate-400">Novo scan</button></div><div className="space-y-2">{generatedCards.map((card, index) => { const expanded = expandedCard === card.id; return <div key={card.id || index} className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden"><button type="button" onClick={() => setExpandedCard(expanded ? null : card.id)} className="w-full text-left p-4 flex items-start gap-3"><span className="text-[11px] font-bold text-purple-400">#{index + 1}</span><div className="flex-1"><p className="text-[11px] uppercase text-slate-500 mb-1">{card.topic || 'Tópico'}</p><p className="text-sm text-white">{card.front || card.question || '—'}</p></div>{expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}</button>{expanded && <div className="px-4 pb-4 border-t border-slate-800 pt-3 text-sm text-slate-300"><span className="text-emerald-400 font-semibold">Resposta: </span>{card.back || card.answer || '—'}{card.explanation && <p className="text-xs text-slate-400 mt-2 bg-slate-900 rounded-lg p-3">{card.explanation}</p>}</div>}</div>; })}</div></div>}
      </div>
    </>
  );
}
