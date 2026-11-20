import { describe, it, expect } from "vitest";
import {
  aggregateRollingHourlyWindow,
  HourlyPollutantReading
} from "@/domain/cpcb/rolling-window-aggregator";

describe("Trusted Aggregation Boundary (Rolling-Window Aggregator)", () => {
  const stationId = "DELHI-DPCC-001";
  const now = "2026-11-20T12:00:00.000Z";
  const nowMs = new Date(now).getTime();

  // Helper to generate n consecutive hourly readings backwards from now
  const generateHourlySeries = (
    count: number,
    baseConcentration: number = 75,
    pollutant: "PM2.5" | "PM10" | "CO" = "PM2.5"
  ): HourlyPollutantReading[] => {
    const list: HourlyPollutantReading[] = [];
    for (let i = 0; i < count; i++) {
      const timeMs = nowMs - i * 3600 * 1000;
      list.push({
        readingId: `read-${i}`,
        stationId,
        pollutant,
        concentration: baseConcentration + (i % 5),
        unit: pollutant === "CO" ? "mg/m³" : "µg/m³",
        timestampUtc: new Date(timeMs).toISOString()
      });
    }
    return list;
  };

  it("strictly rejects cross-station measurement mixing at the aggregation boundary", () => {
    const readings: HourlyPollutantReading[] = [
      {
        readingId: "r1",
        stationId: "STATION-A",
        pollutant: "PM2.5",
        concentration: 60,
        unit: "µg/m³",
        timestampUtc: now
      },
      {
        readingId: "r2",
        stationId: "STATION-B", // Different station!
        pollutant: "PM2.5",
        concentration: 70,
        unit: "µg/m³",
        timestampUtc: new Date(nowMs - 3600 * 1000).toISOString()
      }
    ];

    const result = aggregateRollingHourlyWindow("STATION-A", "PM2.5", readings, 24, now);
    expect(result.diagnostics.isCrossStationRejected).toBe(true);
    expect(result.isSufficient).toBe(false);
    expect(result.rollingAverageConcentration).toBeNull();
    expect(result.qualityFlag).toBe("INVALID_SENSOR_READING");
    expect(result.measurement).toBeNull();
  });

  it("filters readings matching only the target pollutant", () => {
    const readings: HourlyPollutantReading[] = [
      ...generateHourlySeries(18, 50, "PM2.5"),
      {
        readingId: "r-co",
        stationId,
        pollutant: "CO",
        concentration: 1.5,
        unit: "mg/m³",
        timestampUtc: now
      }
    ];

    const result = aggregateRollingHourlyWindow(stationId, "PM2.5", readings, 24, now);
    expect(result.isSufficient).toBe(true);
    expect(result.validHoursCount).toBe(18);
    expect(result.pollutant).toBe("PM2.5");
  });

  it("discards negative, non-finite, calibrating, future, and invalid-timestamp readings", () => {
    const validSeries = generateHourlySeries(16, 80, "PM2.5");
    const corruptedReadings: HourlyPollutantReading[] = [
      ...validSeries,
      {
        readingId: "r-neg",
        stationId,
        pollutant: "PM2.5",
        concentration: -999, // Negative sensor error
        unit: "µg/m³",
        timestampUtc: new Date(nowMs - 17 * 3600 * 1000).toISOString()
      },
      {
        readingId: "r-nan",
        stationId,
        pollutant: "PM2.5",
        concentration: NaN,
        unit: "µg/m³",
        timestampUtc: new Date(nowMs - 18 * 3600 * 1000).toISOString()
      },
      {
        readingId: "r-inf",
        stationId,
        pollutant: "PM2.5",
        concentration: Infinity,
        unit: "µg/m³",
        timestampUtc: new Date(nowMs - 19 * 3600 * 1000).toISOString()
      },
      {
        readingId: "r-calib",
        stationId,
        pollutant: "PM2.5",
        concentration: 20,
        unit: "µg/m³",
        isCalibratingOrFault: true, // Maintenance mode
        timestampUtc: new Date(nowMs - 20 * 3600 * 1000).toISOString()
      },
      {
        readingId: "r-future",
        stationId,
        pollutant: "PM2.5",
        concentration: 85,
        unit: "µg/m³",
        timestampUtc: new Date(nowMs + 60 * 60 * 1000).toISOString() // 1 hour in the future!
      },
      {
        readingId: "r-badtime",
        stationId,
        pollutant: "PM2.5",
        concentration: 85,
        unit: "µg/m³",
        timestampUtc: "INVALID_DATE_STRING"
      }
    ];

    const result = aggregateRollingHourlyWindow(stationId, "PM2.5", corruptedReadings, 24, now);
    expect(result.diagnostics.discardedFaultOrNegativeCount).toBe(6);
    expect(result.isSufficient).toBe(true);
    expect(result.validHoursCount).toBe(16);
  });

  it("handles duplicate timestamps by keeping one when values match, and flags CONFLICTING_MEASUREMENT when values differ", () => {
    const timestampA = new Date(nowMs - 3600 * 1000).toISOString();
    const timestampB = new Date(nowMs - 2 * 3600 * 1000).toISOString();

    // Exact duplicate test
    const duplicateReadings: HourlyPollutantReading[] = [
      ...generateHourlySeries(16, 70, "PM2.5"),
      {
        readingId: "dup-1",
        stationId,
        pollutant: "PM2.5",
        concentration: 71, // Matches concentration at i=1 (70 + (1 % 5))
        unit: "µg/m³",
        timestampUtc: timestampA
      }
    ];
    const resDup = aggregateRollingHourlyWindow(stationId, "PM2.5", duplicateReadings, 24, now);
    expect(resDup.diagnostics.discardedDuplicatesCount).toBe(1);
    expect(resDup.diagnostics.conflictingReadingsCount).toBe(0);
    expect(resDup.qualityFlag).toBe("VERIFIED");

    // Conflicting measurement test (same timestamp, different concentration)
    const conflictingReadings: HourlyPollutantReading[] = [
      ...generateHourlySeries(16, 70, "PM2.5"),
      {
        readingId: "conflict-1",
        stationId,
        pollutant: "PM2.5",
        concentration: 180, // Very different from existing reading at timestampB!
        unit: "µg/m³",
        timestampUtc: timestampB
      }
    ];
    const resConflict = aggregateRollingHourlyWindow(stationId, "PM2.5", conflictingReadings, 24, now);
    expect(resConflict.diagnostics.conflictingReadingsCount).toBe(1);
    expect(resConflict.qualityFlag).toBe("CONFLICTING_MEASUREMENT");
    expect(resConflict.isSufficient).toBe(false);
    expect(resConflict.rollingAverageConcentration).toBeNull();
  });

  it("enforces statutory 16h requirement for 24h window (PM2.5/PM10)", () => {
    // 15 hours -> INSUFFICIENT_WINDOW
    const series15 = generateHourlySeries(15, 60, "PM2.5");
    const res15 = aggregateRollingHourlyWindow(stationId, "PM2.5", series15, 24, now);
    expect(res15.isSufficient).toBe(false);
    expect(res15.validHoursCount).toBe(15);
    expect(res15.qualityFlag).toBe("INSUFFICIENT_WINDOW");
    expect(res15.rollingAverageConcentration).toBeNull();
    expect(res15.measurement).toBeNull();

    // 16 hours -> SUFFICIENT and computes verified rolling average
    const series16 = generateHourlySeries(16, 60, "PM2.5");
    const res16 = aggregateRollingHourlyWindow(stationId, "PM2.5", series16, 24, now);
    expect(res16.isSufficient).toBe(true);
    expect(res16.validHoursCount).toBe(16);
    expect(res16.qualityFlag).toBe("VERIFIED");
    expect(res16.rollingAverageConcentration).toBeGreaterThanOrEqual(60);
    expect(res16.measurement).not.toBeNull();
    expect(res16.measurement?.validHoursInWindow).toBe(16);
  });

  it("enforces secondary adapted 6h requirement for 8h window (CO)", () => {
    // 5 hours -> INSUFFICIENT
    const series5 = generateHourlySeries(5, 2.0, "CO");
    const res5 = aggregateRollingHourlyWindow(stationId, "CO", series5, 8, now);
    expect(res5.isSufficient).toBe(false);
    expect(res5.validHoursCount).toBe(5);
    expect(res5.qualityFlag).toBe("INSUFFICIENT_WINDOW");

    // 6 hours -> SUFFICIENT
    const series6 = generateHourlySeries(6, 2.0, "CO");
    const res6 = aggregateRollingHourlyWindow(stationId, "CO", series6, 8, now);
    expect(res6.isSufficient).toBe(true);
    expect(res6.validHoursCount).toBe(6);
    expect(res6.qualityFlag).toBe("VERIFIED");
  });

  it("accurately detects stale observations beyond the threshold", () => {
    // Latest reading is 5 hours old (300 minutes > 240 minute threshold)
    const oldReadings: HourlyPollutantReading[] = [];
    for (let i = 5; i < 22; i++) {
      oldReadings.push({
        readingId: `old-${i}`,
        stationId,
        pollutant: "PM10",
        concentration: 120,
        unit: "µg/m³",
        timestampUtc: new Date(nowMs - i * 3600 * 1000).toISOString()
      });
    }

    const res = aggregateRollingHourlyWindow(stationId, "PM10", oldReadings, 24, now, 240);
    expect(res.isStale).toBe(true);
    expect(res.ageMinutes).toBeGreaterThan(240);
    expect(res.qualityFlag).toBe("STALE");
  });

  it("handles empty reading sets safely", () => {
    const res = aggregateRollingHourlyWindow(stationId, "PM2.5", [], 24, now);
    expect(res.validHoursCount).toBe(0);
    expect(res.isSufficient).toBe(false);
    expect(res.earliestReadingUtc).toBeNull();
    expect(res.latestReadingUtc).toBeNull();
    expect(res.ageMinutes).toBe(Infinity);
    expect(res.isStale).toBe(true);
    expect(res.qualityFlag).toBe("INSUFFICIENT_WINDOW");
  });
});
