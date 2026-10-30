import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { hashSha256 } from '../utils/crypto.js';
import { sendError } from '../utils/response.js';
import { ApiKey, Domain } from '@prisma/client';

export interface AuthenticatedApiKey extends ApiKey {
  domain: Domain | null;
}

declare global {
  namespace Express {
    interface Request {
      apiKey?: AuthenticatedApiKey;
      domain?: Domain | null;
      scopedDomain?: Domain | null;
    }
  }
}

export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let tokenCandidate: string | undefined;

  // 1. Check Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    tokenCandidate = authHeader.substring(7).trim();
  }

  // 2. Check x-api-key header
  if (!tokenCandidate && typeof req.headers['x-api-key'] === 'string') {
    tokenCandidate = req.headers['x-api-key'].trim();
  }

  // 3. Fallback: check legacy x-api-key & x-api-secret pair or key:secret
  let legacySecret: string | undefined;
  if (tokenCandidate && tokenCandidate.includes(':')) {
    const parts = tokenCandidate.split(':');
    tokenCandidate = parts[0].trim();
    legacySecret = parts[1].trim();
  } else if (typeof req.headers['x-api-secret'] === 'string') {
    legacySecret = req.headers['x-api-secret'].trim();
  }

  if (!tokenCandidate) {
    sendError(
      res,
      'Missing API Key. Provide "Authorization: Bearer <em_live_token>" or "x-api-key" header.',
      401
    );
    return;
  }

  try {
    let apiKeyRecord = null;
    if (tokenCandidate) {
      const keyHash = hashSha256(tokenCandidate);
      apiKeyRecord = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: {
          domain: true,
        },
      });
    }

    // If matching API Key found, enforce API Key checks
    if (apiKeyRecord) {
      // If legacy dual-credential key was created with secretHash, check secret if provided
      if (apiKeyRecord.secretHash && legacySecret) {
        const secretHash = hashSha256(legacySecret);
        if (apiKeyRecord.secretHash !== secretHash && apiKeyRecord.secretHash !== hashSha256(tokenCandidate)) {
          sendError(res, 'Invalid API Key secret', 401);
          return;
        }
      }

      if (!apiKeyRecord.isActive) {
        sendError(res, 'This API Key has been deactivated or paused', 403);
        return;
      }

      if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
        sendError(res, 'This API Key has expired', 403);
        return;
      }

      // Update lastUsedAt timestamp asynchronously
      prisma.apiKey
        .update({
          where: { id: apiKeyRecord.id },
          data: { lastUsedAt: new Date() },
        })
        .catch((err) => {
          console.error('Failed to update API key lastUsedAt timestamp:', err);
        });

      // Attach tenancy & domain context
      req.apiKey = apiKeyRecord;
      req.domain = apiKeyRecord.domain;
      req.scopedDomain = apiKeyRecord.domain;

      next();
      return;
    }

    // 4. Fallback: Check if tokenCandidate is a valid Admin JWT from dashboard session
    if (tokenCandidate) {
      try {
        const jwt = await import('jsonwebtoken');
        const { env } = await import('../config/env.js');
        const decoded = jwt.default.verify(tokenCandidate, env.JWT_SECRET) as { sub: string; username: string };

        const user = await prisma.user.findUnique({
          where: { id: decoded.sub },
          select: { id: true, username: true, email: true, fullName: true, role: true, mustChangePassword: true },
        });

        if (user) {
          req.user = user;
          req.apiKey = undefined;
          req.domain = null; // Admin has full access to all registered domains
          req.scopedDomain = null;
          next();
          return;
        }
      } catch {
        // Not a valid JWT, proceed to Invalid API Key credentials error below
      }
    }

    sendError(res, 'Invalid API Key credentials', 401);
    return;
  } catch (error) {
    console.error('Error during API Key authentication:', error);
    sendError(res, 'Internal authentication error', 500);
  }
};
