import { Metadata } from "next";
import { LoginView } from "@/components/views/LoginView";

export const metadata: Metadata = {
  title: "Sign In — EmitMail",
  description: "Sign in to your EmitMail administrator dashboard.",
};

export default function LoginPage() {
  return <LoginView />;
}

