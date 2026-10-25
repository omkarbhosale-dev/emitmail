import { StatCard } from "@/components/ui/stat-card";
import {
  computeDomainMetrics,
  computeApiKeyMetrics,
  computeWebhookMetrics,
} from "../derive";
import type { DomainRecord, ApiKeyRecord, WebhookSubscription } from "@/lib/api/types";
import { Globe, Key, WebhooksLogo, CheckCircle } from "@phosphor-icons/react/dist/ssr";

interface KpiGridProps {
  domains: DomainRecord[];
  apiKeys: ApiKeyRecord[];
  webhooks: WebhookSubscription[];
}

export function KpiGrid({ domains, apiKeys, webhooks }: KpiGridProps) {
  const domainStats = computeDomainMetrics(domains);
  const apiKeyStats = computeApiKeyMetrics(apiKeys);
  const webhookStats = computeWebhookMetrics(webhooks);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Domains"
        value={domainStats.total}
        secondaryText={
          domainStats.pending > 0
            ? `${domainStats.pending} pending verification`
            : "All domains processed"
        }
        icon={<Globe size={18} />}
      />

      <StatCard
        label="Verified Domains"
        value={`${domainStats.verified} / ${domainStats.total}`}
        secondaryText={
          domainStats.failed > 0
            ? `${domainStats.failed} failed verification`
            : "100% DNS readiness"
        }
        icon={<CheckCircle size={18} />}
      />

      <StatCard
        label="Active API Keys"
        value={apiKeyStats.active}
        secondaryText={
          apiKeyStats.paused > 0
            ? `${apiKeyStats.paused} key${apiKeyStats.paused > 1 ? "s" : ""} paused`
            : "All credentials active"
        }
        icon={<Key size={18} />}
      />

      <StatCard
        label="Webhooks"
        value={webhookStats.active}
        secondaryText={`${webhookStats.total} registered subscription${
          webhookStats.total === 1 ? "" : "s"
        }`}
        icon={<WebhooksLogo size={18} />}
      />
    </div>
  );
}
