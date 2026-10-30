export type NavTab = "emails" | "inbox" | "analytics" | "domains" | "api-keys" | "webhooks" | "settings" | "home";

export type UserRole = "ADMIN" | "MEMBER" | "VIEWER";

export interface DashboardUser {
  id: string;
  username: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  mustChangePassword: boolean;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

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
  from: string;
  to: string[];
  subject: string;
  status: "QUEUED" | "SENDING" | "DELIVERED" | "BOUNCED" | "FAILED" | "SUPPRESSED" | string;
  messageId?: string | null;
  sentAt?: string | null;
  bouncedAt?: string | null;
  bounceType?: string | null;
  bounceReason?: string | null;
  createdAt: string;
  domainId?: string;
  domain?: {
    id: string;
    domainName: string;
  } | null;
  deliveryAttempts?: number;
  lastError?: string | null;
  suppressionReason?: string | null;
  htmlContent?: string | null;
  textContent?: string | null;
  recipient?: string;
  sender?: string;
  smtpResponse?: string;
  hasDkim?: boolean;
  hasSpf?: boolean;
  latencyMs?: number;
  timestamp?: string;
  sizeBytes?: number;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  domainId?: string | null;
  domain?: {
    id: string;
    domainName: string;
    status: string;
  } | null;
  scopes?: string[];
  isActive: boolean;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatedApiKeyResponse {
  id: string;
  name: string;
  apiKey: string;
  keyPrefix: string;
  domainId?: string | null;
  domain?: {
    id: string;
    domainName: string;
    status: string;
  } | null;
  scopes?: string[];
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
  warning: string;
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
