import { Request, Response } from 'express';
import { prisma } from '../../config/db.js';
import { generateApiKeyPair } from '../../utils/crypto.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { CreateApiKeyInput, ApiKeyIdParam } from './apiKeys.schema.js';

export const createApiKey = async (req: Request, res: Response): Promise<void> => {
  const { name, domainId, expiresAt } = req.body as CreateApiKeyInput;

  // If domainId provided, check that domain exists
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
  }

  const { apiKey, apiSecret, keyPrefix, keyHash, secretHash } = generateApiKeyPair();

  const newKey = await prisma.apiKey.create({
    data: {
      name,
      keyPrefix,
      keyHash,
      secretHash,
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
      keyPrefix: newKey.keyPrefix,
      apiKey,
      apiSecret,
      domainId: newKey.domainId,
      domain: newKey.domain,
      isActive: newKey.isActive,
      expiresAt: newKey.expiresAt,
      createdAt: newKey.createdAt,
      warning:
        'Please copy your API key and secret now. For security purposes, the secret key will never be shown again.',
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

  const scope = req.scopedDomain
    ? req.scopedDomain.domainName
    : 'ALL_VERIFIED_DOMAINS';

  sendSuccess(
    res,
    {
      authenticated: true,
      keyId: req.apiKey.id,
      keyName: req.apiKey.name,
      keyPrefix: req.apiKey.keyPrefix,
      scope,
      scopedDomainId: req.apiKey.domainId,
    },
    'API credentials verified successfully'
  );
};
