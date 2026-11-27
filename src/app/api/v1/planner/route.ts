// SPDX-License-Identifier: Apache-2.0
import { type NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, checkRouteRateLimit } from "@/lib/http/api-response";
import { parseValidatedJsonBody } from "@/lib/http/request-guards";
import { PlannedActivitySchema } from "@/schemas/planner.schema";
import { CpcbAqiResultSchema } from "@/schemas/cpcb.schema";
import { NormalizedObservationSchema, NormalizedForecastSchema } from "@/schemas/providers/normalized-provider.schema";
import { evaluateScheduleDay } from "@/domain/planner/schedule-planner";

const PlannerEvaluateRequestSchema = z.object({
  activities: z.array(PlannedActivitySchema).max(30),
  aqiResult: CpcbAqiResultSchema.nullable().optional(),
  observations: z.array(NormalizedObservationSchema).max(200).optional().default([]),
  forecast: z.array(NormalizedForecastSchema).max(200).optional().default([])
});

export async function POST(req: NextRequest) {
  const rateLimitError = await checkRouteRateLimit(req, 60, 60);
  if (rateLimitError) return rateLimitError;

  const parsed = await parseValidatedJsonBody(req, PlannerEvaluateRequestSchema);
  if (!parsed.ok) return parsed.response;

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
