import { describe, it, expect } from "vitest";
import { calculateStationCpcbAqi } from "@/domain/cpcb/cpcb-engine";
import { RawPollutantMeasurement } from "@/schemas/pollutant.schema";

describe("CPCB Station AQI Engine & Data Sufficiency Rules", () => {
  const baseTime = "2026-11-20T12:00:00Z";

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
    // PM10 at 280 gives sub-index in Poor range (approx 230), which is highest
    expect(result.prominentPollutant).toBe("PM10");
    expect(result.category).toBe("POOR");
    expect(result.subIndices.length).toBe(3);
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
      // Only 2 pollutants!
    ];

    const result = calculateStationCpcbAqi("DELHI-002", measurements, baseTime);

    expect(result.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(result.overallAqi).toBeNull();
    expect(result.category).toBeNull();
    expect(result.prominentPollutant).toBeNull();
    expect(result.explanation).toContain("fewer than 3 valid pollutants");
    expect(result.subIndices.length).toBe(2); // Individual sub-indices are preserved!
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
      // 3 pollutants, but NO PM2.5 or PM10!
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

    // Since PM2.5 had an insufficient window, its subIndex is null, leaving only 2 valid sub-indices
    expect(result.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(result.overallAqi).toBeNull();
  });
});
