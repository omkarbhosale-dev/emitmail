import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

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
      className="h-full"
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
