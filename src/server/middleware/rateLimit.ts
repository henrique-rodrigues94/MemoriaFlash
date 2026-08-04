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
    // CORREÇÃO: antes usava o header `x-forwarded-for` inteiro, direto do
    // jeito que chegou — mas esse header é enviado pelo PRÓPRIO cliente e
    // pode ser falsificado livremente (ex: um valor aleatório diferente em
    // cada requisição), o que permite contornar completamente o limite,
    // criando um "bucket" novo a cada chamada. Como o servidor normalmente
    // roda atrás de exatamente 1 proxy confiável (Render/Railway/Fly/Nginx),
    // usamos apenas o ÚLTIMO IP da cadeia — o trecho que o NOSSO proxy
    // anexou de fato, não o que o cliente pode ter forjado no início.
    const forwardedHeader = req.headers['x-forwarded-for'];
    const forwardedList = Array.isArray(forwardedHeader) ? forwardedHeader[0] : forwardedHeader;
    const lastHop = forwardedList?.split(',').map((ip) => ip.trim()).filter(Boolean).pop();
    const key = lastHop || req.socket.remoteAddress || 'unknown';

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
