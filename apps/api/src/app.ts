import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { prisma } from './config/db.js';
import { redis } from './config/redis.js';
import { env } from './config/env.js';
import { sendSuccess, sendError } from './utils/response.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/users.routes.js';
import { domainRoutes } from './modules/domains/domains.routes.js';
import { apiKeyRoutes } from './modules/api-keys/apiKeys.routes.js';
import { serverConfigRoutes } from './modules/server-config/serverConfig.routes.js';
import { systemRoutes } from './modules/system/system.routes.js';
import { emailRoutes } from './modules/emails/emails.routes.js';
import { webhookRoutes } from './modules/webhooks/webhooks.routes.js';
import { suppressionRoutes } from './modules/suppressions/suppressions.routes.js';
import { unsubscribeRoutes } from './modules/unsubscribe/unsubscribe.routes.js';

export const createApp = (): Express => {
  const app = express();

  // Security & Utility Middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-api-secret'],
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // Health Check Endpoint
  app.get('/api/v1/health', async (_req: Request, res: Response) => {
    let dbStatus = 'disconnected';
    let redisStatus = 'disconnected';

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (err: unknown) {
      dbStatus = `error: ${err instanceof Error ? err.message : 'failed'}`;
    }

    try {
      if (redis.status === 'ready' || redis.status === 'connect') {
        const pingResponse = await redis.ping();
        redisStatus = pingResponse === 'PONG' ? 'connected' : 'error';
      } else {
        const pingResponse = await redis.ping();
        redisStatus = pingResponse === 'PONG' ? 'connected' : 'error';
      }
    } catch (err: unknown) {
      redisStatus = `error: ${err instanceof Error ? err.message : 'failed'}`;
    }

    const isHealthy = dbStatus === 'connected' && redisStatus === 'connected';

    sendSuccess(
      res,
      {
        status: isHealthy ? 'healthy' : 'degraded',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus,
          redis: redisStatus,
        },
      },
      'Health check status'
    );
  });

  // Mount API Modules
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/domains', domainRoutes);
  app.use('/api/v1/api-keys', apiKeyRoutes);
  app.use('/api/v1/server-config', serverConfigRoutes);
  app.use('/api/v1/system', systemRoutes);
  app.use('/api/v1/emails', emailRoutes);
  app.use('/v1/emails', emailRoutes);
  app.use('/emails', emailRoutes);
  app.use('/api/v1/webhooks', webhookRoutes);
  app.use('/webhooks', webhookRoutes);
  app.use('/api/v1/suppressions', suppressionRoutes);
  app.use('/v1/suppressions', suppressionRoutes);
  app.use('/suppressions', suppressionRoutes);
  app.use('/api/v1/unsubscribe', unsubscribeRoutes);
  app.use('/unsubscribe', unsubscribeRoutes);

  // Root endpoint aliases for convenience
  app.use('/domains', domainRoutes);
  app.use('/api-keys', apiKeyRoutes);

  // 404 Route Handler
  app.use((req: Request, res: Response) => {
    sendError(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};
