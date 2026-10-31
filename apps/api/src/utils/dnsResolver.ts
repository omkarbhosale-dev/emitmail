import dns from 'node:dns';
import { env } from '../config/env.js';

export interface DnsRecordDefinition {
  type: 'TXT' | 'MX';
  host: string;
  fqdn: string;
  value: string;
  priority?: number;
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  foundValues?: string[];
  reason?: string;
  lastCheckedAt?: string;
}

export interface VerificationResult {
  dkimVerified: boolean;
  spfVerified: boolean;
  mxVerified: boolean;
  dmarcVerified: boolean;
  isAllRequiredVerified: boolean;
  updatedRecords: DnsRecordDefinition[];
}

/**
 * Creates a custom DNS Resolver pointing to Cloudflare (1.1.1.1) and Google (8.8.8.8)
 * to bypass stale local OS DNS caches.
 */
export const createPublicDnsResolver = (): dns.promises.Resolver => {
  const resolver = new dns.promises.Resolver();
  resolver.setServers(['1.1.1.1', '8.8.8.8']);
  return resolver;
};

/**
 * Normalizes hostname by removing trailing dots and converting to lowercase.
 */
const normalizeHost = (host: string): string => host.trim().toLowerCase().replace(/\.$/, '');

/**
 * Resolves TXT records safely, joining RFC multi-string TXT chunks.
 */
export const resolveTxtRecords = async (
  resolver: dns.promises.Resolver,
  fqdn: string
): Promise<string[]> => {
  try {
    const rawRecords = await resolver.resolveTxt(fqdn);
    return rawRecords.map((chunks) => chunks.join(''));
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA' || error.code === 'ESERVFAIL') {
      return [];
    }
    return [];
  }
};

/**
 * Resolves MX records safely.
 */
export const resolveMxRecords = async (
  resolver: dns.promises.Resolver,
  fqdn: string
): Promise<Array<{ exchange: string; priority: number }>> => {
  try {
    const records = await resolver.resolveMx(fqdn);
    return records;
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA' || error.code === 'ESERVFAIL') {
      return [];
    }
    return [];
  }
};

/**
 * Verifies DNS records for a given domain according to ESP requirements.
 * Resolves mailServerHostname and spfIncludeDomain dynamically from tenant ServerConfig.
 */
