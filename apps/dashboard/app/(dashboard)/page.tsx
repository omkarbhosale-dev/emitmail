import { fetchOverviewData } from "@/features/overview/data";
import { OverviewAlerts } from "@/features/overview/components/overview-alerts";
import { KpiGrid } from "@/features/overview/components/kpi-grid";
import { DomainHealthTable } from "@/features/overview/components/domain-health-table";
import { InfrastructureCard } from "@/features/overview/components/infrastructure-card";
import { ApiKeyActivity } from "@/features/overview/components/api-key-activity";
import { EmailScopeNotice } from "@/features/overview/components/email-scope-notice";

export default async function OverviewPage() {
  const data = await fetchOverviewData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-page-title text-[#262626]">Overview</h1>
        <p className="mt-2 text-body text-[#595959]">
          Platform health, verified sender domains, and operational status.
        </p>
      </div>

      {/* Pre-Flight, Update & Demo Mode Alerts */}
      <OverviewAlerts
        serverConfigData={data.serverConfigData}
        version={data.version}
        isDemoMode={data.isDemoMode}
      />

      {/* 4 KPI Cards */}
      <KpiGrid
        domains={data.domains}
        apiKeys={data.apiKeys}
        webhooks={data.webhooks}
      />

      {/* Middle Grid: Domain Health Table (2fr) + Infrastructure Card (1fr) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DomainHealthTable domains={data.domains} />
        </div>
        <div className="lg:col-span-1">
          <InfrastructureCard
            serverConfigData={data.serverConfigData}
            health={data.health}
            version={data.version}
          />
        </div>
      </div>

      {/* Lower Grid: Recent API Key Activity + Email Scope Notice */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ApiKeyActivity apiKeys={data.apiKeys} />
        <EmailScopeNotice />
      </div>
    </div>
  );
}
