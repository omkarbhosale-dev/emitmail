import type { Metadata } from "next";
import { Suspense } from "react";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EmitMail — Cloudflare-Grade Email Infrastructure",
  description:
    "Self-hosted email dispatch, BullMQ telemetry, DKIM/SPF domain verification, API keys, and webhooks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-mode="dark"
      suppressHydrationWarning
      className={`${bricolage.variable} ${inter.variable} h-full`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const saved = localStorage.getItem('emitmail-theme-mode');
                  const mode = saved || 'dark';
                  document.documentElement.setAttribute('data-mode', mode);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-kumo-canvas text-kumo-default font-sans">
        <Suspense fallback={<div className="h-screen w-screen bg-kumo-canvas" />}>
          <AppShell>
            {children}
          </AppShell>
        </Suspense>
      </body>
    </html>
  );
}
