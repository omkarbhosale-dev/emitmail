import { Router } from 'express';
import { getServerConfig, updateServerConfig } from './serverConfig.controller.js';
import { updateServerConfigSchema } from './serverConfig.schema.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { authenticateJwt, requireAdmin } from '../../middlewares/auth.middleware.js';

const router = Router();

// Master server configuration routes are protected by JWT
router.use(authenticateJwt);

// GET /api/v1/server-config - View MTA configuration and master DNS prerequisite checklist (All authenticated roles)
router.get('/', getServerConfig);

// PATCH /api/v1/server-config - Update MTA hostname & IP (Admin only)
router.patch(
  '/',
  requireAdmin,
  validateRequest({ body: updateServerConfigSchema }),
  updateServerConfig
);

export const serverConfigRoutes: Router = router;
