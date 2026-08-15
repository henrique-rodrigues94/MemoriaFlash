import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import App from './App.tsx';
import './index.css';
import { initErrorLogger } from './lib/errorLogger';
import { initializeAdMob, requestAdMobConsent, installAdMobListeners } from './services/ads/adMobNative';

// Backend usado pelo APK/produção. Em desenvolvimento local, sem VITE_API_BASE_URL,
// as chamadas continuam relativas para usar o servidor Vite/Express local.
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://memoriaflash.onrender.com' : '')
).replace(/\/+$/, '');

// Todas as chamadas internas para /api passam pelo backend configurado.
// No Android/iOS usamos CapacitorHttp para evitar as restrições de CORS do WebView.
if (API_BASE_URL && typeof window !== 'undefined') {
  const browserFetch = window.fetch.bind(window);
  const isNative = Capacitor.isNativePlatform();

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    if (!rawUrl.startsWith('/api/')) {
      return browserFetch(input, init);
    }

    const targetUrl = `${API_BASE_URL}${rawUrl}`;

    if (!isNative) {
      if (typeof input === 'string' || input instanceof URL) {
        return browserFetch(targetUrl, init);
      }
      return browserFetch(new Request(targetUrl, input), init);
    }

    // CapacitorHttp recebe o corpo JSON como objeto. As chamadas /api do
    // frontend usam JSON; corpos binários/FormData continuam no fetch normal.
    const body = init?.body;
    if (body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer) {
      return browserFetch(targetUrl, init);
    }

    const headers = new Headers(init?.headers);
    let data: unknown = undefined;
    if (typeof body === 'string' && body.length > 0) {
      try {
        data = JSON.parse(body);
      } catch {
        data = body;
      }
    }

    const nativeResponse = await CapacitorHttp.request({
      url: targetUrl,
      method: init?.method || 'GET',
      headers: Object.fromEntries(headers.entries()),
      data,
      connectTimeout: 30000,
      readTimeout: 120000,
    });

    const responseBody = typeof nativeResponse.data === 'string'
      ? nativeResponse.data
      : JSON.stringify(nativeResponse.data ?? null);

    return new Response(responseBody, {
      status: nativeResponse.status,
      headers: nativeResponse.headers,
    });
  };
}

// Ativa o log global de erros do frontend (só aparece no terminal do servidor).
initErrorLogger();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// O SDK é inicializado somente no Android nativo. Falhas de configuração não
// impedem o aplicativo de abrir; nesse caso o plano gratuito continua sem ads.
void initializeAdMob()
  .then(async (native) => {
    if (!native) return;
    await requestAdMobConsent();
    await installAdMobListeners();
  })
  .catch((error) => {
    console.warn('[AdMob] Inicialização ignorada:', error);
  });
