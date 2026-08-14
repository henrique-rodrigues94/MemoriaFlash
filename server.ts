// Carrega o .env ANTES de qualquer outro import: os providers de IA leem
// process.env.* no momento em que o módulo é avaliado.
import 'dotenv/config';
import express from 'express';
import path from 'path';
import admin from 'firebase-admin';

import { aiOrchestrator } from './src/server/ai';
import { generateFlashcardsTask } from './src/server/ai/tasks/generateFlashcards';
import { suggestTopicsTask } from './src/server/ai/tasks/suggestTopics';
import { quizDiagnosticTask } from './src/server/ai/tasks/quizDiagnostic';
import { voiceTutorTask } from './src/server/ai/tasks/voiceTutor';
import { generateQuizTask } from './src/server/ai/tasks/generateQuiz';
import { recoveryPlanTask } from './src/server/ai/tasks/recoveryPlan';
import { scannerAnalyzeTask } from './src/server/ai/tasks/scannerAnalyze';
import { extractTextFromImages, getOCRStatus } from './src/server/ocr/ocrService';
import { generateCurriculumTask, CurriculumCategory } from './src/server/ai/tasks/generateCurriculum';
import { identifySubjectLevelsTask } from './src/server/ai/tasks/identifySubjectLevels';
import { getBucketStats, saveCardBucket, BankCard, CardContentType } from './src/server/db/db';
import { simpleRateLimit } from './src/server/middleware/rateLimit';
import { referralRouter } from './src/server/routes/referral';
import { notificationsRouter } from './src/server/routes/notifications';
import { billingRouter } from './src/server/routes/billing';
import { getCacheStats } from './src/server/ai/cache/aiCache';
import { startCronJobs } from './src/server/cron';
import { injectReferralMeta, readIndexHtmlTemplate } from './src/server/ogPreview';
import { authorizeGeneration, recordGeneratedCards } from './src/server/generationLimit';
import { getAdminFirestore } from './src/server/firebaseAdmin';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

app.use('/api/gemini', simpleRateLimit({ windowMs: 60_000, max: 30 }));
app.use('/api/referral', simpleRateLimit({ windowMs: 60_000, max: 20 }));
app.use('/api/notifications', simpleRateLimit({ windowMs: 60_000, max: 10 }));
app.use('/api/billing', simpleRateLimit({ windowMs: 60_000, max: 60 }));
app.use('/api/log', simpleRateLimit({ windowMs: 60_000, max: 20 }));
app.use('/api/referral', referralRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/billing', billingRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/log', async (req, res) => {
  try {
    const data = req.body || {};
    const ts = typeof data.ts === 'string' ? data.ts : new Date().toISOString();
    const type = typeof data.type === 'string' ? data.type : 'frontend';
    const url = typeof data.url === 'string' ? data.url.slice(0, 500) : undefined;

    if (type === 'feedback') {
      const message = typeof data.message === 'string' ? data.message.trim().slice(0, 4000) : '';
      if (!message) return res.status(400).json({ ok: false, error: 'Mensagem de feedback vazia.' });
      const db = getAdminFirestore();
      if (db) {
        await db.collection('feedback').add({
          message,
          url: url || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          resolved: false,
        });
      } else {
        console.warn('[api/log] Firebase Admin não configurado — feedback apenas logado.');
        console.error(`[frontend:feedback] ${ts}`, message, url ? `@ ${url}` : '');
      }
    } else if (type === 'frontend-batch') {
      const errors = Array.isArray(data.errors) ? data.errors : [];
      for (const e of errors.slice(0, 50)) {
        console.error(`[frontend:${e?.type || 'error'}] ${ts}`, e?.message || '(sem mensagem)', e?.url ? `@ ${e.url}` : '');
      }
    } else {
      console.error(`[frontend:${type}] ${ts}`, data.message || '(sem mensagem)', url ? `@ ${url}` : '');
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[api/log] erro ao processar log/feedback:', err);
    res.status(500).json({ ok: false, error: 'Falha ao processar o log/feedback.' });
  }
});

app.get('/api/subject-levels', async (req, res) => {
  const { subject } = req.query as { subject?: string };
  if (!subject?.trim() || subject.trim().length < 2) {
    return res.status(400).json({ error: 'subject obrigatório (mín. 2 caracteres)' });
  }
  try {
    const result = await identifySubjectLevelsTask(subject.trim());
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.json(result);
  } catch (err: any) {
    console.error('[/api/subject-levels] error:', err);
    return res.status(500).json({ error: err?.message || 'Erro ao identificar níveis' });
  }
});

app.get('/api/curriculum', async (req, res) => {
  const { subject, level } = req.query as { subject?: string; level?: string };
  if (!subject?.trim() || !level?.trim()) {
    return res.status(400).json({ error: 'subject e level são obrigatórios' });
  }
  try {
    const result = await generateCurriculumTask({ subject: subject.trim(), educationLevel: level as any, language: 'pt' });
    if (!result?.categories?.length) return res.status(502).json({ error: 'IA não gerou currículo válido' });
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.json({ categories: result.categories, fromFirestore: result.cacheHit ?? false });
  } catch (err: any) {
    console.error('[/api/curriculum] error:', err);
    return res.status(500).json({ error: err?.message || 'Erro interno ao gerar currículo' });
  }
});

app.use('/api/card-bank', simpleRateLimit({ windowMs: 60_000, max: 60 }));

app.get('/api/card-bank/stats', async (req, res) => {
  const { subject, topics, educationLevel = 'medio', difficulty = 'medium' } = req.query as Record<string, string>;
  if (!subject?.trim() || !topics?.trim()) return res.status(400).json({ error: 'subject e topics são obrigatórios' });
  const topicList = topics.split(',').map(t => t.trim()).filter(Boolean);
  if (topicList.length === 0) return res.json({ stats: [] });
  try {
    const stats = await getBucketStats(subject.trim(), topicList, educationLevel as any, difficulty as CardContentType);
    return res.json({ stats });
  } catch (err: any) {
    console.error('[/api/card-bank/stats] error:', err);
    return res.status(500).json({ error: err?.message || 'Erro ao consultar banco de cards' });
  }
});

app.post('/api/card-bank/save', async (req, res) => {
  const { subject, topic, educationLevel, difficulty, cards, providerUsed } = req.body as {
    subject: string; topic: string; educationLevel: string; difficulty: string; cards: BankCard[]; providerUsed?: string;
  };
  if (!subject?.trim() || !topic?.trim() || !Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ error: 'subject, topic e cards são obrigatórios' });
  }
  try {
    await saveCardBucket(subject.trim(), topic.trim(), (educationLevel ?? 'medio') as any, (difficulty ?? 'definition') as CardContentType, cards, providerUsed ?? 'manual');
    return res.json({ saved: cards.length });
  } catch (err: any) {
    console.error('[/api/card-bank/save] error:', err);
    return res.status(500).json({ error: err?.message || 'Erro ao salvar cards no banco' });
  }
});

