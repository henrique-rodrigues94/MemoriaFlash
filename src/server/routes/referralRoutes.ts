// src/server/routes/referralRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validate } from '../middleware/validate';
import { createReferralSchema } from '../schemas';
import { AppError } from '../middleware/errorHandler';
// import { authenticate } from '../middleware/auth'; // DESABILITADO

const router = Router();

const referralLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Limite de indicações excedido.' },
});

router.post(
  '/create',
  // authenticate,
  referralLimiter,
  validate(createReferralSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { referredEmail } = req.body;
      // Lógica de criação de indicação...
      res.json({ success: true, message: 'Indicação criada com sucesso' });
    } catch (error) {
      next(error);
    }
  }
);

export { router as referralRouter };