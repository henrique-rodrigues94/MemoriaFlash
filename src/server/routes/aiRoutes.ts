// src/server/routes/aiRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { aiOrchestrator } from '../../lib/ai/orchestrator';
// import { authenticate } from '../middleware/auth'; // DESABILITADO
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Rate limiting específico para IA
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de requisições de IA excedido. Aguarde um minuto.' },
});

// Schemas
const generateFlashcardsSchema = z.object({
  body: z.object({
    prompt: z.string().min(10, 'O prompt deve ter pelo menos 10 caracteres'),
    topic: z.string().optional(),
    numberOfCards: z.number().int().min(1).max(50).default(10),
  }),
});

const suggestTopicsSchema = z.object({
  body: z.object({
    subject: z.string().min(3, 'Assunto deve ter pelo menos 3 caracteres'),
  }),
});

// Rota para gerar flashcards
router.post(
  '/generate-flashcards',
  // authenticate, // DESABILITADO
  aiRateLimiter,
  validate(generateFlashcardsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prompt, topic, numberOfCards } = req.body;
      const userId = 'test-user'; // mock temporário

      const result = await aiOrchestrator.generateFlashcards({
        prompt,
        topic,
        numberOfCards,
        userId,
      });

      if (!result.success) {
        throw new AppError(result.error || 'Falha ao gerar flashcards', 503, 'AI_SERVICE_ERROR');
      }

      res.json({ success: true, data: result.data });
    } catch (error) {
      next(error);
    }
  }
);

// Rota para sugerir tópicos
router.post(
  '/suggest-topics',
  // authenticate,
  aiRateLimiter,
  validate(suggestTopicsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { subject } = req.body;
      const userId = 'test-user';

      const result = await aiOrchestrator.suggestTopics({ subject, userId });

      if (!result.success) {
        throw new AppError(result.error || 'Falha ao sugerir tópicos', 503, 'AI_SERVICE_ERROR');
      }

      res.json({ success: true, data: result.data });
    } catch (error) {
      next(error);
    }
  }
);

// Status (pública)
router.get('/status', async (req, res) => {
  try {
    const status = await aiOrchestrator.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter status' });
  }
});

// Rota de teste para verificar se o roteador está ativo
router.get('/test', (req, res) => {
  res.json({ message: 'Rota de teste do aiRouter OK!' });
});

export { router as aiRouter };