// SPDX-License-Identifier: Apache-2.0
import { calculateRoomFiltrationRequirements } from "../indoor/filtration-calculator";

export type EvidenceBasisLabel = "Measured" | "Calculated" | "Estimated" | "Qualitative";

export interface PersonalExposureImpactInput {
  readonly pollutant: "PM2.5" | "PM10" | "NO2" | "O3" | "CO" | "SO2";
  readonly stationConcentration: number | null;
  readonly unit: string;
  readonly assumedReductionFraction: number;
  readonly sourceLabel: string;
  readonly observationTimestamp: string | null;
}

export interface PersonalExposureImpactResult {
  readonly basis: EvidenceBasisLabel;
  readonly direction: "REDUCES_EXPOSURE" | "UNVERIFIED";
  readonly ambientProxyDifference: number | null;
  readonly unit: string;
  readonly summary: string;
  /** Ambient station-level proxy disclaimer only; never personal inhaled dose or medical benefit. */
  readonly stationProxyNote: string | null;
  readonly assumptions: readonly string[];
  readonly uncertainty: string;
  readonly sourceLabel: string;
  readonly observationTimestamp: string | null;
}

export type TransportEmissionMode =
  | "CAR_PETROL_LT_1400CC"
  | "CAR_DIESEL_LT_1400CC"
  | "MOTORCYCLE_LT_125CC"
  | "SCOOTER_LT_110CC"
  | "BUS_INTRACITY"
  | "METRO_RAIL"
  | "WALK_CYCLE"
  | "TRIP_AVOIDED";

interface EmissionFactorSpec {
  readonly rawFactor: number | null;
  readonly rawUnit: "PER_VEHICLE_KM" | "PER_PASSENGER_KM" | "UNAVAILABLE";
  readonly maxOccupancy: number;
  readonly source: string;
}

/**
 * India GHG Program (WRI India / CII / TERI), "India Specific Road Transport Emission Factors", v1.0 (2015).
 * Note: Figures represent tailpipe CO2 (kg CO2), NOT complete CO2e.
 * METRO_RAIL is excluded from road tables (set null -> Qualitative unless city grid factor is supplied).
 */
export const INDIA_ROAD_CO2_FACTORS: Readonly<Record<TransportEmissionMode, EmissionFactorSpec>> = {
  CAR_PETROL_LT_1400CC: {
    rawFactor: 0.130,
    rawUnit: "PER_VEHICLE_KM",
    maxOccupancy: 5,
    source: "India GHG Program v1.0 (2015), Petrol Hatchback <1400cc (0.130 kg CO2/vkm without uplift)",
  },
  CAR_DIESEL_LT_1400CC: {
    rawFactor: 0.117,
    rawUnit: "PER_VEHICLE_KM",
    maxOccupancy: 5,
    source: "India GHG Program v1.0 (2015), Diesel Hatchback <1400cc (0.117 kg CO2/vkm)",
  },
  MOTORCYCLE_LT_125CC: {
    rawFactor: 0.0290,
    rawUnit: "PER_VEHICLE_KM",
    maxOccupancy: 2,
    source: "India GHG Program v1.0 (2015), Motorcycle <125cc (0.0290 kg CO2/vkm)",
  },
  SCOOTER_LT_110CC: {
    rawFactor: 0.0334,
    rawUnit: "PER_VEHICLE_KM",
    maxOccupancy: 2,
    source: "India GHG Program v1.0 (2015), Scooter <110cc (0.0334 kg CO2/vkm)",
  },
  BUS_INTRACITY: {
    rawFactor: 0.015161,
    rawUnit: "PER_PASSENGER_KM",
    maxOccupancy: 100,
    source: "India GHG Program v1.0 (2015), SRTU Intracity Bus (0.015161 kg CO2/pax-km)",
  },
  METRO_RAIL: {
    rawFactor: null,
    rawUnit: "UNAVAILABLE",
    maxOccupancy: 1000,
    source: "Not in India GHG Program Road Transport v1.0 (city-specific electric grid factor required)",
  },
  WALK_CYCLE: {
    rawFactor: 0,
    rawUnit: "PER_PASSENGER_KM",
    maxOccupancy: 1,
    source: "Zero direct tailpipe CO2 emissions",
  },
  TRIP_AVOIDED: {
    rawFactor: 0,
    rawUnit: "PER_PASSENGER_KM",
    maxOccupancy: 1,
    source: "Avoided travel (0 kg CO2)",
  },
};

