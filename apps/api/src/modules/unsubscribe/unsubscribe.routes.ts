import { Router } from 'express';
import { handleOneClickPost, handleOneClickGet } from './unsubscribe.controller.js';

const router = Router();

// Public RFC 8058 Direct POST Unsubscribe Route
router.post('/one-click/:token', handleOneClickPost);

// Public Fallback GET Route for human web browser clicks
router.get('/one-click/:token', handleOneClickGet);

export const unsubscribeRoutes: Router = router;
