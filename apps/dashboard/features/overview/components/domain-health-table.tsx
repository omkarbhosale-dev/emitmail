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

const TH = "px-3 py-3 text-label uppercase text-[#595959]";
const TD = "px-3 py-3.5";

export function DomainHealthTable({ domains }: DomainHealthTableProps) {
  const sorted = sortDomainsForHealth(domains);

  return (
    <Panel
      title="Domain Deliverability Health"
      description="Active verification status for DKIM, SPF, MX, and DMARC DNS records"
      action={
        <Link href="/domains" className="link-action">
          <span>View all domains</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      }
    >
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Globe size={36} className="text-[#595959]" aria-hidden="true" />
          <p className="mt-3 text-body font-semibold text-[#262626]">No domains registered</p>
          <p className="mt-1 max-w-md text-support text-[#595959]">
            Register a domain to generate 2048-bit RSA keys and begin DNS verification.
          </p>
          <Link href="/domains" className="btn btn-primary mt-5">
            Add domain
          </Link>
        </div>
      ) : (
        <div
          className="-mx-5 overflow-x-auto px-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#262626]"
          tabIndex={0}
          role="region"
          aria-label="Domain deliverability status table"
        >
          <table className="w-full min-w-[640px] text-left text-table">
            <thead>
              <tr className="border-b border-[#e5e5e5]">
                <th scope="col" className={TH}>Domain Name</th>
                <th scope="col" className={TH}>Status</th>
                <th scope="col" className={`${TH} text-center`}>DKIM</th>
                <th scope="col" className={`${TH} text-center`}>SPF</th>
                <th scope="col" className={`${TH} text-center`}>MX</th>
                <th scope="col" className={`${TH} text-center`}>DMARC</th>
                <th scope="col" className={`${TH} text-right`}>Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeeeee]">
              {sorted.map((domain) => (
                <tr key={domain.id} className="hover:bg-[#fafafa]">
                  <td className={`${TD} font-mono text-table font-medium text-[#262626]`}>
                    {domain.domainName}
                  </td>
                  <td className={TD}>
                    <StatusPill status={domain.status} />
                  </td>
                  <td className={`${TD} text-center`}>
                    <CheckIndicator verified={domain.dkimVerified} name="DKIM" />
                  </td>
                  <td className={`${TD} text-center`}>
                    <CheckIndicator verified={domain.spfVerified} name="SPF" />
                  </td>
                  <td className={`${TD} text-center`}>
                    <CheckIndicator verified={domain.mxVerified} name="MX" />
                  </td>
                  <td className={`${TD} text-center`}>
                    <CheckIndicator verified={domain.dmarcVerified} name="DMARC" />
                  </td>
                  <td className={`${TD} text-right text-table text-[#595959] whitespace-nowrap`}>
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
