import { Panel } from "@/components/ui/panel";
import { Info, LockKey } from "@phosphor-icons/react/dist/ssr";

export function EmailScopeNotice() {
  return (
    <Panel
      title="Email Engine Scope"
      description="API tenancy boundaries and authentication architecture"
    >
      <div className="rounded-[2px] border border-[#e5e5e5] bg-[#fafafa] p-4">
        <div className="flex items-start gap-3">
          <LockKey size={22} className="mt-0.5 flex-shrink-0 text-[#262626]" aria-hidden="true" />
          <div>
            <p className="text-body font-semibold text-[#262626]">
              Transactional Email Logs Require Domain Scoped Keys
            </p>
            <p className="mt-2 text-support text-[#595959]">
              Per the EmitMail architecture, outbound email submission (
              <code className="font-mono text-meta text-[#262626]">POST /v1/emails</code>
              ) and delivery status tracking (
              <code className="font-mono text-meta text-[#262626]">GET /v1/emails</code>
              ) are scoped directly to developer API keys for tenancy isolation.
            </p>
            <div className="mt-4 flex items-start gap-2 text-support text-[#262626]">
              <Info size={18} className="mt-0.5 flex-shrink-0 text-[#c2410c]" aria-hidden="true" />
              <span>
                To send emails, generate an API key from the{" "}
                <strong className="font-semibold">API Keys</strong> panel and use the SDK header{" "}
                <code className="break-all font-mono text-meta">Authorization: Bearer em_live_...</code>.
              </span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
