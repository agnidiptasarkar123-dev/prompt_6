// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import { calculatePollutantSubIndex, getCategoryFromAqi } from "@/domain/cpcb/sub-index-calculator";
import { RawPollutantMeasurement } from "@/schemas/pollutant.schema";

describe("CPCB Sub-Index Calculator (Piecewise Linear Interpolation & Statutory NAQI 2014)", () => {
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
    it("PM2.5: interpolates Good category [0, 30] -> [0, 50]", () => {
      expect(calculatePollutantSubIndex(make24h("PM2.5", 0)).subIndex).toBe(0);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 15)).subIndex).toBe(25);
      const res30 = calculatePollutantSubIndex(make24h("PM2.5", 30));
      expect(res30.subIndex).toBe(50);
      expect(res30.category).toBe("GOOD");
    });

    it("PM2.5: interpolates Satisfactory category (30, 60] -> [50, 100]", () => {
      const res30_1 = calculatePollutantSubIndex(make24h("PM2.5", 30.1));
      expect(res30_1.rawMathematicalSubIndex).toBeCloseTo(50.1667, 3);
      expect(res30_1.subIndex).toBe(50);
      expect(res30_1.category).toBe("SATISFACTORY");
      expect(calculatePollutantSubIndex(make24h("PM2.5", 45)).subIndex).toBe(75);
      const res60 = calculatePollutantSubIndex(make24h("PM2.5", 60));
      expect(res60.subIndex).toBe(100);
      expect(res60.category).toBe("SATISFACTORY");
    });

    it("PM2.5: interpolates Moderate category (60, 90] -> [100, 200]", () => {
      const res60_1 = calculatePollutantSubIndex(make24h("PM2.5", 60.1));
      expect(res60_1.rawMathematicalSubIndex).toBeCloseTo(100.3333, 3);
      expect(res60_1.subIndex).toBe(100);
      expect(res60_1.category).toBe("MODERATE");
      expect(calculatePollutantSubIndex(make24h("PM2.5", 75)).subIndex).toBe(150);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 90)).subIndex).toBe(200);
    });

    it("PM2.5: interpolates Poor category (90, 120] -> [200, 300]", () => {
      const res90_1 = calculatePollutantSubIndex(make24h("PM2.5", 90.1));
      expect(res90_1.rawMathematicalSubIndex).toBeCloseTo(200.3333, 3);
      expect(res90_1.subIndex).toBe(200);
      expect(res90_1.category).toBe("POOR");
      expect(calculatePollutantSubIndex(make24h("PM2.5", 105)).subIndex).toBe(250);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 120)).subIndex).toBe(300);
    });

    it("PM2.5: interpolates Very Poor category (120, 250] -> [300, 400]", () => {
      const res120_1 = calculatePollutantSubIndex(make24h("PM2.5", 120.1));
      expect(res120_1.rawMathematicalSubIndex).toBeCloseTo(300.0769, 3);
      expect(res120_1.subIndex).toBe(300);
      expect(res120_1.category).toBe("VERY_POOR");
      expect(calculatePollutantSubIndex(make24h("PM2.5", 185)).subIndex).toBe(350);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 250)).subIndex).toBe(400);
    });

    it("PM2.5: interpolates Severe nominal range (250, 380] -> [400, 500]", () => {
      const res250_1 = calculatePollutantSubIndex(make24h("PM2.5", 250.1));
      expect(res250_1.rawMathematicalSubIndex).toBeCloseTo(400.0769, 3);
      expect(res250_1.subIndex).toBe(400);
      expect(res250_1.category).toBe("SEVERE");
      expect(calculatePollutantSubIndex(make24h("PM2.5", 315)).subIndex).toBe(450);
      const res380 = calculatePollutantSubIndex(make24h("PM2.5", 380));
      expect(res380.subIndex).toBe(500);
      expect(res380.category).toBe("SEVERE");
      expect(res380.isBeyondNominalScale).toBe(false);
      expect(res380.reportingCeilingCappedAqi).toBe(500);
    });

    it("PM2.5: verifies mandatory test values 250, 300, 350, 380", () => {
      expect(calculatePollutantSubIndex(make24h("PM2.5", 250)).subIndex).toBe(400);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 300)).subIndex).toBe(438);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 350)).subIndex).toBe(477);
      expect(calculatePollutantSubIndex(make24h("PM2.5", 380)).subIndex).toBe(500);
    });

    it("PM2.5: extrapolates formula linearly beyond 500 at concentrations 500 and 1000", () => {
      const res500 = calculatePollutantSubIndex(make24h("PM2.5", 500));
      expect(res500.subIndex).toBe(592);
      expect(res500.rawMathematicalSubIndex).toBeCloseTo(592.3077, 3);
      expect(res500.isBeyondNominalScale).toBe(true);
      expect(res500.reportingCeilingCappedAqi).toBe(500);
      expect(res500.qualityFlag).toBe("EXCEEDS_SEVERE_FORMULA_ANCHOR");

      const res1000 = calculatePollutantSubIndex(make24h("PM2.5", 1000));
      expect(res1000.subIndex).toBe(977);
      expect(res1000.rawMathematicalSubIndex).toBeCloseTo(976.9231, 3);
      expect(res1000.isBeyondNominalScale).toBe(true);
      expect(res1000.reportingCeilingCappedAqi).toBe(500);
      expect(res1000.qualityFlag).toBe("EXCEEDS_SEVERE_FORMULA_ANCHOR");
    });

    it("PM2.5: rejects concentrations beyond extreme physical ceiling (>2500 µg/m³)", () => {
      const res = calculatePollutantSubIndex(make24h("PM2.5", 2501));
      expect(res.subIndex).toBeNull();
      expect(res.qualityFlag).toBe("INVALID_SENSOR_READING");
    });
  });

  describe("PM10 (24-hour average, µg/m³)", () => {
    it("PM10: interpolates Good [0, 50] -> [0, 50]", () => {
      expect(calculatePollutantSubIndex(make24h("PM10", 0)).subIndex).toBe(0);
      expect(calculatePollutantSubIndex(make24h("PM10", 50)).subIndex).toBe(50);
    });

    it("PM10: interpolates Satisfactory (50, 100] -> [50, 100]", () => {
      expect(calculatePollutantSubIndex(make24h("PM10", 50.1)).subIndex).toBe(50);
      expect(calculatePollutantSubIndex(make24h("PM10", 100)).subIndex).toBe(100);
    });

    it("PM10: interpolates Moderate (100, 250] -> [100, 200]", () => {
      expect(calculatePollutantSubIndex(make24h("PM10", 100.1)).subIndex).toBe(100);
      expect(calculatePollutantSubIndex(make24h("PM10", 250)).subIndex).toBe(200);
    });

    it("PM10: interpolates Poor (250, 350] -> [200, 300]", () => {
      expect(calculatePollutantSubIndex(make24h("PM10", 250.1)).subIndex).toBe(200);
      expect(calculatePollutantSubIndex(make24h("PM10", 350)).subIndex).toBe(300);
    });

    it("PM10: interpolates Very Poor (350, 430] -> [300, 400]", () => {
      expect(calculatePollutantSubIndex(make24h("PM10", 350.1)).subIndex).toBe(300);
      expect(calculatePollutantSubIndex(make24h("PM10", 430)).subIndex).toBe(400);
    });

    it("PM10: interpolates Severe (430, 510] -> [400, 500] and extrapolates at 600", () => {
      expect(calculatePollutantSubIndex(make24h("PM10", 430.1)).subIndex).toBe(400);
      expect(calculatePollutantSubIndex(make24h("PM10", 510)).subIndex).toBe(500);

      const res600 = calculatePollutantSubIndex(make24h("PM10", 600));
      expect(res600.subIndex).toBe(613);
      expect(res600.isBeyondNominalScale).toBe(true);
      expect(res600.reportingCeilingCappedAqi).toBe(500);
    });

    it("PM10: rejects concentrations beyond extreme physical ceiling (>4000 µg/m³)", () => {
      expect(calculatePollutantSubIndex(make24h("PM10", 4001)).qualityFlag).toBe("INVALID_SENSOR_READING");
    });
  });

  describe("NO2 (24-hour average, µg/m³)", () => {
    it("NO2: interpolates Good [0, 40] -> [0, 50]", () => {
      expect(calculatePollutantSubIndex(make24h("NO2", 40)).subIndex).toBe(50);
    });

    it("NO2: interpolates Satisfactory (40, 80] -> [50, 100]", () => {
      expect(calculatePollutantSubIndex(make24h("NO2", 40.1)).subIndex).toBe(50);
      expect(calculatePollutantSubIndex(make24h("NO2", 80)).subIndex).toBe(100);
    });

    it("NO2: interpolates Moderate (80, 180] -> [100, 200]", () => {
      expect(calculatePollutantSubIndex(make24h("NO2", 180)).subIndex).toBe(200);
    });

    it("NO2: interpolates Poor (180, 280] -> [200, 300]", () => {
      expect(calculatePollutantSubIndex(make24h("NO2", 280)).subIndex).toBe(300);
    });

    it("NO2: interpolates Very Poor (280, 400] -> [300, 400]", () => {
      expect(calculatePollutantSubIndex(make24h("NO2", 400)).subIndex).toBe(400);
    });

    it("NO2: interpolates Severe (400, 520] -> [400, 500] and extrapolates at 640", () => {
      expect(calculatePollutantSubIndex(make24h("NO2", 520)).subIndex).toBe(500);
      const res640 = calculatePollutantSubIndex(make24h("NO2", 640));
      expect(res640.subIndex).toBe(600);
      expect(res640.isBeyondNominalScale).toBe(true);
    });

    it("NO2: rejects concentrations beyond physical ceiling (>2000 µg/m³)", () => {
      expect(calculatePollutantSubIndex(make24h("NO2", 2001)).qualityFlag).toBe("INVALID_SENSOR_READING");
    });
  });

  describe("SO2 (24-hour average, µg/m³)", () => {
    it("SO2: interpolates Good [0, 40] -> [0, 50]", () => {
      expect(calculatePollutantSubIndex(make24h("SO2", 40)).subIndex).toBe(50);
    });

    it("SO2: interpolates Satisfactory (40, 80] -> [50, 100]", () => {
      expect(calculatePollutantSubIndex(make24h("SO2", 80)).subIndex).toBe(100);
    });

    it("SO2: interpolates Moderate (80, 380] -> [100, 200]", () => {
      expect(calculatePollutantSubIndex(make24h("SO2", 380)).subIndex).toBe(200);
    });

    it("SO2: interpolates Poor (380, 800] -> [200, 300]", () => {
      expect(calculatePollutantSubIndex(make24h("SO2", 800)).subIndex).toBe(300);
    });

    it("SO2: interpolates Very Poor (800, 1600] -> [300, 400]", () => {
      expect(calculatePollutantSubIndex(make24h("SO2", 1600)).subIndex).toBe(400);
    });

    it("SO2: interpolates Severe (1600, 2400] -> [400, 500] and extrapolates at 3200", () => {
      expect(calculatePollutantSubIndex(make24h("SO2", 2400)).subIndex).toBe(500);
      const res3200 = calculatePollutantSubIndex(make24h("SO2", 3200));
      expect(res3200.subIndex).toBe(600);
      expect(res3200.isBeyondNominalScale).toBe(true);
    });

    it("SO2: rejects concentrations beyond physical ceiling (>4000 µg/m³)", () => {
      expect(calculatePollutantSubIndex(make24h("SO2", 4001)).qualityFlag).toBe("INVALID_SENSOR_READING");
    });
  });

  describe("NH3 (24-hour average, µg/m³)", () => {
    it("NH3: interpolates Good [0, 200] -> [0, 50]", () => {
      expect(calculatePollutantSubIndex(make24h("NH3", 200)).subIndex).toBe(50);
    });

    it("NH3: interpolates Satisfactory (200, 400] -> [50, 100]", () => {
      expect(calculatePollutantSubIndex(make24h("NH3", 400)).subIndex).toBe(100);
    });

    it("NH3: interpolates Moderate (400, 800] -> [100, 200]", () => {
      expect(calculatePollutantSubIndex(make24h("NH3", 800)).subIndex).toBe(200);
    });

    it("NH3: interpolates Poor (800, 1200] -> [200, 300]", () => {
      expect(calculatePollutantSubIndex(make24h("NH3", 1200)).subIndex).toBe(300);
    });

    it("NH3: interpolates Very Poor (1200, 1800] -> [300, 400]", () => {
      expect(calculatePollutantSubIndex(make24h("NH3", 1800)).subIndex).toBe(400);
    });

    it("NH3: interpolates Severe (1800, 2400] -> [400, 500] and extrapolates at 3000", () => {
      expect(calculatePollutantSubIndex(make24h("NH3", 2400)).subIndex).toBe(500);
      const res3000 = calculatePollutantSubIndex(make24h("NH3", 3000));
      expect(res3000.subIndex).toBe(600);
      expect(res3000.isBeyondNominalScale).toBe(true);
    });

    it("NH3: rejects concentrations beyond physical ceiling (>5000 µg/m³)", () => {
      expect(calculatePollutantSubIndex(make24h("NH3", 5001)).qualityFlag).toBe("INVALID_SENSOR_READING");
    });
  });

  describe("CO (Carbon Monoxide - 8-hour average, mg/m³)", () => {
    it("CO: interpolates Good [0, 1.0] -> [0, 50]", () => {
      expect(calculatePollutantSubIndex(make8h("CO", 1.0, "mg/m³")).subIndex).toBe(50);
    });

    it("CO: interpolates Satisfactory (1.0, 2.0] -> [50, 100]", () => {
      expect(calculatePollutantSubIndex(make8h("CO", 1.5, "mg/m³")).subIndex).toBe(75);
      expect(calculatePollutantSubIndex(make8h("CO", 2.0, "mg/m³")).subIndex).toBe(100);
    });

    it("CO: interpolates Moderate (2.0, 10.0] -> [100, 200]", () => {
      expect(calculatePollutantSubIndex(make8h("CO", 10.0, "mg/m³")).subIndex).toBe(200);
    });

    it("CO: interpolates Poor (10.0, 17.0] -> [200, 300]", () => {
      expect(calculatePollutantSubIndex(make8h("CO", 17.0, "mg/m³")).subIndex).toBe(300);
    });

    it("CO: interpolates Very Poor (17.0, 34.0] -> [300, 400]", () => {
      expect(calculatePollutantSubIndex(make8h("CO", 34.0, "mg/m³")).subIndex).toBe(400);
    });

    it("CO: interpolates Severe (34.0, 51.0] -> [400, 500] and extrapolates at 68.0", () => {
      expect(calculatePollutantSubIndex(make8h("CO", 51.0, "mg/m³")).subIndex).toBe(500);
      const res68 = calculatePollutantSubIndex(make8h("CO", 68.0, "mg/m³"));
      expect(res68.subIndex).toBe(600);
      expect(res68.isBeyondNominalScale).toBe(true);
    });

    it("CO: rejects concentrations beyond physical ceiling (>150 mg/m³)", () => {
      expect(calculatePollutantSubIndex(make8h("CO", 151.0, "mg/m³")).qualityFlag).toBe("INVALID_SENSOR_READING");
    });
  });

  describe("Pb (Lead - 24-hour average, µg/m³)", () => {
    it("Pb: interpolates Good [0, 0.5] -> [0, 50]", () => {
      expect(calculatePollutantSubIndex(make24h("Pb", 0)).subIndex).toBe(0);
      expect(calculatePollutantSubIndex(make24h("Pb", 0.5)).subIndex).toBe(50);
    });

    it("Pb: interpolates Satisfactory (0.5, 1.0] -> [50, 100]", () => {
      expect(calculatePollutantSubIndex(make24h("Pb", 0.75)).subIndex).toBe(75);
      expect(calculatePollutantSubIndex(make24h("Pb", 1.0)).subIndex).toBe(100);
    });

    it("Pb: interpolates Moderate (1.0, 2.0] -> [100, 200]", () => {
      expect(calculatePollutantSubIndex(make24h("Pb", 1.5)).subIndex).toBe(150);
      expect(calculatePollutantSubIndex(make24h("Pb", 2.0)).subIndex).toBe(200);
    });

    it("Pb: interpolates Poor (2.0, 3.0] -> [200, 300]", () => {
      expect(calculatePollutantSubIndex(make24h("Pb", 2.5)).subIndex).toBe(250);
      expect(calculatePollutantSubIndex(make24h("Pb", 3.0)).subIndex).toBe(300);
    });

    it("Pb: interpolates Very Poor (3.0, 3.5] -> [300, 400]", () => {
      expect(calculatePollutantSubIndex(make24h("Pb", 3.25)).subIndex).toBe(350);
      expect(calculatePollutantSubIndex(make24h("Pb", 3.5)).subIndex).toBe(400);
    });

    it("Pb: classifies Pb > 3.5 µg/m³ as category SEVERE with subIndex null (no fabricated formula)", () => {
      const res36 = calculatePollutantSubIndex(make24h("Pb", 3.6));
      expect(res36.subIndex).toBeNull();
      expect(res36.rawMathematicalSubIndex).toBeNull();
      expect(res36.category).toBe("SEVERE");
      expect(res36.qualityFlag).toBe("NO_DEFENSIBLE_SUBINDEX_FORMULA");

      const res50 = calculatePollutantSubIndex(make24h("Pb", 5.0));
      expect(res50.subIndex).toBeNull();
      expect(res50.category).toBe("SEVERE");
      expect(res50.qualityFlag).toBe("NO_DEFENSIBLE_SUBINDEX_FORMULA");
    });

    it("Pb: rejects concentrations beyond physical ceiling (>50 µg/m³)", () => {
      expect(calculatePollutantSubIndex(make24h("Pb", 51.0)).qualityFlag).toBe("INVALID_SENSOR_READING");
    });
  });

  describe("O3 (Ozone - CPCB Table 3.11 & Section 3.3.4 Dual Averaging Windows)", () => {
    it("O3 8h: handles Good [0, 50] -> [0, 50]", () => {
      expect(calculatePollutantSubIndex(make8h("O3", 50)).subIndex).toBe(50);
    });

    it("O3 8h: handles Satisfactory (50, 100] -> [50, 100]", () => {
      expect(calculatePollutantSubIndex(make8h("O3", 100)).subIndex).toBe(100);
    });

    it("O3 8h: handles Moderate (100, 168] -> [100, 200]", () => {
      expect(calculatePollutantSubIndex(make8h("O3", 168)).subIndex).toBe(200);
    });

    it("O3 8h: handles Poor (168, 208] -> [200, 300]", () => {
      expect(calculatePollutantSubIndex(make8h("O3", 208)).subIndex).toBe(300);
    });

    it("O3 8h: rejects 8h measurement above 208 µg/m³ (must not silently enter 1h starred range)", () => {
      const res208_1_8h = calculatePollutantSubIndex(make8h("O3", 208.1));
      expect(res208_1_8h.subIndex).toBeNull();
      expect(res208_1_8h.qualityFlag).toBe("INCOMPATIBLE_AVERAGING_WINDOW");

      const res748_8h = calculatePollutantSubIndex(make8h("O3", 748));
      expect(res748_8h.subIndex).toBeNull();
      expect(res748_8h.qualityFlag).toBe("INCOMPATIBLE_AVERAGING_WINDOW");
    });

    it("O3 1h: rejects 1h measurement at or below 208 µg/m³ (must not enter 8h ranges)", () => {
      const res208_1h = calculatePollutantSubIndex(make1h("O3", 208.0));
      expect(res208_1h.subIndex).toBeNull();
      expect(res208_1h.qualityFlag).toBe("INCOMPATIBLE_AVERAGING_WINDOW");
    });

    it("O3 1h: calculates Very Poor acute photolytic spike at 208.1 and 209.0 µg/m³", () => {
      const res208_1_1h = calculatePollutantSubIndex(make1h("O3", 208.1));
      expect(res208_1_1h.rawMathematicalSubIndex).toBeCloseTo(300.0185, 4);
      expect(res208_1_1h.subIndex).toBe(300);
      expect(res208_1_1h.category).toBe("VERY_POOR");
      expect(res208_1_1h.qualityFlag).toBe("VERIFIED");

      const res209_1h = calculatePollutantSubIndex(make1h("O3", 209.0));
      expect(res209_1h.rawMathematicalSubIndex).toBeCloseTo(300.1852, 4);
      expect(res209_1h.subIndex).toBe(300);
      expect(res209_1h.category).toBe("VERY_POOR");
    });

    it("O3 1h: evaluates boundary at 748.0 (Very Poor, 400) and 748.1 (Severe, 400)", () => {
      const res748 = calculatePollutantSubIndex(make1h("O3", 748.0));
      expect(res748.subIndex).toBe(400);
      expect(res748.category).toBe("VERY_POOR");

      const res748_1 = calculatePollutantSubIndex(make1h("O3", 748.1));
      expect(res748_1.rawMathematicalSubIndex).toBeCloseTo(400.0185, 4);
      expect(res748_1.subIndex).toBe(400);
      expect(res748_1.category).toBe("SEVERE");
    });

    it("O3 1h: evaluates Severe continuation at 1000.0, 1288.0, and 1350.0 µg/m³", () => {
      const res1000 = calculatePollutantSubIndex(make1h("O3", 1000.0));
      expect(res1000.rawMathematicalSubIndex).toBeCloseTo(446.6667, 3);
      expect(res1000.subIndex).toBe(447);
      expect(res1000.category).toBe("SEVERE");

      const res1288 = calculatePollutantSubIndex(make1h("O3", 1288.0));
      expect(res1288.subIndex).toBe(500);
      expect(res1288.category).toBe("SEVERE");
      expect(res1288.isBeyondNominalScale).toBe(false);

      const res1350 = calculatePollutantSubIndex(make1h("O3", 1350.0));
      expect(res1350.rawMathematicalSubIndex).toBeCloseTo(511.4815, 3);
      expect(res1350.subIndex).toBe(511);
      expect(res1350.isBeyondNominalScale).toBe(true);
      expect(res1350.reportingCeilingCappedAqi).toBe(500);
      expect(res1350.qualityFlag).toBe("EXCEEDS_SEVERE_FORMULA_ANCHOR");
    });

    it("O3 1h: rejects concentrations beyond physical ceiling (>2500 µg/m³)", () => {
      expect(calculatePollutantSubIndex(make1h("O3", 2501.0)).qualityFlag).toBe("INVALID_SENSOR_READING");
    });
  });

  describe("Invalid & Fault Readings Handling", () => {
    it("strictly rejects negative concentrations, NaN, Infinity, null, and undefined", () => {
      // @ts-expect-error testing null
      expect(calculatePollutantSubIndex(make24h("PM2.5", null)).qualityFlag).toBe("INVALID_SENSOR_READING");
      // @ts-expect-error testing undefined
      expect(calculatePollutantSubIndex(make24h("PM2.5", undefined)).qualityFlag).toBe("INVALID_SENSOR_READING");
      expect(calculatePollutantSubIndex(make24h("PM2.5", NaN)).qualityFlag).toBe("INVALID_SENSOR_READING");
      expect(calculatePollutantSubIndex(make24h("PM2.5", Infinity)).qualityFlag).toBe("INVALID_SENSOR_READING");
      expect(calculatePollutantSubIndex(make24h("PM2.5", -1)).qualityFlag).toBe("INVALID_SENSOR_READING");
      expect(calculatePollutantSubIndex(make24h("PM2.5", -999)).qualityFlag).toBe("INVALID_SENSOR_READING");
    });

    it("rejects incompatible averaging windows for pollutants", () => {
      const pm25_8h: RawPollutantMeasurement = {
        pollutant: "PM2.5",
        concentration: 60,
        unit: "µg/m³",
        averagingWindowHours: 8,
        recordedAtUtc: new Date().toISOString(),
        validHoursInWindow: 8
      };
      expect(calculatePollutantSubIndex(pm25_8h).qualityFlag).toBe("INCOMPATIBLE_AVERAGING_WINDOW");
    });

    it("flags INSUFFICIENT_WINDOW when valid hours fail statutory requirement", () => {
      const m15 = { ...make24h("PM2.5", 55), validHoursInWindow: 15 };
      const res15 = calculatePollutantSubIndex(m15);
      expect(res15.subIndex).toBeNull();
      expect(res15.qualityFlag).toBe("INSUFFICIENT_WINDOW");

      const m5 = { ...make8h("CO", 1.5, "mg/m³"), validHoursInWindow: 5 };
      const res5 = calculatePollutantSubIndex(m5);
      expect(res5.subIndex).toBeNull();
      expect(res5.qualityFlag).toBe("INSUFFICIENT_WINDOW");
    });
  });

  describe("getCategoryFromAqi", () => {
    it("correctly maps numeric AQI to CPCB NAQI categories across all bands", () => {
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
      expect(getCategoryFromAqi(650)).toBe("SEVERE");
    });
  });
});
