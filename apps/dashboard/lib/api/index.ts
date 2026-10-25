import { apiRequest } from "./client";
import type {
  AuthLoginResponse,
  UserProfile,
  SystemHealth,
  SystemVersion,
  ServerConfigData,
  DomainRecord,
  ApiKeyRecord,
  WebhookSubscription,
} from "./types";

// 0. System Health & Updates
export async function getHealth(): Promise<SystemHealth> {
  return apiRequest<SystemHealth>("/health", { requiresAuth: false });
}

export async function getSystemVersion(force = false): Promise<SystemVersion> {
  const query = force ? "?force=true" : "";
  return apiRequest<SystemVersion>(`/system/version${query}`, { requiresAuth: false });
}

// 2. Authentication
export async function login(input: { username: string; password: string }): Promise<AuthLoginResponse> {
  return apiRequest<AuthLoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
    requiresAuth: false,
  });
}

export async function getProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>("/auth/me");
}

// 3. Server Configuration & Master DNS
export async function getServerConfig(): Promise<ServerConfigData> {
  return apiRequest<ServerConfigData>("/server-config");
}

// 4. User Settings
export async function getUserSettings(): Promise<UserProfile> {
  return apiRequest<UserProfile>("/users/settings");
}

// 5. Domains
export async function listDomains(query?: { status?: string; search?: string }): Promise<DomainRecord[]> {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  if (query?.search) params.set("search", query.search);
  const qStr = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<DomainRecord[]>(`/domains${qStr}`);
}

// 6. API Keys
export async function listApiKeys(): Promise<ApiKeyRecord[]> {
  return apiRequest<ApiKeyRecord[]>("/api-keys");
}

// 7. Webhooks
export async function listWebhooks(): Promise<WebhookSubscription[]> {
  return apiRequest<WebhookSubscription[]>("/webhooks");
}
