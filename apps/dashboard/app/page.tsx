import { Metadata } from "next";
import { HomeView } from "@/components/views/HomeView";

export const metadata: Metadata = {
  title: "Overview — EmitMail",
  description: "Cloudflare-Grade Email Infrastructure dashboard, metrics, and queue analytics.",
};

export default function HomePage() {
  return <HomeView />;
}
