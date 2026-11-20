import { CpcbCategory } from "@/schemas/cpcb.schema";
import { DwellingContext } from "@/schemas/user-context.schema";

export interface VentilationWindowDecision {
  windowAction: "OPEN_CROSS_VENTILATION" | "KEEP_SEALED" | "EXHAUST_ONLY";
  optimalTimeWindow: string;
  expectedBenefit: string;
  practicalMethod: string;
  cautions: string[];
}

/**
 * Determines ventilation strategy comparing outdoor ambient quality with indoor dwelling constraints.
 */
export function determineVentilationStrategy(
  ambientCategory: CpcbCategory,
  dwelling: DwellingContext
): VentilationWindowDecision {
  const extraCautions: string[] = [];
  if (dwelling.proximityToMajorRoadMeters < 50) {
    extraCautions.push(`Dwelling is within ${dwelling.proximityToMajorRoadMeters}m of a major road: ventilate only away from street-facing facades.`);
  }
  if (dwelling.windowSealingQuality === "LEAKY_OPEN_SLATS") {
    extraCautions.push("Windows have leaky slats: consider tape, towels, or weatherstrips along frame edges during high pollution periods.");
  }

  // If ambient air is hazardous (Very Poor or Severe), keep sealed
  if (ambientCategory === "VERY_POOR" || ambientCategory === "SEVERE") {
    return {
      windowAction: "KEEP_SEALED",
      optimalTimeWindow: "Continuous while outdoor AQI remains Very Poor or Severe",
      expectedBenefit: "Minimizes outdoor toxic particulate infiltration into the living space.",
      practicalMethod: "Keep all exterior windows shut. Apply wet towels or draft stoppers under entrance doors.",
      cautions: [
        "Use kitchen exhaust exclusively during cooking to avoid negative pressure drawing in outdoor smoke.",
        "Perform wet mopping instead of dry sweeping to capture settled dust without resuspension.",
        ...extraCautions
      ]
    };
  }

  // If ambient air is Good or Satisfactory, promote cross-ventilation
  if (ambientCategory === "GOOD" || ambientCategory === "SATISFACTORY") {
    return {
      windowAction: "OPEN_CROSS_VENTILATION",
      optimalTimeWindow: "12:00 PM to 4:00 PM (peak solar mixing)",
      expectedBenefit: "Flushes accumulated indoor CO2, VOCs, and moisture.",
      practicalMethod: "Open opposite windows for 30–60 minutes to establish a cross-draft.",
      cautions: [
        "If living near a busy road, open courtyard-facing windows rather than street-facing windows.",
        ...extraCautions
      ]
    };
  }

  // Moderate or Poor: Selective ventilation outside diurnal traffic peaks
  return {
    windowAction: "EXHAUST_ONLY",
    optimalTimeWindow: "1:00 PM to 3:00 PM (avoid 07:00–09:30 and 19:00–22:00 traffic peaks)",
    expectedBenefit: "Ventilates essential cooking moisture while avoiding morning and evening inversion smog.",
    practicalMethod: "Run kitchen and bathroom exhaust fans; crack window slightly for 15 minutes during early afternoon.",
    cautions: [
      "Avoid opening windows during early morning or late night hours.",
      ...extraCautions
    ]
  };
}
