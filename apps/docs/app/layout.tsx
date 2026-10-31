import type { Metadata } from 'next';
import { RootProvider } from 'fumadocs-ui/provider/next';
import 'fumadocs-ui/style.css';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | emitmail docs',
    default: 'emitmail Documentation – High-Performance Self-Hosted Email Infrastructure',
  },
  description:
    'Complete technical guide to deploying EmitMail: DNS setup (SPF, DKIM, DMARC), BullMQ telemetry, Resend SDK drop-in compatibility, and inbound SMTP routing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col antialiased selection:bg-[#FF6600]/25 selection:text-[#FF6600]">
        <RootProvider
          search={{
            enabled: false,
          }}
          theme={{
            defaultTheme: 'dark',
            enableSystem: true,
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
