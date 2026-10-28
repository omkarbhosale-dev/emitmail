import { Router, Request, Response, NextFunction } from 'express';
import {
  listInboundDomains,
  verifyDomainInboundMx,
  createMailbox,
  listMailboxes,
  getMailboxById,
  updateMailbox,
  deleteMailbox,
  listMailboxMessages,
  getMessageById,
  updateMessage,
  deleteMessage,
  sendFromMailbox,
  replyToMessage,
  simulateInbound,
} from './inbox.controller.js';
import {
  createMailboxSchema,
  updateMailboxSchema,
  listMailboxesQuerySchema,
  mailboxIdParamSchema,
  inboxDomainIdParamSchema,
  listMessagesQuerySchema,
  messageIdParamSchema,
  updateMessageSchema,
  sendMailboxEmailSchema,
  replyMessageSchema,
  simulateInboundSchema,
} from './inbox.schema.js';
import { validateRequest } from '../../middlewares/validate.middleware.js';
import { authenticateJwt } from '../../middlewares/auth.middleware.js';
import { authenticateApiKey } from '../../middlewares/apiKey.middleware.js';

const router = Router();

/**
 * Flexible authentication middleware allowing either JWT session token (Dashboard)
 * or API Key (external API / scripts).
 */
const authenticateInboxAccess = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const isApiKeyHeader =
    (authHeader && (authHeader.startsWith('Bearer em_live_') || authHeader.startsWith('Bearer em_test_'))) ||
    typeof req.headers['x-api-key'] === 'string';

  if (isApiKeyHeader) {
    authenticateApiKey(req, res, next);
  } else {
    authenticateJwt(req, res, next);
  }
};

router.use(authenticateInboxAccess);

// 5.1 Domain Inbound DNS Setup & Verification
router.get('/domains', listInboundDomains);
router.post(
  '/domains/:domainId/verify-mx',
  validateRequest({ params: inboxDomainIdParamSchema }),
  verifyDomainInboundMx
);

// 5.2 Mailbox (Alias) Management
router.post(
  '/mailboxes',
  validateRequest({ body: createMailboxSchema }),
  createMailbox
);
router.get(
  '/mailboxes',
  validateRequest({ query: listMailboxesQuerySchema }),
  listMailboxes
);
router.get(
  '/mailboxes/:mailboxId',
  validateRequest({ params: mailboxIdParamSchema }),
  getMailboxById
);
router.patch(
  '/mailboxes/:mailboxId',
  validateRequest({ params: mailboxIdParamSchema, body: updateMailboxSchema }),
  updateMailbox
);
router.delete(
  '/mailboxes/:mailboxId',
  validateRequest({ params: mailboxIdParamSchema }),
  deleteMailbox
);

// 5.3 Reading, Searching & Managing Emails in a Mailbox
router.get(
  '/mailboxes/:mailboxId/messages',
  validateRequest({ params: mailboxIdParamSchema, query: listMessagesQuerySchema }),
  listMailboxMessages
);
router.post(
  '/mailboxes/:mailboxId/send',
  validateRequest({ params: mailboxIdParamSchema, body: sendMailboxEmailSchema }),
  sendFromMailbox
);

router.get(
  '/messages/:messageId',
  validateRequest({ params: messageIdParamSchema }),
  getMessageById
);
router.patch(
  '/messages/:messageId',
  validateRequest({ params: messageIdParamSchema, body: updateMessageSchema }),
  updateMessage
);
router.delete(
  '/messages/:messageId',
  validateRequest({ params: messageIdParamSchema }),
  deleteMessage
);

// 5.4 Direct Message Reply
router.post(
  '/messages/:messageId/reply',
  validateRequest({ params: messageIdParamSchema, body: replyMessageSchema }),
  replyToMessage
);

// 5.5 Inbound Simulator Endpoint
router.post(
  '/simulate-inbound',
  validateRequest({ body: simulateInboundSchema }),
  simulateInbound
);

export const inboxRoutes: Router = router;
