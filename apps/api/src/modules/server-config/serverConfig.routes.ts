import { Router } from 'express';
import { getServerConfig, updateServerConfig } from './serverConfig.controller.js';
import { updateServerConfigSchema } from './serverConfig.schema.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { authenticateJwt } from '../../middlewares/auth.middleware.js';

const router = Router();

// Master server configuration routes are protected by JWT (Admin only)
router.use(authenticateJwt);

// GET /api/v1/server-config - View MTA configuration and master DNS prerequisite checklist
router.get('/', getServerConfig);

// PATCH /api/v1/server-config - Update MTA hostname & IP, and refresh pending sender domains
router.patch(
  '/',
  validateRequest({ body: updateServerConfigSchema }),
  updateServerConfig
);

export const serverConfigRoutes: Router = router;
