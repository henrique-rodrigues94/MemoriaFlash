import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initErrorLogger } from './lib/errorLogger';

// Ativa o log global de erros do frontend (só aparece no terminal do servidor).
initErrorLogger();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