app.get('/api/ocr/status', (_req, res) => {
  const status = getOCRStatus();
  res.json({ ...status, primaryProvider: status.gemini ? 'gemini' : status.ocrspace ? 'ocrspace' : 'none', fallbackProvider: status.gemini && status.ocrspace ? 'ocrspace' : 'none' });
});

app.get('/api/ai/status', (_req, res) => {
  const providers = aiOrchestrator.getStatus();
  const activeCount = providers.filter(p => p.available).length;
  res.json({ ok: activeCount > 0, summary: `${activeCount}/${providers.length} provedores disponíveis`, providers, cache: getCacheStats() });
});

// Geração de flashcards: autenticação + limite acumulado de 200 cards para
// contas gratuitas. O PRO não possui limite. O backend contabiliza apenas
// os cards realmente devolvidos pela IA.
app.post('/api/gemini/generate-flashcards', async (req, res) => {
  try {
    const requestedCount = Math.min(Math.max(Number(req.body?.count) || 0, 1), 100);
    const authorization = await authorizeGeneration(req, requestedCount);
    const safeExistingFronts: string[] = Array.isArray(req.body?.existingFronts)
      ? req.body.existingFronts.filter((f: unknown) => typeof f === 'string')
      : [];

    const result = await generateFlashcardsTask({ ...req.body, count: requestedCount, existingFronts: safeExistingFronts });
    const cards = Array.isArray(result) ? result : Array.isArray((result as any)?.cards) ? (result as any).cards : [];
    const usage = await recordGeneratedCards(authorization.uid, cards.length);

    return res.json({ cards, usage });
  } catch (error: any) {
    console.error('Error generating flashcards:', error);
    return res.status(error?.httpStatus || 500).json({
      error: error?.message || 'Failed to generate flashcards',
      code: error?.code,
      remaining: error?.remaining,
      generated: error?.generated,
      limit: error?.limit,
    });
  }
});

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

app.post('/api/ai/reset-cooldowns', (req, res) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return res.status(503).json({ error: 'ADMIN_TOKEN não configurado no servidor.' });
  const provided = req.headers['x-admin-token'];
  if (typeof provided !== 'string' || provided !== adminToken) return res.status(401).json({ error: 'Não autorizado.' });
  aiOrchestrator.getProviders().forEach((p) => aiOrchestrator.resetCooldown(p.id));
  res.json({ ok: true, status: aiOrchestrator.getStatus() });
});

app.post('/api/gemini/quiz-diagnostic', async (req, res) => {
  try { const { topic } = req.body; if (!topic) return res.status(400).json({ error: 'Topic is required' }); return res.json(await quizDiagnosticTask(req.body)); }
  catch (error: any) { console.error('Error in quiz diagnostic:', error); return res.status(500).json({ error: error.message || 'Quiz diagnostic failed' }); }
});

