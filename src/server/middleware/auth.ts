import { Request, Response, NextFunction } from 'express';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  // Mock: sempre autenticado
  req.user = { uid: 'test-user', email: 'test@example.com' };
  next();
}