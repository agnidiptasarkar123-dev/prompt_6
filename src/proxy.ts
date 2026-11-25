// SPDX-License-Identifier: Apache-2.0
import { NextResponse, type NextRequest } from "next/server";
import {
  buildContentSecurityPolicy,
  generateCspNonce,
  SECURITY_RESPONSE_HEADERS
} from "@/lib/security/csp";

export function proxy(request: NextRequest) {
  const nonce = generateCspNonce();
  const cspHeaderValue = buildContentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeaderValue);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  response.headers.set("Content-Security-Policy", cspHeaderValue);
  for (const h of SECURITY_RESPONSE_HEADERS) {
    response.headers.set(h.key, h.value);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|logo-icon\\.svg|theme-init\\.js).*)"
  ]
};
