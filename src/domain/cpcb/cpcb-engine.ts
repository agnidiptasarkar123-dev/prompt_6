// SPDX-License-Identifier: Apache-2.0
import { CpcbAqiResult, CpcbSubIndex, CpcbCategory } from "@/schemas/cpcb.schema";
import { ValidatedAggregatedMeasurement, CpcbPollutantId } from "@/schemas/pollutant.schema";
import { calculatePollutantSubIndex, getCategoryFromAqi } from "./sub-index-calculator";
import { isTrustedAggregatedMeasurement } from "./rolling-window-aggregator";

export interface StationAqiCalculationInput {
  stationId: string;
  measurements: ValidatedAggregatedMeasurement[];
  calculatedAtUtc?: string;
}

/**
 * Official CPCB Station AQI Sufficiency Engine:
 * 1. Non-Forgeable Trusted Aggregation Boundary: Accepts ONLY ValidatedAggregatedMeasurement instances
 *    verified via in-process module-private WeakSet/WeakMap registry. Rejects arbitrary deserialized JSON.
 * 2. Monitored station isolation: Rejects combining readings across multiple monitoring stations.
 * 3. Channel deduplication: Resolves multiple telemetry streams; rejects contradictory measurements for the same pollutant.
 * 4. Minimum 3 distinct pollutants rule: Data must be available for at least 3 distinct chemical species with valid numeric sub-indices.
 * 5. Mandatory particulate rule: At least one monitored parameter must be PM2.5 or PM10.
 * 6. Lead (Pb) exclusion principle: Pb concentrations > 3.5 µg/m³ (Severe) with unavailable numerical sub-indices
 *    do NOT contribute to the station AQI maximum or 3-pollutant sufficiency count.
 * 7. Worst-pollutant rule: The highest valid sub-index determines the overall station AQI.
 * 8. Severe extrapolation preservation: Does not clamp the scientific AQI to 500; provides reportingCeilingCappedAqi for visual gauges.
 * 9. Provenance invariant: Tagged strictly as Type B independently calculated result; never represented as Type A official bulletin AQI.
 */
export function calculateStationCpcbAqi(
  stationId: string,
  measurements: ValidatedAggregatedMeasurement[],
  calculatedAtUtc: string = new Date().toISOString()
): CpcbAqiResult {
  // 1. Enforce Non-Forgeable Trusted Aggregation Boundary
  const hasUnvalidated = measurements.some((m) => !isTrustedAggregatedMeasurement(m));
  if (hasUnvalidated) {
    return {
      stationId,
      calculatedAtUtc,
      overallAqi: null,
      rawMathematicalAqi: null,
      category: null,
      prominentPollutant: null,
      sufficiencyStatus: "INSUFFICIENT_DATA",
      completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
      subIndices: [],
      isBeyondNominalScale: false,
      reportingCeilingCappedAqi: null,
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
      rawMathematicalAqi: null,
      category: null,
      prominentPollutant: null,
      sufficiencyStatus: "INSUFFICIENT_DATA",
      completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
      subIndices: [],
      isBeyondNominalScale: false,
      reportingCeilingCappedAqi: null,
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
        rawMathematicalSubIndex: null,
        category: null,
        windowHours: group[0]!.averagingWindowHours,
        validHours: group[0]!.validHoursInWindow,
        qualityFlag: "CONFLICTING_MEASUREMENT",
        isBeyondNominalScale: false,
        reportingCeilingCappedAqi: null
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

  // Check if Pb is present in measurements but has null sub-index (Lead Severe rule)
  const hasLeadSevereOmission = subIndices.some(
    (s) => s.pollutant === "Pb" && s.qualityFlag === "NO_DEFENSIBLE_SUBINDEX_FORMULA"
  );

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

    if (hasLeadSevereOmission) {
      explanation += " [Lead (Pb) concentration is in the SEVERE category (>3.5 µg/m³), but numerical sub-index is omitted as no authoritative Severe formula exists in CPCB NAQI methodology; excluded from 3-pollutant count.]";
    }

    return {
      stationId,
      calculatedAtUtc,
      overallAqi: null,
      rawMathematicalAqi: null,
      category: null,
      prominentPollutant: null,
      sufficiencyStatus: "INSUFFICIENT_DATA",
      completenessPolicy: activeCompletenessPolicy,
      subIndices,
      isBeyondNominalScale: false,
      reportingCeilingCappedAqi: null,
      explanation
    };
  }

  // 5. Identify maximum sub-index as the overall AQI (worst-pollutant rule)
  let maxSubIndex = -1;
  let maxRawSubIndex: number | null = -1;
  let prominent: CpcbPollutantId | null = null;
  let isBeyondNominalScale = false;

  for (const item of validSubIndices) {
    if (item.subIndex !== null && item.subIndex > maxSubIndex) {
      maxSubIndex = item.subIndex;
      maxRawSubIndex = item.rawMathematicalSubIndex;
      prominent = item.pollutant;
      isBeyondNominalScale = item.isBeyondNominalScale;
    }
  }

  const category: CpcbCategory = getCategoryFromAqi(maxSubIndex);
  const reportingCeilingCappedAqi = Math.min(500, maxSubIndex);

  let explanation = `Type B independently calculated CPCB AQI determined by dominant pollutant ${prominent} with sub-index ${maxSubIndex} (${category}) following MoEFCC 2014 standards.`;
  if (isBeyondNominalScale) {
    explanation += ` [Note: Sub-index ${maxSubIndex} extrapolates beyond nominal AQI 500 calculation anchor based on workbook Severe continuation; visual gauge capped at 500.]`;
  }
  if (hasLeadSevereOmission) {
    explanation += " [Lead (Pb) concentration is in the SEVERE category (>3.5 µg/m³), but numerical sub-index is omitted as no authoritative Severe formula exists in CPCB NAQI methodology.]";
  }
  if (hasAdaptedCompleteness) {
    explanation += " [Completeness Note: Calculation incorporates HawaSaathi adapted 6-of-8 hour policy for 8-hour parameters; not an official statutory CPCB figure.]";
  } else {
    explanation += " [Completeness Note: Fully compliant with official CPCB statutory 16-hour completeness rule.]";
  }

  return {
    stationId,
    calculatedAtUtc,
    overallAqi: maxSubIndex,
    rawMathematicalAqi: maxRawSubIndex,
    category,
    prominentPollutant: prominent,
    sufficiencyStatus: "SUFFICIENT",
    completenessPolicy: activeCompletenessPolicy,
    subIndices,
    isBeyondNominalScale,
    reportingCeilingCappedAqi,
    explanation
  };
}
