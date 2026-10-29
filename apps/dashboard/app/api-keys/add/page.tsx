import { Metadata } from "next";
import { CreateApiKeyView } from "@/components/views/CreateApiKeyView";

export const metadata: Metadata = {
  title: "Create API Key — EmitMail",
  description: "Generate a new cryptographic API key for sending emails and Resend SDK integration.",
};

export default function CreateApiKeyPage() {
  return <CreateApiKeyView />;
}

