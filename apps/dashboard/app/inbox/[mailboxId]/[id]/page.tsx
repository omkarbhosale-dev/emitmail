import { Metadata } from "next";
import { Suspense } from "react";
import { InboxMessageDetailView } from "@/components/views/InboxMessageDetailView";
import { TableSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "Message Details — Inbox — EmitMail",
  description: "View received email thread, verify authentication signatures, and reply directly.",
};

async function InboxMessageContent({
  params,
}: {
  params: Promise<{ mailboxId: string; id: string }>;
}) {
  const { mailboxId, id } = await params;
  return <InboxMessageDetailView messageId={id} mailboxId={mailboxId} />;
}

export default function InboxMessagePage({
  params,
}: {
  params: Promise<{ mailboxId: string; id: string }>;
}) {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <InboxMessageContent params={params} />
    </Suspense>
  );
}
