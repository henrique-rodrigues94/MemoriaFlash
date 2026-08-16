import { addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getStoredDecks } from './storage';
import type { Flashcard } from '../types';

export type StudyFeedbackReason = 'wrong_answer' | 'bad_explanation' | 'confusing_question' | 'duplicate_content' | 'outdated_content' | 'other';
export interface StudyFeedbackPayload { reason: StudyFeedbackReason; comment?: string; }

function normalize(value: string): string {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
}

async function deriveBucketId(subject: string, topic: string, level: string, cardType: string): Promise<string> {
  const value = `${normalize(subject)}|${normalize(topic)}||${level}|${cardType}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }
  return '';
}

function findCardFromStudyDom(): { card: Flashcard; subject: string; deckId: string } | null {
  const container = document.getElementById('flashcard-flip-container');
  if (!container) return null;
  const question = container.querySelector('h3')?.textContent?.trim() || '';
  if (!question) return null;
  const topic = container.querySelector('span.truncate')?.textContent?.trim() || '';
  const normalizedQuestion = normalize(question);
  for (const deck of getStoredDecks()) {
    const card = deck.cards.find(candidate => normalize(candidate.front) === normalizedQuestion || normalize(candidate.back) === normalizedQuestion);
    if (card) return { card, subject: deck.category || deck.title, deckId: deck.id };
  }
  return {
    card: { id: `unknown-${Date.now()}`, front: question, back: '', topic: topic || 'Desconhecido', reps: 0, interval: 0, efactor: 2.5, dueDate: new Date().toISOString() },
    subject: topic || 'MemoriaFlash',
    deckId: '',
  };
}

export function getCurrentStudyCard(): { card: Flashcard; subject: string; deckId: string } | null { return findCardFromStudyDom(); }

export async function submitStudyCardFeedback(payload: StudyFeedbackPayload): Promise<void> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Faça login para enviar um feedback sobre este card.');
  const context = findCardFromStudyDom();
  if (!context) throw new Error('Não foi possível identificar o card atual. Tente novamente.');

  const { card, subject, deckId } = context;
  const now = new Date().toISOString();
  const cardType = card.cardContentType || 'definition';
  const level = card.educationLevel || 'medio';
  const topic = card.topic || subject;
  const bucketId = card.bucketId || await deriveBucketId(subject, topic, level, cardType);
  const comment = payload.comment?.trim().slice(0, 500) || '';

  const feedback: Record<string, unknown> = {
    cardId: card.id,
    bucketId,
    subject,
    topic,
    level,
    cardType,
    difficulty: card.difficulty || 'medium',
    rating: 'negative',
    reason: payload.reason,
    userId: user.uid,
    deckId: deckId || undefined,
    front: card.front.slice(0, 4000),
    back: card.back.slice(0, 4000),
    explanation: (card.explanation || '').slice(0, 6000),
    createdAt: now,
    status: 'pending',
    source: 'mobile-study',
  };
  if (card.subtopic) feedback.subtopic = card.subtopic;
  if (comment) feedback.comment = comment;

  await addDoc(collection(db, 'cardFeedback'), feedback);
}

const FEEDBACK_REASONS: Array<{ value: StudyFeedbackReason; label: string }> = [
  { value: 'wrong_answer', label: 'Resposta errada' },
  { value: 'bad_explanation', label: 'Explicação ruim ou incompleta' },
  { value: 'confusing_question', label: 'Pergunta confusa' },
  { value: 'duplicate_content', label: 'Conteúdo duplicado' },
  { value: 'outdated_content', label: 'Conteúdo desatualizado' },
  { value: 'other', label: 'Outro problema' },
];

function ensureStyles(): void {
  if (document.getElementById('memoriaflash-feedback-styles')) return;
  const style = document.createElement('style');
  style.id = 'memoriaflash-feedback-styles';
  style.textContent = `.mf-feedback-btn{position:absolute;right:12px;bottom:12px;z-index:20;border:1px solid rgba(248,113,113,.25);background:rgba(15,23,42,.82);color:#fda4af;border-radius:12px;padding:7px 10px;font-size:11px;font-weight:800;display:flex;align-items:center;gap:6px;backdrop-filter:blur(8px);cursor:pointer;transition:.2s}.mf-feedback-btn:hover{background:rgba(127,29,29,.5);border-color:rgba(248,113,113,.45);color:#fecdd3}.mf-feedback-backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(2,6,23,.78);backdrop-filter:blur(8px)}.mf-feedback-modal{width:min(100%,420px);background:#0b1a2a;border:1px solid rgba(148,163,184,.2);border-radius:24px;padding:20px;box-shadow:0 25px 80px rgba(0,0,0,.5);color:#fff}.mf-feedback-title{font-size:16px;font-weight:900;margin-bottom:4px}.mf-feedback-sub{font-size:11px;color:#94a3b8;margin-bottom:16px}.mf-feedback-reasons{display:grid;gap:8px}.mf-feedback-reason{width:100%;padding:10px 12px;border:1px solid rgba(148,163,184,.18);background:#122131;color:#cbd5e1;border-radius:12px;text-align:left;font-size:12px;font-weight:700;cursor:pointer}.mf-feedback-reason.active{border-color:rgba(96,165,250,.65);background:rgba(37,99,235,.16);color:#bfdbfe}.mf-feedback-text{width:100%;min-height:78px;margin-top:12px;padding:10px 12px;border:1px solid rgba(148,163,184,.18);background:#081522;color:#e2e8f0;border-radius:12px;resize:vertical;outline:none;font-size:12px}.mf-feedback-text:focus{border-color:rgba(96,165,250,.6)}.mf-feedback-actions{display:flex;gap:8px;margin-top:12px}.mf-feedback-cancel,.mf-feedback-send{flex:1;padding:11px;border-radius:12px;font-size:12px;font-weight:900;cursor:pointer}.mf-feedback-cancel{background:#122131;border:1px solid rgba(148,163,184,.18);color:#cbd5e1}.mf-feedback-send{background:#2563eb;border:1px solid #3b82f6;color:#fff}.mf-feedback-send:disabled{opacity:.45;cursor:not-allowed}.mf-feedback-error{margin-top:10px;color:#fda4af;font-size:11px}.mf-feedback-success{text-align:center;padding:18px 4px}.mf-feedback-success strong{display:block;font-size:15px;margin-bottom:5px}.mf-feedback-success span{display:block;color:#94a3b8;font-size:11px}`;
  document.head.appendChild(style);
}

function openFeedbackModal(): void {
  if (document.getElementById('memoriaflash-feedback-backdrop')) return;
  ensureStyles();
  const backdrop = document.createElement('div'); backdrop.id = 'memoriaflash-feedback-backdrop'; backdrop.className = 'mf-feedback-backdrop';
  const modal = document.createElement('div'); modal.className = 'mf-feedback-modal';
  modal.innerHTML = '<div class="mf-feedback-title">Encontrou um problema neste card?</div><div class="mf-feedback-sub">Seu feedback ajuda o MemoriaFlash a corrigir e melhorar o conteúdo.</div>';
  const reasons = document.createElement('div'); reasons.className = 'mf-feedback-reasons';
  let selected: StudyFeedbackReason | null = null;
  for (const reason of FEEDBACK_REASONS) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'mf-feedback-reason'; button.textContent = reason.label;
    button.onclick = () => { selected = reason.value; reasons.querySelectorAll('button').forEach(b => b.classList.remove('active')); button.classList.add('active'); send.disabled = false; };
    reasons.appendChild(button);
  }
  const text = document.createElement('textarea'); text.className = 'mf-feedback-text'; text.maxLength = 500; text.placeholder = 'Explique o que está errado (opcional)...';
  const actions = document.createElement('div'); actions.className = 'mf-feedback-actions';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'mf-feedback-cancel'; cancel.textContent = 'Cancelar';
  const send = document.createElement('button'); send.type = 'button'; send.className = 'mf-feedback-send'; send.textContent = 'Enviar feedback'; send.disabled = true;
  const error = document.createElement('div'); error.className = 'mf-feedback-error';
  cancel.onclick = () => backdrop.remove();
  backdrop.onclick = event => { if (event.target === backdrop) backdrop.remove(); };
  send.onclick = async () => {
    if (!selected) return;
    send.disabled = true; cancel.disabled = true; send.textContent = 'Enviando...'; error.textContent = '';
    try {
      await submitStudyCardFeedback({ reason: selected, comment: text.value });
      modal.innerHTML = '<div class="mf-feedback-success"><strong>✓ Feedback enviado</strong><span>Obrigado. O problema foi registrado para revisão do conteúdo.</span></div>';
      window.setTimeout(() => backdrop.remove(), 1500);
    } catch (err: any) {
      send.disabled = false; cancel.disabled = false; send.textContent = 'Enviar feedback'; error.textContent = err?.message || 'Não foi possível enviar o feedback.';
    }
  };
  actions.append(cancel, send); modal.append(reasons, text, actions, error); backdrop.appendChild(modal); document.body.appendChild(backdrop);
}

function installButton(container: HTMLElement): void {
  if (container.querySelector('.mf-feedback-btn')) return;
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  const button = document.createElement('button'); button.type = 'button'; button.className = 'mf-feedback-btn'; button.innerHTML = '⚠️ <span>Problema no card?</span>';
  button.onclick = event => { event.preventDefault(); event.stopPropagation(); openFeedbackModal(); };
  container.appendChild(button);
}

export function installStudyCardFeedbackOverlay(): void {
  if (typeof document === 'undefined') return;
  ensureStyles();
  const scan = () => { const container = document.getElementById('flashcard-flip-container'); if (container) installButton(container); };
  scan();
  const observer = new MutationObserver(scan); observer.observe(document.body, { childList: true, subtree: true });
  window.setInterval(scan, 1000);
}
