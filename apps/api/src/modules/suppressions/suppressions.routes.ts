import { Router, Request, Response, NextFunction } from 'express';
import {
  createSuppression,
  listSuppressions,
  deleteSuppression,
} from './suppressions.controller.js';
import {
  createSuppressionSchema,
  listSuppressionsQuerySchema,
  suppressionIdParamSchema,
} from './suppressions.schema.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { authenticateJwt } from '../../middlewares/auth.middleware.js';
import { authenticateApiKey } from '../../middlewares/apiKey.middleware.js';

const router = Router();

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

router.use(authenticateAdminOrApiKey);

router.post(
  '/',
  validateRequest({ body: createSuppressionSchema }),
  createSuppression
);

router.get(
  '/',
  validateRequest({ query: listSuppressionsQuerySchema }),
  listSuppressions
);

router.delete(
  '/:id',
  validateRequest({ params: suppressionIdParamSchema }),
  deleteSuppression
);

export const suppressionRoutes: Router = router;
