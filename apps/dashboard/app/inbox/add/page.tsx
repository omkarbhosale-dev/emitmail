import { Metadata } from "next";
import { Suspense } from "react";
import { AddMailboxView } from "@/components/views/AddMailboxView";
import { TableSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "Create Mailbox — Inbox — EmitMail",
  description: "Create a new custom inbound mailbox alias on your verified sending domain.",
};

export default function InboxAddPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} />}>
      <AddMailboxView />
    </Suspense>
  );
}
