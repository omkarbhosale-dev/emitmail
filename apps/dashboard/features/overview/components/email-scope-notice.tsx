import { Panel } from "@/components/ui/panel";
import { Info, LockKey } from "@phosphor-icons/react/dist/ssr";

export function EmailScopeNotice() {
  return (
    <Panel
      title="Email Engine Scope"
      description="API tenancy boundaries and authentication architecture"
    >
      <div className="rounded-[2px] border border-[#f0f0f0] bg-[#fafafa] p-4 text-[13px] text-[#595959]">
        <div className="flex items-start gap-3">
          <LockKey size={20} className="mt-0.5 flex-shrink-0 text-[#262626]" />
          <div>
            <p className="font-medium text-[#262626]">
              Transactional Email Logs Require Domain Scoped Keys
            </p>
            <p className="mt-1 text-[12px] leading-relaxed">
              Per the EmitMail architecture, outbound email submission (
              <code className="font-mono text-[11px] text-[#262626]">POST /v1/emails</code>
              ) and delivery status tracking (
              <code className="font-mono text-[11px] text-[#262626]">GET /v1/emails</code>
              ) are scoped directly to developer API keys for tenancy isolation.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-[#262626]">
              <Info size={14} className="text-[#ff5e1f]" />
              <span>
                To send emails, generate an API key from the{" "}
                <strong>API Keys</strong> panel and use the SDK header{" "}
                <code className="font-mono text-[10px]">Authorization: Bearer em_live_...</code>.
              </span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
