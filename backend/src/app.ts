import express, { Request, Response, NextFunction } from 'express';
import { createRequire } from 'module';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';

const require = createRequire(import.meta.url);
const pinoHttp = require('pino-http');

// Create Express app
const app = express();

// Middleware: pino-http request logging with request id
const logger = pinoHttp({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});
app.use(logger);

// Rate limiter: 60 req/min/IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// JSON body limit 10kb
app.use(express.json({ limit: '10kb' }));

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  // TODO: Add actual DB ping when database is set up
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Central error handler
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', error);

  if (error instanceof Error) {
    // Handle AppError instances
    if ('status' in error && 'code' in error) {
      const appError = error as { status: number; code: string; message: string; details?: unknown };
      const resBody: any = {
        error: {
          code: appError.code,
          message: appError.message
        }
      };
      if (appError.details !== undefined) {
        resBody.error.details = appError.details;
      }
      return res.status(appError.status).json(resBody);
    }

    // Handle other Errors
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Internal server error'
      }
    });
  }

  // Handle unknown errors
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error'
    }
  });
});

export default app;