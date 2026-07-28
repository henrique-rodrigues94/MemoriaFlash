import type { Request, Response, NextFunction } from 'express';

// Rate limiter simples em memória (sem dependências externas). Suficiente
// para um servidor single-instance; para múltiplas instâncias, troque por
// Redis (ex: rate-limiter-flexible + Upstash Redis, ambos com camada grátis).
interface Bucket {
  count: number;
  resetAt: number;
}

export function simpleRateLimit(opts: { windowMs: number; max: number }) {
  const buckets = new Map<string, Bucket>();

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const key = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }

    if (bucket.count >= opts.max) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: `Muitas requisições. Tente novamente em ${retryAfterSec}s.`,
      });
    }

    bucket.count += 1;
    return next();
  };
}