export interface EmissionsImpactInput {
  readonly distanceKm: number;
  readonly fromMode: TransportEmissionMode;
  readonly toMode: TransportEmissionMode;
  readonly occupancy?: number;
  readonly fromOccupancy?: number;
  readonly toOccupancy?: number;
}

export interface EmissionsImpactResult {
  readonly basis: EvidenceBasisLabel;
  readonly direction: "REDUCES_EMISSIONS" | "NO_CHANGE" | "INCREASES_EMISSIONS" | "UNAVAILABLE";
  readonly estimatedCo2DeltaKg: number | null; // Positive = avoided CO2, Negative = additional CO2 emitted
  readonly unit: "kg CO2";
  readonly summary: string;
  readonly assumptions: readonly string[];
  readonly uncertainty: string;
  readonly emissionFactorSource: string;
}

export interface IndoorSensorReadingInput {
  readonly value: number;
  readonly unit: string;
  readonly observationTimestamp: string;
  readonly sourceType: "INDOOR_SENSOR" | "OUTDOOR_STATION";
  readonly nowUtc?: string;
}

export interface IndoorAirImpactInput {
  readonly roomLengthMeters: number;
  readonly roomWidthMeters: number;
  readonly roomHeightMeters: number;
  readonly purifierCadrM3H?: number;
  readonly indoorSensorReading?: IndoorSensorReadingInput;
}

export interface IndoorAirImpactResult {
  readonly achBasis: "Calculated";
  readonly indoorPm25Basis: "Measured" | "Unavailable";
  readonly calculatedAch: number;
  readonly recommendedCadrM3H: number;
  readonly roomVolumeM3: number;
  readonly measuredIndoorPm25: number | null;
  readonly sensorStatusNote: string;
  readonly summary: string;
  readonly limitations: readonly string[];
}

export function calculatePersonalExposureImpact(
  input: PersonalExposureImpactInput
): PersonalExposureImpactResult {
  if (!Number.isFinite(input.assumedReductionFraction) || input.assumedReductionFraction < 0 || input.assumedReductionFraction > 1) {
    throw new RangeError("Reduction fraction must be finite and within [0, 1].");
  }

  const conc = input.stationConcentration ?? Number.NaN;
  if (!Number.isFinite(conc) || conc < 0) {
    return {
      basis: "Qualitative",
      direction: "UNVERIFIED",
      ambientProxyDifference: null,
      unit: input.unit,
      summary: "Qualitative exposure precaution: verified ambient station concentration is unavailable or invalid.",
      stationProxyNote: null,
      assumptions: ["No valid ambient station concentration was supplied."],
      uncertainty: "Quantitative proxy unavailable without valid ambient station measurements.",
      sourceLabel: input.sourceLabel,
      observationTimestamp: input.observationTimestamp,
    };
  }

  const pct = Math.round(input.assumedReductionFraction * 100);
  const proxyDelta = Math.round(conc * input.assumedReductionFraction * 10) / 10;

  return {
    basis: "Estimated",
    direction: "REDUCES_EXPOSURE",
    ambientProxyDifference: proxyDelta,
    unit: input.unit,
    summary: `Estimated ~${pct}% ambient ${input.pollutant} proxy difference (~${proxyDelta} ${input.unit} vs station ${conc} ${input.unit}).`,
    stationProxyNote: `Ambient monitoring station proxy only (${conc} ${input.unit}): NOT personal breathing-zone air, NOT actual inhaled dose, and NOT a guaranteed health improvement.`,
    assumptions: [
      `Uses stationary ${input.pollutant} reading (${conc} ${input.unit}) solely as an ambient proxy.`,
      `Applies scenario attenuation factor (${pct}%) without inventing personal breathing-rate or clinical dose parameters.`,
    ],
    uncertainty: "Actual exposure varies with indoor infiltration, proximity to traffic plumes, and respirator seal; no medical benefit is guaranteed.",
    sourceLabel: input.sourceLabel,
    observationTimestamp: input.observationTimestamp,
  };
}

