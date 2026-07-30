// src/server/routes/aiRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validate } from '../middleware/validate';
import { aiOrchestrator } from '../ai';
import { AppError } from '../middleware/errorHandler';
import { generateFlashcardsSchema, suggestTopicsSchema } from '../schemas';
import { generateFlashcardsTask } from '../ai/tasks/generateFlashcards';
import { suggestTopicsTask } from '../ai/tasks/suggestTopics';
// import { authenticate } from '../middleware/auth'; // DESABILITADO

const router = Router();

// Rate limiting específico para IA
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de requisições de IA excedido. Aguarde um minuto.' },
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
      const result = await generateFlashcardsTask({ prompt, count: numberOfCards, selectedTopics: topic });
      res.json({ success: true, data: result.cards });
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
      const result = await suggestTopicsTask({ title: subject });
      res.json({ success: true, data: result.topics });
    } catch (error) {
      next(error);
    }
  }
);

// Rota para status dos provedores (pública)
router.get('/status', async (req, res) => {
  try {
    const status = await aiOrchestrator.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter status' });
  }
});

// Rota de teste (opcional)
router.get('/test', (req, res) => {
  res.json({ message: 'Rota de teste do aiRouter OK!' });
});

export { router as aiRouter };