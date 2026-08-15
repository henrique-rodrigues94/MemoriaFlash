import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
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
// Isso evita que o APK tente resolver /api no origin do Capacitor (capacitor://localhost).
if (API_BASE_URL && typeof window !== 'undefined') {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    if (rawUrl.startsWith('/api/')) {
      const targetUrl = `${API_BASE_URL}${rawUrl}`;
      if (typeof input === 'string' || input instanceof URL) {
        return nativeFetch(targetUrl, init);
      }
      return nativeFetch(new Request(targetUrl, input), init);
    }

    return nativeFetch(input, init);
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
