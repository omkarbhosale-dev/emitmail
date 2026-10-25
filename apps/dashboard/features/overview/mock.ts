import type {
  DomainRecord,
  ApiKeyRecord,
  WebhookSubscription,
  ServerConfigData,
  SystemHealth,
  SystemVersion,
} from "@/lib/api/types";

/**
 * Clearly identified mock/demonstration data used exclusively when the backend
 * is unreachable or unauthenticated during UI development.
 */
export const MOCK_OVERVIEW_DOMAINS: DomainRecord[] = [
  {
    id: "dom-mock-1",
    domainName: "notify.emitmail.io",
    status: "VERIFIED",
    dkimSelector: "em1",
    dkimPublicKey: "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDf...",
    returnPathSubdomain: "em",
    dmarcPolicy: "reject",
    dkimVerified: true,
    spfVerified: true,
    mxVerified: true,
    dmarcVerified: true,
    lastVerifiedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "dom-mock-2",
    domainName: "transactional.example.com",
    status: "PENDING",
    dkimSelector: "em1",
    dkimPublicKey: "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDf...",
    returnPathSubdomain: "em",
    dmarcPolicy: "none",
    dkimVerified: true,
    spfVerified: true,
    mxVerified: false,
    dmarcVerified: false,
    lastVerifiedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: "dom-mock-3",
    domainName: "updates.marketing-hub.org",
    status: "FAILED",
    dkimSelector: "em1",
    dkimPublicKey: "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDf...",
    returnPathSubdomain: "em",
    dmarcPolicy: "quarantine",
    dkimVerified: false,
    spfVerified: false,
    mxVerified: true,
    dmarcVerified: false,
    lastVerifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export const MOCK_OVERVIEW_API_KEYS: ApiKeyRecord[] = [
  {
    id: "key-mock-1",
    name: "Production Backend Server",
    keyPrefix: "em_live_prod78",
    scopes: ["emails:send", "emails:read"],
    domainId: "dom-mock-1",
    domain: {
      id: "dom-mock-1",
      domainName: "notify.emitmail.io",
      status: "VERIFIED",
    },
    isActive: true,
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    expiresAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: "key-mock-2",
    name: "Staging Billing Service",
    keyPrefix: "em_test_bill22",
    scopes: ["emails:send"],
    domainId: null,
    domain: null,
    isActive: true,
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    expiresAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "key-mock-3",
    name: "Legacy Microservice (Deprecated)",
    keyPrefix: "em_live_old91",
    scopes: ["emails:send"],
    domainId: "dom-mock-2",
    domain: {
      id: "dom-mock-2",
      domainName: "transactional.example.com",
      status: "PENDING",
    },
    isActive: false,
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    expiresAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
];

export const MOCK_OVERVIEW_WEBHOOKS: WebhookSubscription[] = [
  {
    id: "wh-mock-1",
    domainId: "dom-mock-1",
    url: "https://api.notify.emitmail.io/webhooks/delivery",
    events: ["delivered", "bounced", "complained"],
    isActive: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
  },
  {
    id: "wh-mock-2",
    domainId: null,
    url: "https://monitoring.ops.net/events/mail",
    events: ["failed"],
    isActive: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
];

export const MOCK_OVERVIEW_SERVER_CONFIG: ServerConfigData = {
  serverConfig: {
    id: "srv-mock-1",
    mailServerHostname: "mail.emitmail.local",
    spfIncludeDomain: "emitmail.local",
    vpsPublicIpv4: "198.51.100.42",
    isConfigured: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  },
  masterDnsChecklist: [
    {
      type: "A",
      host: "mail.emitmail.local",
      value: "198.51.100.42",
      purpose: "Points mail hostname to VPS IP",
      instructions: "Create an A record pointing mail.emitmail.local to your VPS IPv4 address.",
    },
    {
      type: "TXT",
      host: "emitmail.local",
      value: "v=spf1 ip4:198.51.100.42 ~all",
      purpose: "Designates VPS as authorized sender",
      instructions: "Add SPF record on root domain allowing outbound delivery.",
    },
    {
      type: "PTR",
      ip: "198.51.100.42",
      value: "mail.emitmail.local",
      purpose: "Reverse DNS matching mail hostname",
      instructions: "Configure Reverse DNS (PTR) with your VPS hosting provider.",
    },
  ],
};

export const MOCK_OVERVIEW_HEALTH: SystemHealth = {
  status: "healthy",
  uptime: 86400,
  timestamp: new Date().toISOString(),
  services: {
    database: "connected",
    redis: "connected",
  },
};

export const MOCK_OVERVIEW_VERSION: SystemVersion = {
  currentVersion: "1.0.0",
  latestVersion: "1.0.0",
  hasUpdate: false,
  isMajor: false,
  releaseName: "v1.0.0 General Availability",
  publishedAt: new Date().toISOString(),
  releaseUrl: "https://github.com/emitmail/emitmail/releases",
  releaseNotes: "EmitMail ESP Engine GA",
  updateCommand: "docker compose pull && docker compose up -d",
};
