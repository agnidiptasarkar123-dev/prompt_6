// SPDX-License-Identifier: Apache-2.0
import { CpcbPollutantId, PollutantUnit, ValidatedAggregatedMeasurement } from "@/schemas/pollutant.schema";
import { ObservationQualityFlag } from "@/schemas/freshness.schema";
import { CPCB_POLLUTANT_CONFIGS } from "./cpcb-constants";
import { checkRunningWindowSufficiency } from "./running-window";

export interface HourlyPollutantReading {
  readingId: string;
  stationId: string;
  pollutant: CpcbPollutantId;
  concentration: number;
  unit: PollutantUnit;
  timestampUtc: string; // ISO 8601
  isCalibratingOrFault?: boolean;
}

export interface AggregationResult {
  stationId: string;
  pollutant: CpcbPollutantId;
  averagingWindowHours: 1 | 8 | 24;
  rollingAverageConcentration: number | null;
  validHoursCount: number;
  isSufficient: boolean;
  qualityFlag: ObservationQualityFlag;
  earliestReadingUtc: string | null;
  latestReadingUtc: string | null;
  ageMinutes: number;
  isStale: boolean;
  measurement: ValidatedAggregatedMeasurement | null;
  diagnostics: {
    totalInputReadings: number;
    discardedDuplicatesCount: number;
    discardedFaultOrNegativeCount: number;
    conflictingReadingsCount: number;
    isCrossStationRejected: boolean;
  };
}

// Module-private unforgeable runtime registry for validated aggregated measurements
const TRUSTED_METADATA_REGISTRY = new WeakMap<
  object,
  {
    stationId: string;
    pollutant: CpcbPollutantId;
    concentration: number;
    recordedAtUtc: string;
  }
>();

/**
 * Validates that an object was constructed directly by this trusted aggregation factory.
 * Cannot be forged by JSON deserialization, object spreading, or property tampering.
 */
export function isTrustedAggregatedMeasurement(
  obj: unknown
): obj is ValidatedAggregatedMeasurement {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const meta = TRUSTED_METADATA_REGISTRY.get(obj);
  if (!meta) {
    return false;
  }
  const m = obj as ValidatedAggregatedMeasurement;
  return (
    m.stationId === meta.stationId &&
    m.pollutant === meta.pollutant &&
    Math.abs(m.concentration - meta.concentration) < 0.0001 &&
    m.recordedAtUtc === meta.recordedAtUtc
  );
}

/**
 * Creates a validated aggregated measurement conforming to the trusted aggregation boundary.
 * Freezes the instance and registers it in the module-private registry.
 */
export function createValidatedAggregatedMeasurement(
  input: {
    stationId: string;
    pollutant: CpcbPollutantId;
    concentration: number;
    unit: PollutantUnit;
    averagingWindowHours: 1 | 8 | 24;
    recordedAtUtc: string;
    validHoursInWindow: number;
    completenessPolicy?: "OFFICIAL_CPCB_STATUTORY_16H" | "ADAPTED_HAWASAATHI_6H";
  }
): ValidatedAggregatedMeasurement {
  const policy = input.completenessPolicy ?? (
    input.averagingWindowHours === 24
      ? "OFFICIAL_CPCB_STATUTORY_16H"
      : "ADAPTED_HAWASAATHI_6H"
  );

  const measurement: ValidatedAggregatedMeasurement = Object.freeze({
    brand: "VALIDATED_AGGREGATED_MEASUREMENT",
    stationId: input.stationId,
    pollutant: input.pollutant,
    concentration: input.concentration,
    unit: input.unit,
    averagingWindowHours: input.averagingWindowHours,
    recordedAtUtc: input.recordedAtUtc,
    validHoursInWindow: input.validHoursInWindow,
    isAggregationValidated: true,
    completenessPolicy: policy
  });

  TRUSTED_METADATA_REGISTRY.set(measurement, {
    stationId: input.stationId,
    pollutant: input.pollutant,
    concentration: input.concentration,
    recordedAtUtc: input.recordedAtUtc
  });

  return measurement;
}

/**
 * Trusted Aggregation Boundary:
 * Ingests individual hourly time-series readings, validates continuity, timestamps, and station identity,
 * resolves out-of-order and duplicate telemetry, rejects sensor error sentinels,
 * and computes mathematically verified rolling averages without trusting caller-supplied hour counts.
 */
