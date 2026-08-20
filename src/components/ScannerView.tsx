import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, BookOpen, Camera, Check, CheckCircle2, ChevronDown, ChevronUp, FileText, FlipHorizontal, Layers, Loader2, Lock, RotateCcw, Search, Sparkles, Tag, Upload, X } from 'lucide-react';
import { Deck, UserStats } from '../types';
import { ECONOMY } from '../services/economy/economyConstants';
import { auth, ensureAuthenticated } from '../lib/firebase';
import { fetchWithTimeout } from '../lib/fetchWithTimeout';
import { enqueueDocumentContent } from '../services/contentRequestService';

interface Item { id: string; type: 'image' | 'document'; name: string; file: File; previewUrl?: string; base64?: string; }
interface Topic { id: string; title: string; description: string; cardEstimate: number; }
interface Analysis { subject: string; subjectDescription: string; topics: Topic[]; totalEstimate: number; extractedContent: string; }
type Step = 'collect' | 'analyzing' | 'review' | 'generating' | 'done' | 'error';
interface Props { onSaveNewDeck: (deck: Deck) => void; stats?: UserStats; onDeductCredit?: (amount?: number) => void; onOpenAdMob?: () => void; onOpenSubscription?: () => void; }

const CARD_OPTIONS = [3, 5, 8, 10, 15, 20];
const MAX_FILES = 20;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_DOCUMENT_CHARS = 900000;

const defaultCount = (estimate: number) => estimate <= 4 ? 3 : estimate <= 7 ? 5 : estimate <= 12 ? 8 : estimate <= 17 ? 10 : estimate <= 22 ? 15 : 20;

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

async function script(src: string, key: string) {
  if ((window as any)[key]) return;
  await new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src; el.async = true; el.dataset.memoriaflash = key;
    el.onload = () => resolve(); el.onerror = () => reject(new Error(`Não foi possível carregar ${key}.`));
    document.head.appendChild(el);
  });
}

async function extractText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (file.type === 'text/plain' || ext === 'txt') {
    const text = (await file.text()).replace(/\u0000/g, '').trim();
    if (!text) throw new Error(`O arquivo "${file.name}" está vazio.`);
    if (text.length > MAX_DOCUMENT_CHARS) throw new Error(`O arquivo "${file.name}" excede o limite de conteúdo. Divida o TXT em partes menores.`);
    return text;
  }
  if (ext === 'pdf' || file.type === 'application/pdf') {
    await script('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'pdfjsLib');
    const pdfjs = (window as any).pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];
    let totalChars = 0;
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const text = content.items.map((i: any) => i?.str || '').join(' ').trim();
      if (!text) continue;
      const pageText = `[Página ${n}]\n${text}`;
      if (totalChars + pageText.length > MAX_DOCUMENT_CHARS) {
        throw new Error(`O PDF "${file.name}" ultrapassa o limite de conteúdo de ${MAX_DOCUMENT_CHARS.toLocaleString('pt-BR')} caracteres. Divida o PDF em partes menores.`);
      }
      pages.push(pageText);
      totalChars += pageText.length;
    }
    if (!pages.length) throw new Error(`O PDF "${file.name}" não possui texto extraível. Para PDF escaneado, fotografe as páginas.`);
    return pages.join('\n\n');
  }
  throw new Error(`Formato não suportado: ${file.name}. Nesta versão, documentos aceitos são apenas PDF e TXT.`);
}

