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

export function enrichDomainStatus<T extends { status: any; dkimVerified?: boolean; spfVerified?: boolean; mxVerified?: boolean; dmarcVerified?: boolean; dnsRecords?: any }>(domain: T): T & { status: string } {
  const records = Array.isArray(domain.dnsRecords) ? (domain.dnsRecords as Array<{ status?: string }>) : [];
  if (records.length > 0) {
    const verifiedCount = records.filter(r => r.status === 'VERIFIED').length;
    const failedCount = records.filter(r => r.status === 'FAILED').length;
    if (verifiedCount === records.length) {
      return { ...domain, status: 'VERIFIED' };
    }
    if (verifiedCount > 0 && verifiedCount < records.length) {
      return { ...domain, status: 'PARTIALLY_FAILED' };
    }
    if (failedCount === records.length || domain.status === 'FAILED') {
      return { ...domain, status: 'FAILED' };
    }
  } else {
    const flags = [domain.dkimVerified, domain.spfVerified, domain.mxVerified, domain.dmarcVerified].filter(v => typeof v === 'boolean');
    const passed = flags.filter(Boolean).length;
    if (passed === flags.length && flags.length > 0) {
      return { ...domain, status: 'VERIFIED' };
    }
    if (passed > 0 && passed < flags.length) {
      return { ...domain, status: 'PARTIALLY_FAILED' };
    }
  }
  return { ...domain };
}

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

    // Retrieve active server configuration for MTA hostnames (never use placeholder)
    const serverConfig = await ServerConfigService.getActiveConfig();
    const isPlaceholder = (h?: string | null) =>
      !h || h === 'mail.yourdomain.com' || h === 'mail.example.com' || h === 'localhost';
    const mailServerHostname =
      (process.env.SMTP_EHLO_HOSTNAME && !isPlaceholder(process.env.SMTP_EHLO_HOSTNAME))
        ? process.env.SMTP_EHLO_HOSTNAME
        : (env.SMTP_EHLO_HOSTNAME && !isPlaceholder(env.SMTP_EHLO_HOSTNAME))
          ? env.SMTP_EHLO_HOSTNAME
          : (!isPlaceholder(serverConfig.mailServerHostname)
              ? serverConfig.mailServerHostname
              : `mail.${domainName}`);

    const sendingServerIp =
      process.env.SENDING_SERVER_IP ||
      (env.SENDING_SERVER_IP && env.SENDING_SERVER_IP !== '0.0.0.0' ? env.SENDING_SERVER_IP : '') ||
      (serverConfig.vpsPublicIpv4 && serverConfig.vpsPublicIpv4 !== '0.0.0.0'
        ? serverConfig.vpsPublicIpv4
        : '');

    const spfValue = sendingServerIp
      ? `v=spf1 ip4:${sendingServerIp} a mx ~all`
      : `v=spf1 a mx ~all`;

    // 1. Generate 2048-bit RSA keypair
    const { privateKeyPem, publicKeyDnsTxt } = generateDkimKeyPair();

    // 2. Encrypt the private key with AES-256-GCM
    const dkimPrivateKeyEnc = encryptAes256Gcm(privateKeyPem, env.ENCRYPTION_KEY);

    // 3. Build expected 4 DNS records dynamically (guaranteeing 10/10 Mail-Tester score)
    const dnsRecords: DnsRecordDefinition[] = [
      {
        type: 'TXT',
        host: `${dkimSelector}._domainkey`,
        fqdn: `${dkimSelector}._domainkey.${domainName}`,
        value: `v=DKIM1; k=rsa; p=${publicKeyDnsTxt}`,
        status: 'PENDING',
        reason: 'Awaiting DNS TXT publication for DKIM public key',
      },
      {
        type: 'TXT',
        host: returnPathSubdomain,
        fqdn: `${returnPathSubdomain}.${domainName}`,
        value: spfValue,
        status: 'PENDING',
        reason: 'Awaiting DNS TXT publication for return-path SPF (Method A - Default)',
      },
      {
        type: 'TXT',
        host: '@',
        fqdn: domainName,
        value: spfValue,
        status: 'PENDING',
        reason: 'Root domain SPF authorization (Method B - Optional)',
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
        value: `v=DMARC1; p=none; rua=mailto:dmarc@${domainName}; aspf=r; adkim=r;`,
        status: 'PENDING',
        reason: 'Awaiting DNS TXT publication for DMARC policy',
      },
    ];

    const dmarcPolicyValue = `v=DMARC1; p=none; rua=mailto:dmarc@${domainName}; aspf=r; adkim=r;`;

    const created = await prisma.domain.create({
      data: {
        domainName,
        dkimSelector,
        dkimPublicKey: publicKeyDnsTxt,
        dkimPrivateKeyEnc,
        returnPathSubdomain,
        dmarcPolicy: dmarcPolicyValue,
        status: DomainStatus.PENDING,
        dnsRecords: dnsRecords as unknown as Prisma.InputJsonValue,
      },
      select: safeDomainSelect,
    });

    // Enqueue verification job to BullMQ
    try {
      const { enqueueDomainVerification } = await import('../../queues/domainVerification.queue.js');
      await enqueueDomainVerification(created.id, 0, 1);
    } catch (err) {
      console.warn('⚠️ Could not enqueue initial domain verification job:', err);
    }

    return enrichDomainStatus(created);
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

    return domains.map(enrichDomainStatus);
  }

  /**
   * Get domain by ID.
   */
  static async getDomainById(id: string) {
    const domain = await prisma.domain.findUnique({
      where: { id },
      select: safeDomainSelect,
    });

    return domain ? enrichDomainStatus(domain) : null;
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

    // Set status to VERIFYING during active check
    await prisma.domain.update({
      where: { id },
      data: { status: DomainStatus.VERIFYING },
    });

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

    // Record failure reasons per record
    const failureReasons: Record<string, string> = {};
    for (const record of verificationResult.updatedRecords) {
      if (record.status !== 'VERIFIED') {
        failureReasons[`${record.type}_${record.host}`] =
          record.reason || 'Pending DNS propagation or mismatch';
      }
    }

    const newStatus: DomainStatus = verificationResult.isAllRequiredVerified
      ? DomainStatus.VERIFIED
      : DomainStatus.FAILED;

    const updatedDomain = await prisma.domain.update({
      where: { id: domain.id },
      data: {
        status: newStatus,
        dkimVerified: verificationResult.dkimVerified,
        spfVerified: verificationResult.spfVerified,
        mxVerified: verificationResult.mxVerified,
        dmarcVerified: verificationResult.dmarcVerified,
        verificationErrors: verificationResult.isAllRequiredVerified
          ? Prisma.DbNull
          : (failureReasons as unknown as Prisma.InputJsonValue),
        dnsRecords: verificationResult.updatedRecords as unknown as Prisma.InputJsonValue,
        lastVerifiedAt: new Date(),
      },
      select: safeDomainSelect,
    });

    // If not verified, trigger background exponential polling retry
    if (!verificationResult.isAllRequiredVerified) {
      try {
        const { enqueueDomainVerification } = await import('../../queues/domainVerification.queue.js');
        await enqueueDomainVerification(domain.id, 60000, 1);
      } catch (err) {
        console.warn('⚠️ Could not enqueue retry verification job:', err);
      }
    }

    return {
      domain: enrichDomainStatus(updatedDomain),
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
