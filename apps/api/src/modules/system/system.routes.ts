import { Router } from 'express';
import { getSystemVersion } from './system.controller.js';

const router = Router();

// GET /api/v1/system/version - Returns current running version and checks GitHub update status (?force=true)
router.get('/version', getSystemVersion);

export const systemRoutes: Router = router;
