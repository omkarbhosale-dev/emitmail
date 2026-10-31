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
import { authenticateJwt } from '../../middlewares/auth.middleware.js';

const router = Router();

// All domain management routes are protected by JWT
router.use(authenticateJwt);

// POST /api/v1/domains - Register domain
router.post('/', validateRequest({ body: createDomainSchema }), createDomain);

// GET /api/v1/domains - List domains
router.get('/', validateRequest({ query: listDomainsQuerySchema }), listDomains);

// GET /api/v1/domains/:id - Get domain details + DNS records
router.get('/:id', validateRequest({ params: domainIdParamSchema }), getDomainById);

// POST /api/v1/domains/:id/verify - Live DNS Verification
router.post('/:id/verify', validateRequest({ params: domainIdParamSchema }), verifyDomain);

// POST /api/v1/domains/:id/rotate-dkim - Rotate / Upgrade DKIM key to 2048-bit
router.post('/:id/rotate-dkim', validateRequest({ params: domainIdParamSchema }), rotateDkim);

// DELETE /api/v1/domains/:id - Delete domain
router.delete('/:id', validateRequest({ params: domainIdParamSchema }), deleteDomain);

export const domainRoutes: Router = router;