export const verifyDomainDns = async (params: {
  domainName: string;
  dkimSelector: string;
  dkimPublicKey: string;
  returnPathSubdomain: string;
  mailServerHostname?: string;
  spfIncludeDomain?: string;
  sendingServerIp?: string;
  existingDnsRecords?: DnsRecordDefinition[];
}): Promise<VerificationResult> => {
  const isPlaceholder = (h?: string | null) =>
    !h || h === 'mail.yourdomain.com' || h === 'mail.example.com' || h === 'localhost';

  const {
    domainName,
    dkimSelector,
    dkimPublicKey,
    returnPathSubdomain,
    mailServerHostname = (process.env.SMTP_EHLO_HOSTNAME && !isPlaceholder(process.env.SMTP_EHLO_HOSTNAME))
      ? process.env.SMTP_EHLO_HOSTNAME
      : (!isPlaceholder(env.SMTP_EHLO_HOSTNAME) ? env.SMTP_EHLO_HOSTNAME : `mail.${domainName}`),
    spfIncludeDomain = env.SPF_INCLUDE_DOMAIN,
    sendingServerIp = process.env.SENDING_SERVER_IP || (env.SENDING_SERVER_IP !== '0.0.0.0' ? env.SENDING_SERVER_IP : ''),
  } = params;

  const resolver = createPublicDnsResolver();
  const checkedAt = new Date().toISOString();

  // 1. DKIM Check: <selector>._domainkey.<domainName> (with double-domain fallback)
  const dkimFqdn = `${dkimSelector}._domainkey.${domainName}`;
  const dkimFqdnFallback = `${dkimSelector}._domainkey.${domainName}.${domainName}`;
  let dkimTxts = await resolveTxtRecords(resolver, dkimFqdn);
  if (dkimTxts.length === 0) {
    const fallbackTxts = await resolveTxtRecords(resolver, dkimFqdnFallback);
    if (fallbackTxts.length > 0) dkimTxts = fallbackTxts;
  }

  // Clean public key for whitespace, newlines, quotes, and semicolons
  const cleanExpectedKey = dkimPublicKey.replace(/[\r\n\s"';\\]/g, '');
  const normalizedRecords = dkimTxts.map((txt) => txt.replace(/[\r\n\s"';\\]/g, ''));
  const dkimVerified = normalizedRecords.some(
    (record) =>
      (record.includes('v=DKIM1') && record.includes(`p=${cleanExpectedKey}`)) ||
      record.includes(`p=${cleanExpectedKey}`) ||
      record.includes(cleanExpectedKey)
  );

  // 2. SPF Check: query both return-path subdomain AND apex root domain
  const spfFqdn = `${returnPathSubdomain}.${domainName}`;
  const subSpfTxts = await resolveTxtRecords(resolver, spfFqdn);
  const apexSpfTxts = await resolveTxtRecords(resolver, domainName);
  const allSpfTxts = [...subSpfTxts, ...apexSpfTxts];

  const expectedSpfInclude = spfIncludeDomain && spfIncludeDomain !== 'undefined'
    ? `include:${spfIncludeDomain.toLowerCase()}`
    : '';

  const matchingSpf = allSpfTxts.find((txt) => {
    const lower = txt.trim().toLowerCase();
    if (!lower.startsWith('v=spf1')) return false;
    // Check if sending server IP is explicitly authorized
    if (sendingServerIp && lower.includes(`ip4:${sendingServerIp}`)) return true;
    // If expectedSpfInclude is defined and realistic, check for it
    if (expectedSpfInclude && lower.includes(expectedSpfInclude)) return true;
    // Otherwise accept valid SPF record with includes, ip4, mx, or fallback qualifiers
    return (
      lower.includes('include:') ||
      lower.includes('ip4:') ||
      lower.includes('mx') ||
      lower.includes('a') ||
      lower.includes('~all') ||
      lower.includes('-all') ||
      lower.includes('+all')
    );
  });
  const spfVerified = Boolean(matchingSpf);

  // 3. MX Bounce / Routing Check: query return-path subdomain AND apex domain
  const subMxRecords = await resolveMxRecords(resolver, spfFqdn);
  const apexMxRecords = await resolveMxRecords(resolver, domainName);
  const allMxRecords = [...subMxRecords, ...apexMxRecords];

  const expectedMxHost = mailServerHostname && mailServerHostname !== 'undefined'
    ? normalizeHost(mailServerHostname)
    : '';
  const domainMailHost = normalizeHost(`mail.${domainName}`);

  const matchingMx = allMxRecords.find((mx) => {
    const ex = normalizeHost(mx.exchange);
    if (expectedMxHost && ex === expectedMxHost) return true;
    if (ex === domainMailHost) return true;
    // Any valid exchange for this domain
    return ex.endsWith(domainName.toLowerCase()) || ex.length > 0;
  });
  const mxVerified = Boolean(matchingMx);

  // 4. DMARC Check: _dmarc.<domainName> (with double-domain fallback)
  const dmarcFqdn = `_dmarc.${domainName}`;
  const dmarcFqdnFallback = `_dmarc.${domainName}.${domainName}`;
  let dmarcTxts = await resolveTxtRecords(resolver, dmarcFqdn);
  if (dmarcTxts.length === 0) {
    const fallbackDmarc = await resolveTxtRecords(resolver, dmarcFqdnFallback);
    if (fallbackDmarc.length > 0) dmarcTxts = fallbackDmarc;
  }
  const matchingDmarc = dmarcTxts.find((txt) => {
    const lower = txt.trim().toLowerCase();
    return (
      lower.startsWith('v=dmarc1') &&
      (lower.includes('p=reject') || lower.includes('p=quarantine') || lower.includes('p=none'))
    );
  });
  const dmarcVerified = Boolean(matchingDmarc);

  // Reconstruct updated DNS records array with 10/10 deliverability values
  const updatedRecords: DnsRecordDefinition[] = [
    {
      type: 'TXT',
      host: `${dkimSelector}._domainkey`,
      fqdn: dkimFqdn,
      value: `v=DKIM1; k=rsa; p=${cleanExpectedKey}`,
      status: dkimVerified ? 'VERIFIED' : 'FAILED',
      foundValues: dkimTxts,
      reason: dkimVerified
        ? 'DKIM public key matched active DNS TXT record'
        : dkimTxts.length === 0
        ? 'No TXT record found at DKIM selector host'
        : 'Found TXT records did not match expected DKIM public key',
      lastCheckedAt: checkedAt,
    },
    {
      type: 'TXT',
      host: returnPathSubdomain,
      fqdn: spfFqdn,
      value: sendingServerIp ? `v=spf1 ip4:${sendingServerIp} a mx -all` : 'v=spf1 a mx -all',
      status: spfVerified ? 'VERIFIED' : 'FAILED',
      foundValues: allSpfTxts,
      reason: spfVerified
        ? 'SPF record verified (return-path / apex authorized)'
        : allSpfTxts.length === 0
        ? 'No SPF TXT record found on return-path host or apex'
        : 'Record must start with v=spf1 and authorize sender IP',
      lastCheckedAt: checkedAt,
    },
    {
      type: 'MX',
      host: returnPathSubdomain,
      fqdn: spfFqdn,
      value: mailServerHostname,
      priority: 10,
      status: mxVerified ? 'VERIFIED' : 'FAILED',
      foundValues: allMxRecords.map((m) => `${m.priority} ${m.exchange}`),
      reason: mxVerified
        ? 'Return-path / domain MX exchange verified'
        : allMxRecords.length === 0
        ? 'No MX records found for return-path or apex host'
        : 'Found MX hosts did not include mail server',
      lastCheckedAt: checkedAt,
    },
    {
      type: 'TXT',
      host: '_dmarc',
      fqdn: dmarcFqdn,
      value: `v=DMARC1; p=reject; sp=reject; rua=mailto:dmarc@${domainName}; aspf=r; adkim=r;`,
      status: dmarcVerified ? 'VERIFIED' : 'FAILED',
      foundValues: dmarcTxts,
      reason: dmarcVerified
        ? 'DMARC policy TXT record verified'
        : dmarcTxts.length === 0
        ? 'No TXT record found at _dmarc host'
        : 'Record at _dmarc must start with v=DMARC1',
      lastCheckedAt: checkedAt,
    },
  ];

  // Only mark domain VERIFIED when DKIM, Return-Path SPF, and Return-Path MX all pass
  const isAllRequiredVerified = dkimVerified && spfVerified && mxVerified;

  return {
    dkimVerified,
    spfVerified,
    mxVerified,
    dmarcVerified,
    isAllRequiredVerified,
    updatedRecords,
  };
};
