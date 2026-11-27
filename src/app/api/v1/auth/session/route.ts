// SPDX-License-Identifier: Apache-2.0
import { type NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse, checkRouteRateLimit } from "@/lib/http/api-response";
import { parseValidatedJsonBody, verifySameOriginRequest } from "@/lib/http/request-guards";
import { globalFirebaseAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const SessionRequestSchema = z.object({
  idToken: z.string().min(1).max(8192)
});

const SESSION_COOKIE_NAME = "hs_session";

export async function POST(req: NextRequest) {
  const rateLimitError = await checkRouteRateLimit(req, 20, 60);
  if (rateLimitError) return rateLimitError;

  const csrfError = verifySameOriginRequest(req, "Cross-origin session creation forbidden.");
  if (csrfError) return csrfError;

  const parsed = await parseValidatedJsonBody(req, SessionRequestSchema, {
    maxBytes: 16_384,
    schemaErrorCode: "INVALID_TOKEN",
    schemaErrorMessage: "idToken is required."
  });
  if (!parsed.ok) return parsed.response;

  if (!globalFirebaseAuth.isConfigured()) {
    return errorResponse(
      503,
      "AUTH_NOT_CONFIGURED",
      "Firebase Admin is not configured on this server. Check FIREBASE_PROJECT_ID credentials."
    );
  }

  try {
    const { idToken } = parsed.data;
    const decoded = await globalFirebaseAuth.verifyIdToken(idToken);
    const sessionCookie = await globalFirebaseAuth.createSessionCookie(idToken);

    const isProd = process.env.NODE_ENV === "production";
    const res = successResponse({
      data: {
        uid: decoded.uid,
        email: decoded.email,
        authTime: decoded.auth_time
      }
    });

    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      maxAge: 5 * 24 * 60 * 60, // 5 days
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/"
    });

    return res;
  } catch (err: unknown) {
    return errorResponse(401, "UNAUTHORIZED", err instanceof Error ? err.message : "Authentication failed");
  }
}

export async function DELETE(req: NextRequest) {
  const rateLimitError = await checkRouteRateLimit(req, 30, 60);
  if (rateLimitError) return rateLimitError;

  const csrfError = verifySameOriginRequest(req, "Cross-origin session termination forbidden.");
  if (csrfError) return csrfError;

  const sessionCookie = req.cookies?.get?.(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie && globalFirebaseAuth.isConfigured()) {
    try {
      const decoded = await globalFirebaseAuth.verifySessionCookie(sessionCookie, false);
      await globalFirebaseAuth.revokeRefreshTokens(decoded.uid);
    } catch {
      // Ignore revocation error on expired cookie
    }
  }

  const res = successResponse({
    data: { message: "Session successfully terminated." }
  });

  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/"
  });

  return res;
}
