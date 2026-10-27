import { Metadata } from "next";
import { HomeView } from "@/components/views/HomeView";

export const metadata: Metadata = {
  title: "Analytics — EmitMail",
  description: "Cloudflare-Grade Email Infrastructure metrics, delivery latencies, and queue analytics.",
};

export default function AnalyticsPage() {
  return <HomeView />;
}
