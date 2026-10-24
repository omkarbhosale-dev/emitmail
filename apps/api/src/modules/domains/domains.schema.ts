import { z } from 'zod';

const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const subdomainRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

export const createDomainSchema = z.object({
  domainName: z
    .string({ required_error: 'Domain name is required' })
    .trim()
    .toLowerCase()
    .regex(domainRegex, 'Invalid domain format. Example: repliq.in or example.com'),
  dkimSelector: z
    .string()
    .trim()
    .regex(subdomainRegex, 'DKIM selector must be alphanumeric (hyphens allowed)')
    .default('esp')
    .optional(),
  returnPathSubdomain: z
    .string()
    .trim()
    .regex(subdomainRegex, 'Return-path subdomain must be alphanumeric (hyphens allowed)')
    .default('send')
    .optional(),
});

export type CreateDomainInput = z.infer<typeof createDomainSchema>;

export const listDomainsQuerySchema = z.object({
  status: z.enum(['PENDING', 'VERIFIED', 'FAILED']).optional(),
  search: z.string().trim().optional(),
});

export type ListDomainsQuery = z.infer<typeof listDomainsQuerySchema>;

export const domainIdParamSchema = z.object({
  id: z.string().uuid('Invalid domain ID format (expected UUID)'),
});

export type DomainIdParam = z.infer<typeof domainIdParamSchema>;
