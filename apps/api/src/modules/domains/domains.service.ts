import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import {
  generateDkimKeyPair,
  encryptAes256Gcm,
} from '../../utils/crypto.js';
import {
  verifyDomainDns,
  DnsRecordDefinition,
} from '../../utils/dnsResolver.js';
import { ServerConfigService } from '../server-config/serverConfig.service.js';
import { DomainStatus, Prisma } from '@prisma/client';
import { CreateDomainInput, ListDomainsQuery } from './domains.schema.js';

// Select fields that safely omit dkimPrivateKeyEnc
export const safeDomainSelect = {
  id: true,
  domainName: true,
  status: true,
  dkimSelector: true,
  dkimPublicKey: true,
  returnPathSubdomain: true,
  dmarcPolicy: true,
  dnsRecords: true,
  dkimVerified: true,
  spfVerified: true,
  mxVerified: true,
  dmarcVerified: true,
  lastVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
};

export class DomainsService {
  /**
   * Register a new domain, generate DKIM RSA keys, and initialize expected DNS records
   * using the tenant's dynamic ServerConfig.
   */
  static async createDomain(input: CreateDomainInput) {
    const domainName = input.domainName.toLowerCase().trim();
    const dkimSelector = (input.dkimSelector || 'esp').trim();
    const returnPathSubdomain = (input.returnPathSubdomain || 'send').trim();

    // Check if domain already registered
    const existing = await prisma.domain.findUnique({
      where: { domainName },
    });
    if (existing) {
      throw new Error(`Domain "${domainName}" is already registered`);
    }

    // Retrieve active server configuration for MTA hostnames
    const serverConfig = await ServerConfigService.getActiveConfig();
    const mailServerHostname = serverConfig.mailServerHostname;
    const spfIncludeDomain = serverConfig.spfIncludeDomain;

    // 1. Generate 2048-bit RSA keypair
    const { privateKeyPem, publicKeyDnsTxt } = generateDkimKeyPair();

    // 2. Encrypt the private key with AES-256-GCM
    const dkimPrivateKeyEnc = encryptAes256Gcm(privateKeyPem, env.ENCRYPTION_KEY);

    // 3. Build expected 4 DNS records dynamically
    const dnsRecords: DnsRecordDefinition[] = [
      {
        type: 'TXT',
        host: `${dkimSelector}._domainkey`,
        fqdn: `${dkimSelector}._domainkey.${domainName}`,
        value: `v=DKIM1; k=rsa; p=${publicKeyDnsTxt}`,
        status: 'PENDING',
        reason: 'Awaiting DNS TXT publication',
      },
      {
        type: 'TXT',
        host: returnPathSubdomain,
        fqdn: `${returnPathSubdomain}.${domainName}`,
        value: `v=spf1 include:${spfIncludeDomain} ~all`,
        status: 'PENDING',
        reason: 'Awaiting DNS TXT publication for return-path SPF',
      },
      {
        type: 'MX',
        host: returnPathSubdomain,
        fqdn: `${returnPathSubdomain}.${domainName}`,
        value: mailServerHostname,
        priority: 10,
        status: 'PENDING',
        reason: 'Awaiting DNS MX publication for bounce routing',
      },
      {
        type: 'TXT',
        host: '_dmarc',
        fqdn: `_dmarc.${domainName}`,
        value: 'v=DMARC1; p=quarantine; pct=100;',
        status: 'PENDING',
        reason: 'Awaiting DNS TXT publication for DMARC policy',
      },
    ];

    const created = await prisma.domain.create({
      data: {
        domainName,
        dkimSelector,
        dkimPublicKey: publicKeyDnsTxt,
        dkimPrivateKeyEnc,
        returnPathSubdomain,
        dmarcPolicy: 'v=DMARC1; p=quarantine; pct=100;',
        status: DomainStatus.PENDING,
        dnsRecords: dnsRecords as unknown as Prisma.InputJsonValue,
      },
      select: safeDomainSelect,
    });

    return created;
  }

  /**
   * List all registered domains with optional status and search filters.
   */
  static async listDomains(query: ListDomainsQuery) {
    const where: Prisma.DomainWhereInput = {};

    if (query.status) {
      where.status = query.status as DomainStatus;
    }

    if (query.search) {
      where.domainName = {
        contains: query.search.toLowerCase().trim(),
        mode: 'insensitive',
      };
    }

    const domains = await prisma.domain.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: safeDomainSelect,
    });

    return domains;
  }

  /**
   * Get domain by ID.
   */
  static async getDomainById(id: string) {
    const domain = await prisma.domain.findUnique({
      where: { id },
      select: safeDomainSelect,
    });

    return domain;
  }

  /**
   * Run live DNS resolution against Cloudflare/Google DNS to verify records.
   * Dynamically loads tenant ServerConfig hostnames.
   */
  static async verifyDomain(id: string) {
    const domain = await prisma.domain.findUnique({
      where: { id },
    });

    if (!domain) {
      return null;
    }

    const serverConfig = await ServerConfigService.getActiveConfig();

    const verificationResult = await verifyDomainDns({
      domainName: domain.domainName,
      dkimSelector: domain.dkimSelector,
      dkimPublicKey: domain.dkimPublicKey,
      returnPathSubdomain: domain.returnPathSubdomain,
      mailServerHostname: serverConfig.mailServerHostname,
      spfIncludeDomain: serverConfig.spfIncludeDomain,
      existingDnsRecords: domain.dnsRecords as unknown as DnsRecordDefinition[],
    });

    // Determine overall status
    let newStatus: DomainStatus = DomainStatus.PENDING;
    if (verificationResult.isAllRequiredVerified) {
      newStatus = DomainStatus.VERIFIED;
    } else {
      newStatus = DomainStatus.FAILED;
    }

    const updatedDomain = await prisma.domain.update({
      where: { id: domain.id },
      data: {
        status: newStatus,
        dkimVerified: verificationResult.dkimVerified,
        spfVerified: verificationResult.spfVerified,
        mxVerified: verificationResult.mxVerified,
        dmarcVerified: verificationResult.dmarcVerified,
        dnsRecords: verificationResult.updatedRecords as unknown as Prisma.InputJsonValue,
        lastVerifiedAt: new Date(),
      },
      select: safeDomainSelect,
    });

    return {
      domain: updatedDomain,
      verification: verificationResult,
    };
  }

  /**
   * Delete domain by ID (cascades API keys).
   */
  static async deleteDomain(id: string) {
    const domain = await prisma.domain.findUnique({
      where: { id },
    });

    if (!domain) {
      return null;
    }

    await prisma.domain.delete({
      where: { id },
    });

    return domain;
  }
}
