// SPDX-License-Identifier: Apache-2.0
import { CpcbCategory } from "@/schemas/cpcb.schema";
import { CpcbPollutantId, PollutantUnit } from "@/schemas/pollutant.schema";

export interface BreakpointRange {
  category: CpcbCategory;
  // Official integer values tabulated in CPCB NAQI (2014) Table 2 / Table 3.11
  tabulatedLo: number;
  tabulatedHi: number;
  // Continuous real-line interval boundaries (boundaryLo, boundaryHi]
  boundaryLo: number;
  boundaryHi: number;
  // Mathematical interpolation anchor bounds
  bpLo: number;
  bpHi: number;
  // Sub-index anchor bounds corresponding to bpLo and bpHi
  aqiLo: number;
  aqiHi: number;
}

export interface PollutantConfig {
  name: string;
  unit: PollutantUnit;
  standardAveragingHours: 1 | 8 | 24;
  allowedAveragingHours: readonly (1 | 8 | 24)[];
  minRequiredHours: number; // 16 for 24h statutory, 6 for 8h secondary adapted
  breakpoints: BreakpointRange[];
}

/**
 * Official CPCB NAQI (2014) Breakpoints Table for all 8 monitored parameters.
 * Reconstructed from primary documentation (MoEFCC NAQI 2014 Final Report, CUPS/82/2014-15, Table 3.11)
 * and verified against the official CPCB calculator (AQI-Calculator.xls, SHA-256: 92eb788f...).
 * 
 * Boundary Semantics:
 * - Category 1 (GOOD): [boundaryLo, boundaryHi] -> [0, bpHi]
 * - Categories 2 to 6: (boundaryLo, boundaryHi] -> boundaryLo < Cp <= boundaryHi
 * 
 * Severe Category Reconciliation (CPCB Table 3.11 vs. AQI-Calculator.xls):
 * Table 3.11 publishes open-ended Severe ranges (e.g. 250+, 430+). In the official
 * AQI-Calculator.xls, the Severe sub-index formula continues the Very Poor slope:
 *   I_Severe = 400 + (Cp - BPLo) * (100 / Delta_VP)
 * The finite upper anchors (bpHi) below represent the exact calculation anchors where
 * this formula reaches the nominal CPCB scale anchor of 500:
 * - PM2.5: 250 + 130 = 380 µg/m³ (Severe slope: 100/130)
 * - PM10:  430 + 80  = 510 µg/m³ (Severe slope: 100/80)
 * - NO2:   400 + 120 = 520 µg/m³ (Severe slope: 100/120)
 * - SO2:   1600 + 800 = 2400 µg/m³ (Severe slope: 100/800)
 * - CO:    34 + 17   = 51.0 mg/m³ (Severe slope: 100/17)
 * - O3:    748 + 540 = 1288 µg/m³ (Table 3.11 1h acute spike continuation, Severe slope: 100/540)
 * - NH3:   1800 + 600 = 2400 µg/m³ (Severe slope: 100/600)
 * - Pb:    Lead (Pb) is completely absent from AQI-Calculator.xls and Table 3.11 publishes
 *          only 3.5+ with no upper anchor. HawaSaathi classifies Pb > 3.5 as SEVERE category
 *          but strictly treats the numerical sub-index as unavailable (null), refusing to invent an unverified formula.
 */
