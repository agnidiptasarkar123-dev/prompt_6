import { describe, it, expect } from "vitest";
import { calculateStationCpcbAqi } from "@/domain/cpcb/cpcb-engine";
import { ValidatedAggregatedMeasurement } from "@/schemas/pollutant.schema";

describe("CPCB Station AQI Engine & Data Sufficiency Rules", () => {
  const baseTime = "2026-11-20T12:00:00Z";

  // Helper to create validated aggregated measurement
  const makeAgg = (
    stationId: string,
    pollutant: ValidatedAggregatedMeasurement["pollutant"],
    concentration: number,
    averagingWindowHours: 1 | 8 | 24 = 24,
    validHoursInWindow: number = averagingWindowHours,
    unit: ValidatedAggregatedMeasurement["unit"] = pollutant === "CO" ? "mg/m³" : "µg/m³",
    completenessPolicy: ValidatedAggregatedMeasurement["completenessPolicy"] = averagingWindowHours === 24 ? "OFFICIAL_CPCB_STATUTORY_16H" : "ADAPTED_HAWASAATHI_6H"
  ): ValidatedAggregatedMeasurement => ({
    brand: "VALIDATED_AGGREGATED_MEASUREMENT",
    stationId,
    pollutant,
    concentration,
    unit,
    averagingWindowHours,
    recordedAtUtc: baseTime,
    validHoursInWindow,
    isAggregationValidated: true,
    completenessPolicy
  });

  it("strictly enforces trusted aggregation boundary, rejecting raw unvalidated caller data", () => {
    // Unvalidated raw measurement missing the trusted aggregation brand
    const rawFakeData = [
      {
        pollutant: "PM2.5",
        concentration: 75,
        unit: "µg/m³",
        averagingWindowHours: 24,
        recordedAtUtc: baseTime,
        validHoursInWindow: 24
      } as unknown as ValidatedAggregatedMeasurement
    ];

    const result = calculateStationCpcbAqi("DELHI-001", rawFakeData, baseTime);
    expect(result.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(result.overallAqi).toBeNull();
    expect(result.explanation).toContain("Aggregation boundary violation");
  });

  it("strictly rejects cross-station measurement mixing in calculateStationCpcbAqi", () => {
    const measurements: ValidatedAggregatedMeasurement[] = [
      makeAgg("DELHI-001", "PM2.5", 75),
      makeAgg("NOIDA-002", "PM10", 120) // Cross-station mismatch!
    ];

    const result = calculateStationCpcbAqi("DELHI-001", measurements, baseTime);
    expect(result.stationId).toBe("DELHI-001");
    expect(result.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(result.overallAqi).toBeNull();
    expect(result.explanation).toContain("Cross-station aggregation rejected");
  });

  it("calculates overall AQI and selects dominant pollutant when sufficiency is met", () => {
    const measurements: ValidatedAggregatedMeasurement[] = [
      makeAgg("DELHI-001", "PM2.5", 75), // Moderate (~150)
      makeAgg("DELHI-001", "PM10", 280),  // Poor (~230)
      makeAgg("DELHI-001", "NO2", 45)     // Satisfactory (~56)
    ];

    const result = calculateStationCpcbAqi("DELHI-001", measurements, baseTime);

    expect(result.sufficiencyStatus).toBe("SUFFICIENT");
    expect(result.overallAqi).not.toBeNull();
    // PM10 at 280 gives sub-index in Poor range (~230), which is highest
    expect(result.prominentPollutant).toBe("PM10");
    expect(result.category).toBe("POOR");
    expect(result.subIndices.length).toBe(3);
    expect(result.completenessPolicy).toBe("OFFICIAL_CPCB_STATUTORY_16H");
    expect(result.explanation).toContain("AQI");
  });

  it("transparently marks completenessPolicy when using adapted 6-of-8 rule", () => {
    const measurements: ValidatedAggregatedMeasurement[] = [
      makeAgg("DELHI-001", "PM2.5", 75),
      makeAgg("DELHI-001", "PM10", 100),
      makeAgg("DELHI-001", "CO", 12.0, 8, 8, "mg/m³", "ADAPTED_HAWASAATHI_6H")
    ];

    const result = calculateStationCpcbAqi("DELHI-001", measurements, baseTime);
    expect(result.sufficiencyStatus).toBe("SUFFICIENT");
    expect(result.completenessPolicy).toBe("ADAPTED_HAWASAATHI_6H");
    expect(result.explanation).toContain("adapted 6-of-8 hour policy");
  });

  it("deduplicates multiple channels of the same pollutant before applying 3-pollutant rule", () => {
    // Two PM2.5 readings (e.g. dual redundant sensors) + one NO2 reading = only 2 unique pollutants!
    const measurements: ValidatedAggregatedMeasurement[] = [
      makeAgg("DELHI-002-DEDUP", "PM2.5", 70),
      makeAgg("DELHI-002-DEDUP", "PM2.5", 70), // Redundant second channel for PM2.5
      makeAgg("DELHI-002-DEDUP", "NO2", 40)
    ];

    const result = calculateStationCpcbAqi("DELHI-002-DEDUP", measurements, baseTime);
    // Since unique pollutants = 2 (PM2.5, NO2), overall AQI must be suppressed!
    expect(result.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(result.overallAqi).toBeNull();
    expect(result.subIndices.length).toBe(2); // Deduplicated to 2 unique pollutants
  });

  it("detects conflicting readings for the same pollutant and marks them", () => {
    // Conflicting readings: same pollutant, substantially different concentrations
    const measurements: ValidatedAggregatedMeasurement[] = [
      makeAgg("DELHI-CONFLICT", "PM2.5", 30),
      makeAgg("DELHI-CONFLICT", "PM2.5", 200), // Conflicting!
      makeAgg("DELHI-CONFLICT", "PM10", 100),
      makeAgg("DELHI-CONFLICT", "NO2", 40)
    ];

    const result = calculateStationCpcbAqi("DELHI-CONFLICT", measurements, baseTime);
    const pm25Sub = result.subIndices.find((s) => s.pollutant === "PM2.5");
    expect(pm25Sub).toBeDefined();
    expect(pm25Sub!.qualityFlag).toBe("CONFLICTING_MEASUREMENT");
  });

  it("strictly suppresses overall AQI if fewer than 3 pollutants are available", () => {
    const measurements: ValidatedAggregatedMeasurement[] = [
      makeAgg("DELHI-002", "PM2.5", 60),
      makeAgg("DELHI-002", "NO2", 30)
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
    const measurements: ValidatedAggregatedMeasurement[] = [
      makeAgg("DELHI-003", "NO2", 60),
      makeAgg("DELHI-003", "SO2", 50),
      makeAgg("DELHI-003", "CO", 1.5, 8, 8, "mg/m³")
    ];

    const result = calculateStationCpcbAqi("DELHI-003", measurements, baseTime);

    expect(result.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(result.overallAqi).toBeNull();
    expect(result.explanation).toContain("missing mandatory particulate parameter");
  });

  it("suppresses overall AQI if pollutants have insufficient running hours (<16h)", () => {
    const measurements: ValidatedAggregatedMeasurement[] = [
      makeAgg("DELHI-004", "PM2.5", 85, 24, 10), // Insufficient window (<16h)
      makeAgg("DELHI-004", "NO2", 50),
      makeAgg("DELHI-004", "SO2", 30)
    ];

    const result = calculateStationCpcbAqi("DELHI-004", measurements, baseTime);

    // PM2.5 had insufficient window, leaving only 2 valid sub-indices
    expect(result.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
    expect(result.overallAqi).toBeNull();
  });

  it("calculates AQI accurately when all 8 CPCB pollutants are reported", () => {
    const allEightMeasurements: ValidatedAggregatedMeasurement[] = [
      makeAgg("DELHI-ALL-8", "PM2.5", 150),
      makeAgg("DELHI-ALL-8", "PM10", 220),
      makeAgg("DELHI-ALL-8", "NO2", 45),
      makeAgg("DELHI-ALL-8", "SO2", 35),
      makeAgg("DELHI-ALL-8", "CO", 2.5, 8, 8, "mg/m³"),
      makeAgg("DELHI-ALL-8", "O3", 60, 8, 8),
      makeAgg("DELHI-ALL-8", "NH3", 120),
      makeAgg("DELHI-ALL-8", "Pb", 0.8)
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
