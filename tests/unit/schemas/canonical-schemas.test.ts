import { describe, it, expect } from "vitest";
import {
  RawPollutantMeasurementSchema,
  ValidatedAggregatedMeasurementSchema,
  CpcbPollutantIdSchema
} from "@/schemas/pollutant.schema";
import { ObservationQualityFlagSchema, ObservationFreshnessSchema } from "@/schemas/freshness.schema";
import { DataTypologySchema, DataSourceProviderSchema, DataProvenanceRecordSchema } from "@/schemas/provenance.schema";
import { CpcbCategorySchema, CpcbSubIndexSchema, CpcbAqiResultSchema } from "@/schemas/cpcb.schema";
import { ForecastHourlyStepSchema, ModelForecastSchema } from "@/schemas/forecast.schema";
import { AirQualityObservationSnapshotSchema } from "@/schemas/air-quality.schema";
import { AgeBracketSchema, SelfReportedSensitivitiesSchema, HouseholdMemberSchema } from "@/schemas/household.schema";
import { TransitModeSchema, PhysicalIntensitySchema, RoutineActivitySchema } from "@/schemas/routine.schema";
import { DwellingContextSchema, HouseholdContextSchema } from "@/schemas/user-context.schema";
import { RecommendationResponseSchema } from "@/schemas/recommendation.schema";

