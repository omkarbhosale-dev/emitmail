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
      description="MTA server hostnames, DNS prerequisite checklist, and cluster connectivity"
    >
      <div className="space-y-4">
        {/* MTA Hostnames */}
        <div className="rounded-[2px] border border-[#f0f0f0] bg-[#fafafa] p-3 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-[#595959]">Mail Server Hostname</span>
            <span className="font-mono text-[#262626]">
              {config?.mailServerHostname || "mail.yourdomain.com"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[#f0f0f0] pt-2">
            <span className="text-[#595959]">VPS Public IPv4</span>
            <span className="font-mono text-[#262626]">
              {config?.vpsPublicIpv4 || "Not configured"}
            </span>
          </div>
        </div>

        {/* Master DNS Prerequisites */}
        <div>
          <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-[#595959]">
            <span>Master DNS Checklist</span>
            <Link href="/settings" className="text-[#262626] hover:text-[#ff5e1f]">
              Review (3) ›
            </Link>
          </div>
          <div className="space-y-1.5">
            {checklist.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-[2px] border border-[#f0f0f0] px-2.5 py-1.5 text-[12px]"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-[1px] bg-[#f0f0f0] px-1 py-0.5 font-mono text-[10px] font-medium text-[#262626]">
                    {item.type}
                  </span>
                  <span className="text-[#262626]">{item.purpose}</span>
                </div>
                {config?.isConfigured ? (
                  <Check size={13} weight="bold" className="text-[#059669]" />
                ) : (
                  <Warning size={13} weight="bold" className="text-[#d97706]" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Database & Redis status */}
        <div className="border-t border-[#f0f0f0] pt-3">
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="flex items-center gap-2 rounded-[2px] border border-[#f0f0f0] p-2">
              <Database size={15} className="text-[#595959]" />
              <div>
                <p className="text-[10px] uppercase text-[#595959]">PostgreSQL</p>
                <p className={`font-medium ${dbConnected ? "text-[#059669]" : "text-[#dc2626]"}`}>
                  {dbConnected ? "Connected" : "Disconnected"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-[2px] border border-[#f0f0f0] p-2">
              <HardDrives size={15} className="text-[#595959]" />
              <div>
                <p className="text-[10px] uppercase text-[#595959]">Redis Broker</p>
                <p className={`font-medium ${redisConnected ? "text-[#059669]" : "text-[#dc2626]"}`}>
                  {redisConnected ? "Connected" : "Disconnected"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Running Engine Version */}
        <div className="flex items-center justify-between text-[11px] text-[#595959]">
          <span>Engine Version: v{version?.currentVersion || "1.0.0"}</span>
          <span className="font-mono">{version?.hasUpdate ? "Update available" : "Up to date"}</span>
        </div>
      </div>
    </Panel>
  );
}
