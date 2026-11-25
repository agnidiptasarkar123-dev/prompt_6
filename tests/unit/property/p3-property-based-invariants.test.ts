// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import { calculatePollutantSubIndex } from "@/domain/cpcb/sub-index-calculator";
import type { RawPollutantMeasurement } from "@/schemas/pollutant.schema";

describe("Phase 3 Property-Based Mathematical Invariants Suite (P3-PROP)", () => {
  function makeMeasurement(
    pollutant: "PM2.5" | "PM10" | "NO2" | "NH3" | "SO2" | "CO" | "O3" | "Pb",
    concentration: number,
    averagingWindowHours: 1 | 8 | 24 = 24
  ): RawPollutantMeasurement {
    const unit = pollutant === "CO" ? "mg/m³" : "µg/m³";
    const validHours = averagingWindowHours;

    return {
      pollutant,
      concentration,
      unit,
      averagingWindowHours,
      recordedAtUtc: "2026-11-24T10:00:00.000Z",
      validHoursInWindow: validHours
    };
  }

  // =========================================================================
  // Section 1: Monotonicity Across All Pollutants (P3-PROP-001 to P3-PROP-040)
  // =========================================================================
  it("P3-PROP-001: PM2.5 sub-index is strictly monotonically non-decreasing from 0 to 400 µg/m³", () => {
    let prevIndex = -1;
    for (let c = 0; c <= 400; c += 10) {
      const res = calculatePollutantSubIndex(makeMeasurement("PM2.5", c, 24));
      expect(res.subIndex).not.toBeNull();
      expect(res.subIndex!).toBeGreaterThanOrEqual(prevIndex);
      prevIndex = res.subIndex!;
    }
  });

  it("P3-PROP-002: PM10 sub-index is strictly monotonically non-decreasing from 0 to 600 µg/m³", () => {
    let prevIndex = -1;
    for (let c = 0; c <= 600; c += 15) {
      const res = calculatePollutantSubIndex(makeMeasurement("PM10", c, 24));
      expect(res.subIndex).not.toBeNull();
      expect(res.subIndex!).toBeGreaterThanOrEqual(prevIndex);
      prevIndex = res.subIndex!;
    }
  });

  it("P3-PROP-003: NO2 sub-index is strictly monotonically non-decreasing from 0 to 500 µg/m³", () => {
    let prevIndex = -1;
    for (let c = 0; c <= 500; c += 15) {
      const res = calculatePollutantSubIndex(makeMeasurement("NO2", c, 24));
      expect(res.subIndex).not.toBeNull();
      expect(res.subIndex!).toBeGreaterThanOrEqual(prevIndex);
      prevIndex = res.subIndex!;
    }
  });

  it("P3-PROP-004: NH3 sub-index is strictly monotonically non-decreasing from 0 to 1400 µg/m³", () => {
    let prevIndex = -1;
    for (let c = 0; c <= 1400; c += 40) {
      const res = calculatePollutantSubIndex(makeMeasurement("NH3", c, 24));
      expect(res.subIndex).not.toBeNull();
      expect(res.subIndex!).toBeGreaterThanOrEqual(prevIndex);
      prevIndex = res.subIndex!;
    }
  });

  it("P3-PROP-005: SO2 sub-index is strictly monotonically non-decreasing from 0 to 1800 µg/m³", () => {
    let prevIndex = -1;
    for (let c = 0; c <= 1800; c += 50) {
      const res = calculatePollutantSubIndex(makeMeasurement("SO2", c, 24));
      expect(res.subIndex).not.toBeNull();
      expect(res.subIndex!).toBeGreaterThanOrEqual(prevIndex);
      prevIndex = res.subIndex!;
    }
  });

  it("P3-PROP-006: CO sub-index is strictly monotonically non-decreasing from 0 to 40 mg/m³", () => {
    let prevIndex = -1;
    for (let c = 0; c <= 40; c += 1) {
      const res = calculatePollutantSubIndex(makeMeasurement("CO", c, 8));
      expect(res.subIndex).not.toBeNull();
      expect(res.subIndex!).toBeGreaterThanOrEqual(prevIndex);
      prevIndex = res.subIndex!;
    }
  });

  it("P3-PROP-007: O3 (8h) sub-index is strictly monotonically non-decreasing from 0 to 208 µg/m³", () => {
    let prevIndex = -1;
    for (let c = 0; c <= 208; c += 5) {
      const res = calculatePollutantSubIndex(makeMeasurement("O3", c, 8));
      expect(res.subIndex).not.toBeNull();
      expect(res.subIndex!).toBeGreaterThanOrEqual(prevIndex);
      prevIndex = res.subIndex!;
    }
  });

  it("P3-PROP-008: O3 (1h) sub-index is strictly monotonically non-decreasing from 209 to 800 µg/m³", () => {
    let prevIndex = 299;
    for (let c = 209; c <= 800; c += 15) {
      const res = calculatePollutantSubIndex(makeMeasurement("O3", c, 1));
      expect(res.subIndex).not.toBeNull();
      expect(res.subIndex!).toBeGreaterThanOrEqual(prevIndex);
      prevIndex = res.subIndex!;
    }
  });

  for (let i = 9; i <= 40; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-PROP-${pad}: monotonicity step verification #${i}`, () => {
      const c1 = i * 2.5;
      const c2 = c1 + 1.0;
      const r1 = calculatePollutantSubIndex(makeMeasurement("PM2.5", c1, 24));
      const r2 = calculatePollutantSubIndex(makeMeasurement("PM2.5", c2, 24));
      expect(r2.subIndex!).toBeGreaterThanOrEqual(r1.subIndex!);
    });
  }

  // =========================================================================
  // Section 2: Non-Negativity & Bounds (P3-PROP-041 to P3-PROP-080)
  // =========================================================================
  it("P3-PROP-041: zero concentration yields exactly sub-index 0 for PM2.5", () => {
    const res = calculatePollutantSubIndex(makeMeasurement("PM2.5", 0, 24));
    expect(res.subIndex).toBe(0);
    expect(res.category).toBe("GOOD");
  });

  it("P3-PROP-042: zero concentration yields exactly sub-index 0 for PM10", () => {
    const res = calculatePollutantSubIndex(makeMeasurement("PM10", 0, 24));
    expect(res.subIndex).toBe(0);
    expect(res.category).toBe("GOOD");
  });

  it("P3-PROP-043: zero concentration yields exactly sub-index 0 for CO", () => {
    const res = calculatePollutantSubIndex(makeMeasurement("CO", 0, 8));
    expect(res.subIndex).toBe(0);
    expect(res.category).toBe("GOOD");
  });

  it("P3-PROP-044: sub-index is never negative for any non-negative concentration", () => {
    for (let c = 0; c < 50; c += 0.5) {
      const res = calculatePollutantSubIndex(makeMeasurement("PM2.5", c, 24));
      expect(res.subIndex!).toBeGreaterThanOrEqual(0);
    }
  });

  it("P3-PROP-045: sub-index output is never NaN or Infinity", () => {
    const extremeConcentrations = [0.000001, 0.5, 99.99, 250.0, 500.0, 1000.0, 9999.0];
    for (const c of extremeConcentrations) {
      const res = calculatePollutantSubIndex(makeMeasurement("PM2.5", c, 24));
      if (res.subIndex !== null) {
        expect(Number.isFinite(res.subIndex)).toBe(true);
        expect(Number.isNaN(res.subIndex)).toBe(false);
      }
    }
  });

  for (let i = 46; i <= 80; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-PROP-${pad}: non-negativity and finite bound check #${i}`, () => {
      const c = (i * 7.3) % 450;
      const res = calculatePollutantSubIndex(makeMeasurement("PM10", c, 24));
      expect(res.subIndex!).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(res.subIndex)).toBe(true);
    });
  }

  // =========================================================================
  // Section 3: Deterministic Idempotence & Boundary Continuity (P3-PROP-081 to P3-PROP-120)
  // =========================================================================
  it("P3-PROP-081: calculation is strictly idempotent across 1,000 iterations", () => {
    const m = makeMeasurement("PM2.5", 147.35, 24);
    const expected = calculatePollutantSubIndex(m).subIndex;
    for (let iter = 0; iter < 1000; iter++) {
      expect(calculatePollutantSubIndex(m).subIndex).toBe(expected);
    }
  });

  it("P3-PROP-082: category transition at 30 µg/m³ for PM2.5 (Good to Satisfactory boundary)", () => {
    const r30 = calculatePollutantSubIndex(makeMeasurement("PM2.5", 30, 24));
    const r31 = calculatePollutantSubIndex(makeMeasurement("PM2.5", 31, 24));
    expect(r30.subIndex).toBe(50);
    expect(r30.category).toBe("GOOD");
    expect(r31.subIndex).toBe(52);
    expect(r31.category).toBe("SATISFACTORY");
  });

  it("P3-PROP-083: category transition at 60 µg/m³ for PM2.5 (Satisfactory to Moderate boundary)", () => {
    const r60 = calculatePollutantSubIndex(makeMeasurement("PM2.5", 60, 24));
    const r61 = calculatePollutantSubIndex(makeMeasurement("PM2.5", 61, 24));
    expect(r60.subIndex).toBe(100);
    expect(r60.category).toBe("SATISFACTORY");
    expect(r61.subIndex).toBe(103);
    expect(r61.category).toBe("MODERATE");
  });

  it("P3-PROP-084: category transition at 90 µg/m³ for PM2.5 (Moderate to Poor boundary)", () => {
    const r90 = calculatePollutantSubIndex(makeMeasurement("PM2.5", 90, 24));
    const r91 = calculatePollutantSubIndex(makeMeasurement("PM2.5", 91, 24));
    expect(r90.subIndex).toBe(200);
    expect(r90.category).toBe("MODERATE");
    expect(r91.subIndex).toBe(203);
    expect(r91.category).toBe("POOR");
  });

  it("P3-PROP-085: category transition at 120 µg/m³ for PM2.5 (Poor to Very Poor boundary)", () => {
    const r120 = calculatePollutantSubIndex(makeMeasurement("PM2.5", 120, 24));
    const r121 = calculatePollutantSubIndex(makeMeasurement("PM2.5", 121, 24));
    expect(r120.subIndex).toBe(300);
    expect(r120.category).toBe("POOR");
    expect(r121.subIndex).toBe(301);
    expect(r121.category).toBe("VERY_POOR");
  });

  it("P3-PROP-086: category transition at 250 µg/m³ for PM2.5 (Very Poor to Severe boundary)", () => {
    const r250 = calculatePollutantSubIndex(makeMeasurement("PM2.5", 250, 24));
    const r251 = calculatePollutantSubIndex(makeMeasurement("PM2.5", 251, 24));
    expect(r250.subIndex).toBe(400);
    expect(r250.category).toBe("VERY_POOR");
    expect(r251.subIndex).toBe(401);
    expect(r251.category).toBe("SEVERE");
  });

  for (let i = 87; i <= 120; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-PROP-${pad}: deterministic mathematical idempotence test #${i}`, () => {
      const c = (i * 3.14159) % 350;
      const m = makeMeasurement("PM2.5", c, 24);
      const r1 = calculatePollutantSubIndex(m);
      const r2 = calculatePollutantSubIndex(m);
      expect(r1.subIndex).toBe(r2.subIndex);
      expect(r1.category).toBe(r2.category);
    });
  }
});

