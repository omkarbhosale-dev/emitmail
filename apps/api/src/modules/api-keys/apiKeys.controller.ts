import { Request, Response } from 'express';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { generateDomainScopedApiKey, hashSha256 } from '../../utils/crypto.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { CreateApiKeyInput, ApiKeyIdParam } from './apiKeys.schema.js';
import { DomainStatus } from '@prisma/client';

export const createApiKey = async (req: Request, res: Response): Promise<void> => {
  const { name, domainId, scopes = ['email:send'], expiresAt } = req.body as CreateApiKeyInput;

  // 1. Prerequisite Validation: Domain Existence & Verification Status
  if (domainId) {
    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
    });

    if (!domain) {
      sendError(res, `Domain with ID "${domainId}" not found`, 404, [
        { path: 'domainId', message: 'Referenced domain does not exist' },
      ]);
      return;
    }

    // Check verification status unless relaxed mode is enabled
    if (!env.ALLOW_PENDING_DOMAIN_API_KEYS && domain.status !== DomainStatus.VERIFIED) {
      sendError(
        res,
        `Cannot generate API key for domain "${domain.domainName}". Sender domain must be in VERIFIED status before generating scoped credentials.`,
        400,
        [
          {
            path: 'domainId',
            message: `Domain status is currently ${domain.status}. Verify DNS records first.`,
          },
        ]
      );
      return;
    }
  } else {
    // If domainId is null (account-wide key), ensure at least one VERIFIED domain exists
    if (!env.ALLOW_PENDING_DOMAIN_API_KEYS) {
      const verifiedDomainCount = await prisma.domain.count({
        where: { status: DomainStatus.VERIFIED },
      });

      if (verifiedDomainCount === 0) {
        sendError(
          res,
          'Prerequisite failed: At least one sender domain must be in VERIFIED status before generating API keys.',
          400
        );
        return;
      }
    }
  }

  // 2. Generate secure high-entropy API token (em_live_...)
  const { rawToken, keyPrefix, keyHash } = generateDomainScopedApiKey('em_live_');
  const secretHash = hashSha256(rawToken);

  const newKey = await prisma.apiKey.create({
    data: {
      name,
      keyPrefix,
      keyHash,
      secretHash,
      scopes,
      domainId: domainId ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: true,
    },
    include: {
      domain: {
        select: {
          id: true,
          domainName: true,
          status: true,
        },
      },
    },
  });

  sendSuccess(
    res,
    {
      id: newKey.id,
      name: newKey.name,
      apiKey: rawToken,
      keyPrefix: newKey.keyPrefix,
      domainId: newKey.domainId,
      domain: newKey.domain,
      scopes: newKey.scopes,
      isActive: newKey.isActive,
      expiresAt: newKey.expiresAt,
      createdAt: newKey.createdAt,
      warning:
        'Please copy your API token now. For security purposes, the raw token will never be displayed or stored again.',
    },
    'API key generated successfully',
    201
  );
};

export const listApiKeys = async (_req: Request, res: Response): Promise<void> => {
  const apiKeys = await prisma.apiKey.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      domainId: true,
      domain: {
        select: {
          id: true,
          domainName: true,
          status: true,
        },
      },
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  sendSuccess(res, apiKeys, 'API keys retrieved successfully');
};

export const toggleApiKeyStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as ApiKeyIdParam;

  const existingKey = await prisma.apiKey.findUnique({
    where: { id },
  });

  if (!existingKey) {
    sendError(res, 'API key not found', 404);
    return;
  }

  const updatedKey = await prisma.apiKey.update({
    where: { id },
    data: {
      isActive: !existingKey.isActive,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      domainId: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      updatedAt: true,
    },
  });

  const statusText = updatedKey.isActive ? 'activated' : 'paused';
  sendSuccess(res, updatedKey, `API key "${updatedKey.name}" has been ${statusText}`);
};

export const deleteApiKey = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as ApiKeyIdParam;

  const existingKey = await prisma.apiKey.findUnique({
    where: { id },
  });

  if (!existingKey) {
    sendError(res, 'API key not found', 404);
    return;
  }

  await prisma.apiKey.delete({
    where: { id },
  });

  sendSuccess(
    res,
    { id: existingKey.id, name: existingKey.name },
    `API key "${existingKey.name}" permanently revoked and deleted`
  );
};

export const verifyCredentials = async (req: Request, res: Response): Promise<void> => {
  if (!req.apiKey) {
    sendError(res, 'API key authentication failed', 401);
    return;
  }

  const scope = req.domain
    ? req.domain.domainName
    : req.scopedDomain
    ? req.scopedDomain.domainName
    : 'ALL_VERIFIED_DOMAINS';

  sendSuccess(
    res,
    {
      authenticated: true,
      keyId: req.apiKey.id,
      keyName: req.apiKey.name,
      keyPrefix: req.apiKey.keyPrefix,
      scopes: req.apiKey.scopes,
      scope,
      scopedDomainId: req.apiKey.domainId,
    },
    'API credentials verified successfully'
  );
};
