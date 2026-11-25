// SPDX-License-Identifier: Apache-2.0
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "HawaSaathi — Urban Air Quality Intelligence",
  description: "Personalised air quality intelligence platform for Indian cities",
  icons: {
    icon: "/favicon.svg",
    apple: "/logo-icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
