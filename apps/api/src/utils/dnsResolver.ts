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
  existingDnsRecords?: DnsRecordDefinition[];
}): Promise<VerificationResult> => {
  const {
    domainName,
    dkimSelector,
    dkimPublicKey,
    returnPathSubdomain,
    mailServerHostname = env.MAIL_SERVER_HOSTNAME,
    spfIncludeDomain = env.SPF_INCLUDE_DOMAIN,
  } = params;

  const resolver = createPublicDnsResolver();
  const checkedAt = new Date().toISOString();

  // 1. DKIM Check: <selector>._domainkey.<domainName>
  const dkimFqdn = `${dkimSelector}._domainkey.${domainName}`;
  const dkimTxts = await resolveTxtRecords(resolver, dkimFqdn);
  const cleanExpectedKey = dkimPublicKey.replace(/[\r\n\s]/g, '');
  const matchingDkim = dkimTxts.find((txt) => {
    const normalized = txt.replace(/[\r\n\s]/g, '');
    return normalized.includes(`p=${cleanExpectedKey}`);
  });
  const dkimVerified = Boolean(matchingDkim);

  // 2. SPF Return-Path Check: <returnPathSubdomain>.<domainName>
  const spfFqdn = `${returnPathSubdomain}.${domainName}`;
  const spfTxts = await resolveTxtRecords(resolver, spfFqdn);
  const expectedSpfInclude = `include:${spfIncludeDomain.toLowerCase()}`;
  const matchingSpf = spfTxts.find((txt) => {
    const lower = txt.toLowerCase();
    return lower.startsWith('v=spf1') && lower.includes(expectedSpfInclude);
  });
  const spfVerified = Boolean(matchingSpf);

  // 3. MX Bounce Routing Check: <returnPathSubdomain>.<domainName>
  const mxRecords = await resolveMxRecords(resolver, spfFqdn);
  const expectedMxHost = normalizeHost(mailServerHostname);
  const matchingMx = mxRecords.find(
    (mx) => normalizeHost(mx.exchange) === expectedMxHost
  );
  const mxVerified = Boolean(matchingMx);

  // 4. DMARC Check: _dmarc.<domainName>
  const dmarcFqdn = `_dmarc.${domainName}`;
  const dmarcTxts = await resolveTxtRecords(resolver, dmarcFqdn);
  const matchingDmarc = dmarcTxts.find((txt) =>
    txt.trim().toLowerCase().startsWith('v=dmarc1')
  );
  const dmarcVerified = Boolean(matchingDmarc);

  // Reconstruct updated DNS records array
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
      value: `v=spf1 include:${spfIncludeDomain} ~all`,
      status: spfVerified ? 'VERIFIED' : 'FAILED',
      foundValues: spfTxts,
      reason: spfVerified
        ? 'Return-path SPF record matched with include directive'
        : spfTxts.length === 0
        ? 'No TXT record found at return-path host'
        : `Record must start with v=spf1 and include ${spfIncludeDomain}`,
      lastCheckedAt: checkedAt,
    },
    {
      type: 'MX',
      host: returnPathSubdomain,
      fqdn: spfFqdn,
      value: mailServerHostname,
      priority: 10,
      status: mxVerified ? 'VERIFIED' : 'FAILED',
      foundValues: mxRecords.map((m) => `${m.priority} ${m.exchange}`),
      reason: mxVerified
        ? 'Return-path MX exchange matches mail server host'
        : mxRecords.length === 0
        ? 'No MX records found for return-path host'
        : `Found MX hosts did not include ${mailServerHostname}`,
      lastCheckedAt: checkedAt,
    },
    {
      type: 'TXT',
      host: '_dmarc',
      fqdn: dmarcFqdn,
      value: 'v=DMARC1; p=quarantine; pct=100;',
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