function validateAndResolveOccupancy(rawOcc: number | undefined, spec: EmissionFactorSpec, label: string): number {
  if (rawOcc === undefined) return 1;
  if (!Number.isFinite(rawOcc) || rawOcc < 1 || (spec.rawUnit === "PER_VEHICLE_KM" && rawOcc > spec.maxOccupancy)) {
    throw new RangeError(`${label} occupancy must be a finite number between 1 and ${spec.maxOccupancy}.`);
  }
  return rawOcc;
}

function toPassengerKmCo2Factor(spec: EmissionFactorSpec, occupancy: number): number | null {
  if (spec.rawFactor === null) return null;
  if (spec.rawUnit === "PER_VEHICLE_KM") return spec.rawFactor / occupancy;
  return spec.rawFactor;
}

export function calculateEmissionsImpact(input: EmissionsImpactInput): EmissionsImpactResult {
  if (!Number.isFinite(input.distanceKm) || input.distanceKm < 0) {
    throw new RangeError("Distance must be a non-negative finite number.");
  }

  const fromSpec = INDIA_ROAD_CO2_FACTORS[input.fromMode];
  const toSpec = INDIA_ROAD_CO2_FACTORS[input.toMode];
  if (!fromSpec || !toSpec) {
    throw new RangeError("Unsupported transport mode.");
  }

  const fromOcc = validateAndResolveOccupancy(input.fromOccupancy ?? input.occupancy, fromSpec, "Origin");
  const toOcc = validateAndResolveOccupancy(input.toOccupancy ?? input.occupancy, toSpec, "Destination");

  const fromPkm = toPassengerKmCo2Factor(fromSpec, fromOcc);
  const toPkm = toPassengerKmCo2Factor(toSpec, toOcc);

  if (fromPkm === null || toPkm === null) {
    return {
      basis: "Qualitative",
      direction: "UNAVAILABLE",
      estimatedCo2DeltaKg: null,
      unit: "kg CO2",
      summary: `Qualitative only: verified CO2 emission factor unavailable for ${fromPkm === null ? input.fromMode : input.toMode}.`,
      assumptions: ["Metro rail electricity emission intensity varies by city grid and is excluded from India GHG Program road tables."],
      uncertainty: "City-specific traction electricity intensity factor must be supplied for quantitative rail CO2 comparisons.",
      emissionFactorSource: `${fromSpec.source}; ${toSpec.source}`,
    };
  }

  if (input.distanceKm === 0) {
    return {
      basis: "Qualitative",
      direction: "NO_CHANGE",
      estimatedCo2DeltaKg: null,
      unit: "kg CO2",
      summary: "No distance supplied (0 km); CO2 impact is qualitative.",
      assumptions: ["Trip distance is 0 km."],
      uncertainty: "Non-zero distance required to quantify kg CO2 difference.",
      emissionFactorSource: `${fromSpec.source}; ${toSpec.source}`,
    };
  }

  const rounded = Math.round((fromPkm - toPkm) * input.distanceKm * 1000) / 1000;
  const deltaKg = rounded === 0 ? 0 : rounded;

  let direction: EmissionsImpactResult["direction"] = "NO_CHANGE";
  let summary = `No estimated CO2 change for ${input.distanceKm} km (${input.fromMode} -> ${input.toMode}).`;
  if (deltaKg > 0) {
    direction = "REDUCES_EMISSIONS";
    summary = `Estimated ~${deltaKg} kg CO2 avoided over ${input.distanceKm} km (${input.fromMode} -> ${input.toMode}).`;
  } else if (deltaKg < 0) {
    direction = "INCREASES_EMISSIONS";
    summary = `Estimated ~${Math.abs(deltaKg)} kg additional CO2 emitted over ${input.distanceKm} km (${input.fromMode} -> ${input.toMode}).`;
  }

  return {
    basis: "Estimated",
    direction,
    estimatedCo2DeltaKg: deltaKg,
    unit: "kg CO2",
    summary,
    assumptions: [
      `Symmetric factors converted to kg CO2/pax-km: origin=${fromPkm.toFixed(6)} (occ=${fromOcc}), dest=${toPkm.toFixed(6)} (occ=${toOcc}).`,
      "Tailpipe CO2 only (not full CO2e lifecycle); vehicle-km road factors apply 2015 Indian fleet categories without uplift unless stated.",
    ],
    uncertainty: "Historical 2015 fleet benchmark (+/-30% variance with congestion, cold starts, AC load, and real occupancy).",
    emissionFactorSource: `${fromSpec.source}; ${toSpec.source}`,
  };
}

