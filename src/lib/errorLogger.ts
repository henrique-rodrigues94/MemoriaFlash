/**
 * Logger global de erros do frontend.
 *
 * Captura erros não tratados (window.onerror, unhandledrejection e
 * console.error) e os envia para o endpoint `POST /api/log` do servidor,
 * onde aparecem SOMENTE no terminal — nunca na interface do usuário.
 *
 * Importe uma vez em `main.tsx` (ex: `import './lib/errorLogger';`).
 */

const MAX_QUEUE = 20;

function sendToServer(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify({ ts: new Date().toISOString(), ...payload });
    // Usa keepalive e não bloqueia o fluxo do app.
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/log', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Nunca deixa o logger quebrar o app.
  }
}

function sanitize(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'string') return value.slice(0, 2000);
  try {
    const s = JSON.stringify(value);
    return s ? s.slice(0, 2000) : String(value);
  } catch {
    return String(value);
  }
}

let consoleError = console.error.bind(console);
let queue: Record<string, unknown>[] = [];

function flushQueue() {
  if (queue.length === 0) return;
  const batch = queue.slice(0, MAX_QUEUE);
  queue = [];
  sendToServer({ type: 'frontend-batch', errors: batch });
}

let flushTimer: ReturnType<typeof setInterval> | null = null;

export function initErrorLogger() {
  if (typeof window === 'undefined') return;

  // 1. Erros de script não capturados (window.onerror)
  window.addEventListener('error', (event) => {
    const payload = {
      type: 'window.onerror',
      message: sanitize(event.message),
      file: event.filename,
      line: event.lineno,
      col: event.colno,
      url: window.location.href,
    };
    queue.push(payload);
    scheduleFlush();
  });

  // 2. Promises rejeitadas sem tratamento
  window.addEventListener('unhandledrejection', (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    const payload = {
      type: 'unhandledrejection',
      message: sanitize(reason instanceof Error ? `${reason.message}\n${reason.stack || ''}` : reason),
      url: window.location.href,
    };
    queue.push(payload);
    scheduleFlush();
  });

  // 3. console.error — mantém o comportamento original (terminal do navegador)
  //    e também envia uma cópia para o terminal do servidor.
  console.error = (...args: unknown[]) => {
    consoleError(...args);
    const payload = {
      type: 'console.error',
      message: args.map(sanitize).join(' | '),
      url: window.location.href,
    };
    queue.push(payload);
    scheduleFlush();
  };

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setInterval(() => {
      flushQueue();
      if (flushTimer) clearInterval(flushTimer);
      flushTimer = null;
    }, 1500);
  }
}

// Exporta também para envio manual quando necessário.
export function reportError(error: unknown, context?: string) {
  const payload = {
    type: 'manual',
    context: context || 'n/a',
    message: sanitize(error instanceof Error ? `${error.message}\n${error.stack || ''}` : error),
    url: window.location.href,
  };
  queue.push(payload);
  if (!flushTimer) {
    flushTimer = setInterval(() => {
      flushQueue();
      if (flushTimer) clearInterval(flushTimer);
      flushTimer = null;
    }, 1500);
  }
}
