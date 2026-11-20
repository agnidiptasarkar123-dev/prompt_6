import { CpcbCategory } from "@/schemas/cpcb.schema";
import { DwellingContext } from "@/schemas/user-context.schema";

export interface VentilationWindowDecision {
  windowAction: "OPEN_CROSS_VENTILATION" | "KEEP_SEALED" | "EXHAUST_ONLY" | "EXHAUST_LOCALIZED_BURST";
  optimalTimeWindow: string;
  expectedBenefit: string;
  practicalMethod: string;
  cautions: string[];
  indoorCombustionOverrideActive: boolean;
  scientificDisclaimer: string;
}

/**
 * Determines indoor ventilation strategy comparing outdoor ambient CPCB air quality
 * against indoor dwelling characteristics, cooking fuels, and combustion sources.
 * 
 * Grounded in:
 * 1. MoHFW / NCDC Health Advisory on Air Pollution (October 2025): External openings kept shut
 *    during morning and evening pollution peak hours; ventilation prioritized at midday (12:00 - 16:00).
 * 2. Indoor Combustion Safety Protocol: An enclosed room must NEVER be kept sealed while indoor
 *    combustion sources (biomass, unvented LPG, incense, mosquito coils, smoking) are active,
 *    as Carbon Monoxide and toxic VOC accumulation can be lethal.
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

  // Check for active indoor combustion sources
  const hasActiveCombustion =
    dwelling.cooking.primaryFuel === "BIOMASS_KEROSENE" ||
    (dwelling.cooking.primaryFuel === "LPG" && dwelling.cooking.kitchenVentilation === "UNVENTED_INDOOR") ||
    dwelling.indoorSources.incenseOrDhoopDaily ||
    dwelling.indoorSources.mosquitoCoilUsage ||
    dwelling.indoorSources.indoorSmoking;

  // CRITICAL SAFETY OVERRIDE:
  // If indoor combustion is active, keeping rooms sealed is hazardous due to toxic CO, NO2, and particle buildup.
  if (hasActiveCombustion) {
    return {
      windowAction: "EXHAUST_LOCALIZED_BURST",
      optimalTimeWindow: "Immediate / during and for 30 minutes following any cooking or burning activity",
      expectedBenefit: "Assists in expelling a portion of indoor combustion emissions and moisture, but cannot guarantee prevention of toxic gas accumulation without primary source reduction.",
      practicalMethod: "Run kitchen/bathroom mechanical exhaust fans on maximum. For make-up air, crack a courtyard- or garden-facing window on the sheltered facade (avoid street-facing openings) to establish localized airflow without drawing in vehicle exhaust.",
      cautions: [
        "CRITICAL LIFE-SAFETY RULE: Prioritise source reduction. Never keep living quarters sealed while biomass, unvented gas, incense, or coils are burning. Operating exhaust fans reduces buildup but does not guarantee prevention of lethal carbon monoxide accumulation.",
        "Extinguish smoldering mosquito coils and incense sticks immediately after initial prayer/use.",
        "Keep infants, elderly, and pregnant members outside the kitchen during cooking.",
        ...extraCautions
      ],
      indoorCombustionOverrideActive: true,
      scientificDisclaimer: "Ambient outdoor air quality is evaluated from CAAQMS telemetry. In the absence of an indoor air sensor, this guidance prioritizes source reduction and localized exhaust. It does NOT guarantee complete air safety or prevention of toxic gas accumulation without direct indoor sensor monitoring."
    };
  }

  // If ambient air is hazardous (Very Poor or Severe), keep sealed per NCDC guidance
  if (ambientCategory === "VERY_POOR" || ambientCategory === "SEVERE") {
    return {
      windowAction: "KEEP_SEALED",
      optimalTimeWindow: "Continuous while outdoor AQI remains Very Poor or Severe (especially 06:00–09:30 and 18:00–22:00)",
      expectedBenefit: "Minimizes outdoor toxic particulate infiltration into the living space.",
      practicalMethod: "Keep all exterior windows and doors shut. Use wet towels or draft stoppers under entrance doors.",
      cautions: [
        "NCDC October 2025 Advisory: Avoid opening windows during morning and late evening peak pollution hours.",
        "If indoor air feels stuffy, a brief 10-minute crack of opposite windows is permissible between 12:00 and 16:00 when solar mixing improves ambient air.",
        "Perform wet mopping instead of dry sweeping to capture settled dust without resuspension.",
        ...extraCautions
      ],
      indoorCombustionOverrideActive: false,
      scientificDisclaimer: "Evaluated from ambient outdoor monitoring. Indoor particulate levels in sealed rooms typically stabilize at 30% to 50% of ambient levels in the absence of indoor sources."
    };
  }

  // If ambient air is Good or Satisfactory, promote cross-ventilation
  if (ambientCategory === "GOOD" || ambientCategory === "SATISFACTORY") {
    return {
      windowAction: "OPEN_CROSS_VENTILATION",
      optimalTimeWindow: "12:00 PM to 4:00 PM (optimal atmospheric solar mixing)",
      expectedBenefit: "Flushes accumulated indoor CO2, VOCs, bio-effluents, and moisture.",
      practicalMethod: "Open opposite windows for 30–60 minutes to establish an active cross-draft.",
      cautions: [
        "If living near a busy road, open courtyard-facing windows rather than street-facing windows.",
        ...extraCautions
      ],
      indoorCombustionOverrideActive: false,
      scientificDisclaimer: "Good ambient air allows natural indoor-outdoor air exchange without mechanical filtration penalties."
    };
  }

  // Moderate or Poor: Selective ventilation outside diurnal traffic peaks
  return {
    windowAction: "EXHAUST_ONLY",
    optimalTimeWindow: "1:00 PM to 3:00 PM (avoid NCDC morning 06:00–09:30 and evening 18:00–22:00 traffic peaks)",
    expectedBenefit: "Ventilates essential cooking moisture while avoiding peak morning and evening particulate smog.",
    practicalMethod: "Run kitchen and bathroom exhaust fans; crack window slightly for 15 minutes during early afternoon.",
    cautions: [
      "Avoid opening windows during early morning or late evening peak hours per NCDC October 2025 advisory.",
      ...extraCautions
    ],
    indoorCombustionOverrideActive: false,
    scientificDisclaimer: "Selective midday ventilation balances indoor moisture control against outdoor ambient particulate exposure."
  };
}
