import { Router } from 'express';
import { login, getMe, changePassword } from './auth.controller.js';
import { loginSchema, changePasswordSchema } from './auth.schema.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { authenticateJwt } from '../../middlewares/auth.middleware.js';

const router = Router();

// POST /api/v1/auth/login - Public login endpoint
router.post('/login', validateRequest({ body: loginSchema }), login);

// GET /api/v1/auth/me - Current admin profile (JWT Protected)
router.get('/me', authenticateJwt, getMe);

// POST /api/v1/auth/change-password - Change password (JWT Protected)
router.post(
  '/change-password',
  authenticateJwt,
  validateRequest({ body: changePasswordSchema }),
  changePassword
);

export const authRoutes: Router = router;
