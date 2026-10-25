import {
  listDomains,
  listApiKeys,
  listWebhooks,
  getServerConfig,
  getHealth,
  getSystemVersion,
} from "@/lib/api";
import type {
  DomainRecord,
  ApiKeyRecord,
  WebhookSubscription,
  ServerConfigData,
  SystemHealth,
  SystemVersion,
} from "@/lib/api/types";
import {
  MOCK_OVERVIEW_DOMAINS,
  MOCK_OVERVIEW_API_KEYS,
  MOCK_OVERVIEW_WEBHOOKS,
  MOCK_OVERVIEW_SERVER_CONFIG,
  MOCK_OVERVIEW_HEALTH,
  MOCK_OVERVIEW_VERSION,
} from "./mock";

export interface OverviewData {
  domains: DomainRecord[];
  apiKeys: ApiKeyRecord[];
  webhooks: WebhookSubscription[];
  serverConfigData: ServerConfigData | null;
  health: SystemHealth | null;
  version: SystemVersion | null;
  isDemoMode: boolean;
}

export async function fetchOverviewData(): Promise<OverviewData> {
  const [
    domainsRes,
    apiKeysRes,
    webhooksRes,
    serverConfigRes,
    healthRes,
    versionRes,
  ] = await Promise.allSettled([
    listDomains(),
    listApiKeys(),
    listWebhooks(),
    getServerConfig(),
    getHealth(),
    getSystemVersion(),
  ]);

  const hasRealData =
    domainsRes.status === "fulfilled" ||
    apiKeysRes.status === "fulfilled" ||
    webhooksRes.status === "fulfilled";

  return {
    domains:
      domainsRes.status === "fulfilled"
        ? domainsRes.value
        : MOCK_OVERVIEW_DOMAINS,
    apiKeys:
      apiKeysRes.status === "fulfilled"
        ? apiKeysRes.value
        : MOCK_OVERVIEW_API_KEYS,
    webhooks:
      webhooksRes.status === "fulfilled"
        ? webhooksRes.value
        : MOCK_OVERVIEW_WEBHOOKS,
    serverConfigData:
      serverConfigRes.status === "fulfilled"
        ? serverConfigRes.value
        : MOCK_OVERVIEW_SERVER_CONFIG,
    health:
      healthRes.status === "fulfilled"
        ? healthRes.value
        : MOCK_OVERVIEW_HEALTH,
    version:
      versionRes.status === "fulfilled"
        ? versionRes.value
        : MOCK_OVERVIEW_VERSION,
    isDemoMode: !hasRealData,
  };
}
