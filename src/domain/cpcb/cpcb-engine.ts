import { CpcbAqiResult, CpcbSubIndex, CpcbCategory } from "@/schemas/cpcb.schema";
import { RawPollutantMeasurement, CpcbPollutantId } from "@/schemas/pollutant.schema";
import { calculatePollutantSubIndex, getCategoryFromAqi } from "./sub-index-calculator";

export interface StationAqiCalculationInput {
  stationId: string;
  measurements: (RawPollutantMeasurement & { stationId?: string })[];
  calculatedAtUtc?: string;
}

/**
 * Official CPCB Station AQI Sufficiency Engine:
 * 1. Monitored station isolation: Rejects combining readings across multiple monitoring stations.
 * 2. Channel deduplication: Resolves multiple telemetry streams; rejects contradictory measurements for the same pollutant.
 * 3. Minimum 3 distinct pollutants rule: Data must be available for at least 3 distinct chemical species (unique count >= 3).
 * 4. Mandatory particulate rule: At least one monitored parameter must be PM2.5 or PM10.
 * 5. Worst-pollutant rule: The highest valid sub-index determines the overall station AQI.
 * 6. Provenance invariant: Tagged strictly as TYPE_B_CALCULATED_CPCB_AQI; never represented as Type A official bulletin AQI.
 */
export function calculateStationCpcbAqi(
  stationId: string,
  measurements: (RawPollutantMeasurement & { stationId?: string })[],
  calculatedAtUtc: string = new Date().toISOString()
): CpcbAqiResult {
  // 1. Cross-station rejection: Verify all measurements belong exclusively to stationId
  const crossStationMismatches = measurements.filter(
    (m) => m.stationId && m.stationId !== stationId
  );
  if (crossStationMismatches.length > 0) {
    return {
      stationId,
      calculatedAtUtc,
      overallAqi: null,
      category: null,
      prominentPollutant: null,
      sufficiencyStatus: "INSUFFICIENT_DATA",
      subIndices: [],
      explanation: `Cross-station aggregation rejected: found measurements from station(s) '${crossStationMismatches.map((m) => m.stationId).join(", ")}' mixed into station '${stationId}'.`
    };
  }

  // 2. Pollutant grouping and deduplication
  const pollutantGroups = new Map<CpcbPollutantId, (RawPollutantMeasurement & { stationId?: string })[]>();
  for (const m of measurements) {
    const list = pollutantGroups.get(m.pollutant) ?? [];
    list.push(m);
    pollutantGroups.set(m.pollutant, list);
  }

  const subIndices: CpcbSubIndex[] = [];
  const validSubIndices: CpcbSubIndex[] = [];

  for (const [pollutant, group] of pollutantGroups.entries()) {
    // Check for conflicting measurements for the same pollutant
    const distinctConcentrations = new Set(group.map((m) => Math.round(m.concentration * 100) / 100));

    if (distinctConcentrations.size > 1) {
      // Conflicting concentrations for the same pollutant
      const conflictSubIndex: CpcbSubIndex = {
        pollutant,
        concentration: group[0]!.concentration,
        unit: group[0]!.unit,
        subIndex: null,
        category: null,
        windowHours: group[0]!.averagingWindowHours,
        validHours: group[0]!.validHoursInWindow,
        qualityFlag: "CONFLICTING_MEASUREMENT"
      };
      subIndices.push(conflictSubIndex);
      continue;
    }

    // Deduplicated single representative reading for this pollutant
    const rep = group[0]!;
    const calculated = calculatePollutantSubIndex(rep);
    subIndices.push(calculated);

    if (calculated.subIndex !== null) {
      validSubIndices.push(calculated);
    }
  }

  // 3. Minimum 3 distinct valid pollutants requirement
  const distinctValidPollutants = new Set(validSubIndices.map((s) => s.pollutant));
  const hasPm = distinctValidPollutants.has("PM2.5") || distinctValidPollutants.has("PM10");
  const sufficientCount = distinctValidPollutants.size >= 3;

  if (!sufficientCount || !hasPm) {
    let explanation = "Overall CPCB AQI unavailable: ";
    if (!sufficientCount && !hasPm) {
      explanation += `fewer than 3 distinct valid pollutants monitored (found ${distinctValidPollutants.size}) and missing particulate parameters (PM2.5 / PM10).`;
    } else if (!sufficientCount) {
      explanation += `fewer than 3 distinct valid pollutants monitored (found ${distinctValidPollutants.size}: [${Array.from(distinctValidPollutants).join(", ")}], minimum 3 required).`;
    } else {
      explanation += `missing mandatory particulate parameter (found ${distinctValidPollutants.size} gases, but neither PM2.5 nor PM10 monitored).`;
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

  // 4. Identify maximum sub-index as the overall AQI (worst-pollutant rule)
  let maxSubIndex = -1;
  let prominent: CpcbPollutantId | null = null;

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
    explanation: `Type B independently calculated CPCB AQI determined by dominant pollutant ${prominent} with sub-index ${maxSubIndex} (${category}) following MoEFCC 2014 standards.`
  };
}
