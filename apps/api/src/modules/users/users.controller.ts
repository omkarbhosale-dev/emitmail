import { Request, Response } from 'express';
import { prisma } from '../../config/db.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { UpdateUserSettingsInput } from './users.schema.js';

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
      timezone: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  sendSuccess(res, updatedUser, 'User settings updated successfully');
};
