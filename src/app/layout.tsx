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
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-[var(--hs-surface-bg)] focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-[var(--hs-text-primary)] focus:ring-2 focus:ring-[var(--hs-focus-ring)] focus:shadow-lg"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
