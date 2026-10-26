import { Metadata } from "next";
import { WebhooksView } from "@/components/views/WebhooksView";

export const metadata: Metadata = {
  title: "Webhooks — EmitMail",
  description: "Monitor real-time webhook endpoints, HMAC signatures, and delivery event logs.",
};

export default function WebhooksPage() {
  return <WebhooksView />;
}
