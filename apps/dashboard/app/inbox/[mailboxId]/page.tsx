import { Metadata } from "next";
import { Suspense } from "react";
import { MailboxEmailsView } from "@/components/views/MailboxEmailsView";
import { TableSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "Mailbox Messages — Inbox — EmitMail",
  description: "View inbound messages and emails received for this mailbox alias.",
};

async function MailboxEmailsContent({
  params,
}: {
  params: Promise<{ mailboxId: string }>;
}) {
  const { mailboxId } = await params;
  return <MailboxEmailsView mailboxId={mailboxId} />;
}

export default function MailboxEmailsPage({
  params,
}: {
  params: Promise<{ mailboxId: string }>;
}) {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <MailboxEmailsContent params={params} />
    </Suspense>
  );
}
