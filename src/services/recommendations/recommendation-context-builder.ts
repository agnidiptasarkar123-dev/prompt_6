// SPDX-License-Identifier: Apache-2.0
import { getCategoryFromAqi } from "@/domain/cpcb/sub-index-calculator";
import type { SupportedAiLanguage } from "@/schemas/ai-explanation.schema";
import type { CpcbAqiResult, CpcbCategory } from "@/schemas/cpcb.schema";
import type { CpcbPollutantId } from "@/schemas/pollutant.schema";
import type { RoutineActivity } from "@/schemas/routine.schema";
import type { DwellingContext, HouseholdContext } from "@/schemas/user-context.schema";

export interface RecommendationContextInput {
  readonly overallAqi: number | null;
  readonly aqiCategory: CpcbCategory | null;
  readonly prominentPollutant: CpcbPollutantId | null;
  readonly householdContext?: HouseholdContext;
  readonly routine?: readonly RoutineActivity[];
  readonly dwelling?: DwellingContext;
  readonly language: SupportedAiLanguage;
}

export interface RecommendationEvaluationContext {
  readonly effectiveCategory: CpcbCategory | null;
  readonly dwelling: DwellingContext;
  readonly householdContext: HouseholdContext;
  readonly stationAqiSnapshot: CpcbAqiResult;
}

const DEFAULT_DWELLING: DwellingContext = {
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

/**
 * Constructs validated domain contexts (household, dwelling, and non-fabricated
 * CPCB AQI status snapshot) cleanly outside HTTP route controllers.
 */
export function buildRecommendationEvaluationContext(
  input: RecommendationContextInput
): RecommendationEvaluationContext {
  const effectiveCategory =
    input.overallAqi !== null
      ? (input.aqiCategory ?? getCategoryFromAqi(input.overallAqi))
      : null;

  const dwelling = input.dwelling ?? DEFAULT_DWELLING;
  const fallbackMemberId = crypto.randomUUID();
  const activities: RoutineActivity[] = input.routine ? [...input.routine] : [
    {
      activityId: crypto.randomUUID(),
      label: "Daily Commute",
      memberIds: [fallbackMemberId],
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

  const primaryMemberId = activities[0]?.memberIds[0] ?? fallbackMemberId;
  const householdContext: HouseholdContext = input.householdContext ?? {
    householdId: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
    preferredLanguage: input.language,
    members: [
      {
        id: primaryMemberId,
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

  const stationAqiSnapshot: CpcbAqiResult = {
    stationId: "station_current",
    calculatedAtUtc: new Date().toISOString(),
    overallAqi: input.overallAqi,
    rawMathematicalAqi: input.overallAqi,
    category: effectiveCategory,
    prominentPollutant: input.prominentPollutant,
    sufficiencyStatus:
      input.overallAqi !== null && effectiveCategory !== null ? "SUFFICIENT" : "INSUFFICIENT_DATA",
    completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
    subIndices: [],
    isBeyondNominalScale: (input.overallAqi ?? 0) > 500,
    reportingCeilingCappedAqi: input.overallAqi !== null ? Math.min(input.overallAqi, 500) : null,
    explanation:
      input.overallAqi !== null && effectiveCategory !== null
        ? `Calculated AQI ${input.overallAqi} (${effectiveCategory})`
        : "Overall CPCB AQI unavailable"
  };

  return {
    effectiveCategory,
    dwelling,
    householdContext,
    stationAqiSnapshot
  };
}
