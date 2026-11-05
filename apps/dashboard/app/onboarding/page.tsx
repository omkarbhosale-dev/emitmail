import { Metadata } from "next";
import { OnboardingView } from "@/components/views/OnboardingView";

export const metadata: Metadata = {
  title: "Setup Wizard — EmitMail",
  description: "Configure your primary sending domain and VPS mail server.",
};

export default function OnboardingPage() {
  return <OnboardingView />;
}