export function calculateIndoorAirImpact(input: IndoorAirImpactInput): IndoorAirImpactResult {
  const sizing = calculateRoomFiltrationRequirements({
    roomLengthMeters: input.roomLengthMeters,
    roomWidthMeters: input.roomWidthMeters,
    roomHeightMeters: input.roomHeightMeters,
  });

  if (input.purifierCadrM3H !== undefined && (!Number.isFinite(input.purifierCadrM3H) || input.purifierCadrM3H <= 0)) {
    throw new RangeError("Purifier CADR (m³/h) must be a positive finite number when provided.");
  }

  const calculatedAch =
    input.purifierCadrM3H !== undefined
      ? Math.round((input.purifierCadrM3H / sizing.roomVolumeM3) * 10) / 10
      : sizing.recommendedAch;

  let measuredIndoorPm25: number | null = null;
  let indoorPm25Basis: IndoorAirImpactResult["indoorPm25Basis"] = "Unavailable";
  let sensorStatusNote = "No indoor sensor reading provided; indoor air quality remains unmeasured.";

  if (input.indoorSensorReading) {
    const r = input.indoorSensorReading;
    const obsMs = Date.parse(r.observationTimestamp);
    const nowMs = Date.parse(r.nowUtc ?? new Date().toISOString());
    const isFresh = Number.isFinite(obsMs) && obsMs <= nowMs + 60_000 && nowMs - obsMs <= 24 * 3600_000;

    if (r.sourceType !== "INDOOR_SENSOR") {
      sensorStatusNote = "Rejected: outdoor station concentration cannot be labelled as measured indoor PM2.5.";
    } else if (!Number.isFinite(r.value) || r.value < 0 || r.unit !== "µg/m³" || !isFresh) {
      sensorStatusNote = "Unavailable: indoor sensor reading failed finite/non-negative/µg/m³/24h-freshness validation.";
    } else {
      measuredIndoorPm25 = r.value;
      indoorPm25Basis = "Measured";
      sensorStatusNote = `Measured indoor PM2.5: ${r.value} µg/m³ at ${r.observationTimestamp}.`;
    }
  }

  return {
    achBasis: "Calculated",
    indoorPm25Basis,
    calculatedAch,
    recommendedCadrM3H: sizing.requiredCadrM3H,
    roomVolumeM3: sizing.roomVolumeM3,
    measuredIndoorPm25,
    sensorStatusNote,
    summary: `Calculated ${calculatedAch} ACH for ${sizing.roomVolumeM3} m³ room (${indoorPm25Basis === "Measured" ? `Measured indoor PM2.5: ${measuredIndoorPm25} µg/m³` : "indoor PM2.5 unmeasured"}).`,
    limitations: [
      "ACH is ALWAYS Calculated from room volume and CADR, never a Measured indoor result, and cannot predict exact AQI reduction.",
      "HEPA particle filtration does not automatically remove gaseous pollutants such as CO or VOCs.",
      "Real performance depends on door/window infiltration, placement, filter maintenance, and safe ventilation near combustion.",
    ],
  };
}
