import { Metadata } from "next";
import { ApiKeysView } from "@/components/views/ApiKeysView";

export const metadata: Metadata = {
  title: "API Keys — EmitMail",
  description: "Generate and manage API keys for programmatic email dispatch and SDK integrations.",
};

export default function ApiKeysPage() {
  return <ApiKeysView />;
}
