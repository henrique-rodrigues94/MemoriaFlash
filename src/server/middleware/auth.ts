// src/server/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  req.user = { uid: 'test-user', email: 'test@example.com' };
  next();
}