import type { DomainRecord, ApiKeyRecord, WebhookSubscription } from "@/lib/api/types";

export function computeDomainMetrics(domains: DomainRecord[]) {
  const total = domains.length;
  const verified = domains.filter((d) => d.status === "VERIFIED").length;
  const pending = domains.filter((d) => d.status === "PENDING" || d.status === "VERIFYING").length;
  const failed = domains.filter((d) => d.status === "FAILED").length;

  return { total, verified, pending, failed };
}

export function computeApiKeyMetrics(apiKeys: ApiKeyRecord[]) {
  const now = new Date();
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const active = apiKeys.filter((k) => k.isActive).length;
  const paused = apiKeys.filter((k) => !k.isActive).length;
  const expiringSoon = apiKeys.filter((k) => {
    if (!k.expiresAt) return false;
    const exp = new Date(k.expiresAt);
    return exp > now && exp <= sevenDaysFromNow;
  }).length;

  return { total: apiKeys.length, active, paused, expiringSoon };
}

export function computeWebhookMetrics(webhooks: WebhookSubscription[]) {
  const total = webhooks.length;
  const active = webhooks.filter((w) => w.isActive).length;
  return { total, active };
}

export function sortDomainsForHealth(domains: DomainRecord[]): DomainRecord[] {
  const statusWeights: Record<string, number> = {
    FAILED: 0,
    PENDING: 1,
    VERIFYING: 2,
    VERIFIED: 3,
  };

  return [...domains]
    .sort((a, b) => {
      const weightA = statusWeights[a.status] ?? 4;
      const weightB = statusWeights[b.status] ?? 4;
      if (weightA !== weightB) return weightA - weightB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 6);
}

export function sortApiKeysByRecentUsage(apiKeys: ApiKeyRecord[]): ApiKeyRecord[] {
  return [...apiKeys]
    .sort((a, b) => {
      const timeA = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
      const timeB = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
      return timeB - timeA;
    })
    .slice(0, 5);
}

export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never used";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}
