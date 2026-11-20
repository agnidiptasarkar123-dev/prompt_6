import { CpcbCategory } from "@/schemas/cpcb.schema";
import { RoutineActivity } from "@/schemas/routine.schema";

export interface SafetyViolation {
  activityId: string;
  label: string;
  violationReason: string;
  mandatoryCorrection: string;
}

/**
 * Hard Safety Guardrails:
 * Never recommend or permit unsafe outdoor physical activity merely to reduce emissions
 * or maintain personal fitness routines during hazardous air quality.
 */
export function checkRoutineSafetyGuardrails(
  activities: RoutineActivity[],
  currentCategory: CpcbCategory
): SafetyViolation[] {
  const violations: SafetyViolation[] = [];

  const isSevereOrVeryPoor =
    currentCategory === "VERY_POOR" || currentCategory === "SEVERE";

  for (const act of activities) {
    // Rule 1: No vigorous outdoor exercise in Very Poor or Severe air
    if (isSevereOrVeryPoor && act.locationType === "OUTDOOR" && act.physicalIntensity === "VIGOROUS") {
      violations.push({
        activityId: act.activityId,
        label: act.label,
        violationReason: `Vigorous outdoor activity during ${currentCategory} air quality causes deep alveolar particulate deposition.`,
        mandatoryCorrection: "Shift workout indoors or substitute with low-intensity stretching/yoga."
      });
    }

    // Rule 2: Active mobility (cycling/walking) must not be prescribed during Severe smog (AQI > 400)
    if (currentCategory === "SEVERE" && (act.transitMode === "BICYCLING" || act.transitMode === "WALKING")) {
      violations.push({
        activityId: act.activityId,
        label: act.label,
        violationReason: "Active outdoor commuting during Severe air quality increases particulate intake up to 5x.",
        mandatoryCorrection: "Switch to enclosed public transport (Metro/AC Bus) or shared vehicle until dispersion improves."
      });
    }
  }

  return violations;
}
