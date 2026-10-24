import { Request, Response } from 'express';
import { DomainsService } from './domains.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { CreateDomainInput, ListDomainsQuery, DomainIdParam } from './domains.schema.js';

export const createDomain = async (req: Request, res: Response): Promise<void> => {
  try {
    const input = req.body as CreateDomainInput;
    const domain = await DomainsService.createDomain(input);
    sendSuccess(
      res,
      domain,
      'Domain registered successfully. Please add the DNS records to your DNS provider.',
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to register domain';
    if (message.includes('already registered')) {
      sendError(res, message, 409, [{ path: 'domainName', message }]);
      return;
    }
    sendError(res, message, 500);
  }
};

export const listDomains = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query as unknown as ListDomainsQuery;
    const domains = await DomainsService.listDomains(query);
    sendSuccess(res, domains, 'Domains retrieved successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list domains';
    sendError(res, message, 500);
  }
};

export const getDomainById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as unknown as DomainIdParam;
    const domain = await DomainsService.getDomainById(id);

    if (!domain) {
      sendError(res, 'Domain not found', 404);
      return;
    }

    sendSuccess(res, domain, 'Domain details retrieved successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve domain';
    sendError(res, message, 500);
  }
};

export const verifyDomain = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as unknown as DomainIdParam;
    const result = await DomainsService.verifyDomain(id);

    if (!result) {
      sendError(res, 'Domain not found', 404);
      return;
    }

    const { domain, verification } = result;
    const isVerified = domain.status === 'VERIFIED';
    const message = isVerified
      ? 'Domain successfully verified and ready for sending.'
      : 'DNS verification incomplete. Please review the missing records in dnsRecords.';

    sendSuccess(
      res,
      {
        domain,
        verificationSummary: {
          status: domain.status,
          dkimVerified: verification.dkimVerified,
          spfVerified: verification.spfVerified,
          mxVerified: verification.mxVerified,
          dmarcVerified: verification.dmarcVerified,
        },
      },
      message
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify domain';
    sendError(res, message, 500);
  }
};

export const deleteDomain = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as unknown as DomainIdParam;
    const domain = await DomainsService.deleteDomain(id);

    if (!domain) {
      sendError(res, 'Domain not found', 404);
      return;
    }

    sendSuccess(
      res,
      { id: domain.id, domainName: domain.domainName },
      `Domain "${domain.domainName}" and associated API keys deleted successfully`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete domain';
    sendError(res, message, 500);
  }
};
