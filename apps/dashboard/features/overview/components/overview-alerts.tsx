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
        <div className="flex flex-col items-start justify-between gap-3 rounded-[4px] border border-[#e5e5e5] bg-[#fafafa] p-4 text-support text-[#595959] sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-[2px] bg-[#f0f0f0] px-2 py-0.5 font-mono text-meta font-semibold text-[#262626]">
              DEV DEMO MODE
            </span>
            <span>
              Displaying demonstration data during UI development. Backend API connection will load live metrics.
            </span>
          </div>
          <Link href="/login" className="link-action flex-shrink-0">
            Sign in console →
          </Link>
        </div>
      )}
      {!isServerConfigured && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-[4px] border border-[#fde68a] bg-[#fffbeb] p-4 text-support text-[#92400e] sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <Warning size={20} weight="bold" className="mt-0.5 flex-shrink-0 text-[#b45309]" aria-hidden="true" />
            <span>
              <strong className="font-semibold">Server Configuration Pending:</strong> Master MTA hostname,
              SPF include, and VPS rDNS PTR records require initial setup before dispatching emails.
            </span>
          </div>
          <Link
            href="/settings"
            className="btn flex-shrink-0 bg-[#b45309] text-white hover:bg-[#92400e]"
          >
            <span>Configure Host</span>
            <ArrowSquareOut size={16} aria-hidden="true" />
          </Link>
        </div>
      )}

      {hasUpdate && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-[4px] border border-[#bfdbfe] bg-[#eff6ff] p-4 text-support text-[#1e40af] sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#2563eb]" aria-hidden="true" />
            <span>
              <strong className="font-semibold">EmitMail Update Available:</strong> Version {version?.latestVersion} is
              available (currently running v{version?.currentVersion}).
            </span>
          </div>
          <code className="rounded-[2px] bg-white px-2.5 py-1 font-mono text-meta text-[#1e40af]">
            {version?.updateCommand || "docker compose pull && docker compose up -d"}
          </code>
        </div>
      )}
    </div>
  );
}
