import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';
import { sendError } from '../utils/response.js';

export interface JwtPayload {
  sub: string;
  username: string;
  role?: UserRole;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string | null;
        fullName: string | null;
        role: UserRole;
        mustChangePassword: boolean;
      };
    }
  }
}

export const authenticateJwt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication token missing or invalid', 401);
    return;
  }

  const token = authHeader.substring(7).trim();

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      sendError(res, 'User associated with token not found', 401);
      return;
    }

    const requestPath = req.originalUrl.split('?')[0];
    if (user.mustChangePassword && !requestPath.endsWith('/auth/change-password') && !requestPath.endsWith('/auth/me')) {
      sendError(res, 'Password change required before using this account', 403);
      return;
    }

    // The root 'admin' user is always the main administrator
    if (user.username === 'admin') {
      user.role = UserRole.ADMIN;
    }

    req.user = user;
    next();
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      sendError(res, 'Authentication token has expired', 401);
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      sendError(res, 'Invalid authentication token signature', 401);
      return;
    }
    sendError(res, 'Failed to authenticate token', 401);
  }
};

/**
 * Enforce minimum role access.
 * Usage: router.use(requireRoles(UserRole.ADMIN, UserRole.MEMBER))
 */
export const requireRoles = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    // Root 'admin' has universal super-admin access
    if (req.user.username === 'admin' || roles.includes(req.user.role)) {
      next();
      return;
    }

    sendError(
      res,
      `Access denied: requires ${roles.join(' or ')} privileges`,
      403
    );
  };
};

/**
 * Shortcut middleware strictly requiring ADMIN privileges.
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  // The 'admin' user is always the primary administrator
  if (req.user.username === 'admin' || req.user.role === UserRole.ADMIN) {
    next();
    return;
  }

  sendError(
    res,
    'Access denied: Administrator privileges required to perform this action',
    403
  );
};

/**
 * Enforce write access: ADMIN and MEMBER can create/modify/delete resources.
 * VIEWER (view-only) is rejected with 403 Forbidden.
 * External API Key requests are permitted (service accounts).
 */
export const requireWriteAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if ((req as any).apiKey) {
    next();
    return;
  }

  if (!req.user) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  if (
    req.user.username === 'admin' ||
    req.user.role === UserRole.ADMIN ||
    req.user.role === UserRole.MEMBER
  ) {
    next();
    return;
  }

  sendError(
    res,
    'Access denied: View-only members are not permitted to create, modify, or delete resources',
    403
  );
};
