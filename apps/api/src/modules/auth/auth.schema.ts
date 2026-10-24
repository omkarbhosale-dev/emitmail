import { z } from 'zod';

export const loginSchema = z.object({
  username: z
    .string({ required_error: 'Username is required' })
    .min(1, 'Username cannot be empty')
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password cannot be empty'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'New password must be at least 8 characters long'),
    confirmPassword: z
      .string({ required_error: 'Password confirmation is required' })
      .min(1, 'Password confirmation cannot be empty'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirmation password do not match',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
