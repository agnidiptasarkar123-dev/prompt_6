// SPDX-License-Identifier: Apache-2.0
import type { NextRequest } from "next/server";
import { globalFirebaseAuth } from "@/lib/firebase/admin";

export interface VerifiedSessionUser {
  readonly uid: string;
  readonly email?: string;
}

/**
 * Resolves verified caller identity strictly from an HttpOnly Firebase session
 * cookie verified by Firebase Admin SDK. Dev mock headers are ignored in production.
 */
export async function resolveSessionUser(req: NextRequest): Promise<VerifiedSessionUser | null> {
  const cookie = req.cookies?.get?.("hs_session")?.value;
  if (cookie && globalFirebaseAuth.isConfigured()) {
    try {
      const decoded = await globalFirebaseAuth.verifySessionCookie(cookie, true);
      return { uid: decoded.uid, email: decoded.email };
    } catch {
      return null;
    }
  }
  const devUid = req.headers.get("x-mock-auth-uid");
  if (devUid && process.env.NODE_ENV !== "production") {
    return { uid: devUid, email: `${devUid}@example.com` };
  }
  return null;
}

/**
 * Resolves caller boolean authentication status via `resolveSessionUser`.
 */
export async function resolveSessionAuth(req: NextRequest): Promise<boolean> {
  return (await resolveSessionUser(req)) !== null;
}
