import { z } from 'zod';
import { SuppressionReason } from '@prisma/client';

export const suppressionReasonEnum = z.enum([
  'HARD_BOUNCE',
  'COMPLAINT',
  'UNSUBSCRIBE',
  'MANUAL',
]);

export const createSuppressionSchema = z.object({
  email: z
    .string({ required_error: 'Recipient email address is required' })
    .email('Invalid email address')
    .transform((val) => val.toLowerCase().trim()),
  reason: suppressionReasonEnum.default('MANUAL'),
  details: z.string().max(1000).optional(),
  domainId: z.string().uuid('Invalid domainId format').optional().nullable(),
});

export type CreateSuppressionInput = z.infer<typeof createSuppressionSchema>;

export const listSuppressionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  domainId: z.string().uuid().optional(),
  reason: suppressionReasonEnum.optional(),
  search: z.string().trim().optional(),
});

export type ListSuppressionsQuery = z.infer<typeof listSuppressionsQuerySchema>;

export const suppressionIdParamSchema = z.object({
  id: z.string().min(1, 'Suppression ID is required'),
});

export type SuppressionIdParam = z.infer<typeof suppressionIdParamSchema>;