export const CPCB_POLLUTANT_CONFIGS: Record<CpcbPollutantId, PollutantConfig> = {
  "PM2.5": {
    name: "Particulate Matter 2.5",
    unit: "µg/m³",
    standardAveragingHours: 24,
    allowedAveragingHours: [24],
    minRequiredHours: 16,
    breakpoints: [
      { category: "GOOD", tabulatedLo: 0, tabulatedHi: 30, boundaryLo: 0, boundaryHi: 30, bpLo: 0, bpHi: 30, aqiLo: 0, aqiHi: 50 },
      { category: "SATISFACTORY", tabulatedLo: 31, tabulatedHi: 60, boundaryLo: 30, boundaryHi: 60, bpLo: 30, bpHi: 60, aqiLo: 50, aqiHi: 100 },
      { category: "MODERATE", tabulatedLo: 61, tabulatedHi: 90, boundaryLo: 60, boundaryHi: 90, bpLo: 60, bpHi: 90, aqiLo: 100, aqiHi: 200 },
      { category: "POOR", tabulatedLo: 91, tabulatedHi: 120, boundaryLo: 90, boundaryHi: 120, bpLo: 90, bpHi: 120, aqiLo: 200, aqiHi: 300 },
      { category: "VERY_POOR", tabulatedLo: 121, tabulatedHi: 250, boundaryLo: 120, boundaryHi: 250, bpLo: 120, bpHi: 250, aqiLo: 300, aqiHi: 400 },
      { category: "SEVERE", tabulatedLo: 251, tabulatedHi: 380, boundaryLo: 250, boundaryHi: 380, bpLo: 250, bpHi: 380, aqiLo: 400, aqiHi: 500 }
    ]
  },
  "PM10": {
    name: "Particulate Matter 10",
    unit: "µg/m³",
    standardAveragingHours: 24,
    allowedAveragingHours: [24],
    minRequiredHours: 16,
    breakpoints: [
      { category: "GOOD", tabulatedLo: 0, tabulatedHi: 50, boundaryLo: 0, boundaryHi: 50, bpLo: 0, bpHi: 50, aqiLo: 0, aqiHi: 50 },
      { category: "SATISFACTORY", tabulatedLo: 51, tabulatedHi: 100, boundaryLo: 50, boundaryHi: 100, bpLo: 50, bpHi: 100, aqiLo: 50, aqiHi: 100 },
      { category: "MODERATE", tabulatedLo: 101, tabulatedHi: 250, boundaryLo: 100, boundaryHi: 250, bpLo: 100, bpHi: 250, aqiLo: 100, aqiHi: 200 },
      { category: "POOR", tabulatedLo: 251, tabulatedHi: 350, boundaryLo: 250, boundaryHi: 350, bpLo: 250, bpHi: 350, aqiLo: 200, aqiHi: 300 },
      { category: "VERY_POOR", tabulatedLo: 351, tabulatedHi: 430, boundaryLo: 350, boundaryHi: 430, bpLo: 350, bpHi: 430, aqiLo: 300, aqiHi: 400 },
      { category: "SEVERE", tabulatedLo: 431, tabulatedHi: 510, boundaryLo: 430, boundaryHi: 510, bpLo: 430, bpHi: 510, aqiLo: 400, aqiHi: 500 }
    ]
  },
  "NO2": {
    name: "Nitrogen Dioxide",
    unit: "µg/m³",
    standardAveragingHours: 24,
    allowedAveragingHours: [24],
    minRequiredHours: 16,
    breakpoints: [
      { category: "GOOD", tabulatedLo: 0, tabulatedHi: 40, boundaryLo: 0, boundaryHi: 40, bpLo: 0, bpHi: 40, aqiLo: 0, aqiHi: 50 },
      { category: "SATISFACTORY", tabulatedLo: 41, tabulatedHi: 80, boundaryLo: 40, boundaryHi: 80, bpLo: 40, bpHi: 80, aqiLo: 50, aqiHi: 100 },
      { category: "MODERATE", tabulatedLo: 81, tabulatedHi: 180, boundaryLo: 80, boundaryHi: 180, bpLo: 80, bpHi: 180, aqiLo: 100, aqiHi: 200 },
      { category: "POOR", tabulatedLo: 181, tabulatedHi: 280, boundaryLo: 180, boundaryHi: 280, bpLo: 180, bpHi: 280, aqiLo: 200, aqiHi: 300 },
      { category: "VERY_POOR", tabulatedLo: 281, tabulatedHi: 400, boundaryLo: 280, boundaryHi: 400, bpLo: 280, bpHi: 400, aqiLo: 300, aqiHi: 400 },
      { category: "SEVERE", tabulatedLo: 401, tabulatedHi: 520, boundaryLo: 400, boundaryHi: 520, bpLo: 400, bpHi: 520, aqiLo: 400, aqiHi: 500 }
    ]
  },
  "O3": {
    name: "Ozone",
    unit: "µg/m³",
    standardAveragingHours: 8,
    // CPCB Table 3.11 Footnote & Section 3.3.4:
    // - 8h window is ONLY eligible for baseline <= 208 µg/m³ (Good..Poor).
    // - 1h window is ONLY eligible for acute photolytic spikes > 208 µg/m³ (Very Poor..Severe).
    allowedAveragingHours: [8, 1],
    minRequiredHours: 6, // Adapted secondary criterion (75% for 8h)
    breakpoints: [
      { category: "GOOD", tabulatedLo: 0, tabulatedHi: 50, boundaryLo: 0, boundaryHi: 50, bpLo: 0, bpHi: 50, aqiLo: 0, aqiHi: 50 },
      { category: "SATISFACTORY", tabulatedLo: 51, tabulatedHi: 100, boundaryLo: 50, boundaryHi: 100, bpLo: 50, bpHi: 100, aqiLo: 50, aqiHi: 100 },
      { category: "MODERATE", tabulatedLo: 101, tabulatedHi: 168, boundaryLo: 100, boundaryHi: 168, bpLo: 100, bpHi: 168, aqiLo: 100, aqiHi: 200 },
      { category: "POOR", tabulatedLo: 169, tabulatedHi: 208, boundaryLo: 168, boundaryHi: 208, bpLo: 168, bpHi: 208, aqiLo: 200, aqiHi: 300 },
      { category: "VERY_POOR", tabulatedLo: 209, tabulatedHi: 748, boundaryLo: 208, boundaryHi: 748, bpLo: 208, bpHi: 748, aqiLo: 300, aqiHi: 400 },
      { category: "SEVERE", tabulatedLo: 749, tabulatedHi: 1288, boundaryLo: 748, boundaryHi: 1288, bpLo: 748, bpHi: 1288, aqiLo: 400, aqiHi: 500 }
    ]
  },
  "CO": {
    name: "Carbon Monoxide",
    unit: "mg/m³",
    standardAveragingHours: 8,
    allowedAveragingHours: [8],
    minRequiredHours: 6,
    breakpoints: [
      { category: "GOOD", tabulatedLo: 0, tabulatedHi: 1.0, boundaryLo: 0, boundaryHi: 1.0, bpLo: 0, bpHi: 1.0, aqiLo: 0, aqiHi: 50 },
      { category: "SATISFACTORY", tabulatedLo: 1.1, tabulatedHi: 2.0, boundaryLo: 1.0, boundaryHi: 2.0, bpLo: 1.0, bpHi: 2.0, aqiLo: 50, aqiHi: 100 },
      { category: "MODERATE", tabulatedLo: 2.1, tabulatedHi: 10.0, boundaryLo: 2.0, boundaryHi: 10.0, bpLo: 2.0, bpHi: 10.0, aqiLo: 100, aqiHi: 200 },
      { category: "POOR", tabulatedLo: 10.1, tabulatedHi: 17.0, boundaryLo: 10.0, boundaryHi: 17.0, bpLo: 10.0, bpHi: 17.0, aqiLo: 200, aqiHi: 300 },
      { category: "VERY_POOR", tabulatedLo: 17.1, tabulatedHi: 34.0, boundaryLo: 17.0, boundaryHi: 34.0, bpLo: 17.0, bpHi: 34.0, aqiLo: 300, aqiHi: 400 },
      { category: "SEVERE", tabulatedLo: 34.1, tabulatedHi: 51.0, boundaryLo: 34.0, boundaryHi: 51.0, bpLo: 34.0, bpHi: 51.0, aqiLo: 400, aqiHi: 500 }
    ]
  },
  "SO2": {
    name: "Sulfur Dioxide",
    unit: "µg/m³",
    standardAveragingHours: 24,
    allowedAveragingHours: [24],
    minRequiredHours: 16,
    breakpoints: [
      { category: "GOOD", tabulatedLo: 0, tabulatedHi: 40, boundaryLo: 0, boundaryHi: 40, bpLo: 0, bpHi: 40, aqiLo: 0, aqiHi: 50 },
      { category: "SATISFACTORY", tabulatedLo: 41, tabulatedHi: 80, boundaryLo: 40, boundaryHi: 80, bpLo: 40, bpHi: 80, aqiLo: 50, aqiHi: 100 },
      { category: "MODERATE", tabulatedLo: 81, tabulatedHi: 380, boundaryLo: 80, boundaryHi: 380, bpLo: 80, bpHi: 380, aqiLo: 100, aqiHi: 200 },
      { category: "POOR", tabulatedLo: 381, tabulatedHi: 800, boundaryLo: 380, boundaryHi: 800, bpLo: 380, bpHi: 800, aqiLo: 200, aqiHi: 300 },
      { category: "VERY_POOR", tabulatedLo: 801, tabulatedHi: 1600, boundaryLo: 800, boundaryHi: 1600, bpLo: 800, bpHi: 1600, aqiLo: 300, aqiHi: 400 },
      { category: "SEVERE", tabulatedLo: 1601, tabulatedHi: 2400, boundaryLo: 1600, boundaryHi: 2400, bpLo: 1600, bpHi: 2400, aqiLo: 400, aqiHi: 500 }
    ]
  },
  "NH3": {
    name: "Ammonia",
    unit: "µg/m³",
    standardAveragingHours: 24,
    allowedAveragingHours: [24],
    minRequiredHours: 16,
    breakpoints: [
      { category: "GOOD", tabulatedLo: 0, tabulatedHi: 200, boundaryLo: 0, boundaryHi: 200, bpLo: 0, bpHi: 200, aqiLo: 0, aqiHi: 50 },
      { category: "SATISFACTORY", tabulatedLo: 201, tabulatedHi: 400, boundaryLo: 200, boundaryHi: 400, bpLo: 200, bpHi: 400, aqiLo: 50, aqiHi: 100 },
      { category: "MODERATE", tabulatedLo: 401, tabulatedHi: 800, boundaryLo: 400, boundaryHi: 800, bpLo: 400, bpHi: 800, aqiLo: 100, aqiHi: 200 },
      { category: "POOR", tabulatedLo: 801, tabulatedHi: 1200, boundaryLo: 800, boundaryHi: 1200, bpLo: 800, bpHi: 1200, aqiLo: 200, aqiHi: 300 },
      { category: "VERY_POOR", tabulatedLo: 1201, tabulatedHi: 1800, boundaryLo: 1200, boundaryHi: 1800, bpLo: 1200, bpHi: 1800, aqiLo: 300, aqiHi: 400 },
      { category: "SEVERE", tabulatedLo: 1801, tabulatedHi: 2400, boundaryLo: 1800, boundaryHi: 2400, bpLo: 1800, bpHi: 2400, aqiLo: 400, aqiHi: 500 }
    ]
  },
  "Pb": {
    name: "Lead",
    unit: "µg/m³",
    standardAveragingHours: 24,
    allowedAveragingHours: [24],
    minRequiredHours: 16,
    breakpoints: [
      { category: "GOOD", tabulatedLo: 0, tabulatedHi: 0.5, boundaryLo: 0, boundaryHi: 0.5, bpLo: 0, bpHi: 0.5, aqiLo: 0, aqiHi: 50 },
      { category: "SATISFACTORY", tabulatedLo: 0.6, tabulatedHi: 1.0, boundaryLo: 0.5, boundaryHi: 1.0, bpLo: 0.5, bpHi: 1.0, aqiLo: 50, aqiHi: 100 },
      { category: "MODERATE", tabulatedLo: 1.1, tabulatedHi: 2.0, boundaryLo: 1.0, boundaryHi: 2.0, bpLo: 1.0, bpHi: 2.0, aqiLo: 100, aqiHi: 200 },
      { category: "POOR", tabulatedLo: 2.1, tabulatedHi: 3.0, boundaryLo: 2.0, boundaryHi: 3.0, bpLo: 2.0, bpHi: 3.0, aqiLo: 200, aqiHi: 300 },
      { category: "VERY_POOR", tabulatedLo: 3.1, tabulatedHi: 3.5, boundaryLo: 3.0, boundaryHi: 3.5, bpLo: 3.0, bpHi: 3.5, aqiLo: 300, aqiHi: 400 }
      // Note: Lead has NO Severe numeric endpoint or formula in CPCB NAQI methodology or AQI-Calculator.xls.
      // Concentrations > 3.5 µg/m³ are classified as category 'SEVERE' with subIndex = null.
    ]
  }
};

