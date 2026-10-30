import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { LoginInput, ChangePasswordInput } from './auth.schema.js';

export const login = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as LoginInput;

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: username },
        { email: username },
      ],
    },
  });

  // If no user exists yet and logging in as default admin, initialize default administrator
  if (!user && username === 'admin') {
    const passwordHash = await bcrypt.hash('emitmail', 12);
    user = await prisma.user.create({
      data: {
        username: 'admin',
        fullName: 'EmitMail Administrator',
        role: 'ADMIN',
        passwordHash,
        mustChangePassword: true,
        timezone: 'UTC',
      },
    });
  }

  if (!user) {
    sendError(res, 'Invalid credentials provided', 401);
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    sendError(res, 'Invalid credentials provided', 401);
    return;
  }

  // The first user who signs in with the admin username is always the main administrator
  if (user.username === 'admin' && user.role !== 'ADMIN') {
    try {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });
    } catch {
      // In case role column hasn't migrated yet, guarantee in-memory role
      user.role = 'ADMIN' as any;
    }
  }

  const tokenPayload = {
    sub: user.id,
    username: user.username,
    role: user.username === 'admin' ? 'ADMIN' : user.role,
  };

  // 30-day persistent session token
  const accessToken = jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: '30d',
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
        role: user.role,
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
      role: true,
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

  // Ensure root admin always has ADMIN role
  if (user.username === 'admin') {
    user.role = 'ADMIN' as any;
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

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      mustChangePassword: false,
    },
  });

  sendSuccess(res, null, 'Password updated successfully');
};
