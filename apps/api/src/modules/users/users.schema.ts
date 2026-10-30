import { z } from 'zod';
import { UserRole } from '@prisma/client';

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

export const createUserSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .trim(),
  email: z
    .string()
    .email('Please provide a valid email address')
    .trim()
    .toLowerCase(),
  role: z
    .nativeEnum(UserRole)
    .default(UserRole.MEMBER),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain alphanumeric characters, underscores, dots, or dashes')
    .trim()
    .optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Role must be ADMIN, MEMBER, or VIEWER' }),
  }),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
});

export type UserIdParamInput = z.infer<typeof userIdParamSchema>;
