// src/server/routes/referralRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { adminFirestore } from '../../lib/firebase/admin'; // supondo

const router = Router();

const referralSchema = z.object({
  body: z.object({
    referredEmail: z.string().email('E-mail inválido'),
  }),
});

router.post(
  '/create',
  authenticate,
  validate(referralSchema),
  async (req, res, next) => {
    try {
      const { referredEmail } = req.body;
      const referrerId = req.user?.uid;

      // Lógica de criação de indicação (exemplo)
      // ...

      res.json({ success: true, message: 'Indicação criada com sucesso' });
    } catch (error) {
      next(error);
    }
  }
);

export { router as referralRouter };