// SPDX-License-Identifier: Apache-2.0
import { type NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, checkRouteRateLimit } from "@/lib/http/api-response";
import { parseValidatedJsonBody, verifySameOriginRequest } from "@/lib/http/request-guards";
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
  stations: z.array(NormalizedStationSchema).max(20).optional(),
  calculatedAqi: CpcbAqiResultSchema.nullable().optional(),
  observations: z.array(NormalizedObservationSchema).max(200).optional().default([]),
  forecast: z.array(NormalizedForecastSchema).max(200).optional().default([]),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(1500)
      })
    )
    .max(8)
    .optional(),
  hasConsentForPersonalization: z.boolean().default(false)
});

export async function POST(req: NextRequest) {
  const tRouteEntry = Date.now();
  const tRlStart = Date.now();
  const rateLimitError = await checkRouteRateLimit(req, 30, 60);
  const rateLimitMs = Date.now() - tRlStart;
  if (rateLimitError) return rateLimitError;

  const csrfError = verifySameOriginRequest(req, "Cross-origin chat execution forbidden.");
  if (csrfError) return csrfError;

  const tValStart = Date.now();
  const parsed = await parseValidatedJsonBody(req, ChatRequestSchema);
  const schemaValidationMs = Date.now() - tValStart;
  if (!parsed.ok) return parsed.response;

  const tAuthStart = Date.now();
  const isAuthenticated = await resolveSessionAuth(req);
  const authMs = Date.now() - tAuthStart;
  const d = parsed.data;

  const result = await generateGroundedChatReply({
    message: d.message,
    language: d.language,
    station: d.station ?? null,
    stations: d.stations,
    calculatedAqi: d.calculatedAqi ?? null,
    observations: d.observations,
    forecast: d.forecast,
    history: d.history,
    hasConsentForPersonalization: d.hasConsentForPersonalization,
    isAuthenticated,
    timeoutMs: 12000,
    routePreTimings: {
      rateLimitMs,
      schemaValidationMs,
      authMs,
      routeEntryMs: tRouteEntry
    }
  });

  return successResponse({
    data: result
  });
}
