// Carrega o .env ANTES de qualquer outro import: os providers de IA leem
// process.env.* no momento em que o módulo é avaliado (const MODEL, etc.).
// Sem isto, dotenv.config() rodaria depois dos imports e o .env nunca
// chegaria aos providers (bug: modelo do OpenRouter sempre era o padrão).
import 'dotenv/config';
import express from 'express';
import path from 'path';

import { aiOrchestrator } from './src/server/ai';
import { generateFlashcardsTask } from './src/server/ai/tasks/generateFlashcards';
import { suggestTopicsTask } from './src/server/ai/tasks/suggestTopics';
import { quizDiagnosticTask } from './src/server/ai/tasks/quizDiagnostic';
import { voiceTutorTask } from './src/server/ai/tasks/voiceTutor';
import { generateQuizTask } from './src/server/ai/tasks/generateQuiz';
import { recoveryPlanTask } from './src/server/ai/tasks/recoveryPlan';
import { simpleRateLimit } from './src/server/middleware/rateLimit';
import { referralRouter } from './src/server/routes/referral';
import { notificationsRouter } from './src/server/routes/notifications';
import { getCacheStats } from './src/server/ai/cache/aiCache';
import { startCronJobs } from './src/server/cron';
import { injectReferralMeta, readIndexHtmlTemplate } from './src/server/ogPreview';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Rate limit básico por IP nas rotas de IA (evita abuso/custo descontrolado
// mesmo com provedores gratuitos — respeita os limites de cada API).
app.use('/api/gemini', simpleRateLimit({ windowMs: 60_000, max: 30 }));
app.use('/api/referral', simpleRateLimit({ windowMs: 60_000, max: 20 }));
app.use('/api/notifications', simpleRateLimit({ windowMs: 60_000, max: 10 }));
app.use('/api/referral', referralRouter);
app.use('/api/notifications', notificationsRouter);

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint: captura de erros do frontend — apenas LOG no terminal, sem resposta
// sensível ao cliente. Usado pelo errorLogger.ts (sendBeacon/fetch keepalive).
app.post('/api/log', (req, res) => {
  try {
    const data = req.body || {};
    const ts = data.ts || new Date().toISOString();
    const type = data.type || 'frontend';
    if (type === 'frontend-batch') {
      const errors = Array.isArray(data.errors) ? data.errors : [];
      for (const e of errors.slice(0, 50)) {
        console.error(`[frontend:${e?.type || 'error'}] ${ts}`, e?.message || '(sem mensagem)', e?.url ? `@ ${e.url}` : '');
      }
    } else {
      console.error(`[frontend:${type}] ${ts}`, data.message || '(sem mensagem)', data.url ? `@ ${data.url}` : '');
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[api/log] erro ao processar log do frontend:', err);
    res.json({ ok: false });
  }
});

// Status dos provedores de IA (útil para depuração e para um painel admin futuro).
// Não expõe as chaves, apenas quais estão configuradas/disponíveis/em cooldown.
app.get('/api/ai/status', (_req, res) => {
  res.json({ providers: aiOrchestrator.getStatus(), cache: getCacheStats() });
});

// Endpoint: Generate Flashcards from Topic or Content
app.post('/api/gemini/generate-flashcards', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt or content is required' });

    const result = await generateFlashcardsTask(req.body);
    return res.json(result);
  } catch (error: any) {
    console.error('Error generating flashcards:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate flashcards' });
  }
});

// Endpoint: Suggest Study Topics for a Deck Title
app.post('/api/gemini/suggest-topics', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const result = await suggestTopicsTask(req.body);
    return res.json(result);
  } catch (error: any) {
    console.error('Error suggesting topics:', error);
    return res.status(500).json({ error: error.message || 'Failed to suggest topics' });
  }
});

// Gerenciamento de provedores de IA: limpa cooldowns (após aguardar o reset
// do rate limit, ex.: reset diário do OpenRouter free ou janela do Groq).
// Protegido por token admin (header `x-admin-token` == ADMIN_TOKEN do .env).
// Se ADMIN_TOKEN não estiver configurado, o endpoint fica desativado (503).
app.post('/api/ai/reset-cooldowns', (req, res) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return res.status(503).json({ error: 'ADMIN_TOKEN não configurado no servidor.' });
  }
  const provided = req.headers['x-admin-token'];
  if (typeof provided !== 'string' || provided !== adminToken) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  aiOrchestrator.getProviders().forEach((p) => aiOrchestrator.resetCooldown(p.id));
  res.json({ ok: true, status: aiOrchestrator.getStatus() });
});

