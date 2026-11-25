// SPDX-License-Identifier: Apache-2.0
import type { NextRequest } from "next/server";
import { globalFirebaseAuth } from "@/lib/firebase/admin";

/**
 * Resolves caller authentication strictly from an HttpOnly Firebase session
 * cookie verified by Firebase Admin SDK. Dev mock headers are ignored outside
 * local development and automated test environments.
 */
export async function resolveSessionAuth(req: NextRequest): Promise<boolean> {
  const cookie = req.cookies?.get?.("hs_session")?.value;
  if (cookie && globalFirebaseAuth.isConfigured()) {
    try {
      await globalFirebaseAuth.verifySessionCookie(cookie, true);
      return true;
    } catch {
      return false;
    }
  }
  const devUid = req.headers.get("x-mock-auth-uid");
  return Boolean(devUid && process.env.NODE_ENV !== "production");
}
