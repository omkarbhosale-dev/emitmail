import { z } from 'zod';

export const updateUserSettingsSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores')
    .trim()
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .trim()
    .nullable()
    .optional(),
  fullName: z
    .string()
    .min(1, 'Full name cannot be empty')
    .trim()
    .optional(),
  timezone: z
    .string()
    .min(1, 'Timezone cannot be empty')
    .trim()
    .optional(),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
