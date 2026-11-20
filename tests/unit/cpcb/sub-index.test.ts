import { describe, it, expect } from "vitest";
import { calculatePollutantSubIndex, getCategoryFromAqi } from "@/domain/cpcb/sub-index-calculator";
import { RawPollutantMeasurement } from "@/schemas/pollutant.schema";

describe("CPCB Sub-Index Calculator (Piecewise Linear Interpolation)", () => {
  it("calculates exact PM2.5 boundary values correctly", () => {
    // 0 -> Sub-index 0 (Good)
    const m0: RawPollutantMeasurement = {
      pollutant: "PM2.5",
      concentration: 0,
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: new Date().toISOString(),
      validHoursInWindow: 24
    };
    expect(calculatePollutantSubIndex(m0).subIndex).toBe(0);

    // 30 -> Sub-index 50 (Good)
    const m30 = { ...m0, concentration: 30 };
    expect(calculatePollutantSubIndex(m30).subIndex).toBe(50);
    expect(calculatePollutantSubIndex(m30).category).toBe("GOOD");

    // 31 -> Sub-index 51 (Satisfactory)
    const m31 = { ...m0, concentration: 31 };
    expect(calculatePollutantSubIndex(m31).subIndex).toBe(51);
    expect(calculatePollutantSubIndex(m31).category).toBe("SATISFACTORY");

    // 60 -> Sub-index 100 (Satisfactory)
    const m60 = { ...m0, concentration: 60 };
    expect(calculatePollutantSubIndex(m60).subIndex).toBe(100);

    // 61 -> Sub-index 101 (Moderate)
    const m61 = { ...m0, concentration: 61 };
    expect(calculatePollutantSubIndex(m61).subIndex).toBe(101);

    // 90 -> Sub-index 200 (Moderate)
    const m90 = { ...m0, concentration: 90 };
    expect(calculatePollutantSubIndex(m90).subIndex).toBe(200);

    // 91 -> Sub-index 201 (Poor)
    const m91 = { ...m0, concentration: 91 };
    expect(calculatePollutantSubIndex(m91).subIndex).toBe(201);

    // 120 -> Sub-index 300 (Poor)
    const m120 = { ...m0, concentration: 120 };
    expect(calculatePollutantSubIndex(m120).subIndex).toBe(300);

    // 121 -> Sub-index 301 (Very Poor)
    const m121 = { ...m0, concentration: 121 };
    expect(calculatePollutantSubIndex(m121).subIndex).toBe(301);

    // 250 -> Sub-index 400 (Very Poor)
    const m250 = { ...m0, concentration: 250 };
    expect(calculatePollutantSubIndex(m250).subIndex).toBe(400);

    // 251 -> Sub-index 401 (Severe)
    const m251 = { ...m0, concentration: 251 };
    expect(calculatePollutantSubIndex(m251).subIndex).toBe(401);
  });

  it("calculates all other 5 CPCB pollutants (NO2, SO2, O3, NH3, Pb) correctly", () => {
    // NO2 (24h window)
    const mNo2: RawPollutantMeasurement = {
      pollutant: "NO2",
      concentration: 40,
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: new Date().toISOString(),
      validHoursInWindow: 24
    };
    expect(calculatePollutantSubIndex(mNo2).subIndex).toBe(50);
    expect(calculatePollutantSubIndex(mNo2).category).toBe("GOOD");

    // SO2 (24h window)
    const mSo2: RawPollutantMeasurement = {
      pollutant: "SO2",
      concentration: 40,
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: new Date().toISOString(),
      validHoursInWindow: 24
    };
    expect(calculatePollutantSubIndex(mSo2).subIndex).toBe(50);

    // O3 (8h window)
    const mO3: RawPollutantMeasurement = {
      pollutant: "O3",
      concentration: 50,
      unit: "µg/m³",
      averagingWindowHours: 8,
      recordedAtUtc: new Date().toISOString(),
      validHoursInWindow: 8
    };
    expect(calculatePollutantSubIndex(mO3).subIndex).toBe(50);

    // NH3 (24h window)
    const mNh3: RawPollutantMeasurement = {
      pollutant: "NH3",
      concentration: 200,
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: new Date().toISOString(),
      validHoursInWindow: 24
    };
    expect(calculatePollutantSubIndex(mNh3).subIndex).toBe(50);

    // Pb (24h window)
    const mPb: RawPollutantMeasurement = {
      pollutant: "Pb",
      concentration: 0.5,
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: new Date().toISOString(),
      validHoursInWindow: 24
    };
    expect(calculatePollutantSubIndex(mPb).subIndex).toBe(50);
  });

  it("calculates Carbon Monoxide (CO in mg/m³) correctly", () => {
    const mCo: RawPollutantMeasurement = {
      pollutant: "CO",
      concentration: 1.0,
      unit: "mg/m³",
      averagingWindowHours: 8,
      recordedAtUtc: new Date().toISOString(),
      validHoursInWindow: 8
    };
    expect(calculatePollutantSubIndex(mCo).subIndex).toBe(50);
    expect(calculatePollutantSubIndex(mCo).category).toBe("GOOD");

    const mCo2 = { ...mCo, concentration: 2.0 };
    expect(calculatePollutantSubIndex(mCo2).subIndex).toBe(100);
    expect(calculatePollutantSubIndex(mCo2).category).toBe("SATISFACTORY");

    const mCo10 = { ...mCo, concentration: 10.0 };
    expect(calculatePollutantSubIndex(mCo10).subIndex).toBe(200);
    expect(calculatePollutantSubIndex(mCo10).category).toBe("MODERATE");
  });

  it("preserves extreme high values and tags SUSPECT_EXTREME without dropping", () => {
    const extremePm25: RawPollutantMeasurement = {
      pollutant: "PM2.5",
      concentration: 850, // Extreme reading beyond 500
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: new Date().toISOString(),
      validHoursInWindow: 24
    };
    const res = calculatePollutantSubIndex(extremePm25);
    expect(res.subIndex).toBe(500);
    expect(res.category).toBe("SEVERE");
    expect(res.qualityFlag).toBe("SUSPECT_EXTREME");
    expect(res.concentration).toBe(850); // Raw concentration preserved
  });

  it("marks INSUFFICIENT_WINDOW if valid hours is below 16 for 24h window", () => {
    const incompletePm10: RawPollutantMeasurement = {
      pollutant: "PM10",
      concentration: 180,
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: new Date().toISOString(),
      validHoursInWindow: 12 // Less than 16 hours!
    };
    const res = calculatePollutantSubIndex(incompletePm10);
    expect(res.subIndex).toBeNull();
    expect(res.category).toBeNull();
    expect(res.qualityFlag).toBe("INSUFFICIENT_WINDOW");
  });

  it("maps numeric AQI to correct health categories", () => {
    expect(getCategoryFromAqi(45)).toBe("GOOD");
    expect(getCategoryFromAqi(95)).toBe("SATISFACTORY");
    expect(getCategoryFromAqi(150)).toBe("MODERATE");
    expect(getCategoryFromAqi(250)).toBe("POOR");
    expect(getCategoryFromAqi(350)).toBe("VERY_POOR");
    expect(getCategoryFromAqi(450)).toBe("SEVERE");
  });
});
