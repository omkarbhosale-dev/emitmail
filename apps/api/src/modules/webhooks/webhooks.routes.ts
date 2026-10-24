import { Router, Request, Response, NextFunction } from 'express';
import {
  createWebhook,
  listWebhooks,
  deleteWebhook,
  inboundBounce,
} from './webhooks.controller.js';
import {
  createWebhookSubscriptionSchema,
  inboundBounceSchema,
  webhookIdParamSchema,
} from './webhooks.schema.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { authenticateJwt } from '../../middlewares/auth.middleware.js';
import { authenticateApiKey } from '../../middlewares/apiKey.middleware.js';

const router = Router();

// Flexible auth: allows either JWT Bearer (Dashboard admin) or API Key (Developer API)
const authenticateAdminOrApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const isApiKey =
    Boolean(req.headers['x-api-key']) ||
    (authHeader && (authHeader.includes('em_live_') || authHeader.includes('emit_live_')));

  if (isApiKey) {
    return authenticateApiKey(req, res, next);
  }
  return authenticateJwt(req, res, next);
};

// POST /webhooks/inbound-bounce or /api/v1/webhooks/inbound-bounce - Inbound DSN bounce pipe
router.post(
  '/inbound-bounce',
  validateRequest({ body: inboundBounceSchema }),
  inboundBounce
);

// Subscription endpoints (Protected)
router.post(
  '/',
  authenticateAdminOrApiKey,
  validateRequest({ body: createWebhookSubscriptionSchema }),
  createWebhook
);

router.get('/', authenticateAdminOrApiKey, listWebhooks);

router.delete(
  '/:id',
  authenticateAdminOrApiKey,
  validateRequest({ params: webhookIdParamSchema }),
  deleteWebhook
);

export const webhookRoutes: Router = router;
