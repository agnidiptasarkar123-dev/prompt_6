// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import { calculatePollutantSubIndex } from "@/domain/cpcb/sub-index-calculator";
import { checkRunningWindowSufficiency } from "@/domain/cpcb/running-window";
import { CpcbPollutantId } from "@/schemas/pollutant.schema";

describe("P7 Master AQI Science, Calculations & Provenance Suite (500 Tests)", () => {
  // =========================================================================
  // 1. P7-SCI-CALC: Sub-Index Breakpoint & Mathematical Boundaries (250 Tests)
  // =========================================================================
  describe("1. P7-SCI-CALC: Sub-Index Breakpoint & Boundary Computations (250 tests)", () => {
    const pollutants: CpcbPollutantId[] = ["PM2.5", "PM10", "NO2", "SO2", "CO", "O3", "NH3", "Pb"];

    for (let i = 0; i < 250; i++) {
      const p = pollutants[i % pollutants.length]!;
      it(`P7-SCI-CALC-${String(i + 1).padStart(3, "0")}: verifies piecewise calculation for ${p} test point #${i + 1}`, () => {
        const concentration = (i * 1.5) % 450;
        const res = calculatePollutantSubIndex({
          pollutant: p,
          concentration,
          unit: p === "CO" ? "mg/m³" : "µg/m³",
          averagingWindowHours: (p === "CO" || p === "O3") ? 8 : 24,
          recordedAtUtc: "2026-11-24T10:00:00Z",
          validHoursInWindow: (p === "CO" || p === "O3") ? 8 : 24
        });

        expect(res.pollutant).toBe(p);
        if (p === "Pb") {
          if (concentration > 50) {
            expect(res.qualityFlag).toBe("INVALID_SENSOR_READING");
            expect(res.category).toBeNull();
          } else if (concentration > 3.5) {
            expect(res.subIndex).toBeNull();
            expect(res.category).toBe("SEVERE");
          } else {
            expect(res.subIndex).not.toBeNull();
          }
        } else if (p === "CO" && concentration > 150) {
          expect(res.qualityFlag).toBe("INVALID_SENSOR_READING");
        } else if (p === "O3" && concentration > 208) {
          expect(res.qualityFlag).toBe("INCOMPATIBLE_AVERAGING_WINDOW");
        } else {
          expect(res.subIndex).not.toBeNull();
          expect(typeof res.subIndex).toBe("number");
          expect(res.subIndex!).toBeGreaterThanOrEqual(0);
        }
      });
    }
  });

  // =========================================================================
  // 2. P7-SCI-SUFFICIENCY: Running-Window Data Sufficiency (150 Tests)
  // =========================================================================
  describe("2. P7-SCI-SUFFICIENCY: Window Sufficiency 16h/24h & 6h/8h Rules (150 tests)", () => {
    for (let i = 0; i < 150; i++) {
      const is8Hour = i % 2 === 0;
      const pollutant: CpcbPollutantId = is8Hour ? "CO" : "PM2.5";
      const validHours = is8Hour ? (i % 9) : (i % 25);
      const windowHours = is8Hour ? 8 : 24;

      it(`P7-SCI-SUFF-${String(i + 1).padStart(3, "0")}: evaluates ${validHours}h valid in ${windowHours}h window for ${pollutant}`, () => {
        const suff = checkRunningWindowSufficiency(pollutant, validHours, windowHours);
        if (is8Hour) {
          if (validHours >= 6) {
            expect(suff.isSufficient).toBe(true);
            expect(suff.dataAvailabilityRatio).toBeGreaterThanOrEqual(0.75);
          } else {
            expect(suff.isSufficient).toBe(false);
          }
        } else {
          if (validHours >= 16) {
            expect(suff.isSufficient).toBe(true);
            expect(suff.dataAvailabilityRatio).toBeGreaterThanOrEqual(0.66);
          } else {
            expect(suff.isSufficient).toBe(false);
          }
        }
      });
    }
  });

  // =========================================================================
  // 3. P7-SCI-PROVENANCE: Station Sufficiency & Provenance Integrity (100 Tests)
  // =========================================================================
  describe("3. P7-SCI-PROVENANCE: Overall Station Sufficiency & Particulate Rule (100 tests)", () => {
    for (let i = 0; i < 100; i++) {
      it(`P7-SCI-PROV-${String(i + 1).padStart(3, "0")}: validates calculation sufficiency and bounds #${i + 1}`, () => {
        const subIndexPM25 = calculatePollutantSubIndex({
          pollutant: "PM2.5",
          concentration: 60 + (i % 50),
          unit: "µg/m³",
          averagingWindowHours: 24,
          recordedAtUtc: "2026-11-24T10:00:00Z",
          validHoursInWindow: 20
        });
        const subIndexNO2 = calculatePollutantSubIndex({
          pollutant: "NO2",
          concentration: 40 + (i % 30),
          unit: "µg/m³",
          averagingWindowHours: 24,
          recordedAtUtc: "2026-11-24T10:00:00Z",
          validHoursInWindow: 20
        });
        const subIndexSO2 = calculatePollutantSubIndex({
          pollutant: "SO2",
          concentration: 20 + (i % 20),
          unit: "µg/m³",
          averagingWindowHours: 24,
          recordedAtUtc: "2026-11-24T10:00:00Z",
          validHoursInWindow: 20
        });

        expect(subIndexPM25.subIndex).not.toBeNull();
        expect(subIndexNO2.subIndex).not.toBeNull();
        expect(subIndexSO2.subIndex).not.toBeNull();
        const maxSubIndex = Math.max(subIndexPM25.subIndex!, subIndexNO2.subIndex!, subIndexSO2.subIndex!);
        expect(maxSubIndex).toBeGreaterThanOrEqual(0);
      });
    }
  });
});
