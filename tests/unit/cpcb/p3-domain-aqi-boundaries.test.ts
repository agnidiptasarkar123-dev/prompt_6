// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import { calculatePollutantSubIndex, getCategoryFromAqi } from "@/domain/cpcb/sub-index-calculator";
import { calculateStationCpcbAqi } from "@/domain/cpcb/cpcb-engine";
import { createValidatedAggregatedMeasurement } from "@/domain/cpcb/rolling-window-aggregator";
import type { RawPollutantMeasurement, ValidatedAggregatedMeasurement } from "@/schemas/pollutant.schema";

describe("Phase 3 CPCB NAQI Domain Boundaries & Statutory Sufficiency Suite (P3-AQI)", () => {
  const baseTime = "2026-11-24T12:00:00Z";

  const make24h = (
    pollutant: RawPollutantMeasurement["pollutant"],
    concentration: number,
    validHoursInWindow: number = 24
  ): RawPollutantMeasurement => ({
    pollutant,
    concentration,
    unit: pollutant === "CO" ? "mg/m³" : "µg/m³",
    averagingWindowHours: 24,
    recordedAtUtc: baseTime,
    validHoursInWindow
  });

  const make8h = (
    pollutant: RawPollutantMeasurement["pollutant"],
    concentration: number,
    validHoursInWindow: number = 8
  ): RawPollutantMeasurement => ({
    pollutant,
    concentration,
    unit: pollutant === "CO" ? "mg/m³" : "µg/m³",
    averagingWindowHours: 8,
    recordedAtUtc: baseTime,
    validHoursInWindow
  });

  const make1h = (
    pollutant: RawPollutantMeasurement["pollutant"],
    concentration: number,
    validHoursInWindow: number = 1
  ): RawPollutantMeasurement => ({
    pollutant,
    concentration,
    unit: "µg/m³",
    averagingWindowHours: 1,
    recordedAtUtc: baseTime,
    validHoursInWindow
  });

  const makeAgg = (
    stationId: string,
    pollutant: ValidatedAggregatedMeasurement["pollutant"],
    concentration: number,
    averagingWindowHours: 1 | 8 | 24 = 24,
    validHoursInWindow: number = averagingWindowHours
  ): ValidatedAggregatedMeasurement =>
    createValidatedAggregatedMeasurement({
      stationId,
      pollutant,
      concentration,
      unit: pollutant === "CO" ? "mg/m³" : "µg/m³",
      averagingWindowHours,
      recordedAtUtc: baseTime,
      validHoursInWindow,
      completenessPolicy: averagingWindowHours === 24 ? "OFFICIAL_CPCB_STATUTORY_16H" : "ADAPTED_HAWASAATHI_6H"
    });

  // Section 1: PM2.5 Breakpoints & Transitions (P3-AQI-001 to P3-AQI-015)
  it("P3-AQI-001: PM2.5 = 0 µg/m³ yields sub-index 0 (Good)", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 0));
    expect(res.subIndex).toBe(0);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-002: PM2.5 = 15 µg/m³ yields sub-index 25 (Good midpoint)", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 15));
    expect(res.subIndex).toBe(25);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-003: PM2.5 = 30 µg/m³ yields sub-index 50 (Good upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 30));
    expect(res.subIndex).toBe(50);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-004: PM2.5 = 30.1 µg/m³ yields sub-index 50 and category Satisfactory", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 30.1));
    expect(res.subIndex).toBe(50);
    expect(res.category).toBe("SATISFACTORY");
  });

  it("P3-AQI-005: PM2.5 = 45 µg/m³ yields sub-index 75 (Satisfactory midpoint)", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 45));
    expect(res.subIndex).toBe(75);
    expect(res.category).toBe("SATISFACTORY");
  });

  it("P3-AQI-006: PM2.5 = 60 µg/m³ yields sub-index 100 (Satisfactory upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 60));
    expect(res.subIndex).toBe(100);
    expect(res.category).toBe("SATISFACTORY");
  });

  it("P3-AQI-007: PM2.5 = 60.1 µg/m³ yields sub-index 100 and category Moderate", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 60.1));
    expect(res.subIndex).toBe(100);
    expect(res.category).toBe("MODERATE");
  });

  it("P3-AQI-008: PM2.5 = 75 µg/m³ yields sub-index 150 (Moderate midpoint)", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 75));
    expect(res.subIndex).toBe(150);
    expect(res.category).toBe("MODERATE");
  });

  it("P3-AQI-009: PM2.5 = 90 µg/m³ yields sub-index 200 (Moderate upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 90));
    expect(res.subIndex).toBe(200);
    expect(res.category).toBe("MODERATE");
  });

  it("P3-AQI-010: PM2.5 = 90.1 µg/m³ yields sub-index 200 and category Poor", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 90.1));
    expect(res.subIndex).toBe(200);
    expect(res.category).toBe("POOR");
  });

  it("P3-AQI-011: PM2.5 = 105 µg/m³ yields sub-index 250 (Poor midpoint)", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 105));
    expect(res.subIndex).toBe(250);
    expect(res.category).toBe("POOR");
  });

  it("P3-AQI-012: PM2.5 = 120 µg/m³ yields sub-index 300 (Poor upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 120));
    expect(res.subIndex).toBe(300);
    expect(res.category).toBe("POOR");
  });

  it("P3-AQI-013: PM2.5 = 120.1 µg/m³ yields sub-index 300 and category Very Poor", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 120.1));
    expect(res.subIndex).toBe(300);
    expect(res.category).toBe("VERY_POOR");
  });

  it("P3-AQI-014: PM2.5 = 185 µg/m³ yields sub-index 350 (Very Poor midpoint)", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 185));
    expect(res.subIndex).toBe(350);
    expect(res.category).toBe("VERY_POOR");
  });

  it("P3-AQI-015: PM2.5 = 250 µg/m³ yields sub-index 400 (Very Poor upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 250));
    expect(res.subIndex).toBe(400);
    expect(res.category).toBe("VERY_POOR");
  });

  // Section 2: PM10 Breakpoints & Transitions (P3-AQI-016 to P3-AQI-030)
  it("P3-AQI-016: PM10 = 0 µg/m³ yields sub-index 0 (Good)", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 0));
    expect(res.subIndex).toBe(0);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-017: PM10 = 25 µg/m³ yields sub-index 25 (Good midpoint)", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 25));
    expect(res.subIndex).toBe(25);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-018: PM10 = 50 µg/m³ yields sub-index 50 (Good upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 50));
    expect(res.subIndex).toBe(50);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-019: PM10 = 50.1 µg/m³ yields sub-index 50 and category Satisfactory", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 50.1));
    expect(res.subIndex).toBe(50);
    expect(res.category).toBe("SATISFACTORY");
  });

  it("P3-AQI-020: PM10 = 75 µg/m³ yields sub-index 75 (Satisfactory midpoint)", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 75));
    expect(res.subIndex).toBe(75);
    expect(res.category).toBe("SATISFACTORY");
  });

  it("P3-AQI-021: PM10 = 100 µg/m³ yields sub-index 100 (Satisfactory upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 100));
    expect(res.subIndex).toBe(100);
    expect(res.category).toBe("SATISFACTORY");
  });

  it("P3-AQI-022: PM10 = 100.1 µg/m³ yields sub-index 100 and category Moderate", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 100.1));
    expect(res.subIndex).toBe(100);
    expect(res.category).toBe("MODERATE");
  });

  it("P3-AQI-023: PM10 = 175 µg/m³ yields sub-index 150 (Moderate midpoint)", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 175));
    expect(res.subIndex).toBe(150);
    expect(res.category).toBe("MODERATE");
  });

  it("P3-AQI-024: PM10 = 250 µg/m³ yields sub-index 200 (Moderate upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 250));
    expect(res.subIndex).toBe(200);
    expect(res.category).toBe("MODERATE");
  });

  it("P3-AQI-025: PM10 = 250.1 µg/m³ yields sub-index 200 and category Poor", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 250.1));
    expect(res.subIndex).toBe(200);
    expect(res.category).toBe("POOR");
  });

  it("P3-AQI-026: PM10 = 300 µg/m³ yields sub-index 250 (Poor midpoint)", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 300));
    expect(res.subIndex).toBe(250);
    expect(res.category).toBe("POOR");
  });

  it("P3-AQI-027: PM10 = 350 µg/m³ yields sub-index 300 (Poor upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 350));
    expect(res.subIndex).toBe(300);
    expect(res.category).toBe("POOR");
  });

  it("P3-AQI-028: PM10 = 350.1 µg/m³ yields sub-index 300 and category Very Poor", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 350.1));
    expect(res.subIndex).toBe(300);
    expect(res.category).toBe("VERY_POOR");
  });

  it("P3-AQI-029: PM10 = 390 µg/m³ yields sub-index 350 (Very Poor midpoint)", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 390));
    expect(res.subIndex).toBe(350);
    expect(res.category).toBe("VERY_POOR");
  });

  it("P3-AQI-030: PM10 = 430 µg/m³ yields sub-index 400 (Very Poor upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 430));
    expect(res.subIndex).toBe(400);
    expect(res.category).toBe("VERY_POOR");
  });

  // Section 3: NO2, SO2, NH3, CO Breakpoints & Units (P3-AQI-031 to P3-AQI-060)
  it("P3-AQI-031: NO2 = 0 µg/m³ yields sub-index 0 (Good)", () => {
    const res = calculatePollutantSubIndex(make24h("NO2", 0));
    expect(res.subIndex).toBe(0);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-032: NO2 = 40 µg/m³ yields sub-index 50 (Good upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("NO2", 40));
    expect(res.subIndex).toBe(50);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-033: NO2 = 80 µg/m³ yields sub-index 100 (Satisfactory upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("NO2", 80));
    expect(res.subIndex).toBe(100);
    expect(res.category).toBe("SATISFACTORY");
  });

  it("P3-AQI-034: NO2 = 180 µg/m³ yields sub-index 200 (Moderate upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("NO2", 180));
    expect(res.subIndex).toBe(200);
    expect(res.category).toBe("MODERATE");
  });

  it("P3-AQI-035: NO2 = 280 µg/m³ yields sub-index 300 (Poor upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("NO2", 280));
    expect(res.subIndex).toBe(300);
    expect(res.category).toBe("POOR");
  });

  it("P3-AQI-036: NO2 = 400 µg/m³ yields sub-index 400 (Very Poor upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("NO2", 400));
    expect(res.subIndex).toBe(400);
    expect(res.category).toBe("VERY_POOR");
  });

  it("P3-AQI-037: SO2 = 0 µg/m³ yields sub-index 0 (Good)", () => {
    const res = calculatePollutantSubIndex(make24h("SO2", 0));
    expect(res.subIndex).toBe(0);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-038: SO2 = 40 µg/m³ yields sub-index 50 (Good upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("SO2", 40));
    expect(res.subIndex).toBe(50);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-039: SO2 = 80 µg/m³ yields sub-index 100 (Satisfactory upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("SO2", 80));
    expect(res.subIndex).toBe(100);
    expect(res.category).toBe("SATISFACTORY");
  });

  it("P3-AQI-040: SO2 = 380 µg/m³ yields sub-index 200 (Moderate upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("SO2", 380));
    expect(res.subIndex).toBe(200);
    expect(res.category).toBe("MODERATE");
  });

  it("P3-AQI-041: SO2 = 800 µg/m³ yields sub-index 300 (Poor upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("SO2", 800));
    expect(res.subIndex).toBe(300);
    expect(res.category).toBe("POOR");
  });

  it("P3-AQI-042: SO2 = 1600 µg/m³ yields sub-index 400 (Very Poor upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("SO2", 1600));
    expect(res.subIndex).toBe(400);
    expect(res.category).toBe("VERY_POOR");
  });

  it("P3-AQI-043: NH3 = 0 µg/m³ yields sub-index 0 (Good)", () => {
    const res = calculatePollutantSubIndex(make24h("NH3", 0));
    expect(res.subIndex).toBe(0);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-044: NH3 = 200 µg/m³ yields sub-index 50 (Good upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("NH3", 200));
    expect(res.subIndex).toBe(50);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-045: NH3 = 400 µg/m³ yields sub-index 100 (Satisfactory upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("NH3", 400));
    expect(res.subIndex).toBe(100);
    expect(res.category).toBe("SATISFACTORY");
  });

  it("P3-AQI-046: NH3 = 800 µg/m³ yields sub-index 200 (Moderate upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("NH3", 800));
    expect(res.subIndex).toBe(200);
    expect(res.category).toBe("MODERATE");
  });

  it("P3-AQI-047: NH3 = 1200 µg/m³ yields sub-index 300 (Poor upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("NH3", 1200));
    expect(res.subIndex).toBe(300);
    expect(res.category).toBe("POOR");
  });

  it("P3-AQI-048: NH3 = 1800 µg/m³ yields sub-index 400 (Very Poor upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("NH3", 1800));
    expect(res.subIndex).toBe(400);
    expect(res.category).toBe("VERY_POOR");
  });

  it("P3-AQI-049: CO = 0 mg/m³ yields sub-index 0 (Good)", () => {
    const res = calculatePollutantSubIndex(make8h("CO", 0));
    expect(res.subIndex).toBe(0);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-050: CO = 0.5 mg/m³ yields sub-index 25 (Good midpoint)", () => {
    const res = calculatePollutantSubIndex(make8h("CO", 0.5));
    expect(res.subIndex).toBe(25);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-051: CO = 1.0 mg/m³ yields sub-index 50 (Good upper boundary)", () => {
    const res = calculatePollutantSubIndex(make8h("CO", 1.0));
    expect(res.subIndex).toBe(50);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-052: CO = 1.5 mg/m³ yields sub-index 75 (Satisfactory midpoint)", () => {
    const res = calculatePollutantSubIndex(make8h("CO", 1.5));
    expect(res.subIndex).toBe(75);
    expect(res.category).toBe("SATISFACTORY");
  });

  it("P3-AQI-053: CO = 2.0 mg/m³ yields sub-index 100 (Satisfactory upper boundary)", () => {
    const res = calculatePollutantSubIndex(make8h("CO", 2.0));
    expect(res.subIndex).toBe(100);
    expect(res.category).toBe("SATISFACTORY");
  });

  it("P3-AQI-054: CO = 6.0 mg/m³ yields sub-index 150 (Moderate midpoint)", () => {
    const res = calculatePollutantSubIndex(make8h("CO", 6.0));
    expect(res.subIndex).toBe(150);
    expect(res.category).toBe("MODERATE");
  });

  it("P3-AQI-055: CO = 10.0 mg/m³ yields sub-index 200 (Moderate upper boundary)", () => {
    const res = calculatePollutantSubIndex(make8h("CO", 10.0));
    expect(res.subIndex).toBe(200);
    expect(res.category).toBe("MODERATE");
  });

  it("P3-AQI-056: CO = 13.5 mg/m³ yields sub-index 250 (Poor midpoint)", () => {
    const res = calculatePollutantSubIndex(make8h("CO", 13.5));
    expect(res.subIndex).toBe(250);
    expect(res.category).toBe("POOR");
  });

  it("P3-AQI-057: CO = 17.0 mg/m³ yields sub-index 300 (Poor upper boundary)", () => {
    const res = calculatePollutantSubIndex(make8h("CO", 17.0));
    expect(res.subIndex).toBe(300);
    expect(res.category).toBe("POOR");
  });

  it("P3-AQI-058: CO = 25.5 mg/m³ yields sub-index 350 (Very Poor midpoint)", () => {
    const res = calculatePollutantSubIndex(make8h("CO", 25.5));
    expect(res.subIndex).toBe(350);
    expect(res.category).toBe("VERY_POOR");
  });

  it("P3-AQI-059: CO = 34.0 mg/m³ yields sub-index 400 (Very Poor upper boundary)", () => {
    const res = calculatePollutantSubIndex(make8h("CO", 34.0));
    expect(res.subIndex).toBe(400);
    expect(res.category).toBe("VERY_POOR");
  });

  it("P3-AQI-060: CO requires mg/m³ unit and rejects µg/m³ without conversion", () => {
    const wrongUnit: RawPollutantMeasurement = {
      pollutant: "CO",
      concentration: 1000,
      unit: "µg/m³",
      averagingWindowHours: 8,
      recordedAtUtc: baseTime,
      validHoursInWindow: 8
    };
    const res = calculatePollutantSubIndex(wrongUnit);
    expect(res.subIndex).toBeNull();
  });

  // Section 4: Ozone Dual-Window & Pb Breakpoints (P3-AQI-061 to P3-AQI-080)
  it("P3-AQI-061: O3 (8-hour) = 50 µg/m³ yields sub-index 50 (Good upper boundary)", () => {
    const res = calculatePollutantSubIndex(make8h("O3", 50));
    expect(res.subIndex).toBe(50);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-062: O3 (8-hour) = 100 µg/m³ yields sub-index 100 (Satisfactory upper boundary)", () => {
    const res = calculatePollutantSubIndex(make8h("O3", 100));
    expect(res.subIndex).toBe(100);
    expect(res.category).toBe("SATISFACTORY");
  });

  it("P3-AQI-063: O3 (8-hour) = 168 µg/m³ yields sub-index 200 (Moderate upper boundary)", () => {
    const res = calculatePollutantSubIndex(make8h("O3", 168));
    expect(res.subIndex).toBe(200);
    expect(res.category).toBe("MODERATE");
  });

  it("P3-AQI-064: O3 (8-hour) = 208 µg/m³ yields sub-index 300 (Poor upper boundary)", () => {
    const res = calculatePollutantSubIndex(make8h("O3", 208));
    expect(res.subIndex).toBe(300);
    expect(res.category).toBe("POOR");
  });

  it("P3-AQI-065: O3 (1-hour) = 748 µg/m³ yields sub-index 400 (Very Poor upper boundary)", () => {
    const res = calculatePollutantSubIndex(make1h("O3", 748));
    expect(res.subIndex).toBe(400);
    expect(res.category).toBe("VERY_POOR");
  });

  it("P3-AQI-066: O3 (1-hour) rejects Good and Satisfactory ranges (1h window not defined for low O3 <= 208)", () => {
    const res = calculatePollutantSubIndex(make1h("O3", 50));
    expect(res.subIndex).toBeNull();
    expect(res.qualityFlag).toBe("INCOMPATIBLE_AVERAGING_WINDOW");
  });

  it("P3-AQI-067: O3 (1-hour) rejects Moderate range concentrations <= 208", () => {
    const res = calculatePollutantSubIndex(make1h("O3", 101));
    expect(res.subIndex).toBeNull();
    expect(res.qualityFlag).toBe("INCOMPATIBLE_AVERAGING_WINDOW");
  });

  it("P3-AQI-068: O3 (1-hour) = 208 µg/m³ rejects 1h window (boundary condition <= 208)", () => {
    const res = calculatePollutantSubIndex(make1h("O3", 208));
    expect(res.subIndex).toBeNull();
    expect(res.qualityFlag).toBe("INCOMPATIBLE_AVERAGING_WINDOW");
  });

  it("P3-AQI-069: O3 (1-hour) = 209 µg/m³ interpolates Very Poor range [208, 748] -> [300, 400]", () => {
    const res = calculatePollutantSubIndex(make1h("O3", 209));
    expect(res.subIndex).toBe(300);
    expect(res.category).toBe("VERY_POOR");
  });

  it("P3-AQI-070: Pb = 0 µg/m³ yields sub-index 0 (Good)", () => {
    const res = calculatePollutantSubIndex(make24h("Pb", 0));
    expect(res.subIndex).toBe(0);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-071: Pb = 0.5 µg/m³ yields sub-index 50 (Good upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("Pb", 0.5));
    expect(res.subIndex).toBe(50);
    expect(res.category).toBe("GOOD");
  });

  it("P3-AQI-072: Pb = 1.0 µg/m³ yields sub-index 100 (Satisfactory upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("Pb", 1.0));
    expect(res.subIndex).toBe(100);
    expect(res.category).toBe("SATISFACTORY");
  });

  it("P3-AQI-073: Pb = 2.0 µg/m³ yields sub-index 200 (Moderate upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("Pb", 2.0));
    expect(res.subIndex).toBe(200);
    expect(res.category).toBe("MODERATE");
  });

  it("P3-AQI-074: Pb = 3.0 µg/m³ yields sub-index 300 (Poor upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("Pb", 3.0));
    expect(res.subIndex).toBe(300);
    expect(res.category).toBe("POOR");
  });

  it("P3-AQI-075: Pb = 3.5 µg/m³ yields sub-index 400 (Very Poor upper boundary)", () => {
    const res = calculatePollutantSubIndex(make24h("Pb", 3.5));
    expect(res.subIndex).toBe(400);
    expect(res.category).toBe("VERY_POOR");
  });

  it("P3-AQI-076: Pb > 3.5 µg/m³ returns null sub-index (CPCB does not define numerical formula for Severe Pb)", () => {
    const res = calculatePollutantSubIndex(make24h("Pb", 4.0));
    expect(res.subIndex).toBeNull();
    expect(res.category).toBe("SEVERE");
  });

  it("P3-AQI-077: Pb > 3.5 µg/m³ does not block other valid pollutants from computing station AQI", () => {
    const stationData = [
      makeAgg("STN-001", "PM2.5", 75), // AQI 150
      makeAgg("STN-001", "PM10", 175), // AQI 150
      makeAgg("STN-001", "NO2", 50),   // AQI 63
      makeAgg("STN-001", "Pb", 5.0)    // Severe Pb (null subIndex)
    ];
    const aqi = calculateStationCpcbAqi("STN-001", stationData);
    expect(aqi.overallAqi).toBe(150);
    expect(aqi.sufficiencyStatus).toBe("SUFFICIENT");
  });

  it("P3-AQI-078: negative concentration returns null sub-index", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", -10));
    expect(res.subIndex).toBeNull();
  });

  it("P3-AQI-079: NaN concentration returns null sub-index", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", NaN));
    expect(res.subIndex).toBeNull();
  });

  it("P3-AQI-080: infinite concentration returns null sub-index", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", Infinity));
    expect(res.subIndex).toBeNull();
  });

  // Section 5: Severe Category Open-Ended Formula & Ceiling (P3-AQI-081 to P3-AQI-100)
  it("P3-AQI-081: PM2.5 = 250.1 µg/m³ yields sub-index 400 (Severe lower boundary continuation)", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 250.1));
    expect(res.subIndex).toBe(400);
    expect(res.category).toBe("SEVERE");
  });

  it("P3-AQI-082: PM2.5 = 380 µg/m³ yields sub-index 500 (Severe nominal anchor)", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 380));
    expect(res.subIndex).toBe(500);
    expect(res.category).toBe("SEVERE");
  });

  it("P3-AQI-083: PM2.5 = 500 µg/m³ calculates scientific AQI beyond 500 without clamping rawMathematicalSubIndex", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 500));
    expect(res.rawMathematicalSubIndex).toBeGreaterThan(500);
    expect(res.isBeyondNominalScale).toBe(true);
  });

  it("P3-AQI-084: PM2.5 = 500 µg/m³ caps reportingCeilingCappedSubIndex at 500 for display widgets", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 500));
    expect(res.reportingCeilingCappedAqi).toBe(500);
  });

  it("P3-AQI-085: PM10 = 430.1 µg/m³ yields sub-index 400 (Severe lower boundary continuation)", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 430.1));
    expect(res.subIndex).toBe(400);
    expect(res.category).toBe("SEVERE");
  });

  it("P3-AQI-086: PM10 = 510 µg/m³ yields sub-index 500 (Severe nominal anchor)", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 510));
    expect(res.subIndex).toBe(500);
    expect(res.category).toBe("SEVERE");
  });

  it("P3-AQI-087: PM10 = 600 µg/m³ calculates scientific AQI > 500 with isBeyondNominalScale true", () => {
    const res = calculatePollutantSubIndex(make24h("PM10", 600));
    expect(res.rawMathematicalSubIndex).toBeGreaterThan(500);
    expect(res.isBeyondNominalScale).toBe(true);
    expect(res.reportingCeilingCappedAqi).toBe(500);
  });

  it("P3-AQI-088: NO2 = 400.1 µg/m³ yields sub-index 400 (Severe lower boundary continuation)", () => {
    const res = calculatePollutantSubIndex(make24h("NO2", 400.1));
    expect(res.subIndex).toBe(400);
    expect(res.category).toBe("SEVERE");
  });

  it("P3-AQI-089: SO2 = 1600.1 µg/m³ yields sub-index 400 (Severe lower boundary continuation)", () => {
    const res = calculatePollutantSubIndex(make24h("SO2", 1600.1));
    expect(res.subIndex).toBe(400);
    expect(res.category).toBe("SEVERE");
  });

  it("P3-AQI-090: NH3 = 1800.1 µg/m³ yields sub-index 400 (Severe lower boundary continuation)", () => {
    const res = calculatePollutantSubIndex(make24h("NH3", 1800.1));
    expect(res.subIndex).toBe(400);
    expect(res.category).toBe("SEVERE");
  });

  it("P3-AQI-091: CO = 34.01 mg/m³ yields sub-index 400 (Severe lower boundary continuation)", () => {
    const res = calculatePollutantSubIndex(make8h("CO", 34.01));
    expect(res.subIndex).toBe(400);
    expect(res.category).toBe("SEVERE");
  });

  it("P3-AQI-092: O3 (1h) = 1500 µg/m³ extrapolates Severe continuation beyond nominal anchor", () => {
    const res = calculatePollutantSubIndex(make1h("O3", 1500));
    expect(res.category).toBe("SEVERE");
    expect(res.isBeyondNominalScale).toBe(true);
  });

  it("P3-AQI-093: Station AQI with PM2.5 = 450 preserves scientific AQI > 500 in station result", () => {
    const measurements = [
      makeAgg("STN-001", "PM2.5", 450),
      makeAgg("STN-001", "PM10", 300),
      makeAgg("STN-001", "NO2", 50)
    ];
    const res = calculateStationCpcbAqi("STN-001", measurements);
    expect(res.rawMathematicalAqi).toBeGreaterThan(500);
    expect(res.isBeyondNominalScale).toBe(true);
    expect(res.reportingCeilingCappedAqi).toBe(500);
    expect(res.category).toBe("SEVERE");
  });

  it("P3-AQI-094: getCategoryFromAqi correctly maps 0-50 to GOOD", () => {
    expect(getCategoryFromAqi(0)).toBe("GOOD");
    expect(getCategoryFromAqi(25)).toBe("GOOD");
    expect(getCategoryFromAqi(50)).toBe("GOOD");
  });

  it("P3-AQI-095: getCategoryFromAqi correctly maps 51-100 to SATISFACTORY", () => {
    expect(getCategoryFromAqi(51)).toBe("SATISFACTORY");
    expect(getCategoryFromAqi(75)).toBe("SATISFACTORY");
    expect(getCategoryFromAqi(100)).toBe("SATISFACTORY");
  });

  it("P3-AQI-096: getCategoryFromAqi correctly maps 101-200 to MODERATE", () => {
    expect(getCategoryFromAqi(101)).toBe("MODERATE");
    expect(getCategoryFromAqi(150)).toBe("MODERATE");
    expect(getCategoryFromAqi(200)).toBe("MODERATE");
  });

  it("P3-AQI-097: getCategoryFromAqi correctly maps 201-300 to POOR", () => {
    expect(getCategoryFromAqi(201)).toBe("POOR");
    expect(getCategoryFromAqi(250)).toBe("POOR");
    expect(getCategoryFromAqi(300)).toBe("POOR");
  });

  it("P3-AQI-098: getCategoryFromAqi correctly maps 301-400 to VERY_POOR", () => {
    expect(getCategoryFromAqi(301)).toBe("VERY_POOR");
    expect(getCategoryFromAqi(350)).toBe("VERY_POOR");
    expect(getCategoryFromAqi(400)).toBe("VERY_POOR");
  });

  it("P3-AQI-099: getCategoryFromAqi correctly maps 401-500+ to SEVERE", () => {
    expect(getCategoryFromAqi(401)).toBe("SEVERE");
    expect(getCategoryFromAqi(500)).toBe("SEVERE");
    expect(getCategoryFromAqi(750)).toBe("SEVERE");
  });

  it("P3-AQI-100: getCategoryFromAqi maps 450 to SEVERE and boundary values accurately", () => {
    expect(getCategoryFromAqi(450)).toBe("SEVERE");
    expect(getCategoryFromAqi(50)).toBe("GOOD");
  });

  // Section 6: Statutory Data Sufficiency Rules (P3-AQI-101 to P3-AQI-130)
  it("P3-AQI-101: 24h window with 16 valid hours calculates valid sub-index (67% sufficiency rule met)", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 75, 16));
    expect(res.subIndex).toBe(150);
  });

  it("P3-AQI-102: 24h window with 15 valid hours returns null sub-index (15 < 16 rule)", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 75, 15));
    expect(res.subIndex).toBeNull();
    expect(res.qualityFlag).toBe("INSUFFICIENT_WINDOW");
  });

  it("P3-AQI-103: 24h window with 0 valid hours returns null sub-index", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 75, 0));
    expect(res.subIndex).toBeNull();
  });

  it("P3-AQI-104: 8h window with 6 valid hours calculates valid sub-index (75% sufficiency rule met)", () => {
    const res = calculatePollutantSubIndex(make8h("CO", 2.0, 6));
    expect(res.subIndex).toBe(100);
  });

  it("P3-AQI-105: 8h window with 5 valid hours returns null sub-index (5 < 6 rule)", () => {
    const res = calculatePollutantSubIndex(make8h("CO", 2.0, 5));
    expect(res.subIndex).toBeNull();
    expect(res.qualityFlag).toBe("INSUFFICIENT_WINDOW");
  });

  it("P3-AQI-106: Station AQI with 3 valid pollutants including PM2.5 is SUFFICIENT", () => {
    const measurements = [
      makeAgg("STN-001", "PM2.5", 60),
      makeAgg("STN-001", "NO2", 40),
      makeAgg("STN-001", "SO2", 40)
    ];
    const res = calculateStationCpcbAqi("STN-001", measurements);
    expect(res.sufficiencyStatus).toBe("SUFFICIENT");
    expect(res.overallAqi).toBe(100);
    expect(res.prominentPollutant).toBe("PM2.5");
  });

  it("P3-AQI-107: Station AQI with 3 valid pollutants including PM10 is SUFFICIENT", () => {
    const measurements = [
      makeAgg("STN-001", "PM10", 100),
      makeAgg("STN-001", "NO2", 40),
      makeAgg("STN-001", "SO2", 40)
    ];
    const res = calculateStationCpcbAqi("STN-001", measurements);
    expect(res.sufficiencyStatus).toBe("SUFFICIENT");
    expect(res.overallAqi).toBe(100);
    expect(res.prominentPollutant).toBe("PM10");
  });

  it("P3-AQI-108: Station AQI with only 2 pollutants is INSUFFICIENT_DATA (fewer than 3 pollutants rule)", () => {
    const measurements = [
      makeAgg("STN-001", "PM2.5", 60),
      makeAgg("STN-001", "NO2", 40)
    ];
    const res = calculateStationCpcbAqi("STN-001", measurements);
    expect(res.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(res.overallAqi).toBeNull();
    expect(res.explanation).toContain("fewer than 3 distinct valid pollutants monitored");
  });

  it("P3-AQI-109: Station AQI with only 1 pollutant is INSUFFICIENT_DATA", () => {
    const measurements = [
      makeAgg("STN-001", "PM2.5", 60)
    ];
    const res = calculateStationCpcbAqi("STN-001", measurements);
    expect(res.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(res.overallAqi).toBeNull();
  });

  it("P3-AQI-110: Station AQI with 0 pollutants is INSUFFICIENT_DATA", () => {
    const res = calculateStationCpcbAqi("STN-001", []);
    expect(res.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(res.overallAqi).toBeNull();
  });

  it("P3-AQI-111: Station AQI with 3 pollutants but missing PM (e.g. NO2, SO2, NH3) is INSUFFICIENT_DATA", () => {
    const measurements = [
      makeAgg("STN-001", "NO2", 40),
      makeAgg("STN-001", "SO2", 40),
      makeAgg("STN-001", "NH3", 200)
    ];
    const res = calculateStationCpcbAqi("STN-001", measurements);
    expect(res.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(res.overallAqi).toBeNull();
    expect(res.explanation).toContain("missing mandatory particulate parameter");
  });

  it("P3-AQI-112: Station AQI with 4 pollutants missing PM (NO2, SO2, NH3, CO) is INSUFFICIENT_DATA", () => {
    const measurements = [
      makeAgg("STN-001", "NO2", 40),
      makeAgg("STN-001", "SO2", 40),
      makeAgg("STN-001", "NH3", 200),
      makeAgg("STN-001", "CO", 1.0, 8)
    ];
    const res = calculateStationCpcbAqi("STN-001", measurements);
    expect(res.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(res.overallAqi).toBeNull();
  });

  it("P3-AQI-113: Station AQI with all 8 pollutants selects maximum sub-index as overall AQI", () => {
    const measurements = [
      makeAgg("STN-001", "PM2.5", 15),  // AQI 25
      makeAgg("STN-001", "PM10", 25),   // AQI 25
      makeAgg("STN-001", "NO2", 40),    // AQI 50
      makeAgg("STN-001", "SO2", 80),    // AQI 100
      makeAgg("STN-001", "CO", 6.0, 8), // AQI 150 -> MAX
      makeAgg("STN-001", "O3", 50, 8),  // AQI 50
      makeAgg("STN-001", "NH3", 200),   // AQI 50
      makeAgg("STN-001", "Pb", 0.5)     // AQI 50
    ];
    const res = calculateStationCpcbAqi("STN-001", measurements);
    expect(res.overallAqi).toBe(150);
    expect(res.prominentPollutant).toBe("CO");
    expect(res.category).toBe("MODERATE");
  });

  it("P3-AQI-114: rejects combining measurements across different monitoring station IDs", () => {
    const measurements = [
      makeAgg("STN-001", "PM2.5", 75),
      makeAgg("STN-002", "PM10", 175), // Different station ID!
      makeAgg("STN-001", "NO2", 50)
    ];
    const res = calculateStationCpcbAqi("STN-001", measurements);
    expect(res.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(res.overallAqi).toBeNull();
    expect(res.explanation).toContain("Cross-station aggregation rejected");
  });

  it("P3-AQI-115: rejects unvalidated raw measurement bypassing rolling-window aggregator", () => {
    const fakeData = [
      {
        pollutant: "PM2.5",
        concentration: 75,
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      } as unknown as ValidatedAggregatedMeasurement
    ];
    const res = calculateStationCpcbAqi("STN-001", fakeData);
    expect(res.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(res.overallAqi).toBeNull();
    expect(res.explanation).toContain("Aggregation boundary violation");
  });

  it("P3-AQI-116: subIndices array preserves all evaluated individual pollutant sub-indices", () => {
    const measurements = [
      makeAgg("STN-001", "PM2.5", 60),
      makeAgg("STN-001", "NO2", 40),
      makeAgg("STN-001", "SO2", 40)
    ];
    const res = calculateStationCpcbAqi("STN-001", measurements);
    expect(res.subIndices).toHaveLength(3);
    const pm25Sub = res.subIndices.find((s) => s.pollutant === "PM2.5");
    expect(pm25Sub?.subIndex).toBe(100);
  });

  it("P3-AQI-117: handles tied maximum sub-indices deterministically", () => {
    const measurements = [
      makeAgg("STN-001", "PM2.5", 60), // AQI 100
      makeAgg("STN-001", "PM10", 100), // AQI 100 (tie)
      makeAgg("STN-001", "NO2", 40)    // AQI 50
    ];
    const res = calculateStationCpcbAqi("STN-001", measurements);
    expect(res.overallAqi).toBe(100);
    expect(["PM2.5", "PM10"]).toContain(res.prominentPollutant);
  });

  it("P3-AQI-118: rejects contradictory duplicate channels for same pollutant", () => {
    const measurements = [
      makeAgg("STN-001", "PM2.5", 60),
      makeAgg("STN-001", "PM2.5", 90), // Duplicate contradictory reading!
      makeAgg("STN-001", "PM10", 100),
      makeAgg("STN-001", "NO2", 40)
    ];
    const res = calculateStationCpcbAqi("STN-001", measurements);
    const pm25Sub = res.subIndices.find((s) => s.pollutant === "PM2.5");
    expect(pm25Sub?.qualityFlag).toBe("CONFLICTING_MEASUREMENT");
    expect(pm25Sub?.subIndex).toBeNull();
  });

  it("P3-AQI-119: preserves stationId on returned CpcbAqiResult", () => {
    const measurements = [
      makeAgg("STN-001", "PM2.5", 60),
      makeAgg("STN-001", "PM10", 100),
      makeAgg("STN-001", "NO2", 40)
    ];
    const res = calculateStationCpcbAqi("STN-001", measurements);
    expect(res.stationId).toBe("STN-001");
  });

  it("P3-AQI-120: preserves calculatedAtUtc on returned CpcbAqiResult", () => {
    const measurements = [
      makeAgg("STN-001", "PM2.5", 60),
      makeAgg("STN-001", "PM10", 100),
      makeAgg("STN-001", "NO2", 40)
    ];
    const res = calculateStationCpcbAqi("STN-001", measurements, "2026-11-24T15:00:00Z");
    expect(res.calculatedAtUtc).toBe("2026-11-24T15:00:00Z");
  });

  it("P3-AQI-121: completenessPolicy defaults to OFFICIAL_CPCB_STATUTORY_16H", () => {
    const measurements = [
      makeAgg("STN-001", "PM2.5", 60),
      makeAgg("STN-001", "PM10", 100),
      makeAgg("STN-001", "NO2", 40)
    ];
    const res = calculateStationCpcbAqi("STN-001", measurements);
    expect(res.completenessPolicy).toBe("OFFICIAL_CPCB_STATUTORY_16H");
  });

  it("P3-AQI-122: sub-index rounding matches round-half-up statutory convention", () => {
    // PM2.5 = 30.3 µg/m³: (30.3 - 30) / 30 * 50 + 50 = 50.5 -> 51
    const res = calculatePollutantSubIndex(make24h("PM2.5", 30.3));
    expect(res.subIndex).toBe(51);
  });

  it("P3-AQI-123: sub-index with fractional concentration below half rounds down", () => {
    // PM2.5 = 30.2 µg/m³: (30.2 - 30) / 30 * 50 + 50 = 50.333 -> 50
    const res = calculatePollutantSubIndex(make24h("PM2.5", 30.2));
    expect(res.subIndex).toBe(50);
  });

  it("P3-AQI-124: mathematical interpolation handles very small concentrations (>0, <0.01)", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 0.005));
    expect(res.subIndex).toBe(0);
    expect(res.rawMathematicalSubIndex).toBeGreaterThan(0);
  });

  it("P3-AQI-125: guarantees zero mutation of input measurements array", () => {
    const measurements = [
      makeAgg("STN-001", "PM2.5", 60),
      makeAgg("STN-001", "PM10", 100),
      makeAgg("STN-001", "NO2", 40)
    ];
    const snapshot = JSON.stringify(measurements);
    calculateStationCpcbAqi("STN-001", measurements);
    expect(JSON.stringify(measurements)).toBe(snapshot);
  });

  it("P3-AQI-126: ensures calculatePollutantSubIndex does not mutate input measurement object", () => {
    const input = make24h("PM2.5", 75);
    const snapshot = JSON.stringify(input);
    calculatePollutantSubIndex(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("P3-AQI-127: station calculation handles 5 pollutants with mixed categories correctly", () => {
    const measurements = [
      makeAgg("STN-001", "PM2.5", 15),  // Good (25)
      makeAgg("STN-001", "PM10", 75),   // Satisfactory (75)
      makeAgg("STN-001", "NO2", 100),   // Moderate (120)
      makeAgg("STN-001", "SO2", 400),   // Poor (205) -> MAX
      makeAgg("STN-001", "CO", 1.0, 8)  // Good (50)
    ];
    const res = calculateStationCpcbAqi("STN-001", measurements);
    expect(res.overallAqi).toBeGreaterThanOrEqual(200);
    expect(res.category).toBe("POOR");
    expect(res.prominentPollutant).toBe("SO2");
  });

  it("P3-AQI-128: verifies individual sub-index qualityFlag is VERIFIED for clean reading", () => {
    const res = calculatePollutantSubIndex(make24h("PM2.5", 75));
    expect(res.qualityFlag).toBe("VERIFIED");
    expect(res.category).toBe("MODERATE");
  });

  it("P3-AQI-129: verifies station AQI explanation string contains dominant pollutant PM2.5", () => {
    const measurements = [
      makeAgg("STN-001", "PM2.5", 75),
      makeAgg("STN-001", "PM10", 175),
      makeAgg("STN-001", "NO2", 50)
    ];
    const res = calculateStationCpcbAqi("STN-001", measurements);
    expect(res.explanation).toContain("dominant pollutant PM2.5");
  });

  it("P3-AQI-130: end-to-end statutory NAQI 2014 verification across all criteria checks", () => {
    const measurements = [
      makeAgg("DELHI-ANAND-VIHAR", "PM2.5", 185), // Very Poor (350)
      makeAgg("DELHI-ANAND-VIHAR", "PM10", 390),  // Very Poor (350)
      makeAgg("DELHI-ANAND-VIHAR", "NO2", 180),   // Moderate (200)
      makeAgg("DELHI-ANAND-VIHAR", "SO2", 80),    // Satisfactory (100)
      makeAgg("DELHI-ANAND-VIHAR", "CO", 6.0, 8), // Moderate (150)
      makeAgg("DELHI-ANAND-VIHAR", "O3", 50, 8)   // Good (50)
    ];
    const res = calculateStationCpcbAqi("DELHI-ANAND-VIHAR", measurements);
    expect(res.sufficiencyStatus).toBe("SUFFICIENT");
    expect(res.overallAqi).toBe(350);
    expect(res.category).toBe("VERY_POOR");
    expect(res.isBeyondNominalScale).toBe(false);
    expect(res.reportingCeilingCappedAqi).toBe(350);
  });
});
