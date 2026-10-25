import Link from "next/link";
import { Warning, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import type { ServerConfigData, SystemVersion } from "@/lib/api/types";

interface OverviewAlertsProps {
  serverConfigData: ServerConfigData | null;
  version: SystemVersion | null;
  isDemoMode?: boolean;
}

export function OverviewAlerts({ serverConfigData, version, isDemoMode }: OverviewAlertsProps) {
  const isServerConfigured = serverConfigData?.serverConfig.isConfigured;
  const hasUpdate = version?.hasUpdate;

  if (isServerConfigured && !hasUpdate && !isDemoMode) {
    return null;
  }

  return (
    <div className="space-y-3">
      {isDemoMode && (
        <div className="flex flex-col items-start justify-between gap-2 rounded-[4px] border border-[#e5e5e5] bg-[#fafafa] p-3 text-[12px] text-[#595959] sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="rounded-[2px] bg-[#f0f0f0] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#262626]">
              DEV DEMO MODE
            </span>
            <span>
              Displaying demonstration data during UI development. Backend API connection will load live metrics.
            </span>
          </div>
          <Link
            href="/login"
            className="flex-shrink-0 text-[11px] font-medium text-[#262626] hover:text-[#ff5e1f]"
          >
            Sign in console →
          </Link>
        </div>
      )}
      {!isServerConfigured && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-[4px] border border-[#fef3c7] bg-[#fffbeb] p-3 text-[13px] text-[#92400e] sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Warning size={18} weight="bold" className="flex-shrink-0 text-[#d97706]" />
            <span>
              <strong>Server Configuration Pending:</strong> Master MTA hostname,
              SPF include, and VPS rDNS PTR records require initial setup before dispatching emails.
            </span>
          </div>
          <Link
            href="/settings"
            className="inline-flex h-7 flex-shrink-0 items-center gap-1 rounded-[2px] bg-[#d97706] px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-[#b45309]"
          >
            <span>Configure Host</span>
            <ArrowSquareOut size={12} />
          </Link>
        </div>
      )}

      {hasUpdate && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-[4px] border border-[#dbeafe] bg-[#eff6ff] p-3 text-[13px] text-[#1e40af] sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
            <span>
              <strong>EmitMail Update Available:</strong> Version {version?.latestVersion} is
              available (currently running v{version?.currentVersion}).
            </span>
          </div>
          <code className="rounded-[2px] bg-white px-2 py-0.5 font-mono text-[11px] text-[#1e40af]">
            {version?.updateCommand || "docker compose pull && docker compose up -d"}
          </code>
        </div>
      )}
    </div>
  );
}
