import { Router } from 'express';
import {
  getUserSettings,
  updateUserSettings,
  listUsers,
  createUser,
  updateUserRole,
  resetUserPassword,
  deleteUser,
} from './users.controller.js';
import {
  updateUserSettingsSchema,
  createUserSchema,
  updateUserRoleSchema,
  userIdParamSchema,
} from './users.schema.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { authenticateJwt, requireAdmin } from '../../middlewares/auth.middleware.js';

const router = Router();

// All user management routes require JWT authentication
router.use(authenticateJwt);

// Personal profile & settings routes (own account)
router.get('/settings', getUserSettings);
router.patch(
  '/settings',
  validateRequest({ body: updateUserSettingsSchema }),
  updateUserSettings
);

// Workspace Team Members management (Role-Based Access Control)
// Any authenticated workspace user can view the team roster
router.get('/', listUsers);

// Only Administrators can create, reassign roles, reset passwords, or remove team members
router.post(
  '/',
  requireAdmin,
  validateRequest({ body: createUserSchema }),
  createUser
);

router.patch(
  '/:id/role',
  requireAdmin,
  validateRequest({ params: userIdParamSchema, body: updateUserRoleSchema }),
  updateUserRole
);

router.post(
  '/:id/reset-password',
  requireAdmin,
  validateRequest({ params: userIdParamSchema }),
  resetUserPassword
);

router.delete(
  '/:id',
  requireAdmin,
  validateRequest({ params: userIdParamSchema }),
  deleteUser
);

export const userRoutes: Router = router;
