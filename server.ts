import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

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

dotenv.config();

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
    console.log(`FlashMind AI full-stack server running on http://0.0.0.0:${PORT}`);
    console.log('Provedores de IA configurados:', aiOrchestrator.getStatus().filter((p) => p.configured).map((p) => p.id).join(', ') || '(nenhum — usando apenas o gerador local)');
    startCronJobs();
  });
}

startServer();
