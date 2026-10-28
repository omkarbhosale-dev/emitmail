import { Metadata } from "next";
import { Suspense } from "react";
import { InboxView } from "@/components/views/InboxView";
import { TableSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "Inbox — EmitMail",
  description: "Inbound email streams, webhook notifications, and bounce monitor.",
};

export default function InboxPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <InboxView />
    </Suspense>
  );
}
