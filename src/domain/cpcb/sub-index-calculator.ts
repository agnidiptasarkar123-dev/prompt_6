import { CpcbSubIndex, CpcbCategory } from "@/schemas/cpcb.schema";
import { RawPollutantMeasurement } from "@/schemas/pollutant.schema";
import { ObservationQualityFlag } from "@/schemas/freshness.schema";
import { CPCB_POLLUTANT_CONFIGS, BreakpointRange } from "./cpcb-constants";
import { checkRunningWindowSufficiency } from "./running-window";

/**
 * Calculates the CPCB Sub-Index for an individual pollutant measurement
 * using piecewise linear interpolation:
 * I_p = ((I_Hi - I_Lo) / (BP_Hi - BP_Lo)) * (C_p - BP_Lo) + I_Lo
 */
export function calculatePollutantSubIndex(
  measurement: RawPollutantMeasurement
): CpcbSubIndex {
  const config = CPCB_POLLUTANT_CONFIGS[measurement.pollutant];
  const sufficiency = checkRunningWindowSufficiency(
    measurement.pollutant,
    measurement.validHoursInWindow
  );

  // If running window sufficiency fails, sub-index cannot be computed
  if (!sufficiency.isSufficient) {
    return {
      pollutant: measurement.pollutant,
      concentration: measurement.concentration,
      unit: measurement.unit,
      subIndex: null,
      category: null,
      windowHours: config.averagingHours,
      validHours: measurement.validHoursInWindow,
      qualityFlag: "INSUFFICIENT_WINDOW"
    };
  }

  const cp = measurement.concentration;
  let flag: ObservationQualityFlag = "VERIFIED";

  // Extreme reading anomaly detection without silent dropping:
  // If concentration exceeds the top breakpoint, flag as SUSPECT_EXTREME and cap sub-index at 500
  const topBreakpoint = config.breakpoints[config.breakpoints.length - 1] as BreakpointRange;
  if (cp > topBreakpoint.bpHi) {
    flag = "SUSPECT_EXTREME";
    return {
      pollutant: measurement.pollutant,
      concentration: cp,
      unit: measurement.unit,
      subIndex: 500,
      category: "SEVERE",
      windowHours: config.averagingHours,
      validHours: measurement.validHoursInWindow,
      qualityFlag: flag
    };
  }

  // Find corresponding breakpoint bracket
  for (const bp of config.breakpoints) {
    if (cp >= bp.bpLo && cp <= bp.bpHi) {
      // Linear interpolation formula
      const subIndexFloat =
        ((bp.aqiHi - bp.aqiLo) / (bp.bpHi - bp.bpLo)) * (cp - bp.bpLo) + bp.aqiLo;
      const subIndex = Math.round(subIndexFloat);

      return {
        pollutant: measurement.pollutant,
        concentration: cp,
        unit: measurement.unit,
        subIndex: Math.min(500, Math.max(0, subIndex)),
        category: bp.category,
        windowHours: config.averagingHours,
        validHours: measurement.validHoursInWindow,
        qualityFlag: flag
      };
    }
  }

  // Fallback for near-zero or minor floating boundary match
  const firstBp = config.breakpoints[0] as BreakpointRange;
  if (cp < firstBp.bpLo) {
    return {
      pollutant: measurement.pollutant,
      concentration: cp,
      unit: measurement.unit,
      subIndex: 0,
      category: "GOOD",
      windowHours: config.averagingHours,
      validHours: measurement.validHoursInWindow,
      qualityFlag: flag
    };
  }

  return {
    pollutant: measurement.pollutant,
    concentration: cp,
    unit: measurement.unit,
    subIndex: null,
    category: null,
    windowHours: config.averagingHours,
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
