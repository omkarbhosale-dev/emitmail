import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { UserRole } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import {
  UpdateUserSettingsInput,
  CreateUserInput,
  UpdateUserRoleInput,
  UserIdParamInput,
} from './users.schema.js';

/**
 * GET /api/v1/users/settings
 * Retrieve personal user settings for the authenticated account.
 */
export const getUserSettings = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      role: true,
      avatarUrl: true,
      timezone: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    sendError(res, 'User not found', 404);
    return;
  }

  sendSuccess(res, user, 'User settings retrieved successfully');
};

/**
 * PATCH /api/v1/users/settings
 * Update personal profile details for the authenticated account.
 */
export const updateUserSettings = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { username, email, fullName, timezone } = req.body as UpdateUserSettingsInput;

  // Check username uniqueness if changing
  if (username && username !== req.user.username) {
    const existingUsername = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: req.user.id },
      },
    });

    if (existingUsername) {
      sendError(res, 'Username is already taken by another account', 409, [
        { path: 'username', message: 'Username is already in use' },
      ]);
      return;
    }
  }

  // Check email uniqueness if changing to a non-null email
  if (email) {
    const existingEmail = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: req.user.id },
      },
    });

    if (existingEmail) {
      sendError(res, 'Email address is already in use by another account', 409, [
        { path: 'email', message: 'Email is already in use' },
      ]);
      return;
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(username !== undefined ? { username } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(fullName !== undefined ? { fullName } : {}),
      ...(timezone !== undefined ? { timezone } : {}),
    },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      role: true,
      avatarUrl: true,
      timezone: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  sendSuccess(res, updatedUser, 'User settings updated successfully');
};

/**
 * GET /api/v1/users
 * List all workspace team members.
 */
export const listUsers = async (_req: Request, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      role: true,
      avatarUrl: true,
      mustChangePassword: true,
      timezone: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const normalizedUsers = users.map((u) => ({
    ...u,
    role: u.username === 'admin' ? UserRole.ADMIN : (u.role || UserRole.MEMBER),
  }));

  sendSuccess(res, normalizedUsers, 'Team members retrieved successfully');
};

/**
 * POST /api/v1/users
 * Create a new team user with a one-time random initial password.
 * Restricted to administrators only.
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  const { fullName, email, role, username } = req.body as CreateUserInput;
  const normalizedEmail = email.toLowerCase().trim();

  // Check for email collision
  const existingEmail = await prisma.user.findFirst({
    where: { email: normalizedEmail },
  });

  if (existingEmail) {
    sendError(res, 'A user with this email address already exists', 409, [
      { path: 'email', message: 'Email address is already in use' },
    ]);
    return;
  }

  // Derive or validate unique username
  let candidateUsername = username?.toLowerCase().trim();
  if (!candidateUsername) {
    const rawPrefix = normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
    candidateUsername = rawPrefix.length >= 3 ? rawPrefix : `user_${rawPrefix}`;
  }

  // Ensure username uniqueness
  let finalUsername = candidateUsername;
  let suffix = 1;
  while (await prisma.user.findFirst({ where: { username: finalUsername } })) {
    finalUsername = `${candidateUsername}_${suffix}`;
    suffix++;
  }

  // Generate deterministic facehash avatar URL
  const avatarUrl = `/api/avatar?name=${encodeURIComponent(finalUsername)}`;

  const initialPassword = randomBytes(24).toString('base64url');
  const passwordHash = await bcrypt.hash(initialPassword, 12);

  const newUser = await prisma.user.create({
    data: {
      fullName,
      email: normalizedEmail,
      username: finalUsername,
      role: role || UserRole.MEMBER,
      avatarUrl,
      passwordHash,
      mustChangePassword: true,
      timezone: 'UTC',
    },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      role: true,
      avatarUrl: true,
      mustChangePassword: true,
      timezone: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  sendSuccess(res, { ...newUser, initialPassword }, 'User created. Share the initial password securely; it is shown only once.', 201);
};

/**
 * PATCH /api/v1/users/:id/role
 * Update role of an existing user.
 * Restricted to administrators only.
 */
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as UserIdParamInput;
  const { role } = req.body as UpdateUserRoleInput;

  const targetUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!targetUser) {
    sendError(res, 'User not found', 404);
    return;
  }

  // The primary 'admin' root account is permanently the main administrator
  if (targetUser.username === 'admin') {
    sendError(res, 'Cannot modify the role of the primary root Administrator account', 400);
    return;
  }

  // If demoting an ADMIN, ensure at least one other active ADMIN exists
  if (targetUser.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
    const adminCount = await prisma.user.count({
      where: { role: UserRole.ADMIN },
    });

    if (adminCount <= 1) {
      sendError(
        res,
        'Cannot demote the last remaining Administrator. Promote another member first.',
        400
      );
      return;
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      role: true,
      avatarUrl: true,
      mustChangePassword: true,
      timezone: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  sendSuccess(res, updatedUser, `User role successfully updated to ${role}`);
};

/**
 * POST /api/v1/users/:id/reset-password
 * Reset a user's password to a one-time random value.
 * Restricted to administrators only.
 */
export const resetUserPassword = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as UserIdParamInput;

  const targetUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!targetUser) {
    sendError(res, 'User not found', 404);
    return;
  }

  const initialPassword = randomBytes(24).toString('base64url');
  const passwordHash = await bcrypt.hash(initialPassword, 12);

  await prisma.user.update({
    where: { id },
    data: {
      passwordHash,
      mustChangePassword: true,
    },
  });

  sendSuccess(
    res,
    { id: targetUser.id, username: targetUser.username, initialPassword },
    'Password reset. Share the initial password securely; it is shown only once.'
  );
};

/**
 * DELETE /api/v1/users/:id
 * Remove a user account.
 * Restricted to administrators only.
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as UserIdParamInput;

  if (req.user?.id === id) {
    sendError(res, 'You cannot delete your own administrator account', 400);
    return;
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!targetUser) {
    sendError(res, 'User not found', 404);
    return;
  }

  // The primary 'admin' root account cannot be deleted
  if (targetUser.username === 'admin') {
    sendError(res, 'Cannot delete the primary root Administrator account', 400);
    return;
  }

  // Prevent deleting the last remaining admin
  if (targetUser.role === UserRole.ADMIN) {
    const adminCount = await prisma.user.count({
      where: { role: UserRole.ADMIN },
    });

    if (adminCount <= 1) {
      sendError(res, 'Cannot delete the last remaining Administrator', 400);
      return;
    }
  }

  await prisma.user.delete({
    where: { id },
  });

  sendSuccess(res, { id }, 'User removed successfully');
};
