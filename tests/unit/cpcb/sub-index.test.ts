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

      // Severe: (250, 350] -> [401, 500]
      expect(calculatePollutantSubIndex(make24h("PM2.5", 250.1)).subIndex).toBe(401);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 300)).subIndex).toBe(451);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 350)).subIndex).toBe(500);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 350)).category).toBe("SEVERE");
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

      // Severe: (430, 500] -> [401, 500]
      expect(calculatePollutantSubIndex(make24h("PM10", 430.1)).subIndex).toBe(401);
      expect(calculatePollutantSubIndex(make24h("PM10", 500)).subIndex).toBe(500);
      expect(calculatePollutantSubIndex(make24h("PM10", 500)).category).toBe("SEVERE");
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
      // Severe: (400, 600] -> [401, 500]
      expect(calculatePollutantSubIndex(make24h("NO2", 600)).subIndex).toBe(500);
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
      // Severe: (1600, 2000] -> [401, 500]
      expect(calculatePollutantSubIndex(make24h("SO2", 2000)).subIndex).toBe(500);
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
      // Severe: (1800, 2500] -> [401, 500]
      expect(calculatePollutantSubIndex(make24h("NH3", 2500)).subIndex).toBe(500);
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
      // Severe: (34.0, 50.0] -> [401, 500]
      expect(calculatePollutantSubIndex(make8h("CO", 50.0, "mg/m³")).subIndex).toBe(500);
    });
  });

  describe("O3 (Ozone - 8-hour and 1-hour special rules, µg/m³)", () => {
    it("handles 8-hour ozone across all breakpoints", () => {
      // Good: [0, 50] -> [0, 50]
      expect(calculatePollutantSubIndex(make8h("O3", 50)).subIndex).toBe(50);
      // Satisfactory: (50, 100] -> [51, 100]
      expect(calculatePollutantSubIndex(make8h("O3", 100)).subIndex).toBe(100);
      // Moderate: (100, 168] -> [101, 200]
      expect(calculatePollutantSubIndex(make8h("O3", 168)).subIndex).toBe(200);
      // Poor: (168, 208] -> [201, 300]
      expect(calculatePollutantSubIndex(make8h("O3", 208)).subIndex).toBe(300);
      // Very Poor: (208, 748] -> [301, 400]
      expect(calculatePollutantSubIndex(make8h("O3", 748)).subIndex).toBe(400);
      // Severe: (748, 1000] -> [401, 500]
      expect(calculatePollutantSubIndex(make8h("O3", 1000)).subIndex).toBe(500);
    });

    it("enforces statutory 1-hour ozone restriction (CPCB Table 2 footnote)", () => {
      // 1-hour ozone with concentration <= 208 µg/m³ is INCOMPATIBLE
      const lowO3_1h: RawPollutantMeasurement = {
        pollutant: "O3",
        concentration: 150,
        unit: "µg/m³",
        averagingWindowHours: 1,
        recordedAtUtc: new Date().toISOString(),
        validHoursInWindow: 1
      };
      const resLow = calculatePollutantSubIndex(lowO3_1h);
      expect(resLow.subIndex).toBeNull();
      expect(resLow.category).toBeNull();
      expect(resLow.qualityFlag).toBe("INCOMPATIBLE_AVERAGING_WINDOW");

      // Boundary condition: exactly 208 µg/m³ is also rejected for 1h
      const boundO3_1h: RawPollutantMeasurement = {
        ...lowO3_1h,
        concentration: 208
      };
      expect(calculatePollutantSubIndex(boundO3_1h).qualityFlag).toBe("INCOMPATIBLE_AVERAGING_WINDOW");

      // 1-hour ozone with concentration > 208 µg/m³ is valid (Very Poor & Severe range)
      const highO3_1h: RawPollutantMeasurement = {
        pollutant: "O3",
        concentration: 500,
        unit: "µg/m³",
        averagingWindowHours: 1,
        recordedAtUtc: new Date().toISOString(),
        validHoursInWindow: 1
      };
      const resHigh = calculatePollutantSubIndex(highO3_1h);
      expect(resHigh.subIndex).not.toBeNull();
      expect(resHigh.category).toBe("VERY_POOR");
      expect(resHigh.qualityFlag).toBe("VERIFIED");

      // 1-hour ozone in Severe range
      const severeO3_1h: RawPollutantMeasurement = {
        ...highO3_1h,
        concentration: 850
      };
      const resSevere = calculatePollutantSubIndex(severeO3_1h);
      expect(resSevere.subIndex).toBeGreaterThan(400);
      expect(resSevere.category).toBe("SEVERE");
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

    it("preserves extreme high values above top breakpoint as SUSPECT_EXTREME capped at 500", () => {
      // Extreme PM2.5 (e.g. 850 µg/m³ during severe crop residue burning)
      const mExtremePm25 = make24h("PM2.5", 850);
      const resExtreme = calculatePollutantSubIndex(mExtremePm25);
      expect(resExtreme.subIndex).toBe(500);
      expect(resExtreme.category).toBe("SEVERE");
      expect(resExtreme.qualityFlag).toBe("SUSPECT_EXTREME");
      expect(resExtreme.concentration).toBe(850);

      // Extreme CO (e.g. 75 mg/m³ near industrial kiln)
      const mExtremeCo = make8h("CO", 75, "mg/m³");
      const resCo = calculatePollutantSubIndex(mExtremeCo);
      expect(resCo.subIndex).toBe(500);
      expect(resCo.qualityFlag).toBe("SUSPECT_EXTREME");
      expect(resCo.concentration).toBe(75);
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
