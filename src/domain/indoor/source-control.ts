import { DwellingContext } from "@/schemas/user-context.schema";

export interface IndoorHazardAssessment {
  hazardScore: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  activeSources: string[];
  mitigationRecommendations: string[];
  disclaimer: string;
}

/**
 * Evaluates indoor pollution hazards without guessing or claiming numeric indoor AQI.
 */
export function evaluateIndoorSources(
  dwelling: DwellingContext
): IndoorHazardAssessment {
  const sources: string[] = [];
  const mitigations: string[] = [];

  // Cooking combustion
  if (dwelling.cooking.primaryFuel === "BIOMASS_KEROSENE") {
    sources.push("Biomass / kerosene cooking fuel");
    mitigations.push("Critical: Transition to induction electric or LPG cooktop; ensure dedicated chimney exhaust.");
  } else if (dwelling.cooking.primaryFuel === "LPG" && dwelling.cooking.kitchenVentilation === "UNVENTED_INDOOR") {
    sources.push("Unvented gas combustion in kitchen");
    mitigations.push("Operate an exhaust fan or open kitchen window during cooking to expel nitrogen dioxide.");
  }

  // Incense & dhoop
  if (dwelling.indoorSources.incenseOrDhoopDaily) {
    sources.push("Daily incense / dhoop combustion");
    mitigations.push("Extinguish incense immediately after prayer or switch to smokeless alternatives.");
  }

  // Mosquito coils
  if (dwelling.indoorSources.mosquitoCoilUsage) {
    sources.push("Smoldering mosquito coil usage");
    mitigations.push("Replace smoldering coils with window mesh screens or liquid vaporizers in well-ventilated areas.");
  }

  // Indoor smoking
  if (dwelling.indoorSources.indoorSmoking) {
    sources.push("Environmental tobacco smoke");
    mitigations.push("Strict zero-smoking indoors policy; third-hand smoke settles on upholstery.");
  }

  let hazardScore: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
  if (sources.length >= 3 || dwelling.cooking.primaryFuel === "BIOMASS_KEROSENE") {
    hazardScore = "CRITICAL";
  } else if (sources.length === 2) {
    hazardScore = "HIGH";
  } else if (sources.length === 1) {
    hazardScore = "MODERATE";
  }

  return {
    hazardScore,
    activeSources: sources,
    mitigationRecommendations: mitigations,
    disclaimer: "Notice: Indoor air quality varies significantly across rooms. In the absence of an indoor air sensor, this guidance provides qualitative exposure reduction models based on source control."
  };
}
