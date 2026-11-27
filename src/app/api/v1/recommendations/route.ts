// SPDX-License-Identifier: Apache-2.0
import { type NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, checkRouteRateLimit } from "@/lib/http/api-response";
import { parseValidatedJsonBody } from "@/lib/http/request-guards";
import { generateDeterministicRecommendations } from "@/domain/rules/deterministic-recommender";
import { evaluateIndoorSources } from "@/domain/indoor/source-control";
import { determineVentilationStrategy } from "@/domain/indoor/ventilation-decision";
import { calculateRoomFiltrationRequirements } from "@/domain/indoor/filtration-calculator";
import { globalAiExplainer } from "@/services/ai/ai-explainer";
import { buildRecommendationEvaluationContext } from "@/services/recommendations/recommendation-context-builder";
import { HouseholdContextSchema, DwellingContextSchema } from "@/schemas/user-context.schema";
import { RoutineActivitySchema } from "@/schemas/routine.schema";
import { CpcbCategorySchema } from "@/schemas/cpcb.schema";
import { CpcbPollutantIdSchema } from "@/schemas/pollutant.schema";
import { AiEvidenceItemSchema, SupportedAiLanguageSchema } from "@/schemas/ai-explanation.schema";

const RecommendationRequestSchema = z.object({
  overallAqi: z.number().min(0).max(2000).nullable(),
  aqiCategory: CpcbCategorySchema.nullable().optional().default(null),
  prominentPollutant: CpcbPollutantIdSchema.nullable().optional(),
  householdContext: HouseholdContextSchema.optional(),
  routine: z.array(RoutineActivitySchema).max(50).optional(),
  dwelling: DwellingContextSchema.optional(),
  purifierRoomDimensions: z
    .object({
      lengthMeters: z.number().positive().max(100),
      widthMeters: z.number().positive().max(100),
      heightMeters: z.number().positive().max(20)
    })
    .optional(),
  evidenceList: z.array(AiEvidenceItemSchema).max(100).optional().default([]),
  language: SupportedAiLanguageSchema.default("en")
});

export async function POST(req: NextRequest) {
  const rateLimitError = await checkRouteRateLimit(req, 40, 60);
  if (rateLimitError) return rateLimitError;

  const parsed = await parseValidatedJsonBody(req, RecommendationRequestSchema);
  if (!parsed.ok) return parsed.response;

  const data = parsed.data;
  const ctx = buildRecommendationEvaluationContext({
    overallAqi: data.overallAqi,
    aqiCategory: data.aqiCategory,
    prominentPollutant: data.prominentPollutant ?? null,
    householdContext: data.householdContext,
    routine: data.routine,
    dwelling: data.dwelling,
    language: data.language
  });

  // 1. Evaluate Deterministic Recommender
  const deterministicResponse = generateDeterministicRecommendations(
    ctx.householdContext,
    ctx.stationAqiSnapshot
  );
  const deterministicRecs = deterministicResponse.actions;

  // 2. Indoor Air Coach Logic
  const indoorHazardAssessment = evaluateIndoorSources(ctx.dwelling);
  const ventilationDecision = determineVentilationStrategy(ctx.effectiveCategory, ctx.dwelling);

  const filtrationRec = data.purifierRoomDimensions
    ? calculateRoomFiltrationRequirements({
        roomLengthMeters: data.purifierRoomDimensions.lengthMeters,
        roomWidthMeters: data.purifierRoomDimensions.widthMeters,
        roomHeightMeters: data.purifierRoomDimensions.heightMeters,
        targetAirChangesPerHour: 4.5
      })
    : null;

  // 3. AI Explanation with strict evidence grounding and deterministic fallback
  const aiResult = await globalAiExplainer.generateExplanation({
    evidenceList: data.evidenceList,
    deterministicRecommendations: deterministicRecs,
    overallAqi: data.overallAqi,
    aqiCategory: ctx.effectiveCategory ?? "UNAVAILABLE",
    prominentPollutant: data.prominentPollutant ?? null,
    language: data.language
  });

  return successResponse({
    data: {
      deterministicRecommendations: deterministicRecs,
      indoorAirCoach: {
        hazardAssessment: indoorHazardAssessment,
        ventilation: ventilationDecision,
        filtration: filtrationRec,
        sensorWarning: "Actual indoor air quality cannot be measured without dedicated indoor environmental sensors. Guidance is based on source control and outdoor ambient infiltration."
      },
      aiExplanation: aiResult.explanation,
      isAiGenerated: aiResult.isAiGenerated
    },
    warnings: aiResult.warnings
  });
}
