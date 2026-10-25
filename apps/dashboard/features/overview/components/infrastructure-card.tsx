import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import type { ServerConfigData, SystemHealth, SystemVersion } from "@/lib/api/types";
import { Check, Warning, HardDrives, Database } from "@phosphor-icons/react/dist/ssr";

interface InfrastructureCardProps {
  serverConfigData: ServerConfigData | null;
  health: SystemHealth | null;
  version: SystemVersion | null;
}

export function InfrastructureCard({
  serverConfigData,
  health,
  version,
}: InfrastructureCardProps) {
  const config = serverConfigData?.serverConfig;
  const checklist = serverConfigData?.masterDnsChecklist || [];
  const dbConnected = health?.services.database === "connected";
  const redisConnected = health?.services.redis === "connected";

  return (
    <Panel
      title="Cluster & Mail Infrastructure"
      description="MTA hostnames, DNS checklist, and cluster connectivity"
    >
      <div className="space-y-5">
        {/* MTA Hostnames */}
        <dl className="rounded-[2px] border border-[#e5e5e5] bg-[#fafafa] p-4 text-support">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <dt className="text-[#595959]">Mail Server Hostname</dt>
            <dd className="break-all font-mono font-medium text-[#262626]">
              {config?.mailServerHostname || "mail.yourdomain.com"}
            </dd>
          </div>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-[#e5e5e5] pt-3">
            <dt className="text-[#595959]">VPS Public IPv4</dt>
            <dd className="font-mono font-medium text-[#262626]">
              {config?.vpsPublicIpv4 || "Not configured"}
            </dd>
          </div>
        </dl>

        {/* Master DNS Prerequisites */}
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-label uppercase text-[#595959]">Master DNS Checklist</h3>
            <Link href="/settings" className="link-action">
              Review ({checklist.length})
            </Link>
          </div>
          <ul className="space-y-2">
            {checklist.map((item, idx) => (
              <li
                key={idx}
                className="flex min-h-[44px] items-center justify-between gap-3 rounded-[2px] border border-[#e5e5e5] px-3 py-2 text-support"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="rounded-[2px] bg-[#f0f0f0] px-1.5 py-0.5 font-mono text-meta font-semibold text-[#262626]">
                    {item.type}
                  </span>
                  <span className="text-[#262626]">{item.purpose}</span>
                </div>
                {config?.isConfigured ? (
                  <Check
                    size={18}
                    weight="bold"
                    className="flex-shrink-0 text-[#059669]"
                    aria-label="Configured"
                  />
                ) : (
                  <Warning
                    size={18}
                    weight="bold"
                    className="flex-shrink-0 text-[#b45309]"
                    aria-label="Action required"
                  />
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Database & Redis status */}
        <div className="grid grid-cols-1 gap-3 border-t border-[#e5e5e5] pt-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <ServiceStatus
            icon={<Database size={22} aria-hidden="true" />}
            label="PostgreSQL"
            connected={dbConnected}
          />
          <ServiceStatus
            icon={<HardDrives size={22} aria-hidden="true" />}
            label="Redis Broker"
            connected={redisConnected}
          />
        </div>

        {/* Running Engine Version */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-meta text-[#595959]">
          <span>Engine Version: v{version?.currentVersion || "1.0.0"}</span>
          <span className="font-mono">{version?.hasUpdate ? "Update available" : "Up to date"}</span>
        </div>
      </div>
    </Panel>
  );
}

function ServiceStatus({
  icon,
  label,
  connected,
}: {
  icon: React.ReactNode;
  label: string;
  connected: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[2px] border border-[#e5e5e5] p-3">
      <span className="text-[#595959]">{icon}</span>
      <div>
        <p className="text-meta uppercase tracking-wide text-[#595959]">{label}</p>
        <p
          className={`text-support font-semibold ${
            connected ? "text-[#047857]" : "text-[#b91c1c]"
          }`}
        >
          {connected ? "Connected" : "Disconnected"}
        </p>
      </div>
    </div>
  );
}
