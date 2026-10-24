import { Router } from 'express';
import { getUserSettings, updateUserSettings } from './users.controller.js';
import { updateUserSettingsSchema } from './users.schema.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { authenticateJwt } from '../../middlewares/auth.middleware.js';

const router = Router();

// All user settings routes are protected by JWT
router.use(authenticateJwt);

// GET /api/v1/users/settings
router.get('/settings', getUserSettings);

// PATCH /api/v1/users/settings
router.patch(
  '/settings',
  validateRequest({ body: updateUserSettingsSchema }),
  updateUserSettings
);

export const userRoutes: Router = router;
