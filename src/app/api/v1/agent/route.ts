// SPDX-License-Identifier: Apache-2.0
import { type NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse, checkRouteRateLimit } from "@/lib/http/api-response";
import { resolveSessionAuth } from "@/lib/http/session-auth";
import { runIntelligentAgentTask } from "@/services/ai/agent-orchestrator";
import { SupportedAiLanguageSchema } from "@/schemas/ai-explanation.schema";
import { CpcbAqiResultSchema } from "@/schemas/cpcb.schema";
import {
  NormalizedStationSchema,
  NormalizedObservationSchema,
  NormalizedForecastSchema
} from "@/schemas/providers/normalized-provider.schema";

const AgentRequestSchema = z.object({
  prompt: z.string().min(1).max(1000),
  language: SupportedAiLanguageSchema.default("en"),
  stationId: z.string().optional(),
  station: NormalizedStationSchema.nullable().optional(),
  calculatedAqi: CpcbAqiResultSchema.nullable().optional(),
  observations: z.array(NormalizedObservationSchema).optional().default([]),
  forecast: z.array(NormalizedForecastSchema).optional().default([]),
  coordinates: z
    .object({
      latitude: z.number().min(6).max(38),
      longitude: z.number().min(68).max(98)
    })
    .optional(),
  roomDimensions: z
    .object({
      length: z.number().positive().max(50),
      width: z.number().positive().max(50),
      height: z.number().positive().max(15)
    })
    .optional(),
  hasCloudConsent: z.boolean().default(false)
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

  const parsed = AgentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      400,
      "SCHEMA_VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join("; ")
    );
  }

  const isAuthenticated = await resolveSessionAuth(req);
  const d = parsed.data;

  try {
    const response = await runIntelligentAgentTask({
      prompt: d.prompt,
      language: d.language,
      stationId: d.stationId,
      station: d.station ?? null,
      calculatedAqi: d.calculatedAqi ?? null,
      observations: d.observations,
      forecast: d.forecast,
      coordinates: d.coordinates,
      roomDimensions: d.roomDimensions,
      context: {
        isAuthenticated,
        hasCloudConsent: d.hasCloudConsent
      }
    });

    return successResponse({
      data: response
    });
  } catch (err: unknown) {
    return errorResponse(500, "AGENT_EXECUTION_ERROR", err instanceof Error ? err.message : String(err));
  }
}
