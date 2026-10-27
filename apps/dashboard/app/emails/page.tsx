import { Metadata } from "next";
import { EmailsView } from "@/components/views/EmailsView";

export const metadata: Metadata = {
  title: "Emails — EmitMail",
  description: "Real-time feed of transactional email dispatches, BullMQ queue telemetry, and SMTP delivery logs.",
};

export default function EmailsPage() {
  return <EmailsView />;
}
