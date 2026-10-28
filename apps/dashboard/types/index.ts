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

export interface MailboxItem {
  id: string;
  domainId: string;
  domain?: {
    id: string;
    domainName: string;
    inboundMxVerified?: boolean;
    inboundEnabled?: boolean;
    status?: string;
  };
  localPart: string;
  emailAddress: string;
  displayName?: string | null;
  isActive: boolean;
  isCatchAll: boolean;
  unreadCount: number;
  totalMessages: number;
  totalReceived?: number;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InboundEmailAttachment {
  filename: string;
  contentType: string;
  sizeBytes: number;
  path?: string;
  url?: string;
}

export interface InboundEmailItem {
  id: string;
  mailboxId: string;
  domainId: string;
  threadId: string;
  messageId: string;
  inReplyTo?: string | null;
  references?: string[];
  fromAddress: string;
  fromName?: string | null;
  toAddresses: string[];
  ccAddresses?: string[];
  replyTo?: string | null;
  subject: string;
  snippet: string;
  textBody?: string | null;
  htmlBody?: string | null;
  rawHeaders?: Record<string, any> | null;
  attachments?: InboundEmailAttachment[] | null;
  sizeBytes: number;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isTrash: boolean;
  direction: "INBOUND" | "OUTBOUND_REPLY";
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
  mailbox?: MailboxItem;
  domain?: {
    id: string;
    domainName: string;
  };
  spamScore?: number;
  dkimPass?: boolean;
  spfPass?: boolean;
}

export interface InboundDomainItem {
  id: string;
  domainName: string;
  inboundEnabled: boolean;
  inboundMxVerified: boolean;
  createdAt: string;
  activeMailboxesCount?: number;
  mxHost?: string;
  mxPriority?: number;
  requiredMxRecord: {
    type: string;
    host: string;
    value: string;
    priority: number;
    ttl: string;
    status: "VERIFIED" | "PENDING";
  };
}

