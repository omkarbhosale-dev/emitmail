import { z } from 'zod';

export const allowedWebhookEvents = [
  'email.delivered',
  'email.bounced',
  'email.complaint',
  'domain.verified',
  'domain.failed',
] as const;

export const createWebhookSubscriptionSchema = z.object({
  url: z
    .string({ required_error: 'Target URL is required' })
    .url('Must be a valid HTTP or HTTPS webhook URL'),
  events: z
    .array(z.enum(allowedWebhookEvents))
    .min(1, 'At least one event subscription is required'),
  secret: z
    .string()
    .min(8, 'Secret must be at least 8 characters long')
    .optional(),
  domainId: z
    .string()
    .uuid('Invalid domainId format')
    .nullable()
    .optional(),
});

export type CreateWebhookSubscriptionInput = z.infer<
  typeof createWebhookSubscriptionSchema
>;

export const inboundBounceSchema = z.object({
  messageId: z.string().optional(),
  emailId: z.string().uuid().optional(),
  recipient: z.string().email('Invalid recipient email address'),
  bounceType: z.enum(['hard', 'soft']).default('hard'),
  diagnosticCode: z.string().min(1, 'Diagnostic code or bounce reason is required'),
  source: z.string().default('mta-inbound-pipe'),
  rawDsn: z.string().optional(),
});

export type InboundBounceInput = z.infer<typeof inboundBounceSchema>;

export const webhookIdParamSchema = z.object({
  id: z.string().uuid('Invalid webhook ID format'),
});

export type WebhookIdParam = z.infer<typeof webhookIdParamSchema>;
