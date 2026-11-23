// SPDX-License-Identifier: Apache-2.0
import { type NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse, checkRouteRateLimit } from "@/lib/http/api-response";
import { generateDeterministicRecommendations } from "@/domain/rules/deterministic-recommender";
import { evaluateIndoorSources } from "@/domain/indoor/source-control";
import { determineVentilationStrategy } from "@/domain/indoor/ventilation-decision";
import { calculateRoomFiltrationRequirements } from "@/domain/indoor/filtration-calculator";
import { globalAiExplainer } from "@/services/ai/ai-explainer";
import {
  HouseholdContextSchema,
  DwellingContextSchema,
  type HouseholdContext,
  type DwellingContext
} from "@/schemas/user-context.schema";
import { RoutineActivitySchema, type RoutineActivity } from "@/schemas/routine.schema";
import { CpcbCategorySchema, type CpcbAqiResult } from "@/schemas/cpcb.schema";
import { type CpcbPollutantId } from "@/schemas/pollutant.schema";
import { AiEvidenceItemSchema } from "@/schemas/ai-explanation.schema";

const RecommendationRequestSchema = z.object({
  overallAqi: z.number().nullable(),
  aqiCategory: CpcbCategorySchema.default("MODERATE"),
  prominentPollutant: z.string().nullable().optional(),
  householdContext: HouseholdContextSchema.optional(),
  routine: z.array(RoutineActivitySchema).optional(),
  dwelling: DwellingContextSchema.optional(),
  purifierRoomDimensions: z.object({
    lengthMeters: z.number().positive(),
    widthMeters: z.number().positive(),
    heightMeters: z.number().positive()
  }).optional(),
  evidenceList: z.array(AiEvidenceItemSchema).optional().default([]),
  language: z.enum(["en", "bn", "hi"]).default("en")
});

export async function POST(req: NextRequest) {
  const rateLimitError = await checkRouteRateLimit(req, 40, 60);
  if (rateLimitError) return rateLimitError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = RecommendationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, "SCHEMA_VALIDATION_ERROR", parsed.error.issues.map((i) => i.message).join("; "));
  }

  const data = parsed.data;
  const aqiCat = data.aqiCategory;

  const dwelling: DwellingContext = data.dwelling || {
    dwellingType: "APARTMENT_LOW_RISE",
    floorLevel: 3,
    proximityToMajorRoadMeters: 100,
    cooking: {
      primaryFuel: "LPG",
      kitchenVentilation: "KITCHEN_HOOD_CHIMNEY",
      averageDailyCookingHours: 2
    },
    indoorSources: {
      incenseOrDhoopDaily: false,
      mosquitoCoilUsage: false,
      indoorSmoking: false,
      unventedGasHeater: false
    },
    filtration: {
      hasAirPurifier: true,
      purifierLocations: ["LIVING_ROOM"],
      filterType: "TRUE_HEPA_H13",
      cleanAirDeliveryRateCadrM3H: 250
    },
    windowSealingQuality: "STANDARD_WINDOWS"
  };

  const activities: RoutineActivity[] = data.routine || [
    {
      activityId: crypto.randomUUID(),
      label: "Daily Commute",
      memberIds: [crypto.randomUUID()],
      locationType: "TRANSIT",
      physicalIntensity: "LIGHT",
      timeWindow: {
        startMinuteOfDay: 510,
        durationMinutes: 45
      },
      transitMode: "METRO_TRAIN",
      flexibility: {
        canShiftEarlierMinutes: 30,
        canShiftLaterMinutes: 30,
        canSubstituteWithIndoorAlternative: false,
        canChangeTransitMode: true
      }
    }
  ];

  const defaultHousehold: HouseholdContext = data.householdContext || {
    householdId: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
    preferredLanguage: data.language,
    members: [
      {
        id: activities[0]!.memberIds[0]!,
        nickname: "Primary",
        ageBracket: "ADULT_18_59",
        sensitivities: {
          respiratorySensitivity: false,
          cardiovascularSensitivity: false,
          pregnancy: false,
          allergiesOrSinusitis: false
        },
        dailyOutdoorHoursEstimate: 2
      }
    ],
    dwelling,
    routine: activities,
    constraints: {
      affordabilityTier: "MODERATE_TO_HIGH",
      priorityGoals: ["PROTECT_VULNERABLE_MEMBER", "OPTIMIZE_INDOOR_AIR"]
    }
  };

  const mockCpcbResult: CpcbAqiResult = {
    stationId: "station_current",
    calculatedAtUtc: new Date().toISOString(),
    overallAqi: data.overallAqi,
    rawMathematicalAqi: data.overallAqi,
    category: data.overallAqi !== null ? aqiCat : null,
    prominentPollutant: (data.prominentPollutant as CpcbPollutantId | null) || null,
    sufficiencyStatus: data.overallAqi !== null ? "SUFFICIENT" : "INSUFFICIENT_DATA",
    completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
    subIndices: [],
    isBeyondNominalScale: (data.overallAqi ?? 0) > 500,
    reportingCeilingCappedAqi: data.overallAqi !== null ? Math.min(data.overallAqi, 500) : null,
    explanation: data.overallAqi !== null ? `Calculated AQI ${data.overallAqi} (${aqiCat})` : "AQI unavailable"
  };

  // 1. Evaluate Deterministic Recommender
  const deterministicResponse = generateDeterministicRecommendations(defaultHousehold, mockCpcbResult);
  const deterministicRecs = deterministicResponse.actions;

  // 2. Indoor Air Coach Logic
  const indoorHazardAssessment = evaluateIndoorSources(dwelling);
  const ventilationDecision = determineVentilationStrategy(aqiCat, dwelling);

  let filtrationRec = null;
  if (data.purifierRoomDimensions) {
    filtrationRec = calculateRoomFiltrationRequirements({
      roomLengthMeters: data.purifierRoomDimensions.lengthMeters,
      roomWidthMeters: data.purifierRoomDimensions.widthMeters,
      roomHeightMeters: data.purifierRoomDimensions.heightMeters,
      targetAirChangesPerHour: 4.5
    });
  }

  // 3. AI Explanation with strict evidence grounding and deterministic fallback
  const aiResult = await globalAiExplainer.generateExplanation({
    evidenceList: data.evidenceList,
    deterministicRecommendations: deterministicRecs,
    overallAqi: data.overallAqi,
    aqiCategory: aqiCat,
    prominentPollutant: data.prominentPollutant || null,
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
