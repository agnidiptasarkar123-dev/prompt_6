import { RecommendationResponse, RecommendationAction } from "@/schemas/recommendation.schema";
import { HouseholdContext } from "@/schemas/user-context.schema";
import { CpcbAqiResult } from "@/schemas/cpcb.schema";
import { CPCB_HEALTH_ADVISORIES } from "./cpcb-advisory-matrix";
import { checkRoutineSafetyGuardrails } from "./safety-guardrails";
import { evaluateRoutineExposureWindows } from "../user-context/routine-calculator";

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
  const category = cpcbResult?.category ?? "MODERATE";
  const aqiValue = cpcbResult?.overallAqi ?? "Unobserved";
  const advisory = CPCB_HEALTH_ADVISORIES[category];

  const actions: RecommendationAction[] = [];

  // Evidence citation base
  const evidenceId = cpcbResult
    ? `EVID-STATION-${cpcbResult.stationId}-AQI-${cpcbResult.overallAqi}`
    : "EVID-SEASONAL-CLIMATOLOGY";

  const evidenceSource = cpcbResult
    ? `Station ${cpcbResult.stationId} CPCB Sub-Index Engine`
    : "Seasonal Atmospheric Climatology Guidance";

  // 1. Ventilation Guidance Action
  if (category === "VERY_POOR" || category === "SEVERE") {
    actions.push({
      actionId: crypto.randomUUID(),
      category: "VENTILATION_WINDOW",
      urgency: "IMMEDIATE",
      actionSummary: "Keep windows and external doors closed; avoid ambient air infiltration.",
      reasoning: `Ambient AQI is currently in the ${category} category (${aqiValue}). Open windows will elevate indoor particulate levels rapidly.`,
      implementationMethod: "Keep outer windows shut. Seal gaps with draft stoppers. Use indoor exhaust fans exclusively during active cooking.",
      expectedExposureReduction: "Reduces indoor PM2.5 infiltration by 30% to 50%.",
      applicableConstraintsOrLimits: "Ensure indoor cooking has dedicated exhaust to prevent indoor fume buildup.",
      evidenceReferences: [
        {
          evidenceId,
          source: evidenceSource,
          measuredValue: `AQI ${aqiValue} (${category})`,
          timestamp: nowUtc
        }
      ]
    });
  } else if (category === "GOOD" || category === "SATISFACTORY") {
    actions.push({
      actionId: crypto.randomUUID(),
      category: "VENTILATION_WINDOW",
      urgency: "SCHEDULED",
      actionSummary: "Open windows for natural cross-ventilation during afternoon hours.",
      reasoning: `Ambient AQI is currently ${category} (${aqiValue}). Good atmospheric mixing permits natural flushing of indoor air.`,
      implementationMethod: "Open opposite windows for 30-45 minutes between 12:00 and 16:00 when ambient air is cleanest.",
      expectedExposureReduction: "Flushes indoor carbon dioxide, VOCs, and moisture.",
      applicableConstraintsOrLimits: "Monitor nearby localized smoke before opening.",
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

  // 2. Commute & Routine Adaptation Action
  const safetyViolations = checkRoutineSafetyGuardrails(context.routine, category);
  if (safetyViolations.length > 0) {
    const violation = safetyViolations[0]!;
    actions.push({
      actionId: crypto.randomUUID(),
      category: "EXERCISE_ADAPTATION",
      urgency: "IMMEDIATE",
      actionSummary: `Modify activity: ${violation.label}`,
      reasoning: violation.violationReason,
      implementationMethod: violation.mandatoryCorrection,
      expectedExposureReduction: "Eliminates high-volume particulate inhalation during peak pollution.",
      applicableConstraintsOrLimits: "Applies to all household members participating in this activity.",
      evidenceReferences: [
        {
          evidenceId,
          source: evidenceSource,
          measuredValue: `AQI ${aqiValue} (${category})`,
          timestamp: nowUtc
        }
      ]
    });
  } else {
    // Check for diurnal peak commute shift
    const routineWindows = evaluateRoutineExposureWindows(context.routine, category);
    const morningRisk = routineWindows.find((w) => w.isInversionPeakRisk && w.suggestedShiftMinutes > 0);
    if (morningRisk) {
      actions.push({
        actionId: crypto.randomUUID(),
        category: "COMMUTE_TIMING",
        urgency: "SCHEDULED",
        actionSummary: `Shift ${morningRisk.label} start time later by ${morningRisk.suggestedShiftMinutes} minutes.`,
        reasoning: "Morning surface temperature inversions trap vehicular exhaust near ground level between 07:00 and 09:30.",
        implementationMethod: `Delay departure to after 09:30 when solar heating begins lifting the inversion layer.`,
        expectedExposureReduction: "Estimated 20% to 35% reduction in direct transit exhaust inhalation.",
        applicableConstraintsOrLimits: `Flexible within user's declared schedule shift window.`,
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
      implementationMethod: "Substitute with LED lights, electric essential oil diffusers without combustion, or ventilate immediately following brief prayer rituals.",
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

  // Ensure at least one action is returned
  if (actions.length === 0) {
    actions.push({
      actionId: crypto.randomUUID(),
      category: "VENTILATION_WINDOW",
      urgency: "INFORMATIONAL",
      actionSummary: "Maintain balanced ventilation and observe local air quality trends.",
      reasoning: advisory.generalPublicAdvisory,
      implementationMethod: advisory.outdoorActivityGuidance,
      expectedExposureReduction: "Maintains optimal indoor-outdoor balance.",
      applicableConstraintsOrLimits: "None.",
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

  return {
    recommendationId: crypto.randomUUID(),
    generatedAtUtc: nowUtc,
    generator: "RULE_ENGINE",
    overallRiskSummary: `Current air quality is ${category} (${aqiValue}). ${advisory.generalPublicAdvisory} ${advisory.sensitivePopulationAdvisory}`,
    actions
  };
}
