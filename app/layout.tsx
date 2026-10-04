import type { Metadata } from "next";
import "./globals.css";
import "./portfolio.css";

export const metadata: Metadata = {
  title: "TRAG Agency — Digital work with a pulse",
  description:
    "TRAG Agency designs and builds websites, apps, SaaS products, AI integrations, chatbots and SEO systems.",
  icons: {
    icon: "/favicon-brand.svg",
    shortcut: "/favicon-brand.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
