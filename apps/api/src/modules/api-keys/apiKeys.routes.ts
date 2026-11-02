import { Router } from 'express';
import {
  createApiKey,
  listApiKeys,
  toggleApiKeyStatus,
  deleteApiKey,
  verifyCredentials,
} from './apiKeys.controller.js';
import {
  createApiKeySchema,
  apiKeyIdParamSchema,
} from './apiKeys.schema.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { authenticateJwt, requireWriteAccess } from '../../middlewares/auth.middleware.js';
import { authenticateApiKey } from '../../middlewares/apiKey.middleware.js';

const router = Router();

// POST /api/v1/api-keys/verify-credentials - Public SDK Handshake Test Route (API Key Authenticated)
router.post('/verify-credentials', authenticateApiKey, verifyCredentials);

// Dashboard routes (JWT Authenticated)
router.post(
  '/',
  authenticateJwt,
  requireWriteAccess,
  validateRequest({ body: createApiKeySchema }),
  createApiKey
);

// List keys (All roles including VIEWER)
router.get('/', authenticateJwt, listApiKeys);

router.patch(
  '/:id/toggle',
  authenticateJwt,
  requireWriteAccess,
  validateRequest({ params: apiKeyIdParamSchema }),
  toggleApiKeyStatus
);

router.delete(
  '/:id',
  authenticateJwt,
  requireWriteAccess,
  validateRequest({ params: apiKeyIdParamSchema }),
  deleteApiKey
);

export const apiKeyRoutes: Router = router;
