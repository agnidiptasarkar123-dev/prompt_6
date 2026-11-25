// SPDX-License-Identifier: Apache-2.0
import { type NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse, checkRouteRateLimit } from "@/lib/http/api-response";
import { PlannedActivitySchema } from "@/schemas/planner.schema";
import { CpcbAqiResultSchema } from "@/schemas/cpcb.schema";
import { NormalizedObservationSchema, NormalizedForecastSchema } from "@/schemas/providers/normalized-provider.schema";
import { evaluateScheduleDay } from "@/domain/planner/schedule-planner";

const PlannerEvaluateRequestSchema = z.object({
  activities: z.array(PlannedActivitySchema).max(30),
  aqiResult: CpcbAqiResultSchema.nullable().optional(),
  observations: z.array(NormalizedObservationSchema).optional().default([]),
  forecast: z.array(NormalizedForecastSchema).optional().default([])
});

export async function POST(req: NextRequest) {
  const rateLimitError = await checkRouteRateLimit(req, 60, 60);
  if (rateLimitError) return rateLimitError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = PlannerEvaluateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      400,
      "SCHEMA_VALIDATION_ERROR",
      parsed.error.issues.map((i) => i.message).join("; ")
    );
  }

  const evaluation = evaluateScheduleDay({
    activities: parsed.data.activities,
    aqiResult: parsed.data.aqiResult ?? null,
    observations: parsed.data.observations,
    forecast: parsed.data.forecast
  });

  return successResponse({
    data: evaluation
  });
}
