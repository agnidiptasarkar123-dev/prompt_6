import { describe, it, expect } from "vitest";
import { calculatePollutantSubIndex, getCategoryFromAqi } from "@/domain/cpcb/sub-index-calculator";
import { RawPollutantMeasurement } from "@/schemas/pollutant.schema";

describe("CPCB Sub-Index Calculator (Piecewise Linear Interpolation & Statutory NAQI 2014)", () => {
  // Base 24h measurement helper
  const make24h = (
    pollutant: RawPollutantMeasurement["pollutant"],
    concentration: number,
    unit: RawPollutantMeasurement["unit"] = "µg/m³"
  ): RawPollutantMeasurement => ({
    pollutant,
    concentration,
    unit,
    averagingWindowHours: 24,
    recordedAtUtc: new Date().toISOString(),
    validHoursInWindow: 24
  });

  // Base 8h measurement helper
  const make8h = (
    pollutant: RawPollutantMeasurement["pollutant"],
    concentration: number,
    unit: RawPollutantMeasurement["unit"] = "µg/m³"
  ): RawPollutantMeasurement => ({
    pollutant,
    concentration,
    unit,
    averagingWindowHours: 8,
    recordedAtUtc: new Date().toISOString(),
    validHoursInWindow: 8
  });

  // Base 1h measurement helper
  const make1h = (
    pollutant: RawPollutantMeasurement["pollutant"],
    concentration: number,
    unit: RawPollutantMeasurement["unit"] = "µg/m³"
  ): RawPollutantMeasurement => ({
    pollutant,
    concentration,
    unit,
    averagingWindowHours: 1,
    recordedAtUtc: new Date().toISOString(),
    validHoursInWindow: 1
  });

  describe("PM2.5 (24-hour average, µg/m³)", () => {
    it("interpolates across all categories and boundary decimals", () => {
      // Good: [0, 30] -> [0, 50]
      expect(calculatePollutantSubIndex(make24h("PM2.5", 0)).subIndex).toBe(0);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 15)).subIndex).toBe(25);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 30)).subIndex).toBe(50);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 30)).category).toBe("GOOD");

      // Satisfactory: (30, 60] -> [51, 100]
      expect(calculatePollutantSubIndex(make24h("PM2.5", 30.1)).subIndex).toBe(51);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 30.1)).category).toBe("SATISFACTORY");
      expect(calculatePollutantSubIndex(make24h("PM2.5", 45)).subIndex).toBe(76);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 60)).subIndex).toBe(100);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 60)).category).toBe("SATISFACTORY");

      // Moderate: (60, 90] -> [101, 200]
      expect(calculatePollutantSubIndex(make24h("PM2.5", 60.1)).subIndex).toBe(101);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 60.1)).category).toBe("MODERATE");
      expect(calculatePollutantSubIndex(make24h("PM2.5", 75)).subIndex).toBe(151);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 90)).subIndex).toBe(200);

      // Poor: (90, 120] -> [201, 300]
      expect(calculatePollutantSubIndex(make24h("PM2.5", 90.1)).subIndex).toBe(201);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 105)).subIndex).toBe(251);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 120)).subIndex).toBe(300);

      // Very Poor: (120, 250] -> [301, 400]
      expect(calculatePollutantSubIndex(make24h("PM2.5", 120.1)).subIndex).toBe(301);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 185)).subIndex).toBe(351);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 250)).subIndex).toBe(400);

      // Severe: (250, 380] -> [401, 500] (reconciled with AQI-Calculator.xls Delta_VP formula)
      expect(calculatePollutantSubIndex(make24h("PM2.5", 250.1)).subIndex).toBe(401);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 315)).subIndex).toBe(451);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 380)).subIndex).toBe(500);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 380)).category).toBe("SEVERE");
      expect(calculatePollutantSubIndex(make24h("PM2.5", 380)).isReportingCeilingCapped).toBe(false);
    });
  });

  describe("PM10 (24-hour average, µg/m³)", () => {
    it("interpolates across all categories and boundaries", () => {
      // Good: [0, 50] -> [0, 50]
      expect(calculatePollutantSubIndex(make24h("PM10", 0)).subIndex).toBe(0);
      expect(calculatePollutantSubIndex(make24h("PM10", 50)).subIndex).toBe(50);
      expect(calculatePollutantSubIndex(make24h("PM10", 50)).category).toBe("GOOD");

      // Satisfactory: (50, 100] -> [51, 100]
      expect(calculatePollutantSubIndex(make24h("PM10", 50.1)).subIndex).toBe(51);
      expect(calculatePollutantSubIndex(make24h("PM10", 100)).subIndex).toBe(100);

      // Moderate: (100, 250] -> [101, 200]
      expect(calculatePollutantSubIndex(make24h("PM10", 100.1)).subIndex).toBe(101);
      expect(calculatePollutantSubIndex(make24h("PM10", 250)).subIndex).toBe(200);

      // Poor: (250, 350] -> [201, 300]
      expect(calculatePollutantSubIndex(make24h("PM10", 250.1)).subIndex).toBe(201);
      expect(calculatePollutantSubIndex(make24h("PM10", 350)).subIndex).toBe(300);

      // Very Poor: (350, 430] -> [301, 400]
      expect(calculatePollutantSubIndex(make24h("PM10", 350.1)).subIndex).toBe(301);
      expect(calculatePollutantSubIndex(make24h("PM10", 430)).subIndex).toBe(400);

      // Severe: (430, 510] -> [401, 500] (reconciled with AQI-Calculator.xls Delta_VP formula)
      expect(calculatePollutantSubIndex(make24h("PM10", 430.1)).subIndex).toBe(401);
      expect(calculatePollutantSubIndex(make24h("PM10", 510)).subIndex).toBe(500);
      expect(calculatePollutantSubIndex(make24h("PM10", 510)).category).toBe("SEVERE");
    });
  });

  describe("NO2 (24-hour average, µg/m³)", () => {
    it("interpolates across all categories", () => {
      // Good: [0, 40] -> [0, 50]
      expect(calculatePollutantSubIndex(make24h("NO2", 40)).subIndex).toBe(50);
      // Satisfactory: (40, 80] -> [51, 100]
      expect(calculatePollutantSubIndex(make24h("NO2", 40.1)).subIndex).toBe(51);
      expect(calculatePollutantSubIndex(make24h("NO2", 80)).subIndex).toBe(100);
      // Moderate: (80, 180] -> [101, 200]
      expect(calculatePollutantSubIndex(make24h("NO2", 180)).subIndex).toBe(200);
      // Poor: (180, 280] -> [201, 300]
      expect(calculatePollutantSubIndex(make24h("NO2", 280)).subIndex).toBe(300);
      // Very Poor: (280, 400] -> [301, 400]
      expect(calculatePollutantSubIndex(make24h("NO2", 400)).subIndex).toBe(400);
      // Severe: (400, 520] -> [401, 500]
      expect(calculatePollutantSubIndex(make24h("NO2", 520)).subIndex).toBe(500);
    });
  });

  describe("SO2 (24-hour average, µg/m³)", () => {
    it("interpolates across all categories", () => {
      // Good: [0, 40] -> [0, 50]
      expect(calculatePollutantSubIndex(make24h("SO2", 40)).subIndex).toBe(50);
      // Satisfactory: (40, 80] -> [51, 100]
      expect(calculatePollutantSubIndex(make24h("SO2", 80)).subIndex).toBe(100);
      // Moderate: (80, 380] -> [101, 200]
      expect(calculatePollutantSubIndex(make24h("SO2", 380)).subIndex).toBe(200);
      // Poor: (380, 800] -> [201, 300]
      expect(calculatePollutantSubIndex(make24h("SO2", 800)).subIndex).toBe(300);
      // Very Poor: (800, 1600] -> [301, 400]
      expect(calculatePollutantSubIndex(make24h("SO2", 1600)).subIndex).toBe(400);
      // Severe: (1600, 2400] -> [401, 500]
      expect(calculatePollutantSubIndex(make24h("SO2", 2400)).subIndex).toBe(500);
    });
  });

  describe("NH3 (24-hour average, µg/m³)", () => {
    it("interpolates across all categories", () => {
      // Good: [0, 200] -> [0, 50]
      expect(calculatePollutantSubIndex(make24h("NH3", 200)).subIndex).toBe(50);
      // Satisfactory: (200, 400] -> [51, 100]
      expect(calculatePollutantSubIndex(make24h("NH3", 400)).subIndex).toBe(100);
      // Moderate: (400, 800] -> [101, 200]
      expect(calculatePollutantSubIndex(make24h("NH3", 800)).subIndex).toBe(200);
      // Poor: (800, 1200] -> [201, 300]
      expect(calculatePollutantSubIndex(make24h("NH3", 1200)).subIndex).toBe(300);
      // Very Poor: (1200, 1800] -> [301, 400]
      expect(calculatePollutantSubIndex(make24h("NH3", 1800)).subIndex).toBe(400);
      // Severe: (1800, 2400] -> [401, 500]
      expect(calculatePollutantSubIndex(make24h("NH3", 2400)).subIndex).toBe(500);
    });
  });

  describe("Pb (Lead - 24-hour average, µg/m³)", () => {
    it("interpolates across all categories", () => {
      // Good: [0, 0.5] -> [0, 50]
      expect(calculatePollutantSubIndex(make24h("Pb", 0.5)).subIndex).toBe(50);
      // Satisfactory: (0.5, 1.0] -> [51, 100]
      expect(calculatePollutantSubIndex(make24h("Pb", 1.0)).subIndex).toBe(100);
      // Moderate: (1.0, 2.0] -> [101, 200]
      expect(calculatePollutantSubIndex(make24h("Pb", 2.0)).subIndex).toBe(200);
      // Poor: (2.0, 3.0] -> [201, 300]
      expect(calculatePollutantSubIndex(make24h("Pb", 3.0)).subIndex).toBe(300);
      // Very Poor: (3.0, 3.5] -> [301, 400]
      expect(calculatePollutantSubIndex(make24h("Pb", 3.5)).subIndex).toBe(400);
      // Severe: (3.5, 5.0] -> [401, 500]
      expect(calculatePollutantSubIndex(make24h("Pb", 5.0)).subIndex).toBe(500);
    });
  });

  describe("CO (Carbon Monoxide - 8-hour average, mg/m³)", () => {
    it("interpolates across all categories", () => {
      // Good: [0, 1.0] -> [0, 50]
      expect(calculatePollutantSubIndex(make8h("CO", 1.0, "mg/m³")).subIndex).toBe(50);
      // Satisfactory: (1.0, 2.0] -> [51, 100]
      expect(calculatePollutantSubIndex(make8h("CO", 1.05, "mg/m³")).subIndex).toBe(53);
      expect(calculatePollutantSubIndex(make8h("CO", 2.0, "mg/m³")).subIndex).toBe(100);
      // Moderate: (2.0, 10.0] -> [101, 200]
      expect(calculatePollutantSubIndex(make8h("CO", 10.0, "mg/m³")).subIndex).toBe(200);
      // Poor: (10.0, 17.0] -> [201, 300]
      expect(calculatePollutantSubIndex(make8h("CO", 17.0, "mg/m³")).subIndex).toBe(300);
      // Very Poor: (17.0, 34.0] -> [301, 400]
      expect(calculatePollutantSubIndex(make8h("CO", 34.0, "mg/m³")).subIndex).toBe(400);
      // Severe: (34.0, 51.0] -> [401, 500]
      expect(calculatePollutantSubIndex(make8h("CO", 51.0, "mg/m³")).subIndex).toBe(500);
    });
  });

  describe("O3 (Ozone - CPCB Table 3.11 & Section 3.3.4 Dual Averaging Windows)", () => {
    it("handles 8-hour ozone in published ordinary range (<= 208 µg/m³)", () => {
      // Good: [0, 50] -> [0, 50]
      expect(calculatePollutantSubIndex(make8h("O3", 50)).subIndex).toBe(50);
      // Satisfactory: (50, 100] -> [51, 100]
      expect(calculatePollutantSubIndex(make8h("O3", 100)).subIndex).toBe(100);
      // Moderate: (100, 168] -> [101, 200]
      expect(calculatePollutantSubIndex(make8h("O3", 168)).subIndex).toBe(200);
      // Poor: (168, 208] -> [201, 300]
      expect(calculatePollutantSubIndex(make8h("O3", 208)).subIndex).toBe(300);
    });

    it("verifies test values 208, 208.1, 748, 748.1 against statutory 8-hour and 1-hour rules", () => {
      // 1. Test value 208 µg/m³:
      // 8-hour: VALID -> subIndex 300 (POOR)
      const res208_8h = calculatePollutantSubIndex(make8h("O3", 208));
      expect(res208_8h.subIndex).toBe(300);
      expect(res208_8h.category).toBe("POOR");
      expect(res208_8h.qualityFlag).toBe("VERIFIED");

      // 1-hour: REJECTED (<= 208 µg/m³ not eligible for 1h window per Table 3.11 footnote)
      const res208_1h = calculatePollutantSubIndex(make1h("O3", 208));
      expect(res208_1h.subIndex).toBeNull();
      expect(res208_1h.category).toBeNull();
      expect(res208_1h.qualityFlag).toBe("INCOMPATIBLE_AVERAGING_WINDOW");

      // 2. Test value 208.1 µg/m³:
      // 8-hour: REJECTED (8-hour measurement above 208 must NOT silently enter starred 1-hour ranges)
      const res208_1_8h = calculatePollutantSubIndex(make8h("O3", 208.1));
      expect(res208_1_8h.subIndex).toBeNull();
      expect(res208_1_8h.qualityFlag).toBe("INCOMPATIBLE_AVERAGING_WINDOW");

      // 1-hour: VALID (> 208 µg/m³ eligible for acute 1h window -> VERY POOR, subIndex 301)
      const res208_1_1h = calculatePollutantSubIndex(make1h("O3", 208.1));
      expect(res208_1_1h.subIndex).toBe(301);
      expect(res208_1_1h.category).toBe("VERY_POOR");
      expect(res208_1_1h.qualityFlag).toBe("VERIFIED");

      // 3. Test value 748 µg/m³:
      // 8-hour: REJECTED (> 208)
      expect(calculatePollutantSubIndex(make8h("O3", 748)).qualityFlag).toBe("INCOMPATIBLE_AVERAGING_WINDOW");

      // 1-hour: VALID (boundary of Very Poor -> subIndex 400)
      const res748_1h = calculatePollutantSubIndex(make1h("O3", 748));
      expect(res748_1h.subIndex).toBe(400);
      expect(res748_1h.category).toBe("VERY_POOR");
      expect(res748_1h.qualityFlag).toBe("VERIFIED");

      // 4. Test value 748.1 µg/m³:
      // 8-hour: REJECTED (> 208)
      expect(calculatePollutantSubIndex(make8h("O3", 748.1)).qualityFlag).toBe("INCOMPATIBLE_AVERAGING_WINDOW");

      // 1-hour: VALID (Severe range -> subIndex 401)
      const res748_1_1h = calculatePollutantSubIndex(make1h("O3", 748.1));
      expect(res748_1_1h.subIndex).toBe(401);
      expect(res748_1_1h.category).toBe("SEVERE");
      expect(res748_1_1h.qualityFlag).toBe("VERIFIED");

      // 5. Test value 1288 µg/m³ (1h Severe top anchor):
      const res1288_1h = calculatePollutantSubIndex(make1h("O3", 1288));
      expect(res1288_1h.subIndex).toBe(500);
      expect(res1288_1h.category).toBe("SEVERE");
      expect(res1288_1h.isReportingCeilingCapped).toBe(false);
    });
  });

  describe("Reporting Ceiling vs Genuine Instrument Anomalies", () => {
    it("distinguishes valid severe measurements reaching AQI ceiling from sensor faults", () => {
      // 1. Valid Severe measurement reaching 500 reporting ceiling (e.g. PM2.5 = 500 during crop residue burning)
      const mCeilingPm25 = make24h("PM2.5", 500);
      const resCeiling = calculatePollutantSubIndex(mCeilingPm25);
      expect(resCeiling.subIndex).toBe(500);
      expect(resCeiling.category).toBe("SEVERE");
      expect(resCeiling.qualityFlag).toBe("VERIFIED"); // Real measurement, NOT sensor fault!
      expect(resCeiling.isReportingCeilingCapped).toBe(true);
      expect(resCeiling.concentration).toBe(500); // Raw concentration preserved

      // 2. Valid Severe CO reaching reporting ceiling (e.g. 75 mg/m³ near industrial kiln)
      const mCeilingCo = make8h("CO", 75, "mg/m³");
      const resCeilingCo = calculatePollutantSubIndex(mCeilingCo);
      expect(resCeilingCo.subIndex).toBe(500);
      expect(resCeilingCo.category).toBe("SEVERE");
      expect(resCeilingCo.qualityFlag).toBe("VERIFIED");
      expect(resCeilingCo.isReportingCeilingCapped).toBe(true);
      expect(resCeilingCo.concentration).toBe(75);

      // 3. Genuine instrument anomaly exceeding physically possible ambient concentrations
      // (PM2.5 > 2500 µg/m³ represents stuck register or shorted analyzer)
      const mFaultPm25 = make24h("PM2.5", 3000);
      const resFault = calculatePollutantSubIndex(mFaultPm25);
      expect(resFault.subIndex).toBeNull();
      expect(resFault.category).toBeNull();
      expect(resFault.qualityFlag).toBe("INVALID_SENSOR_READING");

      // CO > 150 mg/m³ represents sensor hardware malfunction
      const mFaultCo = make8h("CO", 200, "mg/m³");
      const resFaultCo = calculatePollutantSubIndex(mFaultCo);
      expect(resFaultCo.subIndex).toBeNull();
      expect(resFaultCo.qualityFlag).toBe("INVALID_SENSOR_READING");
    });
  });

  describe("Invalid & Fault Readings Handling", () => {
    it("strictly rejects negative concentrations, NaN, Infinity, null, and undefined", () => {
      // Negative concentrations (e.g. sensor error -999, -1)
      const mNeg = make24h("PM2.5", -999);
      const resNeg = calculatePollutantSubIndex(mNeg);
      expect(resNeg.subIndex).toBeNull();
      expect(resNeg.category).toBeNull();
      expect(resNeg.qualityFlag).toBe("INVALID_SENSOR_READING");

      const mNegSmall = make24h("PM2.5", -0.01);
      expect(calculatePollutantSubIndex(mNegSmall).qualityFlag).toBe("INVALID_SENSOR_READING");

      // NaN
      const mNan = make24h("PM10", NaN);
      expect(calculatePollutantSubIndex(mNan).qualityFlag).toBe("INVALID_SENSOR_READING");

      // Infinity
      const mInf = make24h("NO2", Infinity);
      expect(calculatePollutantSubIndex(mInf).qualityFlag).toBe("INVALID_SENSOR_READING");

      // Null / Undefined
      const mNull = make24h("SO2", null as unknown as number);
      expect(calculatePollutantSubIndex(mNull).qualityFlag).toBe("INVALID_SENSOR_READING");
    });

    it("rejects incompatible averaging windows for pollutants", () => {
      // PM2.5 requires 24h; passing 8h must fail
      const mBadWindow: RawPollutantMeasurement = {
        pollutant: "PM2.5",
        concentration: 55,
        unit: "µg/m³",
        averagingWindowHours: 8 as 24, // invalid for PM2.5
        recordedAtUtc: new Date().toISOString(),
        validHoursInWindow: 8
      };
      const res = calculatePollutantSubIndex(mBadWindow);
      expect(res.subIndex).toBeNull();
      expect(res.qualityFlag).toBe("INCOMPATIBLE_AVERAGING_WINDOW");
    });

    it("flags INSUFFICIENT_WINDOW when valid hours fail statutory requirement", () => {
      // 15 hours for 24h window (< 16h requirement)
      const m15 = { ...make24h("PM2.5", 55), validHoursInWindow: 15 };
      const res15 = calculatePollutantSubIndex(m15);
      expect(res15.subIndex).toBeNull();
      expect(res15.qualityFlag).toBe("INSUFFICIENT_WINDOW");

      // 5 hours for 8h window (< 6h requirement)
      const m5 = { ...make8h("CO", 1.5, "mg/m³"), validHoursInWindow: 5 };
      const res5 = calculatePollutantSubIndex(m5);
      expect(res5.subIndex).toBeNull();
      expect(res5.qualityFlag).toBe("INSUFFICIENT_WINDOW");
    });
  });

  describe("getCategoryFromAqi", () => {
    it("correctly maps numeric AQI to CPCB NAQI categories", () => {
      expect(getCategoryFromAqi(0)).toBe("GOOD");
      expect(getCategoryFromAqi(50)).toBe("GOOD");
      expect(getCategoryFromAqi(51)).toBe("SATISFACTORY");
      expect(getCategoryFromAqi(100)).toBe("SATISFACTORY");
      expect(getCategoryFromAqi(101)).toBe("MODERATE");
      expect(getCategoryFromAqi(200)).toBe("MODERATE");
      expect(getCategoryFromAqi(201)).toBe("POOR");
      expect(getCategoryFromAqi(300)).toBe("POOR");
      expect(getCategoryFromAqi(301)).toBe("VERY_POOR");
      expect(getCategoryFromAqi(400)).toBe("VERY_POOR");
      expect(getCategoryFromAqi(401)).toBe("SEVERE");
      expect(getCategoryFromAqi(500)).toBe("SEVERE");
    });
  });
});
