// SPDX-License-Identifier: Apache-2.0
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HawaSaathi — Urban Air Quality Intelligence",
  description: "Personalised air quality intelligence platform for Indian cities",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