/**
 * Extreme physical upper sanity bounds based on standard ambient analyzer full-scale spans:
 * - PM2.5: 2500 µg/m³ (Met One BAM-1020 / Thermo 5014i standard beta-attenuation detector span)
 * - PM10:  4000 µg/m³ (Optical light-scattering detector saturation ceiling)
 * - NO2:   2000 µg/m³ (Chemiluminescence analyzer 1000 ppb span)
 * - SO2:   4000 µg/m³ (Pulsed UV fluorescence analyzer detector limit)
 * - CO:    150 mg/m³  (Gas filter correlation NDIR detector saturation)
 * - O3:    2500 µg/m³ (Photometric UV absorption 1000 ppb span)
 * - NH3:   5000 µg/m³ (Chemiluminescence molybdenum converter limit)
 * - Pb:    50 µg/m³   (ICP-MS filter extraction maximum analytical span)
 * Concentrations beyond these values represent analyzer faults, stuck registers, or telemetry corruption.
 */
export const PHYSICAL_ANOMALY_THRESHOLDS: Record<CpcbPollutantId, number> = {
  "PM2.5": 2500, // µg/m³
  "PM10": 4000,  // µg/m³
  "NO2": 2000,   // µg/m³
  "SO2": 4000,   // µg/m³
  "CO": 150,     // mg/m³
  "O3": 2500,    // µg/m³
  "NH3": 5000,   // µg/m³
  "Pb": 50       // µg/m³
};