describe("Canonical Domain Schemas (Zod Boundary Validation)", () => {
  it("validates pollutant and measurement schemas", () => {
    expect(CpcbPollutantIdSchema.safeParse("PM2.5").success).toBe(true);
    expect(CpcbPollutantIdSchema.safeParse("CO").success).toBe(true);
    expect(CpcbPollutantIdSchema.safeParse("INVALID").success).toBe(false);

    const validMeasurement = {
      pollutant: "PM2.5",
      concentration: 125.4,
      unit: "µg/m³",
      averagingWindowHours: 24,
      validHoursInWindow: 18,
      recordedAtUtc: new Date().toISOString()
    };
    expect(RawPollutantMeasurementSchema.safeParse(validMeasurement).success).toBe(true);

    const invalidMeasurement = {
      pollutant: "PM2.5",
      concentration: -5, // Negative forbidden
      unit: "µg/m³",
      averagingWindowHours: 24,
      validHoursInWindow: 18,
      recordedAtUtc: new Date().toISOString()
    };
    expect(RawPollutantMeasurementSchema.safeParse(invalidMeasurement).success).toBe(false);

    const validAgg = {
      brand: "VALIDATED_AGGREGATED_MEASUREMENT",
      pollutant: "PM2.5",
      concentration: 55,
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: new Date().toISOString(),
      validHoursInWindow: 20,
      stationId: "DELHI-001",
      isAggregationValidated: true,
      completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H"
    };
    expect(ValidatedAggregatedMeasurementSchema.safeParse(validAgg).success).toBe(true);

    const invalidAgg = {
      ...validAgg,
      brand: "RAW_UNVALIDATED"
    };
    expect(ValidatedAggregatedMeasurementSchema.safeParse(invalidAgg).success).toBe(false);
  });

  it("validates freshness and quality flag schemas", () => {
    expect(ObservationQualityFlagSchema.safeParse("VERIFIED").success).toBe(true);
    expect(ObservationQualityFlagSchema.safeParse("SUSPECT_EXTREME").success).toBe(true);
    expect(ObservationQualityFlagSchema.safeParse("FABRICATED").success).toBe(false);

    const freshness = {
      observationTimestampUtc: new Date().toISOString(),
      retrievalTimestampUtc: new Date().toISOString(),
      ageMinutes: 5,
      isCached: false,
      qualityFlag: "VERIFIED"
    };
    expect(ObservationFreshnessSchema.safeParse(freshness).success).toBe(true);
  });

  it("validates provenance and 4-way typology schemas", () => {
    expect(DataTypologySchema.safeParse("TYPE_A_OFFICIAL_AQI").success).toBe(true);
    expect(DataTypologySchema.safeParse("TYPE_B_CALCULATED_AQI").success).toBe(true);
    expect(DataTypologySchema.safeParse("TYPE_C_RAW_SENSOR").success).toBe(true);
    expect(DataTypologySchema.safeParse("TYPE_D_MODEL_FORECAST").success).toBe(true);
    expect(DataTypologySchema.safeParse("TYPE_E_MOCK").success).toBe(false);

    expect(DataSourceProviderSchema.safeParse("CPCB_CAAQMS").success).toBe(true);
    expect(DataSourceProviderSchema.safeParse("OPENAQ").success).toBe(true);
    expect(DataSourceProviderSchema.safeParse("OPEN_METEO_CAMS").success).toBe(true);
    expect(DataSourceProviderSchema.safeParse("UNKNOWN_SOURCE").success).toBe(false);

    const provenance = {
      provenanceId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6a",
      stationId: "site_301",
      stationName: "Anand Vihar, Delhi - DPCC",
      city: "Delhi",
      state: "Delhi",
      coordinates: {
        latitude: 28.6508,
        longitude: 77.3152
      },
      provider: "CPCB_CAAQMS",
      typology: "TYPE_A_OFFICIAL_AQI",
      observationTimestampUtc: new Date().toISOString(),
      retrievalTimestampUtc: new Date().toISOString(),
      isCached: false,
      cacheAgeMinutes: 0,
      attributionNotice: "Central Pollution Control Board (CPCB) via data.gov.in (OGDL-India)"
    };
    expect(DataProvenanceRecordSchema.safeParse(provenance).success).toBe(true);
  });

  it("validates CPCB category and AQI result schemas", () => {
    expect(CpcbCategorySchema.safeParse("GOOD").success).toBe(true);
    expect(CpcbCategorySchema.safeParse("SEVERE").success).toBe(true);
    expect(CpcbCategorySchema.safeParse("HAZARDOUS").success).toBe(false); // CPCB tops at SEVERE

    const subIndexSample = {
      pollutant: "PM2.5",
      concentration: 135,
      unit: "µg/m³",
      subIndex: 312,
      rawMathematicalSubIndex: 311.54,
      category: "VERY_POOR",
      windowHours: 24,
      validHours: 20,
      qualityFlag: "VERIFIED",
      isBeyondNominalScale: false,
      reportingCeilingCappedAqi: 312
    };
    expect(CpcbSubIndexSchema.safeParse(subIndexSample).success).toBe(true);

    const validResult = {
      stationId: "site_301",
      calculatedAtUtc: new Date().toISOString(),
      overallAqi: 312,
      rawMathematicalAqi: 311.54,
      category: "VERY_POOR",
      prominentPollutant: "PM2.5",
      sufficiencyStatus: "SUFFICIENT",
      completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
      subIndices: [subIndexSample],
      isBeyondNominalScale: false,
      reportingCeilingCappedAqi: 312,
      explanation: "AQI 312 driven by PM2.5 sub-index."
    };
    expect(CpcbAqiResultSchema.safeParse(validResult).success).toBe(true);
  });

  it("validates air quality observation snapshot schema", () => {
    const subIndexSample = {
      pollutant: "PM2.5",
      concentration: 150,
      unit: "µg/m³",
      subIndex: 323,
      rawMathematicalSubIndex: 323.08,
      category: "VERY_POOR",
      windowHours: 24,
      validHours: 20,
      qualityFlag: "VERIFIED",
      isBeyondNominalScale: false,
      reportingCeilingCappedAqi: 323
    };

    const snapshot = {
      provenance: {
        provenanceId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6b",
        stationId: "site_301",
        stationName: "Anand Vihar",
        city: "Delhi",
        state: "Delhi",
        coordinates: { latitude: 28.65, longitude: 77.31 },
        provider: "CPCB_CAAQMS",
        typology: "TYPE_B_CALCULATED_AQI",
        observationTimestampUtc: new Date().toISOString(),
        retrievalTimestampUtc: new Date().toISOString(),
        isCached: false,
        cacheAgeMinutes: 0,
        attributionNotice: "CPCB via data.gov.in"
      },
      cpcbResult: {
        stationId: "site_301",
        calculatedAtUtc: new Date().toISOString(),
        overallAqi: 323,
        rawMathematicalAqi: 323.08,
        category: "VERY_POOR",
        prominentPollutant: "PM2.5",
        sufficiencyStatus: "SUFFICIENT",
        completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
        subIndices: [subIndexSample],
        isBeyondNominalScale: false,
        reportingCeilingCappedAqi: 323,
        explanation: "AQI 323"
      },
      rawMeasurements: [
        {
          pollutant: "PM2.5",
          concentration: 150,
          unit: "µg/m³",
          averagingWindowHours: 24,
          recordedAtUtc: new Date().toISOString(),
          validHoursInWindow: 20
        }
      ]
    };
    expect(AirQualityObservationSnapshotSchema.safeParse(snapshot).success).toBe(true);
  });

  it("validates forecast schemas", () => {
    const hourlyStep = {
      timestampUtc: new Date().toISOString(),
      pm10: 215.0,
      pm2_5: 110.2,
      carbonMonoxide: 1.2,
      nitrogenDioxide: 45.0,
      sulphurDioxide: 12.0,
      ozone: 35.0,
      dust: 15.0
    };
    expect(ForecastHourlyStepSchema.safeParse(hourlyStep).success).toBe(true);

    const forecast = {
      forecastId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6c",
      modelName: "CAMS_GLOBAL",
      gridResolutionKm: 45,
      generatedAtUtc: new Date().toISOString(),
      coordinates: {
        latitude: 28.6139,
        longitude: 77.209
      },
      disclaimer: "ECMWF CAMS ~45km grid global atmospheric dispersion model.",
      hourlySteps: [hourlyStep]
    };
    expect(ModelForecastSchema.safeParse(forecast).success).toBe(true);
  });

  it("validates dynamic user context and dwelling schemas without fixed persona enums", () => {
    expect(AgeBracketSchema.safeParse("CHILD_3_12").success).toBe(true);
    expect(AgeBracketSchema.safeParse("INVALID_AGE").success).toBe(false);

    expect(SelfReportedSensitivitiesSchema.safeParse({ respiratorySensitivity: true }).success).toBe(true);

    expect(TransitModeSchema.safeParse("METRO_TRAIN").success).toBe(true);
    expect(TransitModeSchema.safeParse("MAGIC_CARPET").success).toBe(false);

    expect(PhysicalIntensitySchema.safeParse("VIGOROUS").success).toBe(true);
    expect(PhysicalIntensitySchema.safeParse("SUPERHUMAN").success).toBe(false);

    const memberId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
    const member = {
      id: memberId,
      nickname: "Pooja",
      ageBracket: "ADULT_18_59",
      sensitivities: {
        respiratorySensitivity: false,
        cardiovascularSensitivity: false,
        pregnancy: true,
        allergiesOrSinusitis: true
      },
      dailyOutdoorHoursEstimate: 2.5
    };
    expect(HouseholdMemberSchema.safeParse(member).success).toBe(true);

    const routineActivity = {
      activityId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb71",
      label: "Morning Walk",
      memberIds: [memberId],
      locationType: "OUTDOOR",
      transitMode: "WALKING",
      physicalIntensity: "MODERATE",
      timeWindow: {
        startMinuteOfDay: 420,
        durationMinutes: 45
      },
      flexibility: {
        canShiftEarlierMinutes: 0,
        canShiftLaterMinutes: 30,
        canSubstituteWithIndoorAlternative: true,
        canChangeTransitMode: false
      }
    };
    expect(RoutineActivitySchema.safeParse(routineActivity).success).toBe(true);

    const dwelling = {
      dwellingType: "APARTMENT_HIGH_RISE",
      floorLevel: 14,
      proximityToMajorRoadMeters: 150,
      cooking: {
        primaryFuel: "PIPED_NATURAL_GAS",
        kitchenVentilation: "KITCHEN_HOOD_CHIMNEY",
        averageDailyCookingHours: 1.5
      },
      indoorSources: {
        incenseOrDhoopDaily: false,
        mosquitoCoilUsage: false,
        indoorSmoking: false,
        unventedGasHeater: false
      },
      filtration: {
        hasAirPurifier: true,
        purifierLocations: ["Master Bedroom", "Living Room"],
        filterType: "TRUE_HEPA_H13",
        cleanAirDeliveryRateCadrM3H: 350
      },
      windowSealingQuality: "WELL_SEALED"
    };
    expect(DwellingContextSchema.safeParse(dwelling).success).toBe(true);

    const household = {
      householdId: "0b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6e",
      updatedAt: new Date().toISOString(),
      preferredLanguage: "hi",
      dwelling,
      members: [member],
      routine: [routineActivity],
      constraints: {
        affordabilityTier: "MODERATE_TO_HIGH",
        priorityGoals: ["PROTECT_VULNERABLE_MEMBER", "OPTIMIZE_INDOOR_AIR"]
      }
    };
    expect(HouseholdContextSchema.safeParse(household).success).toBe(true);
  });

  it("validates recommendation response schema and evidence citation constraints", () => {
    const recResponse = {
      recommendationId: "1b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6f",
      generatedAtUtc: new Date().toISOString(),
      generator: "RULE_ENGINE",
      overallRiskSummary: "Air quality is Very Poor due to high PM2.5. Vulnerable members should stay indoors.",
      actions: [
        {
          actionId: "2b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb70",
          category: "RESPIRATOR_USAGE",
          urgency: "IMMEDIATE",
          actionSummary: "Wear a well-fitted N95 mask outdoors.",
          reasoning: "Sub-micrometer particulates penetrate deep into alveoli during Very Poor AQI.",
          implementationMethod: "Ensure tight seal over nose bridge.",
          expectedExposureReduction: "Up to 95% particulate filtration.",
          applicableConstraintsOrLimits: "Ensure tight facial seal.",
          evidenceReferences: [
            {
              evidenceId: "EVID-001",
              source: "CPCB_CAAQMS",
              measuredValue: "AQI 340",
              timestamp: new Date().toISOString()
            }
          ]
        }
      ]
    };
    expect(RecommendationResponseSchema.safeParse(recResponse).success).toBe(true);
  });
});
