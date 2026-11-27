// SPDX-License-Identifier: Apache-2.0
import type { NextResponse } from "next/server";
import type { z } from "zod";
import { errorResponse } from "./api-response";

const DEFAULT_MAX_BODY_BYTES = 262_144; // 256 KB strict JSON ingress cap

function extractExpectedHost(req: Request): string | null {
  const rawHost = req.headers.get("host")?.trim();
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (rawHost) {
    const hostName = rawHost.split(":")[0]!.toLowerCase();
    const isInternalHop = hostName === "localhost" || hostName === "127.0.0.1" || hostName === "internal";
    if (forwardedHost && isInternalHop) {
      return forwardedHost;
    }
    return rawHost;
  }
  if (forwardedHost) return forwardedHost;
  try {
    return new URL(req.url).host;
  } catch {
    return null;
  }
}

/**
 * Verifies same-origin semantics on state-changing requests using browser Fetch Metadata
 * (`Sec-Fetch-Site`) and `Origin` scheme + host matching.
 */
export function verifySameOriginRequest(
  req: Request,
  message: string = "Cross-origin state-changing request forbidden."
): NextResponse | null {
  const secFetchSite = req.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
    return errorResponse(403, "CSRF_FORBIDDEN", message);
  }

  const origin = req.headers.get("origin");
  if (!origin) {
    return null;
  }

  const host = extractExpectedHost(req);
  if (!host) {
    return errorResponse(403, "CSRF_FORBIDDEN", "Host header missing on cross-origin check.");
  }

  try {
    const originUrl = new URL(origin);
    if (originUrl.protocol !== "http:" && originUrl.protocol !== "https:") {
      return errorResponse(403, "CSRF_FORBIDDEN", "Malformed origin header.");
    }
    const originHost = originUrl.host;
    if (originHost !== host) {
      return errorResponse(403, "CSRF_FORBIDDEN", message);
    }

    const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
    const expectedProto = req.url.startsWith("https://")
      ? "https"
      : forwardedProto || (req.url.startsWith("http://") ? "http" : null);
    if (expectedProto && originUrl.protocol !== `${expectedProto}:`) {
      return errorResponse(403, "CSRF_FORBIDDEN", "Cross-scheme origin mismatch forbidden.");
    }
  } catch {
    return errorResponse(403, "CSRF_FORBIDDEN", "Malformed origin header.");
  }
  return null;
}

export interface JsonBodyParseOptions {
  readonly maxBytes?: number;
  readonly schemaErrorCode?: string;
  readonly schemaErrorMessage?: string;
}

export type ValidatedBodyResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly response: NextResponse };

async function readBodyWithinByteLimit(
  req: Request,
  maxBytes: number
): Promise<{ readonly ok: true; readonly text: string } | { readonly ok: false }> {
  const stream = req.body;
  if (stream && typeof stream.getReader === "function") {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel().catch(() => {});
          return { ok: false };
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const merged = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true, text: new TextDecoder().decode(merged) };
  }

  const rawText = await req.text();
  if (new TextEncoder().encode(rawText).byteLength > maxBytes) {
    return { ok: false };
  }
  return { ok: true, text: rawText };
}

/**
 * Enforces an explicit payload byte ceiling via streaming chunk accounting before JSON
 * parsing, and validates decoded data against a Zod schema.
 */
export async function parseValidatedJsonBody<T>(
  req: Request,
  schema: z.ZodType<T>,
  options: JsonBodyParseOptions = {}
): Promise<ValidatedBodyResult<T>> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BODY_BYTES;
  const contentLengthHeader = req.headers.get("content-length");
  if (contentLengthHeader) {
    const declaredLength = Number(contentLengthHeader);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      return {
        ok: false,
        response: errorResponse(413, "PAYLOAD_TOO_LARGE", `Request body exceeds maximum size of ${maxBytes} bytes.`)
      };
    }
  }

  let body: unknown;
  try {
    const readResult = await readBodyWithinByteLimit(req, maxBytes);
    if (!readResult.ok) {
      return {
        ok: false,
        response: errorResponse(413, "PAYLOAD_TOO_LARGE", `Request body exceeds maximum size of ${maxBytes} bytes.`)
      };
    }
    if (readResult.text.trim().length === 0) {
      return {
        ok: false,
        response: errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.")
      };
    }
    body = JSON.parse(readResult.text);
  } catch {
    return {
      ok: false,
      response: errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.")
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: errorResponse(
        400,
        options.schemaErrorCode ?? "SCHEMA_VALIDATION_ERROR",
        options.schemaErrorMessage ?? parsed.error.issues.map((i) => i.message).join("; ")
      )
    };
  }

  return { ok: true, data: parsed.data };
}
