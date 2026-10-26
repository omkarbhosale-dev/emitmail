import { Metadata } from "next";
import { Suspense } from "react";
import { DomainDetailsView } from "@/components/views/DomainDetailsView";
import { TableSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "Domain Configuration — EmitMail",
  description: "Inspect domain deliverability status, DNS records, DKIM public key, and SPF alignment.",
};

async function DomainDetailsContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DomainDetailsView domainId={id} />;
}

export default function DomainsDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<TableSkeleton rows={6} />}>
      <DomainDetailsContent params={params} />
    </Suspense>
  );
}
