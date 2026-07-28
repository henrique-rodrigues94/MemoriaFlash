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

// Rate limiting global (opcional, mas mantido)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 requisições por IP por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições, tente novamente mais tarde.' },
});
app.use(globalLimiter);

// Rotas
app.use('/api/ai', aiRouter);
app.use('/api/referral', referralRouter);
app.use('/api/health', healthRouter);

// Serve o frontend em produção (se buildado)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Middleware de erro global (deve ser o último)
app.use(errorHandler);

// Inicialização do servidor
const server = createServer(app);
server.listen(PORT, () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT} em modo ${process.env.NODE_ENV || 'development'}`);
});

// Captura sinais de encerramento
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando servidor...');
  server.close(() => {
    logger.info('Servidor encerrado.');
    process.exit(0);
  });
});