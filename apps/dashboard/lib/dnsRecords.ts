import { ApiDomain, DnsRecordItem } from "@/types";

export interface StandardDnsRecord {
  id: string; // e.g. "dkim", "spf-send", "mx-send", "dmarc", "mx-inbound"
  group: "sending" | "inbound";
  type: "TXT" | "MX";
  host: string;
  fqdn: string;
  value: string;
  priority?: number;
  status: "VERIFIED" | "PENDING" | "FAILED";
  title: string;
  purpose: string;
  badge?: string;
  reason?: string;
  foundValues?: string[];
  lastCheckedAt?: string;
}

export interface GetDnsRecordsParams {
  domain?: Partial<ApiDomain> | null;
  domainName?: string;
  vpsIp?: string;
  mailHostname?: string;
  spfIncludeDomain?: string;
}

export interface StandardDnsResult {
  domainName: string;
  sendingRecords: StandardDnsRecord[];
  inboundRecords: StandardDnsRecord[];
  allRecords: StandardDnsRecord[];
  isAllSendingVerified: boolean;
  isAllVerified: boolean;
  sendingVerifiedCount: number;
}

/**
 * Single source of truth for DNS record definitions across EmitMail.
 * Used by both Onboarding flow and Domain Details page.
 */
export function getStandardDnsRecords(params: GetDnsRecordsParams): StandardDnsResult {
  const { domain, vpsIp, mailHostname, spfIncludeDomain } = params;

  const rawDomainName = domain?.domainName || params.domainName || "";
  const domainName = rawDomainName.trim().toLowerCase();
  const dkimSelector = (domain?.dkimSelector || "esp").trim();
  const returnPathSubdomain = (domain?.returnPathSubdomain || "send").trim();

  // Resolve mail server EHLO hostname
  const isPlaceholder = (h?: string | null) =>
    !h ||
    h.includes("yourdomain.com") ||
    h.includes("example.com") ||
    h === "localhost";

  const isDummyIp = (ip?: string | null) =>
    !ip || ip === "0.0.0.0" || ip === "127.0.0.1";

  const isDummyValue = (val?: string | null) =>
    !val ||
    val.includes("0.0.0.0") ||
    val.includes("yourdomain.com") ||
    val.includes("example.com");

  const resolvedIp = !isDummyIp(vpsIp)
    ? vpsIp!.trim()
    : "201.18.193.73";

  const resolvedMailHost =
    mailHostname && !isPlaceholder(mailHostname)
      ? mailHostname.trim().toLowerCase()
      : domainName
      ? `mail.${domainName}`
      : "mail.omkarbhosale.dev";

  // Enforce strict SPF with HardFail (-all)
  const resolvedSpfValue =
    spfIncludeDomain && !isPlaceholder(spfIncludeDomain)
      ? `v=spf1 include:${spfIncludeDomain.trim().toLowerCase()} -all`
      : `v=spf1 ip4:${resolvedIp} a mx -all`;

  // Enforce strict DMARC policy (p=reject;)
  const resolvedDmarcValue = "v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;";

  // Extract DKIM public key
  const dkimPublicKey = domain?.dkimPublicKey || "";
  const dkimValue = dkimPublicKey
    ? `v=DKIM1; k=rsa; p=${dkimPublicKey}`
    : "v=DKIM1; k=rsa; p=...";

  const rawDnsRecords: DnsRecordItem[] = Array.isArray(domain?.dnsRecords)
    ? domain.dnsRecords
    : [];

  // Match existing DNS records from backend verification
  const findRecord = (
    predicate: (r: DnsRecordItem) => boolean
  ): DnsRecordItem | undefined => rawDnsRecords.find(predicate);

  // 1. DKIM Record
  const dkimItem = findRecord(
    (r) =>
      r.type === "TXT" &&
      (r.host.includes("_domainkey") || r.fqdn.includes("_domainkey"))
  );
  const dkimStatus: "VERIFIED" | "PENDING" | "FAILED" =
    dkimItem?.status || (domain?.dkimVerified ? "VERIFIED" : "PENDING");

  // 2. Return-Path SPF Record
  const spfItem = findRecord(
    (r) =>
      r.type === "TXT" &&
      (r.host === returnPathSubdomain ||
        r.fqdn.startsWith(`${returnPathSubdomain}.`))
  );
  const spfStatus: "VERIFIED" | "PENDING" | "FAILED" =
    spfItem?.status || (domain?.spfVerified ? "VERIFIED" : "PENDING");

  // 3. Return-Path MX Record (Bounce Routing)
  const mxSendItem = findRecord(
    (r) =>
      r.type === "MX" &&
      (r.host === returnPathSubdomain ||
        r.fqdn.startsWith(`${returnPathSubdomain}.`))
  );
  const mxSendStatus: "VERIFIED" | "PENDING" | "FAILED" =
    mxSendItem?.status || (domain?.mxVerified ? "VERIFIED" : "PENDING");

  // 4. DMARC Record
  const dmarcItem = findRecord(
    (r) =>
      r.type === "TXT" &&
      (r.host.startsWith("_dmarc") || r.fqdn.includes("_dmarc"))
  );
  const dmarcStatus: "VERIFIED" | "PENDING" | "FAILED" =
    dmarcItem?.status || (domain?.dmarcVerified ? "VERIFIED" : "PENDING");

  // 5. Inbound MX Record (Root @)
  const mxInboundItem = findRecord(
    (r) =>
      r.type === "MX" &&
      (r.group === "inbound" || r.host === "@" || r.host === domainName)
  );
  const mxInboundStatus: "VERIFIED" | "PENDING" | "FAILED" =
    mxInboundItem?.status ||
    (domain?.inboundMxVerified ? "VERIFIED" : "PENDING");

  const sanitizeDnsValue = (rawVal: string | undefined, fallback: string): string => {
    if (!rawVal || typeof rawVal !== "string") return fallback;
    let cleaned = rawVal;
    if (cleaned.includes("0.0.0.0")) {
      cleaned = cleaned.replace(/0\.0\.0\.0/g, resolvedIp);
    }
    if (cleaned.includes("mail.yourdomain.com") || cleaned.includes("mail.example.com")) {
      cleaned = cleaned.replace(/mail\.(yourdomain\.com|example\.com)/g, resolvedMailHost);
    }
    if (cleaned.includes("yourdomain.com")) {
      cleaned = cleaned.replace(/yourdomain\.com/g, domainName || "omkarbhosale.dev");
    }
    return isDummyValue(cleaned) ? fallback : cleaned;
  };

  // Clean, real values (sanitized of any dummy / placeholder artifacts)
  const finalDkimValue = sanitizeDnsValue(dkimItem?.value, dkimValue);

  const finalSpfValue = sanitizeDnsValue(
    spfItem?.value && spfItem.value.endsWith("-all") ? spfItem.value : undefined,
    resolvedSpfValue
  );

  const finalMxSendValue = sanitizeDnsValue(mxSendItem?.value, resolvedMailHost);

  const finalDmarcValue = sanitizeDnsValue(
    dmarcItem?.value && dmarcItem.value.includes("p=reject") ? dmarcItem.value : undefined,
    resolvedDmarcValue
  );

  const finalMxInboundValue = sanitizeDnsValue(mxInboundItem?.value, resolvedMailHost);

  // Group 1: Sending & Deliverability Records (4 records)
  const sendingRecords: StandardDnsRecord[] = [
    {
      id: "dkim",
      group: "sending",
      type: "TXT",
      host: `${dkimSelector}._domainkey`,
      fqdn: domainName ? `${dkimSelector}._domainkey.${domainName}` : `${dkimSelector}._domainkey`,
      value: finalDkimValue,
      status: dkimStatus,
      title: "DKIM Signature",
      purpose: "Cryptographic sender identity verification",
      badge: "2048-bit RSA",
      reason: dkimItem?.reason,
      foundValues: dkimItem?.foundValues,
      lastCheckedAt: dkimItem?.lastCheckedAt,
    },
    {
      id: "spf-send",
      group: "sending",
      type: "TXT",
      host: returnPathSubdomain,
      fqdn: domainName ? `${returnPathSubdomain}.${domainName}` : returnPathSubdomain,
      value: finalSpfValue,
      status: spfStatus,
      title: "Return-Path SPF",
      purpose: "SPF authorization for return-path mail envelopes",
      badge: "HardFail -all",
      reason: spfItem?.reason,
      foundValues: spfItem?.foundValues,
      lastCheckedAt: spfItem?.lastCheckedAt,
    },
    {
      id: "mx-send",
      group: "sending",
      type: "MX",
      priority: 10,
      host: returnPathSubdomain,
      fqdn: domainName ? `${returnPathSubdomain}.${domainName}` : returnPathSubdomain,
      value: finalMxSendValue,
      status: mxSendStatus,
      title: "Return-Path MX",
      purpose: "Bounce, feedback loop, and asynchronous error routing",
      badge: "Priority 10",
      reason: mxSendItem?.reason,
      foundValues: mxSendItem?.foundValues,
      lastCheckedAt: mxSendItem?.lastCheckedAt,
    },
    {
      id: "dmarc",
      group: "sending",
      type: "TXT",
      host: "_dmarc",
      fqdn: domainName ? `_dmarc.${domainName}` : "_dmarc",
      value: finalDmarcValue,
      status: dmarcStatus,
      title: "DMARC Policy",
      purpose: "Enforces reject policy for spoofed and unauthorized mail",
      badge: "Strict p=reject",
      reason: dmarcItem?.reason,
      foundValues: dmarcItem?.foundValues,
      lastCheckedAt: dmarcItem?.lastCheckedAt,
    },
  ];

  // Group 2: Inbound Email Receiving Record (1 record)
  const inboundRecords: StandardDnsRecord[] = [
    {
      id: "mx-inbound",
      group: "inbound",
      type: "MX",
      priority: 10,
      host: "@",
      fqdn: domainName || "@",
      value: finalMxInboundValue,
      status: mxInboundStatus,
      title: "Inbound Root MX",
      purpose: "Routes incoming emails and direct replies to your EmitMail mailboxes",
      badge: "Priority 10",
      reason: mxInboundItem?.reason,
      foundValues: mxInboundItem?.foundValues,
      lastCheckedAt: mxInboundItem?.lastCheckedAt,
    },
  ];

  const allRecords = [...sendingRecords, ...inboundRecords];
  const sendingVerifiedCount = sendingRecords.filter((r) => r.status === "VERIFIED").length;
  const isAllSendingVerified = sendingVerifiedCount === sendingRecords.length;
  const isAllVerified = allRecords.every((r) => r.status === "VERIFIED");

  return {
    domainName,
    sendingRecords,
    inboundRecords,
    allRecords,
    isAllSendingVerified,
    isAllVerified,
    sendingVerifiedCount,
  };
}