// Endpoint: AI Diagnostic Quiz Analysis & Targeted Flashcard Generator
app.post('/api/gemini/quiz-diagnostic', async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic is required' });

    const result = await quizDiagnosticTask(req.body);
    return res.json(result);
  } catch (error: any) {
    console.error('Error in quiz diagnostic:', error);
    return res.status(500).json({ error: error.message || 'Quiz diagnostic failed' });
  }
});

// Endpoint: Voice Tutor AI Chat & Card Synthesis
app.post('/api/gemini/voice-tutor', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question is required' });

    const result = await voiceTutorTask(req.body);
    return res.json(result);
  } catch (error: any) {
    console.error('Error in voice-tutor:', error);
    return res.status(500).json({ error: error.message || 'Voice tutor failed' });
  }
});

// Endpoint: Generate Quiz for Duel Arena
app.post('/api/gemini/generate-quiz', async (req, res) => {
  try {
    const result = await generateQuizTask(req.body);
    return res.json(result);
  } catch (error: any) {
    console.error('Error generating quiz:', error);
    return res.status(500).json({ error: error.message || 'Quiz generation failed' });
  }
});

// Endpoint: Scanner — processa imagens (visão) e texto extraído de documentos
// Body: { images?: string[], texts?: string[], subject?: string, count?: number }
app.post('/api/gemini/scanner-process', async (req, res) => {
  try {
    const { images = [], texts = [], subject = '', count = 25 } = req.body;

    if (!images.length && !texts.length) {
      return res.status(400).json({ error: 'Nenhuma imagem ou texto fornecido.' });
    }

    const cardCount = Math.min(Math.max(Number(count) || 25, 1), 100);
    const subjectLabel = subject.trim() || 'Conteúdo do Documento';

    // ── Passo 1: extrair texto de imagens via OCR (fallback em cadeia) ──────────
    //
    // Ordem de tentativa:
    //   1. Gemini Vision (gemini-2.5-flash) — gratuito com GEMINI_API_KEY (principal)
    //   2. OCR.space                        — 25k req/mês grátis, OCRSPACE_API_KEY
    //
    // Configure as chaves no .env:
    //   GEMINI_API_KEY=...   (https://aistudio.google.com/apikey)
    //   OCRSPACE_API_KEY=... (https://ocr.space/ocrapi/freekey)

    /** Extrai texto de MÚLTIPLAS imagens via Gemini Vision (gratuito). */
    async function ocrWithGemini(base64images: string[]): Promise<string> {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('GEMINI_API_KEY não configurada');

      const { GoogleGenAI } = await import('@google/genai');
      const genai = new GoogleGenAI({ apiKey });

      const parts: any[] = [
        {
          text: 'Você é um sistema de OCR especializado em materiais educacionais. Analise todas as imagens e extraia TODO o texto visível — títulos, parágrafos, listas, fórmulas, tabelas. Preserve a estrutura. Não adicione comentários, apenas o texto extraído de cada imagem, separando com "--- Página N ---".',
        },
      ];
      for (const base64img of base64images) {
        const [meta, data] = base64img.split(',');
        const mimeMatch = meta.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        parts.push({ inlineData: { data, mimeType } });
      }

      const response = await genai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: [{ role: 'user', parts }],
        config: { maxOutputTokens: 8192 },
      });
      return response.text || '';
    }

    /** Extrai texto de UMA imagem via OCR.space (25k req/mês grátis). */
    async function ocrWithOCRSpace(base64img: string): Promise<string> {
      const apiKey = process.env.OCRSPACE_API_KEY || 'helloworld'; // chave pública de teste (limitada)
      const [, data] = base64img.split(',');

      const formData = new FormData();
      formData.append('base64Image', `data:image/jpeg;base64,${data}`);
      formData.append('language', 'por'); // Português
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2'); // Engine 2 = melhor precisão

      const res = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: { apikey: apiKey },
        body: formData,
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) throw new Error(`OCR.space HTTP ${res.status}`);
      const json = await res.json();
      if (json.IsErroredOnProcessing) throw new Error(json.ErrorMessage?.[0] || 'OCR.space erro');

      return json.ParsedResults?.map((r: any) => r.ParsedText).join('\n') || '';
    }

    let extractedFromImages = '';
    if (images.length > 0) {
      console.log(`[Scanner] Processando ${images.length} imagem(ns) com OCR…`);
      const pageTexts: string[] = [];

      // Tenta Gemini em lote primeiro (1 chamada para todas as imagens)
      let geminiDone = false;
      if (process.env.GEMINI_API_KEY) {
        try {
          console.log('[Scanner OCR] Tentando Gemini Vision (lote)…');
          const text = await ocrWithGemini(images);
          if (text.trim()) {
            pageTexts.push(text);
            geminiDone = true;
            console.log('[Scanner OCR] ✓ Gemini Vision extraiu o conteúdo.');
          }
        } catch (e) {
          console.warn('[Scanner OCR] Gemini Vision falhou:', (e as Error).message);
        }
      }

      // Se Gemini não funcionou, processa imagem por imagem com OCR.space
      if (!geminiDone) {
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          let pageText = '';

          // Tentativa: OCR.space
          if (!pageText) {
            try {
              console.log(`[Scanner OCR] Imagem ${i + 1}: tentando OCR.space…`);
              pageText = await ocrWithOCRSpace(img);
              if (pageText.trim()) console.log(`[Scanner OCR] ✓ OCR.space extraiu imagem ${i + 1}`);
            } catch (e) {
              console.warn(`[Scanner OCR] OCR.space falhou na imagem ${i + 1}:`, (e as Error).message);
            }
          }

          if (pageText.trim()) {
            pageTexts.push(`=== Página ${i + 1} ===\n${pageText}`);
          } else {
            pageTexts.push(`=== Página ${i + 1} ===\n[Não foi possível extrair texto desta imagem]`);
          }
        }
      }

      extractedFromImages = pageTexts.join('\n\n');

      if (!extractedFromImages.trim()) {
        console.warn('[Scanner OCR] Nenhum provider de OCR disponível. Configure GEMINI_API_KEY ou OCRSPACE_API_KEY.');
        extractedFromImages = `[${images.length} imagem(ns) enviada(s) — nenhum provider de OCR configurado. Configure GEMINI_API_KEY ou OCRSPACE_API_KEY no .env]`;
      }
    }

    // ── Passo 2: combinar todo o conteúdo ─────────────────────────────────────
    const allContent = [
      ...texts,
      extractedFromImages ? `=== Conteúdo extraído das imagens ===\n${extractedFromImages}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    if (!allContent.trim()) {
      return res.status(400).json({ error: 'Não foi possível extrair conteúdo dos arquivos fornecidos.' });
    }

    // ── Passo 3: gerar flashcards a partir do conteúdo ────────────────────────
    const { generateFlashcardsTask } = await import('./src/server/ai/tasks/generateFlashcards');
    const prompt =
      `Matéria/Assunto: ${subjectLabel}\n\n` +
      `CONTEÚDO FONTE (extraído do documento/imagens do usuário):\n` +
      `${allContent.slice(0, 15000)}\n\n` +
      `Com base EXCLUSIVAMENTE no conteúdo acima, gere ${cardCount} flashcards educativos abrangendo os principais conceitos, definições, fórmulas e tópicos presentes no material.`;

    const result = await generateFlashcardsTask({
      prompt,
      count: cardCount,
      language: 'pt',
      difficulty: 'medium',
      selectedTopics: subject.trim() ? [subject.trim()] : [],
    });

    return res.json({ ...result, extractedText: allContent.slice(0, 500) + '...' });
  } catch (error: any) {
    console.error('[Scanner] Error processing scanner:', error);
    return res.status(500).json({ error: error.message || 'Falha ao processar o scanner.' });
  }
});

// Endpoint: AI 7-Day Recovery Plan Generator based on Weakness Analysis
app.post('/api/gemini/recovery-plan', async (req, res) => {
  try {
    const result = await recoveryPlanTask(req.body);
    return res.json(result);
  } catch (error: any) {
    console.error('Error generating recovery plan:', error);
    return res.status(500).json({ error: error.message || 'Recovery plan generation failed' });
  }
});

// Start Server with Vite Middleware or Static Production Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    // Link de indicação (?ref=CODIGO): serve o mesmo index.html, mas com
    // title/description reescritos para um preview convidativo em
    // WhatsApp/Telegram/redes sociais antes de cair no SPA normal.
    app.get('/', (req, res, next) => {
      const ref = req.query.ref;
      if (typeof ref !== 'string' || !ref) return next();

      try {
        const template = readIndexHtmlTemplate(path.join(distPath, 'index.html'));
        res.set('Content-Type', 'text/html');
        return res.send(injectReferralMeta(template, ref));
      } catch (err) {
        console.warn('Falha ao injetar meta tags de indicação, servindo página padrão:', err);
        return next();
      }
    });

    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MemoriaFlash full-stack server running on http://0.0.0.0:${PORT}`);
    console.log('Provedores de IA configurados:', aiOrchestrator.getStatus().filter((p) => p.configured).map((p) => p.id).join(', ') || '(nenhum — usando apenas o gerador local)');
    startCronJobs();
  });
}

// ── Log global de erros não tratados (processo) ─────────────────────────────
// Só aparece no terminal — nunca expõe nada ao usuário.
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err?.stack || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason instanceof Error ? reason.stack || reason.message : reason);
});

startServer();
