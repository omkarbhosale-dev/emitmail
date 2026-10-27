export type NavTab = "emails" | "inbox" | "analytics" | "domains" | "api-keys" | "webhooks" | "settings" | "home";

export interface DnsRecordItem {
  fqdn: string;
  host: string;
  type: "TXT" | "MX" | "CNAME" | "A";
  value: string;
  status: "VERIFIED" | "PENDING" | "FAILED";
  priority?: number;
  reason?: string;
  foundValues?: string[];
  lastCheckedAt?: string;
}

export interface ApiDomain {
  id: string;
  domainName: string;
  status: "PENDING" | "VERIFIED" | "PARTIALLY_FAILED" | "FAILED" | "VERIFYING";
  dkimSelector: string;
  dkimPublicKey: string;
  returnPathSubdomain: string;
  dmarcPolicy: string;
  dnsRecords: DnsRecordItem[];
  dkimVerified: boolean;
  spfVerified: boolean;
  mxVerified: boolean;
  dmarcVerified: boolean;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainItem {
  id: string;
  name: string;
  status: "verified" | "pending" | "failed";
  dkimStatus: "verified" | "pending" | "failed";
  spfStatus: "verified" | "pending" | "failed";
  region: string;
  createdAt: string;
  dkimKey: string;
  spfRecord: string;
  mxRecord: string;
}

export interface ProcessedEmailItem {
  id: string;
  recipient: string;
  sender: string;
  subject: string;
  status: "delivered" | "queued" | "bounced" | "failed";
  smtpResponse: string;
  domain: string;
  latencyMs: number;
  timestamp: string;
  createdAt: string;
  hasDkim: boolean;
  hasSpf: boolean;
  sizeBytes?: number;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  scope: "Full Access" | "Sending Only";
  domain: string;
  lastUsed: string;
  createdAt: string;
  status: "active" | "revoked";
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  status: "active" | "disabled";
  events: string[];
  createdAt: string;
}

export interface WebhookDeliveryLog {
  id: string;
  event: string;
  url: string;
  statusCode: number;
  statusText: string;
  timestamp: string;
  latencyMs: number;
  payload: Record<string, unknown>;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: "success" | "info" | "warning" | "error";
}
