// SPDX-License-Identifier: Apache-2.0
import { CpcbSubIndex, CpcbCategory } from "@/schemas/cpcb.schema";
import { RawPollutantMeasurement } from "@/schemas/pollutant.schema";
import { CPCB_POLLUTANT_CONFIGS, BreakpointRange, PHYSICAL_ANOMALY_THRESHOLDS } from "./cpcb-constants";
import { checkRunningWindowSufficiency } from "./running-window";

/**
 * Calculates the CPCB Sub-Index for an individual pollutant measurement
 * using piecewise linear interpolation:
 * I_p = ((I_Hi - I_Lo) / (BP_Hi - BP_Lo)) * (C_p - BP_Lo) + I_Lo
 *
 * Grounded in MoEFCC CPCB NAQI (2014) Final Report standard methodology
 * and reconciled against the official CPCB calculator (AQI-Calculator.xls).
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
      rawMathematicalSubIndex: null,
      category: null,
      windowHours: measurement.averagingWindowHours,
      validHours: measurement.validHoursInWindow,
      qualityFlag: "INVALID_SENSOR_READING",
      isBeyondNominalScale: false,
      reportingCeilingCappedAqi: null
    };
  }

  // 2. Reject genuine instrument anomalies exceeding physically possible ambient concentrations
  const physicalAnomalyLimit = PHYSICAL_ANOMALY_THRESHOLDS[measurement.pollutant];
  if (cp > physicalAnomalyLimit) {
    return {
      pollutant: measurement.pollutant,
      concentration: cp,
      unit: measurement.unit,
      subIndex: null,
      rawMathematicalSubIndex: null,
      category: null,
      windowHours: measurement.averagingWindowHours,
      validHours: measurement.validHoursInWindow,
      qualityFlag: "INVALID_SENSOR_READING",
      isBeyondNominalScale: false,
      reportingCeilingCappedAqi: null
    };
  }

  // 3. Validate regulatory averaging window compatibility
  if (!config.allowedAveragingHours.includes(measurement.averagingWindowHours)) {
    return {
      pollutant: measurement.pollutant,
      concentration: cp,
      unit: measurement.unit,
      subIndex: null,
      rawMathematicalSubIndex: null,
      category: null,
      windowHours: measurement.averagingWindowHours,
      validHours: measurement.validHoursInWindow,
      qualityFlag: "INCOMPATIBLE_AVERAGING_WINDOW",
      isBeyondNominalScale: false,
      reportingCeilingCappedAqi: null
    };
  }

  // 4. Ozone averaging-window eligibility rules (CPCB CUPS/82/2014-15 Table 3.11 & Section 3.3.4):
  // - Standard 8-hour measurements are ONLY eligible for the published ordinary range (<= 208 µg/m³).
  //   An 8-hour measurement above 208 must NOT silently enter the starred 1-hour ranges!
  // - Special 1-hour measurements are ONLY eligible in the starred upper ranges (> 208 µg/m³).
  if (measurement.pollutant === "O3") {
    if (measurement.averagingWindowHours === 8 && cp > 208) {
      return {
        pollutant: "O3",
        concentration: cp,
        unit: measurement.unit,
        subIndex: null,
        rawMathematicalSubIndex: null,
        category: null,
        windowHours: 8,
        validHours: measurement.validHoursInWindow,
        qualityFlag: "INCOMPATIBLE_AVERAGING_WINDOW",
        isBeyondNominalScale: false,
        reportingCeilingCappedAqi: null
      };
    }

    if (measurement.averagingWindowHours === 1 && cp <= 208) {
      return {
        pollutant: "O3",
        concentration: cp,
        unit: measurement.unit,
        subIndex: null,
        rawMathematicalSubIndex: null,
        category: null,
        windowHours: 1,
        validHours: measurement.validHoursInWindow,
        qualityFlag: "INCOMPATIBLE_AVERAGING_WINDOW",
        isBeyondNominalScale: false,
        reportingCeilingCappedAqi: null
      };
    }
  }

  // 5. Running-window data sufficiency check
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
      rawMathematicalSubIndex: null,
      category: null,
      windowHours: measurement.averagingWindowHours,
      validHours: measurement.validHoursInWindow,
      qualityFlag: "INSUFFICIENT_WINDOW",
      isBeyondNominalScale: false,
      reportingCeilingCappedAqi: null
    };
  }

  // 6. Lead (Pb) Severe handling:
  // In CPCB NAQI Table 3.11, Lead is published with ranges up to 3.5 µg/m³ (Very Poor).
  // For concentrations > 3.5 µg/m³, Table 3.11 designates category 'Severe' without an upper anchor.
  // In the official CPCB AQI-Calculator.xls, Lead is completely absent.
  // HawaSaathi strictly preserves the measured concentration and assigns category SEVERE,
  // but reports subIndex as null (unavailable) with qualityFlag NO_DEFENSIBLE_SUBINDEX_FORMULA.
  if (measurement.pollutant === "Pb" && cp > 3.5) {
    return {
      pollutant: "Pb",
      concentration: cp,
      unit: measurement.unit,
      subIndex: null,
      rawMathematicalSubIndex: null,
      category: "SEVERE",
      windowHours: measurement.averagingWindowHours,
      validHours: measurement.validHoursInWindow,
      qualityFlag: "NO_DEFENSIBLE_SUBINDEX_FORMULA",
      isBeyondNominalScale: false,
      reportingCeilingCappedAqi: null
    };
  }

  // 7. Severe-range measurements exceeding the nominal 500 calculation anchor:
  // In the official AQI-Calculator.xls, the Severe formula continues the Very Poor slope:
  // I_Severe = 400 + (Cp - BPLo) * (100 / Delta_VP)
  // When physical concentration exceeds bpHi (e.g. 380 for PM2.5, 510 for PM10),
  // the scientific calculation does NOT clamp silently to 500: it preserves the exact
  // formula extrapolation, sets isBeyondNominalScale = true, reportingCeilingCappedAqi = 500,
  // and flags the measurement as EXCEEDS_SEVERE_FORMULA_ANCHOR.
  const topBreakpoint = config.breakpoints[config.breakpoints.length - 1] as BreakpointRange;
  if (cp > topBreakpoint.boundaryHi) {
    const subIndexFloat =
      ((topBreakpoint.aqiHi - topBreakpoint.aqiLo) / (topBreakpoint.bpHi - topBreakpoint.bpLo)) *
        (cp - topBreakpoint.bpLo) +
      topBreakpoint.aqiLo;
    const subIndex = Math.round(subIndexFloat);

    return {
      pollutant: measurement.pollutant,
      concentration: cp,
      unit: measurement.unit,
      subIndex,
      rawMathematicalSubIndex: subIndexFloat,
      category: "SEVERE",
      windowHours: measurement.averagingWindowHours,
      validHours: measurement.validHoursInWindow,
      qualityFlag: "EXCEEDS_SEVERE_FORMULA_ANCHOR",
      isBeyondNominalScale: true,
      reportingCeilingCappedAqi: 500
    };
  }

  // 8. Continuous interval lookup without breakpoint gaps
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
        subIndex: Math.max(0, subIndex),
        rawMathematicalSubIndex: subIndexFloat,
        category: bp.category,
        windowHours: measurement.averagingWindowHours,
        validHours: measurement.validHoursInWindow,
        qualityFlag: "VERIFIED",
        isBeyondNominalScale: false,
        reportingCeilingCappedAqi: Math.min(500, Math.max(0, subIndex))
      };
    }
  }

  /* v8 ignore next 14 */
  return {
    pollutant: measurement.pollutant,
    concentration: cp,
    unit: measurement.unit,
    subIndex: null,
    rawMathematicalSubIndex: null,
    category: null,
    windowHours: measurement.averagingWindowHours,
    validHours: measurement.validHoursInWindow,
    qualityFlag: "PROVISIONAL",
    isBeyondNominalScale: false,
    reportingCeilingCappedAqi: null
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
