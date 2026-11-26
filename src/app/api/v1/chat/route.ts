// SPDX-License-Identifier: Apache-2.0
import { type NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse, checkRouteRateLimit } from "@/lib/http/api-response";
import { resolveSessionAuth } from "@/lib/http/session-auth";
import { generateGroundedChatReply } from "@/services/ai/chat-service";
import { SupportedAiLanguageSchema } from "@/schemas/ai-explanation.schema";
import { CpcbAqiResultSchema } from "@/schemas/cpcb.schema";
import {
  NormalizedStationSchema,
  NormalizedObservationSchema,
  NormalizedForecastSchema
} from "@/schemas/providers/normalized-provider.schema";

export const runtime = "nodejs";

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(1200),
  language: SupportedAiLanguageSchema.default("en"),
  station: NormalizedStationSchema.nullable().optional(),
  calculatedAqi: CpcbAqiResultSchema.nullable().optional(),
  observations: z.array(NormalizedObservationSchema).optional().default([]),
  forecast: z.array(NormalizedForecastSchema).optional().default([]),
  hasConsentForPersonalization: z.boolean().default(false)
});

export async function POST(req: NextRequest) {
  const rateLimitError = await checkRouteRateLimit(req, 30, 60);
  if (rateLimitError) return rateLimitError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      400,
      "SCHEMA_VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join("; ")
    );
  }

  const isAuthenticated = await resolveSessionAuth(req);
  const d = parsed.data;

  const result = await generateGroundedChatReply({
    message: d.message,
    language: d.language,
    station: d.station ?? null,
    calculatedAqi: d.calculatedAqi ?? null,
    observations: d.observations,
    forecast: d.forecast,
    hasConsentForPersonalization: d.hasConsentForPersonalization,
    isAuthenticated,
    timeoutMs: 12000
  });

  return successResponse({
    data: result
  });
}
