// SPDX-License-Identifier: Apache-2.0
import { type NextRequest } from "next/server";
import { successResponse, errorResponse, checkRouteRateLimit } from "@/lib/http/api-response";
import { globalFirebaseAuth } from "@/lib/firebase/admin";
import { globalProfileRepository } from "@/services/profiles/profile-repository";
import { UpdateProfileRequestSchema } from "@/schemas/user-profile.schema";

const SESSION_COOKIE_NAME = "hs_session";

async function getAuthenticatedUid(req: NextRequest): Promise<{ uid: string; email?: string } | null> {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;

  if (globalFirebaseAuth.isConfigured()) {
    try {
      const decoded = await globalFirebaseAuth.verifySessionCookie(cookie, true);
      return { uid: decoded.uid, email: decoded.email };
    } catch {
      return null;
    }
  }

  // Development fallback: mock dev session token if header is explicitly provided in tests
  const devUid = req.headers.get("x-mock-auth-uid");
  if (devUid && process.env.NODE_ENV !== "production") {
    return { uid: devUid, email: `${devUid}@example.com` };
  }

  return null;
}

export async function GET(req: NextRequest) {
  const rateLimitError = await checkRouteRateLimit(req, 60, 60);
  if (rateLimitError) return rateLimitError;

  const authUser = await getAuthenticatedUid(req);
  if (!authUser) {
    return errorResponse(401, "UNAUTHORIZED", "Valid authentication session cookie is required.");
  }

  const profile = await globalProfileRepository.getProfile(authUser.uid);
  if (!profile) {
    return errorResponse(404, "PROFILE_NOT_FOUND", "User profile has not been created yet.");
  }

  return successResponse({
    data: profile
  });
}

export async function PUT(req: NextRequest) {
  const rateLimitError = await checkRouteRateLimit(req, 40, 60);
  if (rateLimitError) return rateLimitError;

  const authUser = await getAuthenticatedUid(req);
  if (!authUser) {
    return errorResponse(401, "UNAUTHORIZED", "Valid authentication session cookie is required.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = UpdateProfileRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, "SCHEMA_VALIDATION_ERROR", parsed.error.issues.map((i) => i.message).join("; "));
  }

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

  const authUser = await getAuthenticatedUid(req);
  if (!authUser) {
    return errorResponse(401, "UNAUTHORIZED", "Valid authentication session cookie is required.");
  }

  const deleted = await globalProfileRepository.deleteProfile(authUser.uid);
  return successResponse({
    data: {
      deleted,
      uid: authUser.uid,
      message: "User profile and all associated context permanently deleted."
    }
  });
}
