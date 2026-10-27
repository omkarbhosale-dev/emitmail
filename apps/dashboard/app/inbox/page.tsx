import { Metadata } from "next";
import { InboxView } from "@/components/views/InboxView";

export const metadata: Metadata = {
  title: "Inbox — EmitMail",
  description: "Inbound email streams, webhook notifications, and bounce monitor.",
};

export default function InboxPage() {
  return <InboxView />;
}
