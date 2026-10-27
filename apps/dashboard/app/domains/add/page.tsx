import { Metadata } from "next";
import { AddDomainView } from "@/components/views/AddDomainView";

export const metadata: Metadata = {
  title: "Add Domain — EmitMail",
  description: "Register a new sending domain and generate 2048-bit DKIM, Return-Path SPF, MX, and DMARC records.",
};

export default function DomainsAddPage() {
  return <AddDomainView />;
}
