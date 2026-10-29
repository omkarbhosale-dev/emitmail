import { Metadata } from "next";
import { AnalyticsView } from "@/components/views/AnalyticsView";

export const metadata: Metadata = {
  title: "Analytics — EmitMail",
  description: "Cloudflare-Grade Email Infrastructure metrics, delivery latencies, and queue analytics.",
};

export default function AnalyticsPage() {
  return <AnalyticsView />;
}
