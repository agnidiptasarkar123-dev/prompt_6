import { CpcbAqiResult, CpcbSubIndex, CpcbCategory } from "@/schemas/cpcb.schema";
import { RawPollutantMeasurement } from "@/schemas/pollutant.schema";
import { calculatePollutantSubIndex, getCategoryFromAqi } from "./sub-index-calculator";

/**
 * Official CPCB Station AQI Sufficiency Rule:
 * 1. Data must be available for at least 3 pollutants with valid sub-indices (Count >= 3).
 * 2. At least one of the pollutants must be PM2.5 or PM10.
 * 
 * If sufficiency fails, overall AQI MUST be null. Under no circumstances is an AQI guessed.
 */
export function calculateStationCpcbAqi(
  stationId: string,
  measurements: RawPollutantMeasurement[],
  calculatedAtUtc: string = new Date().toISOString()
): CpcbAqiResult {
  const subIndices: CpcbSubIndex[] = measurements.map((m) =>
    calculatePollutantSubIndex(m)
  );

  const validSubIndices = subIndices.filter((s) => s.subIndex !== null);

  const hasPm = validSubIndices.some(
    (s) => s.pollutant === "PM2.5" || s.pollutant === "PM10"
  );
  const sufficientCount = validSubIndices.length >= 3;

  if (!sufficientCount || !hasPm) {
    let explanation = "Overall CPCB AQI unavailable: ";
    if (!sufficientCount && !hasPm) {
      explanation += "fewer than 3 valid pollutants monitored and missing particulate parameters (PM2.5 / PM10).";
    } else if (!sufficientCount) {
      explanation += `fewer than 3 valid pollutants monitored (found ${validSubIndices.length}, minimum 3 required).`;
    } else {
      explanation += "missing mandatory particulate parameter (at least one of PM2.5 or PM10 required).";
    }

    return {
      stationId,
      calculatedAtUtc,
      overallAqi: null,
      category: null,
      prominentPollutant: null,
      sufficiencyStatus: "INSUFFICIENT_DATA",
      subIndices,
      explanation
    };
  }

  // Identify maximum sub-index as the overall AQI (worst-pollutant rule)
  let maxSubIndex = -1;
  let prominent = validSubIndices[0]?.pollutant ?? null;

  for (const item of validSubIndices) {
    if (item.subIndex !== null && item.subIndex > maxSubIndex) {
      maxSubIndex = item.subIndex;
      prominent = item.pollutant;
    }
  }

  const category: CpcbCategory = getCategoryFromAqi(maxSubIndex);

  return {
    stationId,
    calculatedAtUtc,
    overallAqi: maxSubIndex,
    category,
    prominentPollutant: prominent,
    sufficiencyStatus: "SUFFICIENT",
    subIndices,
    explanation: `Overall CPCB AQI determined by dominant pollutant ${prominent} with sub-index ${maxSubIndex} (${category}).`
  };
}
