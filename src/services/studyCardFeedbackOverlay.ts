import { getCurrentStudyCard, submitStudyCardFeedback, StudyFeedbackReason } from './studyCardFeedback';

const REASONS: Array<{ value: StudyFeedbackReason; label: string }> = [
  { value: 'wrong_answer', label: 'Resposta errada' },
  { value: 'bad_explanation', label: 'Explicação incompleta ou errada' },
  { value: 'confusing_question', label: 'Pergunta confusa' },
  { value: 'duplicate_content', label: 'Conteúdo duplicado' },
  { value: 'outdated_content', label: 'Conteúdo desatualizado' },
  { value: 'other', label: 'Outro problema' },
];

function ensureStyles() {
  if (document.getElementById('memoriaflash-feedback-v2-styles')) return;
  const style = document.createElement('style'); style.id = 'memoriaflash-feedback-v2-styles';
  style.textContent = `
    .mf-feedback-v2-btn{position:absolute;top:10px;right:84px;z-index:30;border:1px solid rgba(248,113,113,.35);background:rgba(255,255,255,.94);color:#b4232d;border-radius:12px;padding:8px 10px;font-size:11px;font-weight:900;display:flex;align-items:center;gap:6px;backdrop-filter:blur(8px);box-shadow:0 4px 16px rgba(15,23,42,.12);cursor:pointer;white-space:nowrap}
    html:not(.theme-light) .mf-feedback-v2-btn{background:rgba(15,23,42,.92);color:#fda4af;border-color:rgba(248,113,113,.35)}
    .mf-feedback-v2-backdrop{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(2,6,23,.68);backdrop-filter:blur(7px)}
    .mf-feedback-v2-modal{width:min(100%,430px);background:#fff;color:#1a1f36;border:1px solid #d9deec;border-radius:24px;padding:20px;box-shadow:0 25px 80px rgba(0,0,0,.3)}
    html:not(.theme-light) .mf-feedback-v2-modal{background:#0b1a2a;color:#fff;border-color:rgba(148,163,184,.2)}
    .mf-feedback-v2-title{font-size:17px;font-weight:900}.mf-feedback-v2-sub{margin-top:4px;margin-bottom:15px;font-size:11px;color:#66708d}html:not(.theme-light) .mf-feedback-v2-sub{color:#94a3b8}
    .mf-feedback-v2-reasons{display:grid;gap:8px}.mf-feedback-v2-reason{width:100%;padding:11px 12px;text-align:left;border-radius:12px;border:1px solid #d9deec;background:#f7f8fc;color:#303750;font-size:12px;font-weight:800;cursor:pointer}html:not(.theme-light) .mf-feedback-v2-reason{background:#122131;color:#cbd5e1;border-color:rgba(148,163,184,.18)}.mf-feedback-v2-reason.active{border-color:#6658f5;background:rgba(102,88,245,.12);color:#5143d9}
    .mf-feedback-v2-text{width:100%;min-height:80px;margin-top:12px;padding:11px;border-radius:12px;border:1px solid #d9deec;background:#fff;color:#1a1f36;outline:none;resize:vertical;font-size:12px}html:not(.theme-light) .mf-feedback-v2-text{background:#081522;color:#e2e8f0;border-color:rgba(148,163,184,.18)}
    .mf-feedback-v2-actions{display:flex;gap:8px;margin-top:12px}.mf-feedback-v2-actions button{flex:1;padding:11px;border-radius:12px;font-size:12px;font-weight:900;cursor:pointer}.mf-feedback-v2-cancel{border:1px solid #d9deec;background:#eef0f8;color:#303750}html:not(.theme-light) .mf-feedback-v2-cancel{background:#122131;color:#cbd5e1;border-color:rgba(148,163,184,.18)}.mf-feedback-v2-send{border:1px solid #6658f5;background:#6658f5;color:#fff}.mf-feedback-v2-send:disabled{opacity:.45}.mf-feedback-v2-error{margin-top:10px;color:#b4232d;font-size:11px}.mf-feedback-v2-success{text-align:center;padding:18px}.mf-feedback-v2-success strong{display:block;font-size:16px}.mf-feedback-v2-success span{display:block;margin-top:5px;color:#66708d;font-size:11px}
    @media(max-width:640px){.mf-feedback-v2-btn{right:78px;top:9px;padding:7px 8px;font-size:10px}}
  `;
  document.head.appendChild(style);
}

