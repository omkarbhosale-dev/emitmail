import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { LoginInput, ChangePasswordInput } from './auth.schema.js';

export const login = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as LoginInput;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: username },
        { email: username },
      ],
    },
  });

  if (!user) {
    sendError(res, 'Invalid credentials provided', 401);
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    sendError(res, 'Invalid credentials provided', 401);
    return;
  }

  const tokenPayload = {
    sub: user.id,
    username: user.username,
  };

  const accessToken = jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: '7d',
  });

  sendSuccess(
    res,
    {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        mustChangePassword: user.mustChangePassword,
        timezone: user.timezone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    },
    'Authentication successful'
  );
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
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

  sendSuccess(res, user, 'User profile retrieved successfully');
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { currentPassword, newPassword } = req.body as ChangePasswordInput;

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (!user) {
    sendError(res, 'User not found', 404);
    return;
  }

  const isCurrentPasswordCorrect = await bcrypt.compare(
    currentPassword,
    user.passwordHash
  );

  if (!isCurrentPasswordCorrect) {
    sendError(res, 'Current password is incorrect', 400);
    return;
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
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

  sendSuccess(
    res,
    updatedUser,
    'Password changed successfully. mustChangePassword has been cleared.'
  );
};
