export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorDetail {
  path?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: ApiErrorDetail[];
}

export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  fullName: string | null;
  timezone: string;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthLoginResponse {
  accessToken: string;
  user: UserProfile;
}

export interface SystemHealth {
  status: "healthy" | "degraded";
  uptime: number;
  timestamp: string;
  services: {
    database: string;
    redis: string;
  };
}

export interface SystemVersion {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  isMajor: boolean;
  releaseName: string | null;
  publishedAt: string | null;
  releaseUrl: string;
  releaseNotes: string | null;
  updateCommand: string;
}

export interface MasterDnsChecklistItem {
  type: "A" | "TXT" | "PTR";
  host?: string;
  ip?: string;
  value: string;
  purpose: string;
  instructions: string;
}

export interface ServerConfigData {
  serverConfig: {
    id: string;
    mailServerHostname: string;
    spfIncludeDomain: string;
    vpsPublicIpv4: string | null;
    isConfigured: boolean;
    updatedAt: string;
  };
  masterDnsChecklist: MasterDnsChecklistItem[];
  refreshedPendingDomainsCount?: number;
}

export type DomainStatus = "PENDING" | "VERIFYING" | "VERIFIED" | "FAILED";

export interface DomainRecord {
  id: string;
  domainName: string;
  status: DomainStatus;
  dkimSelector: string;
  dkimPublicKey: string;
  returnPathSubdomain: string;
  dmarcPolicy: string;
  dkimVerified: boolean;
  spfVerified: boolean;
  mxVerified: boolean;
  dmarcVerified: boolean;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  domainId: string | null;
  domain: {
    id: string;
    domainName: string;
    status: DomainStatus;
  } | null;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookSubscription {
  id: string;
  domainId: string | null;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
