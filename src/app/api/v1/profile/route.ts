// SPDX-License-Identifier: Apache-2.0
import { type NextRequest } from "next/server";
import { successResponse, errorResponse, checkRouteRateLimit } from "@/lib/http/api-response";
import { parseValidatedJsonBody, verifySameOriginRequest } from "@/lib/http/request-guards";
import { resolveSessionUser } from "@/lib/http/session-auth";
import { globalFirebaseAuth } from "@/lib/firebase/admin";
import { globalProfileRepository } from "@/services/profiles/profile-repository";
import { UpdateProfileRequestSchema } from "@/schemas/user-profile.schema";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "hs_session";

export async function GET(req: NextRequest) {
  const rateLimitError = await checkRouteRateLimit(req, 60, 60);
  if (rateLimitError) return rateLimitError;

  const authUser = await resolveSessionUser(req);
  if (!authUser) {
    return errorResponse(401, "UNAUTHORIZED", "Valid authentication session cookie is required.");
  }

  const profile = await globalProfileRepository.getProfile(authUser.uid);
  if (!profile) {
    return errorResponse(404, "PROFILE_NOT_FOUND", "User profile has not been created yet.");
  }

  const searchParams = req.nextUrl?.searchParams ?? new URL(req.url).searchParams;
  const isExport = searchParams.get("export") === "json";
  const res = successResponse({
    data: profile
  });

  if (isExport) {
    const safeUid = authUser.uid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "user";
    res.headers.set("Content-Disposition", `attachment; filename="hawasaathi-profile-${safeUid}.json"`);
  }

  return res;
}

export async function PUT(req: NextRequest) {
  const rateLimitError = await checkRouteRateLimit(req, 40, 60);
  if (rateLimitError) return rateLimitError;

  const csrfError = verifySameOriginRequest(req, "Cross-origin profile update forbidden.");
  if (csrfError) return csrfError;

  const authUser = await resolveSessionUser(req);
  if (!authUser) {
    return errorResponse(401, "UNAUTHORIZED", "Valid authentication session cookie is required.");
  }

  const parsed = await parseValidatedJsonBody(req, UpdateProfileRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const updated = await globalProfileRepository.saveProfile(authUser.uid, parsed.data, authUser.email);
    return successResponse({
      data: updated
    });
  } catch (err: unknown) {
    return errorResponse(400, "PROFILE_UPDATE_FAILED", err instanceof Error ? err.message : String(err));
  }
}

export async function DELETE(req: NextRequest) {
  const rateLimitError = await checkRouteRateLimit(req, 20, 60);
  if (rateLimitError) return rateLimitError;

  const csrfError = verifySameOriginRequest(req, "Cross-origin profile deletion forbidden.");
  if (csrfError) return csrfError;

  const authUser = await resolveSessionUser(req);
  if (!authUser) {
    return errorResponse(401, "UNAUTHORIZED", "Valid authentication session cookie is required.");
  }

  // 1. Cascading hard delete: delete profile document and household context from Firestore
  const deleted = await globalProfileRepository.deleteProfile(authUser.uid);

  // 2. Revoke Firebase refresh tokens if Firebase Admin is configured
  if (globalFirebaseAuth.isConfigured()) {
    try {
      await globalFirebaseAuth.revokeRefreshTokens(authUser.uid);
    } catch (err: unknown) {
      console.warn("Could not revoke refresh tokens during account deletion:", err);
    }
  }

  // 3. Clear HttpOnly session cookie
  const res = successResponse({
    data: {
      deleted,
      uid: authUser.uid,
      message: "User profile, associated context, and active sessions permanently deleted."
    }
  });

  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return res;
}

export const POST = PUT;