export function aggregateRollingHourlyWindow(
  stationId: string,
  pollutant: CpcbPollutantId,
  readings: HourlyPollutantReading[],
  windowHours: 1 | 8 | 24 = CPCB_POLLUTANT_CONFIGS[pollutant].standardAveragingHours,
  evaluationTimeUtc: string = new Date().toISOString(),
  staleThresholdMinutes: number = 240 // 4 hours
): AggregationResult {
  const config = CPCB_POLLUTANT_CONFIGS[pollutant];
  const evalDate = new Date(evaluationTimeUtc);
  const evalTimeMs = evalDate.getTime();

  // 1. Cross-station identity verification
  const crossStation = readings.some((r) => r.stationId !== stationId);
  if (crossStation) {
    return {
      stationId,
      pollutant,
      averagingWindowHours: windowHours,
      rollingAverageConcentration: null,
      validHoursCount: 0,
      isSufficient: false,
      qualityFlag: "INVALID_SENSOR_READING",
      earliestReadingUtc: null,
      latestReadingUtc: null,
      ageMinutes: Infinity,
      isStale: true,
      measurement: null,
      diagnostics: {
        totalInputReadings: readings.length,
        discardedDuplicatesCount: 0,
        discardedFaultOrNegativeCount: 0,
        conflictingReadingsCount: 0,
        isCrossStationRejected: true
      }
    };
  }

  // 2. Pollutant type verification
  const pollutantReadings = readings.filter((r) => r.pollutant === pollutant);

  let discardedFaultOrNegativeCount = 0;
  let discardedDuplicatesCount = 0;
  let conflictingReadingsCount = 0;

  // 3. Filter invalid readings: negative concentrations, non-finite, calibrating/fault flags, future timestamps
  const validCandidates: HourlyPollutantReading[] = [];
  const fiveMinutesInFuture = evalTimeMs + 5 * 60 * 1000;

  for (const r of pollutantReadings) {
    const readingTimeMs = new Date(r.timestampUtc).getTime();

    if (
      r.concentration < 0 ||
      !isFinite(r.concentration) ||
      isNaN(r.concentration) ||
      r.isCalibratingOrFault ||
      readingTimeMs > fiveMinutesInFuture ||
      isNaN(readingTimeMs)
    ) {
      discardedFaultOrNegativeCount++;
      continue;
    }

    validCandidates.push(r);
  }

  // 4. Sort chronologically by timestamp
  validCandidates.sort(
    (a, b) => new Date(a.timestampUtc).getTime() - new Date(b.timestampUtc).getTime()
  );

  // 5. Handle duplicates and conflicting readings for the same timestamp
  const deduplicatedByTimestamp: HourlyPollutantReading[] = [];
  const seenTimestamps = new Map<string, number>();

  for (const r of validCandidates) {
    const existing = seenTimestamps.get(r.timestampUtc);
    if (existing !== undefined) {
      if (Math.abs(existing - r.concentration) < 0.001) {
        // Exact duplicate -> discard redundant entry
        discardedDuplicatesCount++;
      } else {
        // Same timestamp, different concentration -> telemetry conflict!
        conflictingReadingsCount++;
      }
      continue;
    }
    seenTimestamps.set(r.timestampUtc, r.concentration);
    deduplicatedByTimestamp.push(r);
  }

  // 6. Slice window backwards from evaluationTimeUtc
  const windowStartMs = evalTimeMs - windowHours * 60 * 60 * 1000;
  const inWindowReadings = deduplicatedByTimestamp.filter((r) => {
    const timeMs = new Date(r.timestampUtc).getTime();
    return timeMs >= windowStartMs && timeMs <= evalTimeMs;
  });

  const validHoursCount = inWindowReadings.length;
  const sufficiency = checkRunningWindowSufficiency(pollutant, validHoursCount, windowHours);

  // Determine freshness based on latest reading timestamp
  const latestReading = inWindowReadings[inWindowReadings.length - 1];
  const earliestReading = inWindowReadings[0];

  const latestTimeMs = latestReading ? new Date(latestReading.timestampUtc).getTime() : 0;
  const ageMinutes = latestReading ? Math.max(0, (evalTimeMs - latestTimeMs) / 60000) : Infinity;
  const isStale = ageMinutes > staleThresholdMinutes;

  let qualityFlag: ObservationQualityFlag = "VERIFIED";

  if (conflictingReadingsCount > 0) {
    qualityFlag = "CONFLICTING_MEASUREMENT";
  } else if (!sufficiency.isSufficient) {
    qualityFlag = "INSUFFICIENT_WINDOW";
  } else if (isStale) {
    qualityFlag = "STALE";
  }

  // 7. Calculate rolling arithmetic mean
  let rollingMean: number | null = null;
  let measurement: ValidatedAggregatedMeasurement | null = null;

  if (sufficiency.isSufficient && conflictingReadingsCount === 0) {
    const sum = inWindowReadings.reduce((acc, curr) => acc + curr.concentration, 0);
    rollingMean = Math.round((sum / validHoursCount) * 100) / 100;

    const completenessPolicy = windowHours === 24
      ? "OFFICIAL_CPCB_STATUTORY_16H"
      : "ADAPTED_HAWASAATHI_6H";

    measurement = {
      brand: "VALIDATED_AGGREGATED_MEASUREMENT",
      stationId,
      pollutant,
      concentration: rollingMean,
      unit: config.unit,
      averagingWindowHours: windowHours,
      recordedAtUtc: latestReading!.timestampUtc,
      validHoursInWindow: validHoursCount,
      isAggregationValidated: true,
      completenessPolicy
    };
  }

  return {
    stationId,
    pollutant,
    averagingWindowHours: windowHours,
    rollingAverageConcentration: rollingMean,
    validHoursCount,
    isSufficient: sufficiency.isSufficient && conflictingReadingsCount === 0,
    qualityFlag,
    earliestReadingUtc: earliestReading?.timestampUtc ?? null,
    latestReadingUtc: latestReading?.timestampUtc ?? null,
    ageMinutes: Math.round(ageMinutes),
    isStale,
    measurement,
    diagnostics: {
      totalInputReadings: readings.length,
      discardedDuplicatesCount,
      discardedFaultOrNegativeCount,
      conflictingReadingsCount,
      isCrossStationRejected: false
    }
  };
}
