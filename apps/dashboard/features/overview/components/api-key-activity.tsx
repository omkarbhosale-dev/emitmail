import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { sortApiKeysByRecentUsage, formatRelativeTime } from "../derive";
import type { ApiKeyRecord } from "@/lib/api/types";
import { Key, ArrowRight } from "@phosphor-icons/react/dist/ssr";

interface ApiKeyActivityProps {
  apiKeys: ApiKeyRecord[];
}

export function ApiKeyActivity({ apiKeys }: ApiKeyActivityProps) {
  const recentKeys = sortApiKeysByRecentUsage(apiKeys);

  return (
    <Panel
      title="Recent API Key Activity"
      description="Transactional sending credentials and last active timestamp"
      action={
        <Link
          href="/api-keys"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-[#262626] hover:text-[#ff5e1f]"
        >
          <span>Manage keys</span>
          <ArrowRight size={12} />
        </Link>
      }
    >
      {recentKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Key size={28} className="text-[#595959]" />
          <p className="mt-2 text-[13px] font-medium text-[#262626]">No API keys created</p>
          <p className="mt-0.5 text-[12px] text-[#595959]">
            Generate an API key to connect the EmitMail Node.js/Python SDK.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentKeys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-[2px] border border-[#f0f0f0] p-2.5 text-[12px]"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    key.isActive ? "bg-[#059669]" : "bg-[#d97706]"
                  }`}
                  title={key.isActive ? "Active" : "Paused"}
                />
                <div>
                  <p className="font-medium text-[#262626]">{key.name}</p>
                  <p className="font-mono text-[11px] text-[#595959]">
                    {key.keyPrefix}... · {key.domain?.domainName || "All verified domains"}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[12px] text-[#595959]">
                  {formatRelativeTime(key.lastUsedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
