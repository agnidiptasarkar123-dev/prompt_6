import { describe, it, expect } from "vitest";
import { calculateStationCpcbAqi } from "@/domain/cpcb/cpcb-engine";
import { RawPollutantMeasurement } from "@/schemas/pollutant.schema";

describe("CPCB Station AQI Engine & Data Sufficiency Rules", () => {
  const baseTime = "2026-11-20T12:00:00Z";

  it("strictly rejects cross-station measurement mixing in calculateStationCpcbAqi", () => {
    const measurements: (RawPollutantMeasurement & { stationId?: string })[] = [
      {
        stationId: "DELHI-001",
        pollutant: "PM2.5",
        concentration: 75,
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      },
      {
        stationId: "NOIDA-002", // Cross-station mismatch!
        pollutant: "PM10",
        concentration: 120,
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      }
    ];

    const result = calculateStationCpcbAqi("DELHI-001", measurements, baseTime);
    expect(result.stationId).toBe("DELHI-001");
    expect(result.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(result.overallAqi).toBeNull();
    expect(result.explanation).toContain("Cross-station aggregation rejected");
  });

  it("calculates overall AQI and selects dominant pollutant when sufficiency is met", () => {
    const measurements: RawPollutantMeasurement[] = [
      {
        pollutant: "PM2.5",
        concentration: 75, // Moderate (~150)
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      },
      {
        pollutant: "PM10",
        concentration: 280, // Poor (~230)
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      },
      {
        pollutant: "NO2",
        concentration: 45, // Satisfactory (~56)
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      }
    ];

    const result = calculateStationCpcbAqi("DELHI-001", measurements, baseTime);

    expect(result.sufficiencyStatus).toBe("SUFFICIENT");
    expect(result.overallAqi).not.toBeNull();
    // PM10 at 280 gives sub-index in Poor range (~230), which is highest
    expect(result.prominentPollutant).toBe("PM10");
    expect(result.category).toBe("POOR");
    expect(result.subIndices.length).toBe(3);
    expect(result.explanation).toContain("AQI");
  });

  it("deduplicates multiple channels of the same pollutant before applying 3-pollutant rule", () => {
    // Two PM2.5 readings (e.g. dual redundant sensors) + one NO2 reading = only 2 unique pollutants!
    const measurements: RawPollutantMeasurement[] = [
      {
        pollutant: "PM2.5",
        concentration: 70,
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      },
      {
        pollutant: "PM2.5", // Redundant second channel for PM2.5
        concentration: 70,
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      },
      {
        pollutant: "NO2",
        concentration: 40,
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      }
    ];

    const result = calculateStationCpcbAqi("DELHI-002-DEDUP", measurements, baseTime);
    // Since unique pollutants = 2 (PM2.5, NO2), overall AQI must be suppressed!
    expect(result.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(result.overallAqi).toBeNull();
    expect(result.subIndices.length).toBe(2); // Deduplicated to 2 unique pollutants
  });

  it("detects conflicting readings for the same pollutant and marks them", () => {
    // Conflicting readings: same pollutant, substantially different sub-indices
    const measurements: RawPollutantMeasurement[] = [
      {
        pollutant: "PM2.5",
        concentration: 30, // Good (Sub-index 50)
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      },
      {
        pollutant: "PM2.5",
        concentration: 200, // Very Poor (Sub-index 350) - conflicting!
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      },
      {
        pollutant: "PM10",
        concentration: 100,
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      },
      {
        pollutant: "NO2",
        concentration: 40,
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      }
    ];

    const result = calculateStationCpcbAqi("DELHI-CONFLICT", measurements, baseTime);
    const pm25Sub = result.subIndices.find((s) => s.pollutant === "PM2.5");
    expect(pm25Sub).toBeDefined();
    expect(pm25Sub!.qualityFlag).toBe("CONFLICTING_MEASUREMENT");
  });

  it("strictly suppresses overall AQI if fewer than 3 pollutants are available", () => {
    const measurements: RawPollutantMeasurement[] = [
      {
        pollutant: "PM2.5",
        concentration: 60,
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      },
      {
        pollutant: "NO2",
        concentration: 30,
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      }
    ];

    const result = calculateStationCpcbAqi("DELHI-002", measurements, baseTime);

    expect(result.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(result.overallAqi).toBeNull();
    expect(result.category).toBeNull();
    expect(result.prominentPollutant).toBeNull();
    expect(result.explanation).toContain("fewer than 3 distinct valid pollutants");
    expect(result.subIndices.length).toBe(2);
  });

  it("strictly suppresses overall AQI if 3 pollutants exist but PM2.5 and PM10 are missing", () => {
    const measurements: RawPollutantMeasurement[] = [
      {
        pollutant: "NO2",
        concentration: 60,
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      },
      {
        pollutant: "SO2",
        concentration: 50,
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      },
      {
        pollutant: "CO",
        concentration: 1.5,
        unit: "mg/m³",
        averagingWindowHours: 8,
        recordedAtUtc: baseTime,
        validHoursInWindow: 8
      }
    ];

    const result = calculateStationCpcbAqi("DELHI-003", measurements, baseTime);

    expect(result.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(result.overallAqi).toBeNull();
    expect(result.explanation).toContain("missing mandatory particulate parameter");
  });

  it("suppresses overall AQI if pollutants have insufficient running hours (<16h)", () => {
    const measurements: RawPollutantMeasurement[] = [
      {
        pollutant: "PM2.5",
        concentration: 85,
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 10 // Insufficient window (<16h)
      },
      {
        pollutant: "NO2",
        concentration: 50,
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      },
      {
        pollutant: "SO2",
        concentration: 30,
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      }
    ];

    const result = calculateStationCpcbAqi("DELHI-004", measurements, baseTime);

    // PM2.5 had insufficient window, leaving only 2 valid sub-indices
    expect(result.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(result.overallAqi).toBeNull();
  });

  it("calculates AQI accurately when all 8 CPCB pollutants are reported", () => {
    const allEightMeasurements: RawPollutantMeasurement[] = [
      { pollutant: "PM2.5", concentration: 150, unit: "µg/m³", averagingWindowHours: 24, recordedAtUtc: baseTime, validHoursInWindow: 24 },
      { pollutant: "PM10", concentration: 220, unit: "µg/m³", averagingWindowHours: 24, recordedAtUtc: baseTime, validHoursInWindow: 24 },
      { pollutant: "NO2", concentration: 45, unit: "µg/m³", averagingWindowHours: 24, recordedAtUtc: baseTime, validHoursInWindow: 24 },
      { pollutant: "SO2", concentration: 35, unit: "µg/m³", averagingWindowHours: 24, recordedAtUtc: baseTime, validHoursInWindow: 24 },
      { pollutant: "CO", concentration: 2.5, unit: "mg/m³", averagingWindowHours: 8, recordedAtUtc: baseTime, validHoursInWindow: 8 },
      { pollutant: "O3", concentration: 60, unit: "µg/m³", averagingWindowHours: 8, recordedAtUtc: baseTime, validHoursInWindow: 8 },
      { pollutant: "NH3", concentration: 120, unit: "µg/m³", averagingWindowHours: 24, recordedAtUtc: baseTime, validHoursInWindow: 24 },
      { pollutant: "Pb", concentration: 0.8, unit: "µg/m³", averagingWindowHours: 24, recordedAtUtc: baseTime, validHoursInWindow: 24 }
    ];

    const result = calculateStationCpcbAqi("DELHI-ALL-8", allEightMeasurements, baseTime);
    expect(result.sufficiencyStatus).toBe("SUFFICIENT");
    expect(result.subIndices.length).toBe(8);
    expect(result.overallAqi).not.toBeNull();
    // PM2.5 at 150 is in Very Poor (approx 323), higher than PM10 at 220 (approx 180)
    expect(result.prominentPollutant).toBe("PM2.5");
    expect(result.category).toBe("VERY_POOR");
  });
});
