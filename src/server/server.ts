// src/server/server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { aiRouter } from './routes/aiRoutes';
import { referralRouter } from './routes/referralRoutes';
import { healthRouter } from './routes/healthRoutes';
import { logger } from './utils/logger';
import path from 'path';

config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globais
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições, tente novamente mais tarde.' },
});
app.use(globalLimiter);

// Rotas
app.use('/api/ai', aiRouter);
app.use('/api/referral', referralRouter);
app.use('/api/health', healthRouter);

// Servir frontend em produção
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Middleware de erro global (último)
app.use(errorHandler);

// Inicialização
const server = createServer(app);
server.listen(PORT, () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT} em modo ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando servidor...');
  server.close(() => {
    logger.info('Servidor encerrado.');
    process.exit(0);
  });
});