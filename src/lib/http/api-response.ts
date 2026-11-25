// SPDX-License-Identifier: Apache-2.0
import { NextResponse } from "next/server";
import { globalRateLimiter } from "@/services/rate-limit/rate-limiter";
import { sanitizePublicErrorMessage } from "@/services/ai/output-guardrails";

export interface ApiResponseOptions<T> {
  readonly status?: number;
  readonly data?: T;
  readonly warnings?: readonly string[];
  readonly cached?: boolean;
  readonly isDistributed?: boolean;
}

export function successResponse<T>(options: ApiResponseOptions<T>): NextResponse {
  const requestId = `req_${Math.random().toString(36).substring(2, 10)}`;
  const headers = new Headers();
  headers.set("X-Request-Id", requestId);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Cache-Control", "no-store, max-age=0");

  return NextResponse.json(
    {
      requestId,
      status: "SUCCESS",
      retrievedAt: new Date().toISOString(),
      data: options.data,
      warnings: options.warnings || []
    },
    {
      status: options.status ?? 200,
      headers
    }
  );
}

export function errorResponse(
  status: number,
  errorCode: string,
  message: string,
  retryable: boolean = false
): NextResponse {
  const requestId = `req_${Math.random().toString(36).substring(2, 10)}`;
  const headers = new Headers();
  headers.set("X-Request-Id", requestId);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Cache-Control", "no-store, max-age=0");

  const safeMessage =
    status >= 500
      ? "An internal service error occurred. Please retry or reference X-Request-Id."
      : sanitizePublicErrorMessage(message);

  return NextResponse.json(
    {
      requestId,
      status: "ERROR",
      errorCode,
      message: safeMessage,
      retryable
    },
    {
      status,
      headers
    }
  );
}

export async function checkRouteRateLimit(
  req: Request,
  limit: number = 60,
  windowSeconds: number = 60
): Promise<NextResponse | null> {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]!.trim() || "anonymous" : "anonymous";
  const rateLimitResult = await globalRateLimiter.checkLimit(`ip_${ip}`, limit, windowSeconds);

  if (!rateLimitResult.allowed) {
    return errorResponse(
      429,
      "RATE_LIMIT_EXCEEDED",
      `Rate limit exceeded. Try again in ${rateLimitResult.resetSeconds} seconds.`,
      true
    );
  }
  return null;
}
