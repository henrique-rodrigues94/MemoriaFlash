// src/server/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  code?: string;
  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: err.issues.map((e) => ({ path: (e.path || []).join('.'), message: e.message })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code || undefined,
    });
  }

  return res.status(500).json({
    error: 'Erro interno do servidor',
    code: 'INTERNAL_SERVER_ERROR',
  });
}