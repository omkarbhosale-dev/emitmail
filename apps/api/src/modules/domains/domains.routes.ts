import { Router } from 'express';
import {
  createDomain,
  listDomains,
  getDomainById,
  verifyDomain,
  rotateDkim,
  deleteDomain,
} from './domains.controller.js';
import {
  createDomainSchema,
  listDomainsQuerySchema,
  domainIdParamSchema,
} from './domains.schema.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { authenticateJwt, requireWriteAccess } from '../../middlewares/auth.middleware.js';

const router = Router();

// All domain management routes are protected by JWT
router.use(authenticateJwt);

// POST /api/v1/domains - Register domain (Admin & Member only)
router.post('/', requireWriteAccess, validateRequest({ body: createDomainSchema }), createDomain);

// GET /api/v1/domains - List domains (All roles including VIEWER)
router.get('/', validateRequest({ query: listDomainsQuerySchema }), listDomains);

// GET /api/v1/domains/:id - Get domain details + DNS records (All roles including VIEWER)
router.get('/:id', validateRequest({ params: domainIdParamSchema }), getDomainById);

// POST /api/v1/domains/:id/verify - Live DNS Verification (Admin & Member only)
router.post('/:id/verify', requireWriteAccess, validateRequest({ params: domainIdParamSchema }), verifyDomain);

// POST /api/v1/domains/:id/rotate-dkim - Rotate / Upgrade DKIM key to 2048-bit (Admin & Member only)
router.post('/:id/rotate-dkim', requireWriteAccess, validateRequest({ params: domainIdParamSchema }), rotateDkim);

// DELETE /api/v1/domains/:id - Delete domain (Admin & Member only)
router.delete('/:id', requireWriteAccess, validateRequest({ params: domainIdParamSchema }), deleteDomain);

export const domainRoutes: Router = router;
