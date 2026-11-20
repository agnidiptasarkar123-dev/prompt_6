import { CpcbAqiResult, CpcbSubIndex, CpcbCategory } from "@/schemas/cpcb.schema";
import { ValidatedAggregatedMeasurement, CpcbPollutantId } from "@/schemas/pollutant.schema";
import { calculatePollutantSubIndex, getCategoryFromAqi } from "./sub-index-calculator";

export interface StationAqiCalculationInput {
  stationId: string;
  measurements: ValidatedAggregatedMeasurement[];
  calculatedAtUtc?: string;
}

/**
 * Official CPCB Station AQI Sufficiency Engine:
 * 1. Trusted Aggregation Boundary: Accepts ONLY ValidatedAggregatedMeasurement instances.
 *    Rejects raw unaggregated telemetry attempting to bypass rolling-window aggregation.
 * 2. Monitored station isolation: Rejects combining readings across multiple monitoring stations.
 * 3. Channel deduplication: Resolves multiple telemetry streams; rejects contradictory measurements for the same pollutant.
 * 4. Minimum 3 distinct pollutants rule: Data must be available for at least 3 distinct chemical species (unique count >= 3).
 * 5. Mandatory particulate rule: At least one monitored parameter must be PM2.5 or PM10.
 * 6. Completeness policy transparency: Explicitly documents whether calculation adheres to the official
 *    CPCB statutory 16-hour rule (24h) or includes HawaSaathi adapted 6-hour policy (8h).
 * 7. Worst-pollutant rule: The highest valid sub-index determines the overall station AQI.
 * 8. Provenance invariant: Tagged strictly as TYPE_B_CALCULATED_CPCB_AQI; never represented as Type A official bulletin AQI.
 */
export function calculateStationCpcbAqi(
  stationId: string,
  measurements: ValidatedAggregatedMeasurement[],
  calculatedAtUtc: string = new Date().toISOString()
): CpcbAqiResult {
  // 1. Enforce Trusted Aggregation Boundary: verify all measurements are validated aggregated objects
  const hasUnvalidated = measurements.some(
    (m) => m.brand !== "VALIDATED_AGGREGATED_MEASUREMENT" || !m.isAggregationValidated
  );
  if (hasUnvalidated) {
    return {
      stationId,
      calculatedAtUtc,
      overallAqi: null,
      category: null,
      prominentPollutant: null,
      sufficiencyStatus: "INSUFFICIENT_DATA",
      completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
      subIndices: [],
      explanation: "Aggregation boundary violation: calculation rejected because caller supplied unvalidated raw data bypassing rolling-window aggregation."
    };
  }

  // 2. Cross-station rejection: Verify all measurements belong exclusively to stationId
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
      completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
      subIndices: [],
      explanation: `Cross-station aggregation rejected: found measurements from station(s) '${crossStationMismatches.map((m) => m.stationId).join(", ")}' mixed into station '${stationId}'.`
    };
  }

  // 3. Pollutant grouping and deduplication
  const pollutantGroups = new Map<CpcbPollutantId, ValidatedAggregatedMeasurement[]>();
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
        qualityFlag: "CONFLICTING_MEASUREMENT",
        isReportingCeilingCapped: false
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

  // Determine completeness policy across contributing valid measurements
  const hasAdaptedCompleteness = measurements.some(
    (m) => m.completenessPolicy === "ADAPTED_HAWASAATHI_6H"
  );
  const activeCompletenessPolicy = hasAdaptedCompleteness
    ? "ADAPTED_HAWASAATHI_6H"
    : "OFFICIAL_CPCB_STATUTORY_16H";

  // 4. Minimum 3 distinct valid pollutants requirement
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
      completenessPolicy: activeCompletenessPolicy,
      subIndices,
      explanation
    };
  }

  // 5. Identify maximum sub-index as the overall AQI (worst-pollutant rule)
  let maxSubIndex = -1;
  let prominent: CpcbPollutantId | null = null;

  for (const item of validSubIndices) {
    if (item.subIndex !== null && item.subIndex > maxSubIndex) {
      maxSubIndex = item.subIndex;
      prominent = item.pollutant;
    }
  }

  const category: CpcbCategory = getCategoryFromAqi(maxSubIndex);

  let explanation = `Type B independently calculated CPCB AQI determined by dominant pollutant ${prominent} with sub-index ${maxSubIndex} (${category}) following MoEFCC 2014 standards.`;
  if (hasAdaptedCompleteness) {
    explanation += " [Completeness Note: Calculation incorporates HawaSaathi adapted 6-of-8 hour policy for 8-hour parameters; not an official statutory CPCB figure.]";
  } else {
    explanation += " [Completeness Note: Fully compliant with official CPCB statutory 16-hour completeness rule.]";
  }

  return {
    stationId,
    calculatedAtUtc,
    overallAqi: maxSubIndex,
    category,
    prominentPollutant: prominent,
    sufficiencyStatus: "SUFFICIENT",
    completenessPolicy: activeCompletenessPolicy,
    subIndices,
    explanation
  };
}