function openModal() {
  if (document.getElementById('memoriaflash-feedback-v2-backdrop')) return;
  ensureStyles();
  const backdrop = document.createElement('div'); backdrop.id = 'memoriaflash-feedback-v2-backdrop'; backdrop.className = 'mf-feedback-v2-backdrop';
  const modal = document.createElement('div'); modal.className = 'mf-feedback-v2-modal';
  modal.innerHTML = '<div class="mf-feedback-v2-title">Relatar problema neste card</div><div class="mf-feedback-v2-sub">O card atual, matéria, tópico, nível e conteúdo serão enviados junto com seu relato para correção.</div>';
  const reasons = document.createElement('div'); reasons.className = 'mf-feedback-v2-reasons';
  let selected: StudyFeedbackReason | null = null;
  const send = document.createElement('button'); send.className = 'mf-feedback-v2-send'; send.textContent = 'Enviar feedback'; send.disabled = true;
  for (const reason of REASONS) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'mf-feedback-v2-reason'; button.textContent = reason.label;
    button.onclick = () => { selected = reason.value; reasons.querySelectorAll('button').forEach(item => item.classList.remove('active')); button.classList.add('active'); send.disabled = false; };
    reasons.appendChild(button);
  }
  const text = document.createElement('textarea'); text.className = 'mf-feedback-v2-text'; text.maxLength = 500; text.placeholder = 'Explique o problema (opcional)...';
  const actions = document.createElement('div'); actions.className = 'mf-feedback-v2-actions';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'mf-feedback-v2-cancel'; cancel.textContent = 'Cancelar';
  const error = document.createElement('div'); error.className = 'mf-feedback-v2-error';
  cancel.onclick = () => backdrop.remove(); backdrop.onclick = event => { if (event.target === backdrop) backdrop.remove(); };
  send.onclick = async () => {
    if (!selected) return;
    send.disabled = true; cancel.disabled = true; send.textContent = 'Enviando...';
    try {
      if (!getCurrentStudyCard()) throw new Error('Não foi possível identificar o card atual.');
      await submitStudyCardFeedback({ reason: selected, comment: text.value });
      modal.innerHTML = '<div class="mf-feedback-v2-success"><strong>✓ Feedback enviado</strong><span>Obrigado. O problema foi registrado para revisão do conteúdo.</span></div>';
      window.setTimeout(() => backdrop.remove(), 1400);
    } catch (err: any) { send.disabled = false; cancel.disabled = false; send.textContent = 'Enviar feedback'; error.textContent = err?.message || 'Não foi possível enviar o feedback.'; }
  };
  actions.append(cancel, send); modal.append(reasons, text, actions, error); backdrop.appendChild(modal); document.body.appendChild(backdrop);
}

function installButton(container: HTMLElement) {
  if (container.querySelector('.mf-feedback-v2-btn')) return;
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  const button = document.createElement('button'); button.type = 'button'; button.className = 'mf-feedback-v2-btn'; button.innerHTML = '⚠️ <span>Relatar problema</span>'; button.title = 'Relatar erro, resposta incorreta, explicação ruim ou conteúdo desatualizado';
  button.onclick = event => { event.preventDefault(); event.stopPropagation(); openModal(); };
  container.appendChild(button);
}

export function installStudyCardFeedbackOverlayV2() {
  if (typeof document === 'undefined') return;
  ensureStyles();
  const scan = () => { const container = document.getElementById('flashcard-flip-container'); if (container) installButton(container); };
  scan();
  const observer = new MutationObserver(scan); observer.observe(document.body, { childList: true, subtree: true });
  window.setInterval(scan, 1200);
}