app.post('/api/gemini/voice-tutor', async (req, res) => {
  try { const { question } = req.body; if (!question) return res.status(400).json({ error: 'Question is required' }); return res.json(await voiceTutorTask(req.body)); }
  catch (error: any) { console.error('Error in voice-tutor:', error); return res.status(500).json({ error: error.message || 'Voice tutor failed' }); }
});

app.post('/api/gemini/generate-quiz', async (req, res) => {
  try { return res.json(await generateQuizTask(req.body)); }
  catch (error: any) { console.error('Error generating quiz:', error); return res.status(500).json({ error: error.message || 'Quiz generation failed' }); }
});

app.post('/api/gemini/scanner-analyze', async (req, res) => {
  try {
    const { images = [], texts = [], subjectHint = '', language = 'pt' } = req.body;
    if (!images.length && !texts.length) return res.status(400).json({ error: 'Nenhuma imagem ou texto fornecido.' });
    let extractedFromImages = '';
    let ocrWarnings: string[] = [];
    if (images.length > 0) {
      const ocrResult = await extractTextFromImages(images as string[]);
      extractedFromImages = ocrResult.text;
      ocrWarnings = ocrResult.warnings;
    }
    const allContent = [...(texts as string[]), extractedFromImages].filter(Boolean).join('\n\n');
    if (!allContent.trim()) return res.status(400).json({ error: 'Não foi possível extrair conteúdo dos arquivos.', warnings: ocrWarnings });
    const result = await scannerAnalyzeTask({ content: allContent, subjectHint, language });
    return res.json({ ...result, extractedContent: allContent.slice(0, 20000), ocrWarnings: ocrWarnings.length > 0 ? ocrWarnings : undefined });
  } catch (error: any) {
    console.error('[Scanner Analyze] Erro:', error);
    return res.status(500).json({ error: error.message || 'Falha ao analisar o documento.' });
  }
});

app.post('/api/gemini/scanner-process', async (req, res) => {
  try {
    const { images = [], texts = [], subject = '', count = 25, selectedTopics = [] as string[], extractedContent = '' } = req.body;
    if (!images.length && !texts.length && !extractedContent.trim()) return res.status(400).json({ error: 'Nenhuma imagem ou texto fornecido.' });
    const cardCount = Math.min(Math.max(Number(count) || 25, 1), 100);
    const authorization = await authorizeGeneration(req, cardCount);
    const subjectLabel = subject.trim() || 'Conteúdo do Documento';

    let extractedFromImages = '';
    let ocrWarnings: string[] = [];
    if (images.length > 0) {
      const ocrResult = await extractTextFromImages(images as string[]);
      extractedFromImages = ocrResult.text;
      ocrWarnings = ocrResult.warnings;
    }

    const allContent = [...texts, extractedFromImages ? `=== Conteúdo extraído das imagens ===\n${extractedFromImages}` : ''].filter(Boolean).join('\n\n');
    const sourceContent = allContent.trim() || extractedContent;
    if (!sourceContent.trim()) return res.status(400).json({ error: 'Não foi possível extrair conteúdo dos arquivos fornecidos.' });

    const topicsFilter = (selectedTopics as string[]).length > 0 ? `\n\nFoque EXCLUSIVAMENTE nos seguintes tópicos selecionados pelo usuário: ${(selectedTopics as string[]).join(', ')}` : '';
    const prompt = `Matéria/Assunto: ${subjectLabel}\n\nCONTEÚDO FONTE (extraído do documento/imagens do usuário):\n${sourceContent.slice(0, 15000)}\n\nCom base EXCLUSIVAMENTE no conteúdo acima, gere ${cardCount} flashcards educativos abrangendo os principais conceitos, definições, fórmulas e tópicos presentes no material.${topicsFilter}`;

    const result = await generateFlashcardsTask({
      prompt,
      count: cardCount,
      language: 'pt',
      difficulty: 'medium',
      selectedTopics: (selectedTopics as string[]).length > 0 ? selectedTopics as string[] : (subject.trim() ? [subject.trim()] : []),
      sourceType: 'document',
    });
    const cards = Array.isArray(result) ? result : Array.isArray((result as any)?.cards) ? (result as any).cards : [];
    const usage = await recordGeneratedCards(authorization.uid, cards.length);
    return res.json({ cards, usage, extractedText: sourceContent.slice(0, 500) + '...' });
  } catch (error: any) {
    console.error('[Scanner] Error processing scanner:', error);
    return res.status(error?.httpStatus || 500).json({ error: error?.message || 'Falha ao processar o scanner.', code: error?.code, remaining: error?.remaining, generated: error?.generated, limit: error?.limit });
  }
});

app.post('/api/gemini/recovery-plan', async (req, res) => {
  try { return res.json(await recoveryPlanTask(req.body)); }
  catch (error: any) { console.error('Error generating recovery plan:', error); return res.status(500).json({ error: error.message || 'Recovery plan generation failed' }); }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
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
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  startCronJobs();
  app.listen(PORT, '0.0.0.0', () => console.log(`MemoriaFlash full-stack server running on http://0.0.0.0:${PORT}`));
}

startServer();