function CameraModal({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const start = useCallback(async (mode: 'environment' | 'user') => {
    streamRef.current?.getTracks().forEach(t => t.stop()); setReady(false); setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('A câmera não está disponível neste dispositivo.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); setReady(true); }
    } catch (e: any) {
      setError(e?.name === 'NotAllowedError' ? 'Permissão de câmera negada. Autorize a câmera nas configurações do MemoriaFlash.' : e?.message || 'Não foi possível abrir a câmera.');
    }
  }, []);
  useEffect(() => { void start(facing); return () => streamRef.current?.getTracks().forEach(t => t.stop()); }, [start, facing]);
  const capture = () => {
    const video = videoRef.current; if (!video || !ready) return;
    const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(blob => blob && onCapture(new File([blob], `pagina-${Date.now()}.jpg`, { type: 'image/jpeg' })), 'image/jpeg', 0.92);
  };
  return <div className="fixed inset-0 z-[100] bg-black flex flex-col"><div className="flex justify-between items-center p-4 bg-black/80"><button onClick={onClose} className="text-white text-sm">Fechar</button><b className="text-white text-sm">Fotografar Página</b><button disabled={!ready} onClick={() => setFacing(v => v === 'environment' ? 'user' : 'environment')} className="text-white disabled:opacity-40"><FlipHorizontal className="w-5 h-5" /></button></div><div className="relative flex-1"><video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />{!ready && !error && <div className="absolute inset-0 flex items-center justify-center bg-black/70"><Loader2 className="text-white animate-spin" /></div>}{error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 bg-black/80 text-center"><AlertCircle className="text-rose-400 w-10 h-10" /><p className="text-white text-sm">{error}</p><button onClick={() => void start(facing)} className="px-4 py-2 bg-white/10 rounded-xl text-white">Tentar novamente</button></div>}</div><div className="bg-black p-6 flex justify-center"><button disabled={!ready} onClick={capture} className="w-16 h-16 rounded-full bg-white disabled:opacity-40 flex items-center justify-center"><Camera className="text-black" /></button></div></div>;
}

function TopicRow({ topic, selected, count, toggle, changeCount }: { topic: Topic; selected: boolean; count: number; toggle: () => void; changeCount: (n: number) => void }) {
  return <div className={`rounded-xl border ${selected ? 'bg-purple-600/15 border-purple-500/50' : 'bg-slate-950/50 border-slate-800'}`}><button type="button" onClick={toggle} className="w-full p-3.5 text-left flex items-start gap-3"><span className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center ${selected ? 'bg-purple-600 border-purple-500' : 'border-slate-600'}`}>{selected && <Check className="w-3 h-3 text-white" />}</span><span className="flex-1"><b className="block text-sm text-slate-100">{topic.title}</b>{topic.description && <span className="block text-xs text-slate-500 mt-1">{topic.description}</span>}</span><span className="text-[10px] px-2 py-1 rounded-full bg-slate-800 text-slate-400">IA~{topic.cardEstimate}</span></button>{selected && <div className="px-3.5 pb-3.5 flex flex-wrap gap-1.5 items-center"><span className="text-[11px] text-slate-400">Cards:</span>{CARD_OPTIONS.map(n => <button key={n} type="button" onClick={e => { e.stopPropagation(); changeCount(n); }} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${count === n ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>{n}</button>)}</div>}</div>;
}

export function ScannerView({ onSaveNewDeck, stats, onDeductCredit, onOpenAdMob }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('collect');
  const [items, setItems] = useState<Item[]>([]);
  const [subject, setSubject] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [cards, setCards] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [shareWithMemoriaFlash, setShareWithMemoriaFlash] = useState(false);
  const [documentSources, setDocumentSources] = useState<Record<string, string>>({});
  const [shareMessage, setShareMessage] = useState('');
  const queuedDocumentIds = useRef(new Set<string>());

  useEffect(() => setCameraAvailable(!!navigator.mediaDevices?.getUserMedia), []);
  useEffect(() => () => items.forEach(item => item.previewUrl && URL.revokeObjectURL(item.previewUrl)), []);

  const totalCards = analysis?.topics.filter(t => selected.has(t.id)).reduce((sum, t) => sum + (counts[t.id] || defaultCount(t.cardEstimate)), 0) || 0;
  const cost = totalCards * ECONOMY.COST_GENERATE_DECK;
  const noCredits = !!stats && !stats.isPro && (stats.aiCredits || 0) < cost;

  const addFile = useCallback(async (file: File) => {
    if (items.length >= MAX_FILES) throw new Error(`Limite de ${MAX_FILES} arquivos por análise.`);
    if (file.size > MAX_FILE_SIZE) throw new Error(`"${file.name}" ultrapassa o limite de 25 MB.`);
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!isImage && ext !== 'pdf' && ext !== 'txt' && file.type !== 'application/pdf' && file.type !== 'text/plain') {
      throw new Error(`Formato não suportado: "${file.name}". Nesta versão, documentos aceitos são apenas PDF e TXT.`);
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (isImage) {
      const previewUrl = URL.createObjectURL(file);
      const base64 = await toBase64(file);
      setItems(prev => [...prev, { id, type: 'image', name: file.name, file, previewUrl, base64 }]);
    } else setItems(prev => [...prev, { id, type: 'document', name: file.name, file }]);
  }, [items.length]);

  const addFiles = async (files: File[]) => {
    setMessage('');
    try { for (const file of files) await addFile(file); } catch (e: any) { setMessage(e?.message || 'Não foi possível adicionar o arquivo.'); setStep('error'); }
  };

  const analyze = async () => {
    if (!items.length) return;
    setStep('analyzing'); setMessage('');
    try {
      const images: string[] = []; const texts: string[] = []; const documentSourceMap: Record<string, string> = {};
      for (const item of items) {
        setProcessing(`Processando ${item.name}…`);
        if (item.type === 'image') images.push(item.base64 || await toBase64(item.file));
        else {
          const extracted = await extractText(item.file);
          documentSourceMap[item.id] = extracted;
          texts.push(`=== ${item.name} ===\n${extracted}`);
        }
      }
      setProcessing('IA identificando matéria e tópicos…');
      // 130s: mesmo raciocínio do curriculumService — o backend pode tentar
      // até 3 provedores de IA em sequência (Gemini ~30s + DeepSeek ~60s +
      // OpenAI ~25s de timeout cada) antes de desistir, o que passa dos 60s
      // que tínhamos aqui e cancelava a análise antes do servidor responder.
      const res = await fetchWithTimeout('/api/gemini/scanner-analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images, texts, subjectHint: subject.trim(), language: 'pt' }) }, 130_000);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erro do servidor (${res.status}).`);
      if (!data?.subject || !Array.isArray(data.topics) || !data.topics.length) throw new Error('A IA não encontrou tópicos suficientes. Envie conteúdo mais legível ou uma foto melhor.');
      const normalized: Analysis = { subject: String(data.subject), subjectDescription: String(data.subjectDescription || ''), topics: data.topics.map((t: any, i: number) => ({ id: String(t.id || `topic-${i + 1}`), title: String(t.title || `Tópico ${i + 1}`), description: String(t.description || ''), cardEstimate: Math.max(1, Number(t.cardEstimate) || 5) })), totalEstimate: Number(data.totalEstimate) || 0, extractedContent: String(data.extractedContent || texts.join('\n\n')) };
      setDocumentSources(documentSourceMap);
      setAnalysis(normalized); setSelected(new Set(normalized.topics.map(t => t.id))); setCounts(Object.fromEntries(normalized.topics.map(t => [t.id, defaultCount(t.cardEstimate)]))); if (!subject.trim()) setSubject(normalized.subject); setStep('review');
    } catch (e: any) { setMessage(e?.message || 'Ocorreu um erro ao analisar o conteúdo.'); setStep('error'); }
  };

  const generate = async () => {
    if (!analysis || selected.size === 0 || totalCards <= 0) return;
    if (noCredits) { onOpenAdMob?.(); return; }
    setStep('generating'); setProcessing('Gerando flashcards com IA…');
    try {
      const topicsWithCounts = analysis.topics.filter(t => selected.has(t.id)).map(t => ({ title: t.title, count: counts[t.id] || defaultCount(t.cardEstimate) }));
      const user = auth.currentUser || await ensureAuthenticated();
      const idToken = await user.getIdToken();

      if (shareWithMemoriaFlash) {
        const documentSourcesToShare = Object.entries(documentSources).filter(([id]) => queuedDocumentIds.current.has(id)).reduce((acc, [id, content]) => ({ ...acc, [id]: content }), {} as Record<string, string>);
        void Object.entries(documentSourcesToShare).map(([id, content]) => ({ id, content }));
      }

      const res = await fetchWithTimeout('/api/gemini/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ prompt: analysis.subject, topicsWithCounts, language: 'pt', difficulty: 'medium', educationLevel: 'medio' }) }, 130_000);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erro do servidor (${res.status}).`);
      const generated = Array.isArray(data?.cards) ? data.cards : [];
      if (!generated.length) throw new Error('A IA não retornou cards.');
      setCards(generated); setStep('done'); onDeductCredit?.(cost);
    } catch (e: any) { setMessage(e?.message || 'Ocorreu um erro ao gerar os flashcards.'); setStep('error'); }
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(item => item.id !== id));
  const toggleTopic = (id: string) => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const changeCount = (id: string, n: number) => setCounts(prev => ({ ...prev, [id]: n }));
  const reset = () => { setStep('collect'); setItems([]); setAnalysis(null); setCards([]); setMessage(''); setProcessing(''); };
  const saveDeck = () => { if (!analysis || !cards.length) return; onSaveNewDeck({ id: `deck-${Date.now()}`, name: analysis.subject, cards, createdAt: new Date().toISOString() } as any); };

  return <div className="p-6 max-w-6xl mx-auto"><div className="flex items-center justify-between gap-4 mb-6"><div><h2 className="text-2xl font-bold text-slate-100">Scanner</h2><p className="text-sm text-slate-400">Transforme PDF, TXT e fotos em flashcards.</p></div>{step !== 'collect' && <button onClick={reset} className="text-sm text-slate-300">Recomeçar</button>}</div>{step === 'collect' && <div className="space-y-6"><input ref={inputRef} type="file" multiple accept="image/*,.pdf,.txt" className="hidden" onChange={e => void addFiles(Array.from(e.target.files || []))} /><input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void addFiles([file]); }} /><div className="grid md:grid-cols-3 gap-4"><button onClick={() => inputRef.current?.click()} className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 text-left"><Upload className="w-6 h-6 mb-3 text-purple-400" /><b className="block text-slate-100">Enviar arquivos</b><span className="text-xs text-slate-400">PDF, TXT ou imagens</span></button><button onClick={() => cameraAvailable ? setCameraOpen(true) : cameraInputRef.current?.click()} className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 text-left"><Camera className="w-6 h-6 mb-3 text-purple-400" /><b className="block text-slate-100">Usar câmera</b><span className="text-xs text-slate-400">Fotografe páginas</span></button><button onClick={() => setSubject('')} className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 text-left"><Sparkles className="w-6 h-6 mb-3 text-purple-400" /><b className="block text-slate-100">Matéria</b><span className="text-xs text-slate-400">Opcional: informe uma dica</span></button></div><div className="space-y-2"><label className="text-xs text-slate-400">Dica de matéria</label><input value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100" placeholder="Ex.: Direito Constitucional" /></div>{items.length > 0 && <div className="space-y-3">{items.map(item => <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/60"><div className="w-12 h-12 rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center">{item.previewUrl ? <img src={item.previewUrl} className="w-full h-full object-cover" /> : <FileText className="text-slate-500" />}</div><div className="flex-1 min-w-0"><b className="block text-sm text-slate-100 truncate">{item.name}</b><span className="text-xs text-slate-500">{item.type === 'image' ? 'Imagem' : 'Documento'}</span></div><button onClick={() => removeItem(item.id)} className="p-2 text-slate-500 hover:text-white"><X className="w-4 h-4" /></button></div>)}<button onClick={() => void analyze()} className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold">Analisar conteúdo</button></div>}</div>}{step === 'analyzing' && <div className="py-20 flex flex-col items-center gap-4 text-center"><Loader2 className="w-10 h-10 animate-spin text-purple-400" /><h3 className="text-lg font-semibold text-slate-100">Analisando conteúdo</h3><p className="text-sm text-slate-400">{processing}</p></div>}{step === 'review' && analysis && <div className="space-y-6"><div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5"><div className="flex items-center gap-3"><BookOpen className="text-purple-400" /><div><h3 className="text-lg font-bold text-slate-100">{analysis.subject}</h3><p className="text-sm text-slate-400">{analysis.subjectDescription}</p></div></div></div><div className="space-y-3">{analysis.topics.map(topic => <TopicRow key={topic.id} topic={topic} selected={selected.has(topic.id)} count={counts[topic.id] || defaultCount(topic.cardEstimate)} toggle={() => toggleTopic(topic.id)} changeCount={n => changeCount(topic.id, n)} />)}</div><button onClick={() => void generate()} disabled={noCredits} className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold disabled:opacity-50">Gerar {totalCards} cards</button></div>}{step === 'generating' && <div className="py-20 flex flex-col items-center gap-4 text-center"><Loader2 className="w-10 h-10 animate-spin text-purple-400" /><h3 className="text-lg font-semibold text-slate-100">Gerando flashcards</h3><p className="text-sm text-slate-400">{processing}</p></div>}{step === 'done' && <div className="space-y-5"><div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 flex items-center gap-3"><CheckCircle2 className="text-emerald-400" /><div><h3 className="font-bold text-slate-100">Cards gerados</h3><p className="text-sm text-slate-400">{cards.length} flashcards prontos.</p></div></div><div className="space-y-3">{cards.map((card, i) => <div key={i} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><button className="w-full flex items-center justify-between text-left" onClick={() => setExpanded(expanded === String(i) ? null : String(i))}><span className="text-sm font-semibold text-slate-100">{card.front}</span>{expanded === String(i) ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}</button>{expanded === String(i) && <div className="mt-3 space-y-2 text-sm"><p className="text-slate-300"><b>Resposta:</b> {card.back}</p><p className="text-slate-400"><b>Explicação:</b> {card.explanation}</p></div>}</div>)}</div><button onClick={saveDeck} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold">Salvar baralho</button></div>}{step === 'error' && <div className="py-20 flex flex-col items-center gap-4 text-center"><AlertCircle className="w-10 h-10 text-rose-400" /><h3 className="text-lg font-semibold text-slate-100">Não foi possível concluir</h3><p className="text-sm text-slate-400 max-w-lg">{message || 'Tente novamente.'}</p><button onClick={() => setStep('collect')} className="px-4 py-2 rounded-xl bg-slate-800 text-white">Voltar</button></div>}{cameraOpen && <CameraModal onCapture={file => { setCameraOpen(false); void addFiles([file]); }} onClose={() => setCameraOpen(false)} />}</div>;
}
