// src/server/server.ts (versão simplificada e funcional)
import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { aiOrchestrator } from '../lib/ai/orchestrator';

config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições, tente novamente mais tarde.' },
});
app.use(limiter);

// Middleware de erro global
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Erro:', err.message);
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: 'Dados inválidos', details: err.errors });
  }
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Rota de saúde
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rota de status da IA
app.get('/api/ai/status', async (req, res) => {
  try {
    const status = await aiOrchestrator.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter status' });
  }
});

// Rota para gerar flashcards (com validação Zod)
app.post('/api/ai/generate-flashcards', async (req, res, next) => {
  try {
    const schema = z.object({
      prompt: z.string().min(10),
      topic: z.string().optional(),
      numberOfCards: z.number().int().min(1).max(50).default(10),
    });
    const { prompt, topic, numberOfCards } = schema.parse(req.body);

    const result = await aiOrchestrator.generateFlashcards({
      prompt,
      topic,
      numberOfCards,
      userId: 'test-user',
    });

    if (!result.success) {
      return res.status(503).json({ error: result.error || 'Falha ao gerar flashcards' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

// Rota para sugerir tópicos (com validação Zod)
app.post('/api/ai/suggest-topics', async (req, res, next) => {
  try {
    const schema = z.object({
      subject: z.string().min(3),
    });
    const { subject } = schema.parse(req.body);

    const result = await aiOrchestrator.suggestTopics({
      subject,
      userId: 'test-user',
    });

    if (!result.success) {
      return res.status(503).json({ error: result.error || 'Falha ao sugerir tópicos' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

// Inicialização
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT} em modo ${process.env.NODE_ENV || 'development'}`);
});