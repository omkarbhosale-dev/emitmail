import { Metadata } from "next";
import { DomainsView } from "@/components/views/DomainsView";

export const metadata: Metadata = {
  title: "Domains — EmitMail",
  description: "Configure sending domains, generate 2048-bit DKIM keys, and verify SPF, DMARC, and MX records.",
};

export default function DomainsPage() {
  return <DomainsView />;
}
