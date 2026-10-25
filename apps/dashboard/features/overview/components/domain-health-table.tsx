import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { CheckIndicator } from "@/components/ui/check-indicator";
import { sortDomainsForHealth, formatRelativeTime } from "../derive";
import type { DomainRecord } from "@/lib/api/types";
import { ArrowRight, Globe } from "@phosphor-icons/react/dist/ssr";

interface DomainHealthTableProps {
  domains: DomainRecord[];
}

export function DomainHealthTable({ domains }: DomainHealthTableProps) {
  const sorted = sortDomainsForHealth(domains);

  return (
    <Panel
      title="Domain Deliverability Health"
      description="Active verification status for DKIM, SPF, MX, and DMARC DNS records"
      action={
        <Link
          href="/domains"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-[#262626] hover:text-[#ff5e1f]"
        >
          <span>View all domains</span>
          <ArrowRight size={12} />
        </Link>
      }
    >
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Globe size={32} className="text-[#595959]" />
          <p className="mt-2 text-[14px] font-medium text-[#262626]">No domains registered</p>
          <p className="mt-1 text-[12px] text-[#595959]">
            Register a domain to generate 2048-bit RSA keys and begin DNS verification.
          </p>
          <Link
            href="/domains"
            className="mt-4 inline-flex h-8 items-center rounded-[2px] bg-[#ff5e1f] px-3 text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#ff7038]"
          >
            Add domain
          </Link>
        </div>
      ) : (
        <div
          className="overflow-x-auto focus:outline-none focus:ring-1 focus:ring-[#ff5e1f]"
          tabIndex={0}
          role="region"
          aria-label="Domain deliverability status table"
        >
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#f0f0f0] text-[11px] font-medium uppercase tracking-wider text-[#595959]">
                <th scope="col" className="pb-2.5 font-medium">Domain Name</th>
                <th scope="col" className="pb-2.5 font-medium">Status</th>
                <th scope="col" className="pb-2.5 text-center font-medium">DKIM</th>
                <th scope="col" className="pb-2.5 text-center font-medium">SPF</th>
                <th scope="col" className="pb-2.5 text-center font-medium">MX</th>
                <th scope="col" className="pb-2.5 text-center font-medium">DMARC</th>
                <th scope="col" className="pb-2.5 text-right font-medium">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {sorted.map((domain) => (
                <tr key={domain.id} className="hover:bg-[#fcfcfc]">
                  <td className="py-2.5 font-mono text-[13px] font-medium text-[#262626]">
                    {domain.domainName}
                  </td>
                  <td className="py-2.5">
                    <StatusPill status={domain.status} />
                  </td>
                  <td className="py-2.5 text-center">
                    <CheckIndicator verified={domain.dkimVerified} name="DKIM" />
                  </td>
                  <td className="py-2.5 text-center">
                    <CheckIndicator verified={domain.spfVerified} name="SPF" />
                  </td>
                  <td className="py-2.5 text-center">
                    <CheckIndicator verified={domain.mxVerified} name="MX" />
                  </td>
                  <td className="py-2.5 text-center">
                    <CheckIndicator verified={domain.dmarcVerified} name="DMARC" />
                  </td>
                  <td className="py-2.5 text-right text-[12px] text-[#595959]">
                    {formatRelativeTime(domain.lastVerifiedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
