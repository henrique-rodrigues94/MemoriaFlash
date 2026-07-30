// src/server/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { sanitizeObject } from '../schemas';

export const validate = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Aplica sanitização nos dados da requisição (body, query, params)
      const sanitizedBody = req.body ? sanitizeObject(req.body) : req.body;
      const sanitizedQuery = req.query ? sanitizeObject(req.query) : req.query;
      const sanitizedParams = req.params ? sanitizeObject(req.params) : req.params;

      // Valida com o schema
      await schema.parseAsync({
        body: sanitizedBody,
        query: sanitizedQuery,
        params: sanitizedParams,
      });

      // Substitui os dados originais pelos sanitizados (opcional, mas recomendado)
      req.body = sanitizedBody;
      req.query = sanitizedQuery;
      req.params = sanitizedParams;

      next();
    } catch (error) {
      // Repassa para o middleware de erro (que tratará ZodError)
      next(error);
    }
  };
};