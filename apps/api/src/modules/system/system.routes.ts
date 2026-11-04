import { Router } from 'express';
import { getSystemVersion, triggerSystemUpdate, detectServerPublicIp } from './system.controller.js';
import { authenticateJwt, requireAdmin } from '../../middlewares/auth.middleware.js';

const router = Router();

// GET /api/v1/system/version - Returns current running version and checks GitHub update status (?refresh=true)
router.get('/version', getSystemVersion);

// GET /api/v1/system/detect-ip - Auto-detect server public outbound IP
router.get('/detect-ip', detectServerPublicIp);

// POST /api/v1/system/update - Triggers asynchronous self-update via internal updater sidecar (Admin only)
router.post('/update', authenticateJwt, requireAdmin, triggerSystemUpdate);

export const systemRoutes: Router = router;
