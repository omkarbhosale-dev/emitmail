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
      scopedDomain?: Domain | null;
    }
  }
}

export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let apiKeyRaw: string | undefined;
  let apiSecretRaw: string | undefined;

  // 1. Check custom headers: x-api-key & x-api-secret
  const headerKey = req.headers['x-api-key'];
  const headerSecret = req.headers['x-api-secret'];

  if (typeof headerKey === 'string' && typeof headerSecret === 'string') {
    apiKeyRaw = headerKey.trim();
    apiSecretRaw = headerSecret.trim();
  }

  // 2. Alternatively check Authorization: Bearer <apiKey>:<apiSecret>
  if (!apiKeyRaw || !apiSecretRaw) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const parts = token.split(':');
      if (parts.length === 2) {
        apiKeyRaw = parts[0].trim();
        apiSecretRaw = parts[1].trim();
      }
    }
  }

  if (!apiKeyRaw || !apiSecretRaw) {
    sendError(
      res,
      'Missing API Key or API Secret. Provide x-api-key and x-api-secret headers or Authorization: Bearer <key>:<secret>',
      401
    );
    return;
  }

  try {
    const keyHash = hashSha256(apiKeyRaw);
    const secretHash = hashSha256(apiSecretRaw);

    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        domain: true,
      },
    });

    if (!apiKeyRecord || apiKeyRecord.secretHash !== secretHash) {
      sendError(res, 'Invalid API Key or API Secret credentials', 401);
      return;
    }

    if (!apiKeyRecord.isActive) {
      sendError(res, 'This API Key has been deactivated or paused', 403);
      return;
    }

    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
      sendError(res, 'This API Key has expired', 403);
      return;
    }

    // Update lastUsedAt asynchronously in the background
    prisma.apiKey
      .update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err) => {
        console.error('Failed to update API key lastUsedAt timestamp:', err);
      });

    req.apiKey = apiKeyRecord;
    req.scopedDomain = apiKeyRecord.domain;

    next();
  } catch (error) {
    console.error('Error during API Key authentication:', error);
    sendError(res, 'Internal authentication error', 500);
  }
};
