import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EmitMail — Self-Hosted Email Service Provider",
  description: "Modern, self-hosted transactional email infrastructure and deliverability console.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full bg-white antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-[#262626]">
        {children}
      </body>
    </html>
  );
}
