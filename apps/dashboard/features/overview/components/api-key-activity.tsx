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
        <Link href="/api-keys" className="link-action">
          <span>Manage keys</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      }
    >
      {recentKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Key size={32} className="text-[#595959]" aria-hidden="true" />
          <p className="mt-3 text-body font-semibold text-[#262626]">No API keys created</p>
          <p className="mt-1 max-w-sm text-support text-[#595959]">
            Generate an API key to connect the EmitMail Node.js/Python SDK.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {recentKeys.map((key) => (
            <li
              key={key.id}
              className="flex items-center justify-between gap-4 rounded-[2px] border border-[#e5e5e5] px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                    key.isActive ? "bg-[#059669]" : "bg-[#d97706]"
                  }`}
                  role="img"
                  aria-label={key.isActive ? "Active" : "Paused"}
                  title={key.isActive ? "Active" : "Paused"}
                />
                <div className="min-w-0">
                  <p className="truncate text-table font-semibold text-[#262626]">{key.name}</p>
                  <p className="truncate font-mono text-meta text-[#595959]">
                    {key.keyPrefix}... · {key.domain?.domainName || "All verified domains"}
                  </p>
                </div>
              </div>

              <span className="flex-shrink-0 text-table text-[#595959]">
                {formatRelativeTime(key.lastUsedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
