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
      const res = await fetchWithTimeout('/api/gemini/scanner-analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images, texts, subjectHint: subject.trim(), language: 'pt' }) }, 60_000);
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
        const documentItems = items.filter(item => item.type === 'document');
        let queuedCount = 0;
        let failedCount = 0;

        for (const item of documentItems) {
          if (queuedDocumentIds.current.has(item.id)) continue;
          try {
            const sourceText = documentSources[item.id] || await extractText(item.file);
            await enqueueDocumentContent({
              subject: (subject.trim() || analysis.subject).trim(),
              educationLevel: 'general',
              fileName: item.name,
              mimeType: item.file.type === 'text/plain' || item.name.toLowerCase().endsWith('.txt') ? 'text/plain' : 'application/pdf',
              sourceText,
              shareWithMemoriaFlash: true,
            });
            queuedDocumentIds.current.add(item.id);
            queuedCount++;
          } catch (queueError: any) {
            failedCount++;
            console.warn('[MemoriaFlash] Não foi possível enviar documento para a fila compartilhada:', queueError);
          }
        }

        if (queuedCount > 0) setShareMessage(`${queuedCount} documento(s) enviado(s) para o conteúdo compartilhado. O MemoriaFlashAgent processará o material em lote.`);
        if (failedCount > 0) setShareMessage(prev => `${prev}${prev ? ' ' : ''}${failedCount} documento(s) não puderam ser enviados para a fila; a geração do seu deck continuará normalmente.`);
      }

      const res = await fetchWithTimeout('/api/gemini/scanner-process', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ images: [], texts: [], subject: subject.trim() || analysis.subject, count: totalCards, selectedTopics: topicsWithCounts.map(t => t.title), topicsWithCounts, extractedContent: analysis.extractedContent }) }, 120_000);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Erro do servidor (${res.status}).`);
      const raw = Array.isArray(data) ? data : Array.isArray(data?.cards) ? data.cards : Array.isArray(data?.flashcards) ? data.flashcards : [];
      if (!raw.length) throw new Error('Nenhum flashcard foi gerado. Tente novamente.');
      const title = (subject.trim() || analysis.subject || items[0]?.name.replace(/\.[^.]+$/, '') || 'Documento Escaneado').trim();
      const normalized = raw.map((card: any, i: number) => ({ ...card, id: card.id || `scanner-card-${Date.now()}-${i}`, subject: card.subject || title, topic: card.topic || topicsWithCounts[0]?.title || title, difficulty: card.difficulty || 'medium', source: 'ai' as const, reps: 0, interval: 0, efactor: 2.5, dueDate: new Date().toISOString() }));
      const deck: Deck = { id: `deck-scanner-${Date.now()}`, title, category: subject.trim() || analysis.subject || 'Scanner', description: `Deck gerado pelo Scanner a partir de ${items.length} arquivo(s)`, color: '#8b5cf6', accentBorder: 'border-purple-500', cards: normalized, createdAt: new Date().toISOString() };
      onSaveNewDeck(deck); if (stats && !stats.isPro && onDeductCredit) onDeductCredit(normalized.length * ECONOMY.COST_GENERATE_DECK); setCards(normalized); setStep('done');
    } catch (e: any) { setMessage(e?.message || 'Ocorreu um erro ao gerar os flashcards.'); setStep('error'); }
  };

  const reset = () => { queuedDocumentIds.current.clear(); items.forEach(i => i.previewUrl && URL.revokeObjectURL(i.previewUrl)); setItems([]); setAnalysis(null); setDocumentSources({}); setShareWithMemoriaFlash(false); setShareMessage(''); setSelected(new Set()); setCounts({}); setCards([]); setExpanded(null); setSubject(''); setMessage(''); setStep('collect'); };

  return <>
    {cameraOpen && <CameraModal onCapture={file => { setCameraOpen(false); void addFile(file); }} onClose={() => setCameraOpen(false)} />}
    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={e => { void addFiles(Array.from(e.target.files || [])); e.currentTarget.value = ''; }} />
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5 text-slate-100">
      <div className="scanner-header rounded-2xl border border-purple-400/40 p-6 shadow-xl"><div className="flex items-center gap-4"><div className="p-3 rounded-2xl border border-purple-400/40"><Camera className="w-7 h-7" /></div><div><h3 className="text-xl font-bold">Scanner & Upload</h3><p className="text-sm text-slate-400 mt-1">Envie documentos — a IA identifica a matéria, lista os tópicos e gera flashcards</p></div></div></div>
      {/* Só mostra o aviso de créditos quando é acionável (sem créditos); o custo por card
          já aparece no resumo da etapa de revisão, então repetir "N créditos disponível"
          o tempo todo é apenas ruído visual. */}
      {stats && !stats.isPro && noCredits && <div className="rounded-xl p-3.5 flex items-center justify-between gap-3 border bg-amber-500/10 border-amber-500/30"><div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" /><div><b className="text-xs text-amber-300">Sem créditos disponíveis</b><p className="text-[11px] text-slate-400">Obtenha mais créditos para continuar.</p></div></div>{onOpenAdMob && <button onClick={onOpenAdMob} className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">Ganhar créditos</button>}</div>}
      {step === 'collect' && <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-5"><div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-7 text-center cursor-pointer"><Upload className="w-7 h-7 text-purple-400 mx-auto mb-3" /><b className="text-white">Clique para fazer upload</b><p className="text-xs text-slate-400 mt-1">PDF, TXT, JPG, PNG</p><input ref={inputRef} type="file" multiple accept=".txt,.pdf,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={e => { void addFiles(Array.from(e.target.files || [])); e.currentTarget.value = ''; }} /></div><button onClick={() => cameraAvailable ? setCameraOpen(true) : cameraInputRef.current?.click()} className="w-full py-3.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 font-semibold flex justify-center gap-2"><Camera className="w-5 h-5" />Abrir Câmera — Fotografar Página</button>{items.length > 0 && <><div><p className="text-xs font-bold uppercase text-slate-400 mb-2">Arquivos selecionados ({items.length})</p><div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{items.map(item => <div key={item.id} className="relative aspect-square">{item.previewUrl ? <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover rounded-xl" /> : <div className="w-full h-full rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col items-center justify-center p-2"><FileText className="text-blue-400" /><span className="text-[9px] text-blue-300 text-center break-all line-clamp-2">{item.name}</span></div>}<button onClick={() => { item.previewUrl && URL.revokeObjectURL(item.previewUrl); setItems(prev => prev.filter(x => x.id !== item.id)); }} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"><X className="w-3 h-3" /></button></div>)}</div></div><div><label className="text-xs font-bold text-slate-300">Matéria / Assunto (opcional — a IA identifica automaticamente)</label><input value={subject} onChange={e => setSubject(e.target.value.toUpperCase())} placeholder="EX: DIREITO CONSTITUCIONAL, ANATOMIA…" className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm uppercase" /></div><button onClick={() => void analyze()} className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold flex justify-center gap-2"><Search className="w-5 h-5" />Analisar Documento — Identificar Tópicos</button></>}</div>}
      {step === 'analyzing' && <div className="rounded-2xl bg-slate-900/80 p-10 text-center flex flex-col items-center gap-4"><Loader2 className="w-10 h-10 text-indigo-400 animate-spin" /><b className="text-white">Analisando documento…</b><p className="text-sm text-slate-400">{processing}</p></div>}
      {step === 'review' && analysis && <div className="space-y-4"><div className="rounded-2xl bg-slate-900/80 border border-indigo-500/30 p-5"><p className="text-xs font-bold uppercase text-indigo-400">Matéria identificada</p><h4 className="text-xl font-bold text-white mt-1">{analysis.subject}</h4><p className="text-sm text-slate-400 mt-1">{analysis.subjectDescription}</p><input value={subject} onChange={e => setSubject(e.target.value.toUpperCase())} className="mt-3 w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm uppercase" /></div><div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Layers className="w-4 h-4 text-purple-400" /><b>Tópicos encontrados ({analysis.topics.length})</b></div><div className="flex gap-2"><button onClick={() => setSelected(new Set(analysis.topics.map(t => t.id)))} className="text-xs text-indigo-400">Todos</button><button onClick={() => setSelected(new Set())} className="text-xs text-slate-500">Nenhum</button></div></div>{analysis.topics.map(topic => <TopicRow key={topic.id} topic={topic} selected={selected.has(topic.id)} count={counts[topic.id] || defaultCount(topic.cardEstimate)} toggle={() => setSelected(prev => { const n = new Set(prev); n.has(topic.id) ? n.delete(topic.id) : n.add(topic.id); return n; })} changeCount={n => setCounts(prev => ({ ...prev, [topic.id]: n }))} />)}</div>{items.some(item => item.type === 'document') && <div className="rounded-2xl bg-slate-900/80 border border-emerald-500/20 p-4"><label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={shareWithMemoriaFlash} onChange={e => setShareWithMemoriaFlash(e.target.checked)} className="mt-1 h-4 w-4 accent-emerald-500" /><span><b className="block text-sm text-emerald-300">Contribuir para o conteúdo do MemoriaFlash</b><span className="block text-xs text-slate-400 mt-1">Autorize o uso deste PDF/TXT para criar matéria, tópicos, subtópicos e flashcards compartilhados. Seu deck pessoal continua sendo gerado normalmente.</span></span></label></div>}<div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-3"><p className="text-xs text-slate-400">{selected.size} tópico(s) selecionado(s) · <b className="text-purple-300">{totalCards} cards</b> · custo {cost} crédito(s)</p><button onClick={() => void generate()} disabled={selected.size === 0 || totalCards === 0} className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold flex justify-center gap-2 disabled:opacity-40">{noCredits ? <><Lock className="w-5 h-5" />Ganhar créditos</> : <><Sparkles className="w-5 h-5" />Gerar {totalCards} Flashcards</>}</button><button onClick={reset} className="w-full text-xs text-slate-500 py-1">Voltar e adicionar arquivos</button></div></div>}
      {step === 'generating' && <div className="rounded-2xl bg-slate-900/80 p-10 text-center flex flex-col items-center gap-4"><Loader2 className="w-10 h-10 text-purple-400 animate-spin" /><b className="text-white">IA gerando flashcards…</b><p className="text-sm text-slate-400">{processing}</p></div>}
      {step === 'error' && <div className="rounded-2xl bg-slate-900/80 border border-rose-500/30 p-6 space-y-4"><div className="flex gap-3"><AlertCircle className="text-rose-400" /><div><b className="text-rose-300">Ocorreu um erro</b><p className="text-sm text-slate-400 mt-1">{message}</p></div></div><div className="flex gap-2"><button onClick={() => setStep(analysis ? 'review' : 'collect')} className="px-4 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300"><RotateCcw className="w-4 h-4 inline mr-2" />Tentar novamente</button><button onClick={reset} className="px-3 text-xs text-slate-500">Começar do zero</button></div></div>}
      {step === 'done' && cards.length > 0 && <div className="space-y-4"><div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/30 p-5 flex gap-3"><CheckCircle2 className="text-emerald-400 shrink-0" /><div className="flex-1"><b className="text-emerald-300">{cards.length} flashcards gerados e salvos!</b><p className="text-sm text-emerald-200/70">Seu deck está disponível na biblioteca.</p>{shareMessage && <p className="mt-2 text-xs text-emerald-300/80">{shareMessage}</p>}</div><button onClick={reset} className="text-xs text-slate-400">Novo scan</button></div>{cards.map((card, i) => { const open = expanded === card.id; return <div key={card.id || i} className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden"><button onClick={() => setExpanded(open ? null : card.id)} className="w-full p-4 text-left flex gap-3"><span className="text-xs text-purple-400">#{i + 1}</span><span className="flex-1"><span className="block text-[11px] text-slate-500">{card.topic || 'Tópico'}</span><span className="block text-sm text-white mt-1">{card.front || card.question || '—'}</span></span>{open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}</button>{open && <div className="border-t border-slate-800 p-4 text-sm text-slate-300"><b className="text-emerald-400">Resposta: </b>{card.back || card.answer || '—'}{card.explanation && <p className="mt-2 text-xs text-slate-400">{card.explanation}</p>}</div>}</div>; })}</div>}
    </div>
  </>;
}
