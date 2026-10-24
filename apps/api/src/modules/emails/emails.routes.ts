import { Router } from 'express';
import { sendEmail, getEmail, listEmails } from './emails.controller.js';
import { sendEmailSchema, emailIdParamSchema } from './emails.schema.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { authenticateApiKey } from '../../middlewares/apiKey.middleware.js';

const router = Router();

// All email submission & status routes are secured by domain-scoped API key
router.use(authenticateApiKey);

// POST /v1/emails or /api/v1/emails - Send email
router.post('/', validateRequest({ body: sendEmailSchema }), sendEmail);

// GET /v1/emails or /api/v1/emails - List emails
router.get('/', listEmails);

// GET /v1/emails/:id or /api/v1/emails/:id - Get email status
router.get('/:id', validateRequest({ params: emailIdParamSchema }), getEmail);

export const emailRoutes: Router = router;
