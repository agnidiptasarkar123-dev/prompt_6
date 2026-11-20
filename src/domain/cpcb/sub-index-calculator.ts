import { CpcbSubIndex, CpcbCategory } from "@/schemas/cpcb.schema";
import { RawPollutantMeasurement } from "@/schemas/pollutant.schema";
import { CPCB_POLLUTANT_CONFIGS, BreakpointRange } from "./cpcb-constants";
import { checkRunningWindowSufficiency } from "./running-window";

/**
 * Calculates the CPCB Sub-Index for an individual pollutant measurement
 * using piecewise linear interpolation:
 * I_p = ((I_Hi - I_Lo) / (BP_Hi - BP_Lo)) * (C_p - BP_Lo) + I_Lo
 *
 * Grounded in MoEFCC CPCB NAQI (2014) Final Report standard methodology.
 */
export function calculatePollutantSubIndex(
  measurement: RawPollutantMeasurement
): CpcbSubIndex {
  const config = CPCB_POLLUTANT_CONFIGS[measurement.pollutant];
  const cp = measurement.concentration;

  // 1. Strict rejection of negative concentrations, NaN, and sensor fault sentinels (-999, etc.)
  if (cp === null || cp === undefined || isNaN(cp) || !isFinite(cp) || cp < 0) {
    return {
      pollutant: measurement.pollutant,
      concentration: cp,
      unit: measurement.unit,
      subIndex: null,
      category: null,
      windowHours: measurement.averagingWindowHours,
      validHours: measurement.validHoursInWindow,
      qualityFlag: "INVALID_SENSOR_READING"
    };
  }

  // 2. Validate regulatory averaging window compatibility
  if (!config.allowedAveragingHours.includes(measurement.averagingWindowHours)) {
    return {
      pollutant: measurement.pollutant,
      concentration: cp,
      unit: measurement.unit,
      subIndex: null,
      category: null,
      windowHours: measurement.averagingWindowHours,
      validHours: measurement.validHoursInWindow,
      qualityFlag: "INCOMPATIBLE_AVERAGING_WINDOW"
    };
  }

  // 3. Special handling for Ozone (CPCB Table 2 footnote)
  // 1-hourly O3 analysis is only valid when concentration exceeds 208 µg/m³ (Very Poor and Severe)
  if (measurement.pollutant === "O3" && measurement.averagingWindowHours === 1 && cp <= 208) {
    return {
      pollutant: measurement.pollutant,
      concentration: cp,
      unit: measurement.unit,
      subIndex: null,
      category: null,
      windowHours: 1,
      validHours: measurement.validHoursInWindow,
      qualityFlag: "INCOMPATIBLE_AVERAGING_WINDOW"
    };
  }

  // 4. Running-window data sufficiency check
  const sufficiency = checkRunningWindowSufficiency(
    measurement.pollutant,
    measurement.validHoursInWindow,
    measurement.averagingWindowHours
  );

  if (!sufficiency.isSufficient) {
    return {
      pollutant: measurement.pollutant,
      concentration: cp,
      unit: measurement.unit,
      subIndex: null,
      category: null,
      windowHours: measurement.averagingWindowHours,
      validHours: measurement.validHoursInWindow,
      qualityFlag: "INSUFFICIENT_WINDOW"
    };
  }

  // 5. Extreme concentration anomaly preservation:
  // If concentration exceeds the top breakpoint, preserve physical reading, flag as SUSPECT_EXTREME, and cap at 500
  const topBreakpoint = config.breakpoints[config.breakpoints.length - 1] as BreakpointRange;
  if (cp > topBreakpoint.boundaryHi) {
    return {
      pollutant: measurement.pollutant,
      concentration: cp,
      unit: measurement.unit,
      subIndex: 500,
      category: "SEVERE",
      windowHours: measurement.averagingWindowHours,
      validHours: measurement.validHoursInWindow,
      qualityFlag: "SUSPECT_EXTREME"
    };
  }

  // 6. Continuous interval lookup without breakpoint gaps
  // Bracket 1 (GOOD): [0, boundaryHi]
  // Brackets 2..6: (boundaryLo, boundaryHi]
  for (let idx = 0; idx < config.breakpoints.length; idx++) {
    const bp = config.breakpoints[idx] as BreakpointRange;
    const isMatch = idx === 0
      ? cp >= bp.boundaryLo && cp <= bp.boundaryHi
      : cp > bp.boundaryLo && cp <= bp.boundaryHi;

    if (isMatch) {
      const subIndexFloat =
        ((bp.aqiHi - bp.aqiLo) / (bp.bpHi - bp.bpLo)) * (cp - bp.bpLo) + bp.aqiLo;
      const subIndex = Math.round(subIndexFloat);

      return {
        pollutant: measurement.pollutant,
        concentration: cp,
        unit: measurement.unit,
        subIndex: Math.min(500, Math.max(0, subIndex)),
        category: bp.category,
        windowHours: measurement.averagingWindowHours,
        validHours: measurement.validHoursInWindow,
        qualityFlag: "VERIFIED"
      };
    }
  }

  /* v8 ignore next 11 */
  return {
    pollutant: measurement.pollutant,
    concentration: cp,
    unit: measurement.unit,
    subIndex: null,
    category: null,
    windowHours: measurement.averagingWindowHours,
    validHours: measurement.validHoursInWindow,
    qualityFlag: "PROVISIONAL"
  };
}

export function getCategoryFromAqi(aqi: number): CpcbCategory {
  if (aqi <= 50) return "GOOD";
  if (aqi <= 100) return "SATISFACTORY";
  if (aqi <= 200) return "MODERATE";
  if (aqi <= 300) return "POOR";
  if (aqi <= 400) return "VERY_POOR";
  return "SEVERE";
}
