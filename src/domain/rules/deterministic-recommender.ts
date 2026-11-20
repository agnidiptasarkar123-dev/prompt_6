import { RecommendationResponse, RecommendationAction } from "@/schemas/recommendation.schema";
import { HouseholdContext } from "@/schemas/user-context.schema";
import { CpcbAqiResult } from "@/schemas/cpcb.schema";
import { CPCB_HEALTH_ADVISORIES } from "./cpcb-advisory-matrix";
import { checkRoutineSafetyGuardrails } from "./safety-guardrails";
import { evaluateRoutineExposureWindows } from "../user-context/routine-calculator";
import { determineVentilationStrategy } from "../indoor/ventilation-decision";

/**
 * Deterministic Recommendation Engine:
 * Generates transparent, category-aware, evidence-grounded recommendations without AI.
 * 
 * CRITICAL RULE: NEVER invents air quality measurements.
 * If measurements are unavailable, it generates safe precautionary advice and states data is unobserved.
 */
export function generateDeterministicRecommendations(
  context: HouseholdContext,
  cpcbResult: CpcbAqiResult | null,
  nowUtc: string = new Date().toISOString()
): RecommendationResponse {
  const isDataAvailable = cpcbResult !== null && cpcbResult.overallAqi !== null && cpcbResult.category !== null;
  const category = isDataAvailable ? cpcbResult.category! : "MODERATE";
  const aqiValue = isDataAvailable ? cpcbResult.overallAqi : "Unobserved";
  const advisory = CPCB_HEALTH_ADVISORIES[category];

  const actions: RecommendationAction[] = [];

  // Evidence citation base
  const evidenceId = isDataAvailable
    ? `EVID-STATION-${cpcbResult.stationId}-AQI-${cpcbResult.overallAqi}`
    : "EVID-SEASONAL-CLIMATOLOGY";

  const evidenceSource = isDataAvailable
    ? `Station ${cpcbResult.stationId} CPCB Sub-Index Engine (Type B Calculated AQI)`
    : "Seasonal Atmospheric Climatology Guidance (Unobserved Baseline)";

  // 1. Ventilation Guidance Action (Integrated with Indoor Combustion Hazard Check)
  const ventDecision = determineVentilationStrategy(category, context.dwelling);
  actions.push({
    actionId: crypto.randomUUID(),
    category: "VENTILATION_WINDOW",
    urgency: ventDecision.indoorCombustionOverrideActive ? "IMMEDIATE" : (category === "VERY_POOR" || category === "SEVERE" ? "IMMEDIATE" : "SCHEDULED"),
    actionSummary: ventDecision.practicalMethod.slice(0, 140),
    reasoning: ventDecision.expectedBenefit.slice(0, 300),
    implementationMethod: ventDecision.practicalMethod.slice(0, 300),
    expectedExposureReduction: ventDecision.indoorCombustionOverrideActive
      ? "Evacuates indoor CO & PM spikes up to 80%."
      : "Reduces particulate infiltration up to 50%.",
    applicableConstraintsOrLimits: ventDecision.cautions[0]!.slice(0, 200),
    evidenceReferences: [
      {
        evidenceId,
        source: evidenceSource,
        measuredValue: isDataAvailable ? `AQI ${aqiValue} (${category})` : "Unobserved ambient air",
        timestamp: nowUtc
      }
    ]
  });

  // 2. Commute & Routine Adaptation Action (Inspecting Household Members & Vulnerabilities)
  const safetyViolations = checkRoutineSafetyGuardrails(context.routine, category, context.members);
  if (safetyViolations.length > 0) {
    for (const violation of safetyViolations) {
      actions.push({
        actionId: crypto.randomUUID(),
        category: "EXERCISE_ADAPTATION",
        urgency: "IMMEDIATE",
        actionSummary: `Safety Adjustment: ${violation.label}`.slice(0, 140),
        reasoning: violation.violationReason.slice(0, 300),
        implementationMethod: violation.mandatoryCorrection.slice(0, 300),
        expectedExposureReduction: "Eliminates high-volume toxic particulate intake during peak pollution.",
        applicableConstraintsOrLimits: violation.affectedMemberNickname
          ? `Applies to vulnerable member: ${violation.affectedMemberNickname}`
          : "Applies to participating household members.",
        evidenceReferences: [
          {
            evidenceId,
            source: evidenceSource,
            measuredValue: isDataAvailable ? `AQI ${aqiValue} (${category})` : "Unobserved ambient air",
            timestamp: nowUtc
          }
        ]
      });
    }
  } else {
    // Check for diurnal peak commute shift (NCDC Peak Hours & Inversion Guidance)
    const routineWindows = evaluateRoutineExposureWindows(context.routine, category);
    const peakRisk = routineWindows.find((w) => w.isNcdcPeakHourRisk && w.suggestedShiftMinutes !== 0);
    if (peakRisk) {
      actions.push({
        actionId: crypto.randomUUID(),
        category: "COMMUTE_TIMING",
        urgency: "SCHEDULED",
        actionSummary: `Shift ${peakRisk.label} timing by ${Math.abs(peakRisk.suggestedShiftMinutes)} minutes.`.slice(0, 140),
        reasoning: peakRisk.guidanceRationale.slice(0, 300),
        implementationMethod: `Adjust schedule departure away from morning/evening pollution peaks per NCDC October 2025 health guidance.`.slice(0, 300),
        expectedExposureReduction: "Estimated 20% to 35% reduction in direct transit exhaust inhalation.",
        applicableConstraintsOrLimits: "Flexible within declared schedule window.",
        evidenceReferences: [
          {
            evidenceId,
            source: evidenceSource,
            measuredValue: `AQI ${aqiValue} (${category})`,
            timestamp: nowUtc
          }
        ]
      });
    }
  }

  // 3. Indoor Source Control Action
  if (context.dwelling.indoorSources.incenseOrDhoopDaily) {
    actions.push({
      actionId: crypto.randomUUID(),
      category: "SOURCE_CONTROL_INDOOR",
      urgency: "SCHEDULED",
      actionSummary: "Reduce or substitute daily incense (agarbatti/dhoop) burning.",
      reasoning: "Burning incense indoors generates high concentrations of PM2.5, benzene, and polycyclic aromatic hydrocarbons.",
      implementationMethod: "Substitute with LED lights, electric diffusers without combustion, or ventilate immediately following brief prayer rituals.",
      expectedExposureReduction: "Removes up to 80% of localized indoor particulate spikes.",
      applicableConstraintsOrLimits: "Cultural practice adaptation; non-judgmental guidance.",
      evidenceReferences: [
        {
          evidenceId,
          source: evidenceSource,
          measuredValue: "Indoor Source Combustion Profile",
          timestamp: nowUtc
        }
      ]
    });
  }

  const overallRiskSummary = isDataAvailable
    ? `Current air quality is ${category} (AQI ${aqiValue}). ${advisory.generalPublicAdvisory} ${advisory.sensitivePopulationAdvisory}`
    : `Ambient air quality is currently unobserved. Precautionary health guidance is provided based on seasonal baseline climatology.`;

  return {
    recommendationId: crypto.randomUUID(),
    generatedAtUtc: nowUtc,
    generator: "RULE_ENGINE",
    overallRiskSummary,
    actions
  };
}
