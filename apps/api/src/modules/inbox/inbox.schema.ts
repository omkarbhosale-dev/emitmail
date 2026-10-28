import { z } from 'zod';

export const localPartRegex = /^[a-z0-9][a-z0-9._+-]{0,62}$/i;

export const createMailboxSchema = z.object({
  domainId: z.string().uuid('Invalid domainId format (expected UUID)'),
  localPart: z
    .string()
    .trim()
    .refine(
      (val) => val === '*' || localPartRegex.test(val),
      'Invalid localPart format. Must be alphanumeric (dots, hyphens, plus allowed) or "*" for catch-all.'
    ),
  displayName: z.string().trim().max(100).optional(),
  isCatchAll: z.boolean().optional().default(false),
});

export type CreateMailboxInput = z.infer<typeof createMailboxSchema>;

export const updateMailboxSchema = z.object({
  displayName: z.string().trim().max(100).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateMailboxInput = z.infer<typeof updateMailboxSchema>;

export const listMailboxesQuerySchema = z.object({
  domainId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});

export type ListMailboxesQuery = z.infer<typeof listMailboxesQuerySchema>;

export const mailboxIdParamSchema = z.object({
  mailboxId: z.string().uuid('Invalid mailboxId format'),
});

export const inboxDomainIdParamSchema = z.object({
  domainId: z.string().uuid('Invalid domainId format'),
});

export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  filter: z.enum(['all', 'unread', 'starred', 'archived', 'trash']).default('all'),
  search: z.string().trim().optional(),
});

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;

export const messageIdParamSchema = z.object({
  messageId: z.string().uuid('Invalid messageId format'),
});

export const updateMessageSchema = z.object({
  isRead: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isTrash: z.boolean().optional(),
});

export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;

export const sendMailboxEmailSchema = z.object({
  to: z
    .union([z.string().email(), z.array(z.string().email())])
    .transform((val) => (Array.isArray(val) ? val : [val])),
  subject: z.string().trim().min(1, 'Subject is required'),
  html: z.string().optional(),
  text: z.string().optional(),
  cc: z
    .union([z.string().email(), z.array(z.string().email())])
    .optional()
    .transform((val) => (val ? (Array.isArray(val) ? val : [val]) : [])),
  bcc: z
    .union([z.string().email(), z.array(z.string().email())])
    .optional()
    .transform((val) => (val ? (Array.isArray(val) ? val : [val]) : [])),
  replyTo: z.string().email().optional(),
});

export type SendMailboxEmailInput = z.infer<typeof sendMailboxEmailSchema>;

export const replyMessageSchema = z.object({
  html: z.string().optional(),
  text: z.string().optional(),
  cc: z
    .union([z.string().email(), z.array(z.string().email())])
    .optional()
    .transform((val) => (val ? (Array.isArray(val) ? val : [val]) : [])),
  bcc: z
    .union([z.string().email(), z.array(z.string().email())])
    .optional()
    .transform((val) => (val ? (Array.isArray(val) ? val : [val]) : [])),
});

export type ReplyMessageInput = z.infer<typeof replyMessageSchema>;

export const simulateInboundSchema = z.object({
  to: z.string().email('Invalid "to" recipient email'),
  from: z.string().min(3, 'Invalid "from" sender address'),
  subject: z.string().trim().min(1, 'Subject is required'),
  html: z.string().optional(),
  text: z.string().optional(),
});

export type SimulateInboundInput = z.infer<typeof simulateInboundSchema>;
