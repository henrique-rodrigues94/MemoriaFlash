import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initErrorLogger } from './lib/errorLogger';
import { initializeAdMob, requestAdMobConsent, installAdMobListeners } from './services/ads/adMobNative';

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
