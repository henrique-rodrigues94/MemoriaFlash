import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import App from './App.tsx';
import './index.css';
import { initErrorLogger } from './lib/errorLogger';
import { installCameraPlaybackFix } from './lib/cameraPlaybackFix';
import { initializeAdMob, requestAdMobConsent, installAdMobListeners } from './services/ads/adMobNative';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://memoriaflash.onrender.com' : '')
).replace(/\/+$/, '');

if (API_BASE_URL && typeof window !== 'undefined') {
  const browserFetch = window.fetch.bind(window);
  const isNative = Capacitor.isNativePlatform();
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!rawUrl.startsWith('/api/')) return browserFetch(input, init);
    const targetUrl = `${API_BASE_URL}${rawUrl}`;
    if (!isNative) {
      if (typeof input === 'string' || input instanceof URL) return browserFetch(targetUrl, init);
      return browserFetch(new Request(targetUrl, input), init);
    }
    const body = init?.body;
    if (body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer) return browserFetch(targetUrl, init);
    const headers = new Headers(init?.headers);
    let data: unknown = undefined;
    if (typeof body === 'string' && body.length > 0) {
      try { data = JSON.parse(body); } catch { data = body; }
    }
    const nativeResponse = await CapacitorHttp.request({
      url: targetUrl,
      method: init?.method || 'GET',
      headers: Object.fromEntries(headers.entries()),
      data,
      connectTimeout: 30000,
      readTimeout: 120000,
    });
    const responseBody = typeof nativeResponse.data === 'string' ? nativeResponse.data : JSON.stringify(nativeResponse.data ?? null);
    return new Response(responseBody, { status: nativeResponse.status, headers: nativeResponse.headers });
  };
}

initErrorLogger();
installCameraPlaybackFix();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void initializeAdMob()
  .then(async (native) => {
    if (!native) return;
    await requestAdMobConsent();
    await installAdMobListeners();
  })
  .catch((error) => console.warn('[AdMob] Inicialização ignorada:', error));
