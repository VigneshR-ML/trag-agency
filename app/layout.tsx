import type { Metadata } from "next";
import "./globals.css";
import "./portfolio.css";
import "./landing-additions.css";
import "./studio-additions.css";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
