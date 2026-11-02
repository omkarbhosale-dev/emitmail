import { Router, Request, Response, NextFunction } from 'express';
import {
  createWebhook,
  listWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  listDeliveries,
  inboundBounce,
} from './webhooks.controller.js';
import {
  createWebhookSubscriptionSchema,
  updateWebhookSubscriptionSchema,
  inboundBounceSchema,
  webhookIdParamSchema,
  testWebhookSchema,
} from './webhooks.schema.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { authenticateJwt, requireWriteAccess } from '../../middlewares/auth.middleware.js';
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

// Delivery logs endpoint
router.get(
  '/deliveries',
  authenticateAdminOrApiKey,
  listDeliveries
);

// Subscription endpoints (Protected)
router.post(
  '/',
  authenticateAdminOrApiKey,
  requireWriteAccess,
  validateRequest({ body: createWebhookSubscriptionSchema }),
  createWebhook
);

// List webhooks (All roles including VIEWER)
router.get('/', authenticateAdminOrApiKey, listWebhooks);

// Get single webhook
router.get(
  '/:id',
  authenticateAdminOrApiKey,
  validateRequest({ params: webhookIdParamSchema }),
  getWebhook
);

// Update webhook (e.g. toggle events or active state)
router.patch(
  '/:id',
  authenticateAdminOrApiKey,
  requireWriteAccess,
  validateRequest({
    params: webhookIdParamSchema,
    body: updateWebhookSubscriptionSchema,
  }),
  updateWebhook
);

// Test webhook dispatch
router.post(
  '/:id/test',
  authenticateAdminOrApiKey,
  requireWriteAccess,
  validateRequest({
    params: webhookIdParamSchema,
    body: testWebhookSchema,
  }),
  testWebhook
);

// Delete webhook
router.delete(
  '/:id',
  authenticateAdminOrApiKey,
  requireWriteAccess,
  validateRequest({ params: webhookIdParamSchema }),
  deleteWebhook
);

export const webhookRoutes: Router = router;
