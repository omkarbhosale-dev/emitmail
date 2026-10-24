import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z
    .string({ required_error: 'API key name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be at most 60 characters')
    .trim(),
  domainId: z
    .string()
    .uuid('Invalid domain ID format (expected UUID)')
    .nullable()
    .optional(),
  expiresAt: z
    .string()
    .datetime({ message: 'expiresAt must be a valid ISO 8601 datetime string' })
    .nullable()
    .optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export const apiKeyIdParamSchema = z.object({
  id: z.string().uuid('Invalid API key ID format (expected UUID)'),
});

export type ApiKeyIdParam = z.infer<typeof apiKeyIdParamSchema>;
