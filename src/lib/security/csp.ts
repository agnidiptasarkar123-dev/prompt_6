// SPDX-License-Identifier: Apache-2.0

/**
 * Generates a 128-bit cryptographic Base64 nonce compatible with both Edge/Web
 * Crypto and Node runtimes without Weak/predictable PRNG fallback.
 */
export function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Builds the strict Content-Security-Policy string.
 * Note: `'unsafe-inline'` is strictly forbidden from `script-src`; Next.js SSR
 * attaches the per-request nonce to framework hydration scripts automatically.
 * `style-src 'self' 'unsafe-inline'` remains scoped solely for Leaflet dynamic
 * SVG/DOM inline transforms and Tailwind utilities.
 */
export function buildContentSecurityPolicy(nonce?: string): string {
  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}' https://apis.google.com`
    : "script-src 'self' https://apis.google.com";

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
    "font-src 'self' data:",
    "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://firebaseinstallations.googleapis.com",
    "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join("; ");
}

export const SECURITY_RESPONSE_HEADERS: readonly { readonly key: string; readonly value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }
];
