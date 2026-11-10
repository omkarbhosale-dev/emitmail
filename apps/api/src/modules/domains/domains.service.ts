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
  inboundEnabled: true,
  inboundMxVerified: true,
  lastVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
};

export function enrichDomainStatus<T extends { domainName?: string; status: any; dkimVerified?: boolean; spfVerified?: boolean; mxVerified?: boolean; dmarcVerified?: boolean; inboundMxVerified?: boolean; dnsRecords?: any }>(domain: T): T & { status: string } {
  const domName = (domain.domainName || '').toLowerCase().trim();
  const rawRecords = Array.isArray(domain.dnsRecords) ? (domain.dnsRecords as Array<any>) : [];

  // Sanitize any legacy placeholder/dummy values in dnsRecords
  const records = rawRecords.map((rec) => {
    let val = rec.value || '';
    if (typeof val === 'string') {
      if (val.includes('0.0.0.0')) {
        val = val.replace(/0\.0\.0\.0/g, '201.18.193.73');
      }
      if (val.includes('mail.yourdomain.com') || val.includes('mail.example.com')) {
        val = domName ? `mail.${domName}` : 'mail.omkarbhosale.dev';
      }
      if (rec.type === 'TXT' && (rec.host === '_dmarc' || (rec.fqdn && rec.fqdn.includes('_dmarc')))) {
        if (val.includes('yourdomain.com') || val.includes('p=none')) {
          val = 'v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;';
        }
      }
    }
    return {
      ...rec,
      value: val,
    };
  });

  // For domain sending verification status, required records are sending records (or all records if group not set)
  const sendingRecords = records.filter(r => r.group !== 'inbound');
  const targetRecords = sendingRecords.length > 0 ? sendingRecords : records;

  let computedStatus = domain.status;
  if (targetRecords.length > 0) {
    const verifiedCount = targetRecords.filter(r => r.status === 'VERIFIED').length;
    const failedCount = targetRecords.filter(r => r.status === 'FAILED').length;
    if (verifiedCount === targetRecords.length) {
      computedStatus = 'VERIFIED';
    } else if (verifiedCount > 0 && verifiedCount < targetRecords.length) {
      computedStatus = 'PARTIALLY_FAILED';
    } else if (failedCount === targetRecords.length || domain.status === 'FAILED') {
      computedStatus = 'FAILED';
    }
  } else {
    const flags = [domain.dkimVerified, domain.spfVerified, domain.mxVerified, domain.dmarcVerified].filter(v => typeof v === 'boolean');
    const passed = flags.filter(Boolean).length;
    if (passed === flags.length && flags.length > 0) {
      computedStatus = 'VERIFIED';
    } else if (passed > 0 && passed < flags.length) {
      computedStatus = 'PARTIALLY_FAILED';
    }
  }
  return {
    ...domain,
    dnsRecords: records,
    status: computedStatus,
  };
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
        : '') ||
      '201.18.193.73';

    const spfValue = (serverConfig.spfIncludeDomain && !isPlaceholder(serverConfig.spfIncludeDomain))
      ? `v=spf1 include:${serverConfig.spfIncludeDomain.toLowerCase()} -all`
      : sendingServerIp
      ? `v=spf1 ip4:${sendingServerIp} a mx -all`
      : `v=spf1 a mx -all`;

    // 1. Generate 2048-bit RSA keypair (UNTOUCHED)
    const { privateKeyPem, publicKeyDnsTxt } = generateDkimKeyPair();

    // 2. Encrypt the private key with AES-256-GCM
    const dkimPrivateKeyEnc = encryptAes256Gcm(privateKeyPem, env.ENCRYPTION_KEY);

    // 3. Build standardized 5 DNS records (Group 1: 4 Sending, Group 2: 1 Inbound)
    const dnsRecords: DnsRecordDefinition[] = [
      // Group 1: Sending & Deliverability Records (Required for Domain Verification)
      {
        group: 'sending',
        type: 'TXT',
        host: `${dkimSelector}._domainkey`,
        fqdn: `${dkimSelector}._domainkey.${domainName}`,
        value: `v=DKIM1; k=rsa; p=${publicKeyDnsTxt}`,
        status: 'PENDING',
        reason: 'Awaiting DNS TXT publication for 2048-bit DKIM public key',
      },
      {
        group: 'sending',
        type: 'TXT',
        host: returnPathSubdomain,
        fqdn: `${returnPathSubdomain}.${domainName}`,
        value: spfValue,
        status: 'PENDING',
        reason: 'Awaiting DNS TXT publication for custom return-path SPF (HardFail -all)',
      },
      {
        group: 'sending',
        type: 'MX',
        host: returnPathSubdomain,
        fqdn: `${returnPathSubdomain}.${domainName}`,
        value: mailServerHostname,
        priority: 10,
        status: 'PENDING',
        reason: 'Awaiting DNS MX publication for custom return-path bounce routing',
      },
      {
        group: 'sending',
        type: 'TXT',
        host: '_dmarc',
        fqdn: `_dmarc.${domainName}`,
        value: `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;`,
        status: 'PENDING',
        reason: 'Awaiting DNS TXT publication for strict DMARC policy (p=reject; sp=reject;)',
      },
      // Group 2: Inbound Email Receiving Record (Keep for Receiving Emails)
      {
        group: 'inbound',
        type: 'MX',
        host: '@',
        fqdn: domainName,
        value: mailServerHostname,
        priority: 10,
        status: 'PENDING',
        reason: 'Root domain MX record for receiving inbound emails and replies',
      },
    ];

    const dmarcPolicyValue = `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;`;

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
    const isPlaceholderHost = (h?: string | null) =>
      !h || h === 'mail.yourdomain.com' || h === 'mail.example.com' || h.includes('yourdomain.com') || h === 'localhost';

    const mailServerHostname = (!isPlaceholderHost(serverConfig.mailServerHostname))
      ? serverConfig.mailServerHostname
      : (process.env.SMTP_EHLO_HOSTNAME && !isPlaceholderHost(process.env.SMTP_EHLO_HOSTNAME))
      ? process.env.SMTP_EHLO_HOSTNAME
      : `mail.${domain.domainName}`;

    const sendingServerIp = (serverConfig.vpsPublicIpv4 && serverConfig.vpsPublicIpv4 !== '0.0.0.0')
      ? serverConfig.vpsPublicIpv4
      : (process.env.SENDING_SERVER_IP && process.env.SENDING_SERVER_IP !== '0.0.0.0')
      ? process.env.SENDING_SERVER_IP
      : '201.18.193.73';

    const verificationResult = await verifyDomainDns({
      domainName: domain.domainName,
      dkimSelector: domain.dkimSelector,
      dkimPublicKey: domain.dkimPublicKey,
      returnPathSubdomain: domain.returnPathSubdomain,
      mailServerHostname,
      spfIncludeDomain: serverConfig.spfIncludeDomain,
      sendingServerIp,
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
        inboundMxVerified: verificationResult.inboundMxVerified,
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
      verificationSummary: {
        status: newStatus,
        dkimVerified: verificationResult.dkimVerified,
        spfVerified: verificationResult.spfVerified,
        mxVerified: verificationResult.mxVerified,
        dmarcVerified: verificationResult.dmarcVerified,
        inboundMxVerified: verificationResult.inboundMxVerified,
        isAllRequiredVerified: verificationResult.isAllRequiredVerified,
      },
    };
  }

  /**
   * Rotates and upgrades domain DKIM key to a brand-new 2048-bit RSA keypair.
   * Resets dkimVerified = false and status = PENDING so the user can publish the new record and re-verify.
   */
  static async rotateDkim(id: string) {
    const existing = await prisma.domain.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    // Generate brand-new 2048-bit RSA keypair
    const { privateKeyPem, publicKeyDnsTxt } = generateDkimKeyPair();
    const dkimPrivateKeyEnc = encryptAes256Gcm(privateKeyPem, env.ENCRYPTION_KEY);

    const dkimHost = `${existing.dkimSelector}._domainkey`;
    const dkimFqdn = `${existing.dkimSelector}._domainkey.${existing.domainName}`;
    const newDkimValue = `v=DKIM1; k=rsa; p=${publicKeyDnsTxt}`;

    // Update dnsRecords JSON array
    let currentDnsRecords: DnsRecordDefinition[] = [];
    if (Array.isArray(existing.dnsRecords)) {
      currentDnsRecords = existing.dnsRecords as unknown as DnsRecordDefinition[];
    }

    let foundDkim = false;
    const updatedDnsRecords = currentDnsRecords.map((rec) => {
      if (rec.host === dkimHost || rec.fqdn === dkimFqdn || (rec.type === 'TXT' && rec.host.includes('_domainkey'))) {
        foundDkim = true;
        return {
          ...rec,
          group: 'sending' as const,
          value: newDkimValue,
          status: 'PENDING' as const,
          reason: 'Awaiting DNS TXT publication for newly generated 2048-bit DKIM key',
          lastCheckedAt: new Date().toISOString(),
        };
      }
      return rec;
    });

    if (!foundDkim) {
      updatedDnsRecords.unshift({
        group: 'sending',
        type: 'TXT',
        host: dkimHost,
        fqdn: dkimFqdn,
        value: newDkimValue,
        status: 'PENDING',
        reason: 'Awaiting DNS TXT publication for newly generated 2048-bit DKIM key',
        lastCheckedAt: new Date().toISOString(),
      });
    }

    const updated = await prisma.domain.update({
      where: { id },
      data: {
        dkimPublicKey: publicKeyDnsTxt,
        dkimPrivateKeyEnc,
        dkimVerified: false,
        status: DomainStatus.PENDING,
        dnsRecords: updatedDnsRecords as unknown as Prisma.InputJsonValue,
      },
      select: safeDomainSelect,
    });

    return {
      domain: enrichDomainStatus(updated),
      dnsRecord: {
        type: 'TXT' as const,
        host: dkimHost,
        fqdn: dkimFqdn,
        value: newDkimValue,
        keyBits: 2048,
      },
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
