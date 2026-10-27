import { Metadata } from "next";
import { SettingsView } from "@/components/views/SettingsView";

export const metadata: Metadata = {
  title: "Settings — EmitMail",
  description: "Configure workspace parameters, BullMQ worker concurrency, retry policies, and UI themes.",
};

export default function SettingsPage() {
  return <SettingsView />;
}
