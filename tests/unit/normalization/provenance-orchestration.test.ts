// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DataTypologySchema,
  QualityFlagSchema,
  NormalizedStationSchema,
  NormalizedObservationSchema,
  NormalizedForecastSchema,
  type NormalizedStation,
  type NormalizedObservation,
  type NormalizedForecast
} from "@/schemas/providers/normalized-provider.schema";
import { SourceOrchestrator } from "@/services/air-quality/source-orchestrator";
import { CacheService } from "@/services/cache/cache-service";
import { RedisService } from "@/lib/redis/redis-client";
import { calculateStationCpcbAqi } from "@/domain/cpcb/cpcb-engine";
import {
  createValidatedAggregatedMeasurement,
  aggregateRollingHourlyWindow
} from "@/domain/cpcb/rolling-window-aggregator";
import { checkRunningWindowSufficiency } from "@/domain/cpcb/running-window";
import { CPCB_POLLUTANT_CONFIGS } from "@/domain/cpcb/cpcb-constants";
import type { AirQualityProvider } from "@/services/providers/types";

describe("Normalization, Provenance & Orchestration Tests", () => {
  let mockCpcbProvider: AirQualityProvider;
  let mockOpenaqProvider: AirQualityProvider;
  let mockOpenMeteoProvider: AirQualityProvider;
  let testCacheService: CacheService;

  beforeEach(() => {
    vi.restoreAllMocks();
    testCacheService = new CacheService(new RedisService({}));

    mockCpcbProvider = {
      providerId: "CPCB_CAAQMS",
      getCapabilities: async () => ({
        providerId: "CPCB_CAAQMS",
        displayName: "CPCB",
        providesGroundObservations: true,
        providesAtmosphericForecast: false,
        providesStationSearch: true,
        rateLimitPerMinute: 60,
        defaultCacheTtlSeconds: 300,
        legalLicense: "GODL-India",
        mandatoryAttribution: "CPCB / data.gov.in"
      }),
      searchStations: vi.fn().mockResolvedValue({
        providerId: "CPCB_CAAQMS",
        stations: [
          {
            id: "cpcb_dl_delhi_anand_vihar",
            providerId: "CPCB_CAAQMS",
            name: "Anand Vihar, Delhi",
            city: "Delhi",
            state: "Delhi",
            latitude: 28.6468,
            longitude: 77.316,
            distanceKm: 5.2,
            availablePollutants: ["PM2.5", "PM10", "NO2"],
            lastReportedAt: "2026-11-22T08:00:00Z",
            license: "Government Open Data License - India (GODL-India)",
            attribution: "Central Pollution Control Board (CPCB) via data.gov.in"
          }
        ],
        retrievedAt: "2026-11-22T08:00:00Z",
        status: "CONFIGURED",
        warnings: []
      }),
      getObservations: vi.fn().mockResolvedValue({
        providerId: "CPCB_CAAQMS",
        observations: [],
        retrievedAt: "2026-11-22T08:00:00Z",
        status: "CONFIGURED",
        warnings: []
      }),
      getForecast: vi.fn().mockResolvedValue({
        providerId: "CPCB_CAAQMS",
        forecast: [],
        modelDomain: "NONE",
        spatialResolutionKm: 0,
        temporalResolutionHours: 0,
        retrievedAt: "2026-11-22T08:00:00Z",
        status: "CONFIGURED",
        warnings: []
      })
    };

    mockOpenaqProvider = {
      providerId: "OPENAQ",
      getCapabilities: async () => ({
        providerId: "OPENAQ",
        displayName: "OpenAQ",
        providesGroundObservations: true,
        providesAtmosphericForecast: false,
        providesStationSearch: true,
        rateLimitPerMinute: 60,
        defaultCacheTtlSeconds: 600,
        legalLicense: "OpenAQ / Source License",
        mandatoryAttribution: "OpenAQ"
      }),
      searchStations: vi.fn().mockResolvedValue({
        providerId: "OPENAQ",
        stations: [
          {
            id: "openaq_101",
            providerId: "OPENAQ",
            name: "US Embassy, New Delhi",
            city: "New Delhi",
            state: "Delhi",
            latitude: 28.598,
            longitude: 77.189,
            distanceKm: 2.1,
            availablePollutants: ["PM2.5"],
            lastReportedAt: "2026-11-22T08:00:00Z",
            license: "CC BY 4.0",
            attribution: "OpenAQ / AirNow"
          }
        ],
        retrievedAt: "2026-11-22T08:00:00Z",
        status: "CONFIGURED",
        warnings: []
      }),
      getObservations: vi.fn().mockResolvedValue({
        providerId: "OPENAQ",
        observations: [],
        retrievedAt: "2026-11-22T08:00:00Z",
        status: "CONFIGURED",
        warnings: []
      }),
      getForecast: vi.fn().mockResolvedValue({
        providerId: "OPENAQ",
        forecast: [],
        modelDomain: "NONE",
        spatialResolutionKm: 0,
        temporalResolutionHours: 0,
        retrievedAt: "2026-11-22T08:00:00Z",
        status: "CONFIGURED",
        warnings: []
      })
    };

    mockOpenMeteoProvider = {
      providerId: "OPEN_METEO_CAMS",
      getCapabilities: async () => ({
        providerId: "OPEN_METEO_CAMS",
        displayName: "Open-Meteo CAMS",
        providesGroundObservations: false,
        providesAtmosphericForecast: true,
        providesStationSearch: false,
        rateLimitPerMinute: 600,
        defaultCacheTtlSeconds: 3600,
        legalLicense: "CC BY 4.0",
        mandatoryAttribution: "Copernicus CAMS"
      }),
      searchStations: vi.fn().mockResolvedValue({
        providerId: "OPEN_METEO_CAMS",
        stations: [],
        retrievedAt: "2026-11-22T08:00:00Z",
        status: "CONFIGURED",
        warnings: []
      }),
      getObservations: vi.fn().mockResolvedValue({
        providerId: "OPEN_METEO_CAMS",
        observations: [],
        retrievedAt: "2026-11-22T08:00:00Z",
        status: "CONFIGURED",
        warnings: []
      }),
      getForecast: vi.fn().mockResolvedValue({
        providerId: "OPEN_METEO_CAMS",
        forecast: [
          {
            id: "cams_28.61_77.20_PM2.5_2026-11-22T09:00:00Z",
            latitude: 28.625,
            longitude: 77.25,
            modelDomain: "cams_global",
            spatialResolutionKm: 45,
            temporalResolutionHours: 3,
            pollutant: "PM2.5",
            forecastValue: 68.5,
            unit: "µg/m³",
            validTime: "2026-11-22T09:00:00Z",
            issueTime: null,
            retrievalTime: "2026-11-22T08:00:00Z",
            typology: "TYPE_D_MODEL_FORECAST",
            license: "CC BY 4.0",
            attribution: "Copernicus Atmosphere Monitoring Service (CAMS Global)"
          }
        ],
        modelDomain: "cams_global",
        spatialResolutionKm: 45,
        temporalResolutionHours: 3,
        retrievedAt: "2026-11-22T08:00:00Z",
        status: "CONFIGURED",
        warnings: []
      })
    };
  });

  // Schema & Typology Tests
  it("NORM-001: validates TYPE_A_OFFICIAL_AQI in DataTypologySchema", () => {
    expect(DataTypologySchema.parse("TYPE_A_OFFICIAL_AQI")).toBe("TYPE_A_OFFICIAL_AQI");
  });

  it("NORM-002: validates TYPE_B_CALCULATED_AQI in DataTypologySchema", () => {
    expect(DataTypologySchema.parse("TYPE_B_CALCULATED_AQI")).toBe("TYPE_B_CALCULATED_AQI");
  });

  it("NORM-003: validates TYPE_C_RAW_MEASUREMENT in DataTypologySchema", () => {
    expect(DataTypologySchema.parse("TYPE_C_RAW_MEASUREMENT")).toBe("TYPE_C_RAW_MEASUREMENT");
  });

  it("NORM-004: validates TYPE_D_MODEL_FORECAST in DataTypologySchema", () => {
    expect(DataTypologySchema.parse("TYPE_D_MODEL_FORECAST")).toBe("TYPE_D_MODEL_FORECAST");
  });

  it("NORM-005: rejects invalid typology string", () => {
    expect(() => DataTypologySchema.parse("ESTIMATED_AQI")).toThrow();
    expect(() => DataTypologySchema.parse("AI_GENERATED_AQI")).toThrow();
  });

  it("NORM-006: validates all canonical QualityFlagSchema values", () => {
    expect(QualityFlagSchema.parse("VERIFIED")).toBe("VERIFIED");
    expect(QualityFlagSchema.parse("PROVISIONAL")).toBe("PROVISIONAL");
    expect(QualityFlagSchema.parse("SUSPICIOUS")).toBe("SUSPICIOUS");
    expect(QualityFlagSchema.parse("STALE")).toBe("STALE");
    expect(QualityFlagSchema.parse("MODEL_FORECAST")).toBe("MODEL_FORECAST");
  });

  it("NORM-007: rejects invalid quality flag string", () => {
    expect(() => QualityFlagSchema.parse("PERFECT")).toThrow();
  });

  it("NORM-008: NormalizedStationSchema validates station with proper bounds", () => {
    const station: NormalizedStation = {
      id: "station_1",
      providerId: "CPCB_CAAQMS",
      name: "Punjabi Bagh, Delhi",
      city: "Delhi",
      state: "Delhi",
      latitude: 28.67,
      longitude: 77.12,
      availablePollutants: ["PM2.5", "PM10"],
      lastReportedAt: "2026-11-22T08:00:00Z",
      license: "GODL-India",
      attribution: "CPCB"
    };
    expect(NormalizedStationSchema.parse(station)).toEqual(station);
  });

  it("NORM-009: NormalizedStationSchema rejects out-of-bounds latitude/longitude", () => {
    expect(() =>
      NormalizedStationSchema.parse({
        id: "station_bad",
        providerId: "CPCB_CAAQMS",
        name: "Bad",
        city: "Delhi",
        state: "Delhi",
        latitude: 95.0, // invalid > 90
        longitude: 77.12,
        availablePollutants: [],
        lastReportedAt: null,
        license: "GODL-India",
        attribution: "CPCB"
      })
    ).toThrow();
  });

  it("NORM-010: NormalizedObservationSchema validates observation and requires nonnegative value", () => {
    const obs: NormalizedObservation = {
      id: "obs_1",
      stationId: "station_1",
      stationName: "Punjabi Bagh",
      providerId: "CPCB_CAAQMS",
      pollutant: "PM2.5",
      value: 65.5,
      unit: "µg/m³",
      averagingPeriod: "1h",
      typology: "TYPE_C_RAW_MEASUREMENT",
      observationTime: "2026-11-22T08:00:00Z",
      sourceUpdateTime: null,
      retrievalTime: "2026-11-22T08:05:00Z",
      qualityFlag: "VERIFIED",
      license: "GODL-India",
      attribution: "CPCB"
    };
    expect(NormalizedObservationSchema.parse(obs)).toEqual(obs);

    expect(() =>
      NormalizedObservationSchema.parse({ ...obs, value: -10.0 })
    ).toThrow();
  });

  // Provenance Preservation Tests
  it("NORM-011: CPCB observations retain GODL-India license and CPCB attribution", () => {
    const obs: NormalizedObservation = {
      id: "cpcb_obs_1",
      stationId: "cpcb_delhi_station",
      stationName: "Delhi Station",
      providerId: "CPCB_CAAQMS",
      pollutant: "PM10",
      value: 120.0,
      unit: "µg/m³",
      averagingPeriod: "UNKNOWN",
      typology: "TYPE_C_RAW_MEASUREMENT",
      observationTime: "2026-11-22T08:00:00Z",
      sourceUpdateTime: "22-11-2026 13:30:00",
      retrievalTime: "2026-11-22T08:05:00Z",
      qualityFlag: "VERIFIED",
      license: "Government Open Data License - India (GODL-India)",
      attribution: "Central Pollution Control Board (CPCB) via data.gov.in"
    };
    const parsed = NormalizedObservationSchema.parse(obs);
    expect(parsed.license).toContain("GODL-India");
    expect(parsed.attribution).toContain("CPCB");
  });

  it("NORM-012: OpenAQ observations retain source-specific license and attribution", () => {
    const obs: NormalizedObservation = {
      id: "openaq_obs_1",
      stationId: "openaq_101",
      stationName: "US Embassy",
      providerId: "OPENAQ",
      pollutant: "PM2.5",
      value: 50.0,
      unit: "µg/m³",
      averagingPeriod: "1h",
      typology: "TYPE_C_RAW_MEASUREMENT",
      observationTime: "2026-11-22T08:00:00Z",
      sourceUpdateTime: null,
      retrievalTime: "2026-11-22T08:05:00Z",
      qualityFlag: "VERIFIED",
      license: "CC BY 4.0",
      attribution: "OpenAQ / US State Dept"
    };
    const parsed = NormalizedObservationSchema.parse(obs);
    expect(parsed.license).toBe("CC BY 4.0");
    expect(parsed.attribution).toContain("OpenAQ");
  });

  it("NORM-013: Open-Meteo forecasts retain CC BY 4.0 and Copernicus CAMS attribution", () => {
    const fc: NormalizedForecast = {
      id: "fc_1",
      latitude: 28.625,
      longitude: 77.25,
      modelDomain: "cams_global",
      spatialResolutionKm: 45,
      temporalResolutionHours: 3,
      pollutant: "PM2.5",
      forecastValue: 70.0,
      unit: "µg/m³",
      validTime: "2026-11-22T12:00:00Z",
      issueTime: null,
      retrievalTime: "2026-11-22T08:05:00Z",
      typology: "TYPE_D_MODEL_FORECAST",
      license: "Creative Commons Attribution 4.0 International (CC BY 4.0)",
      attribution: "Copernicus Atmosphere Monitoring Service (CAMS Global)"
    };
    const parsed = NormalizedForecastSchema.parse(fc);
    expect(parsed.license).toContain("CC BY 4.0");
    expect(parsed.attribution).toContain("CAMS Global");
  });

  it("NORM-014: NormalizedForecastSchema enforces strict TYPE_D_MODEL_FORECAST typology literal", () => {
    const fc = {
      id: "fc_2",
      latitude: 28.625,
      longitude: 77.25,
      modelDomain: "cams_global",
      spatialResolutionKm: 45,
      temporalResolutionHours: 3,
      pollutant: "PM2.5" as const,
      forecastValue: 70.0,
      unit: "µg/m³",
      validTime: "2026-11-22T12:00:00Z",
      issueTime: null,
      retrievalTime: "2026-11-22T08:05:00Z",
      typology: "TYPE_C_RAW_MEASUREMENT", // Illegal for forecast
      license: "CC BY 4.0",
      attribution: "CAMS"
    };
    expect(() => NormalizedForecastSchema.parse(fc)).toThrow();
  });

  it("NORM-015: observation retains stationId and stationName provenance", () => {
    const obs: NormalizedObservation = {
      id: "obs_test_station",
      stationId: "cpcb_wb_kolkata_victoria",
      stationName: "Victoria Memorial, Kolkata",
      providerId: "CPCB_CAAQMS",
      pollutant: "PM2.5",
      value: 85.0,
      unit: "µg/m³",
      averagingPeriod: "UNKNOWN",
      typology: "TYPE_C_RAW_MEASUREMENT",
      observationTime: "2026-11-22T08:00:00Z",
      sourceUpdateTime: null,
      retrievalTime: "2026-11-22T08:05:00Z",
      qualityFlag: "VERIFIED",
      license: "GODL-India",
      attribution: "CPCB"
    };
    expect(obs.stationId).toBe("cpcb_wb_kolkata_victoria");
    expect(obs.stationName).toBe("Victoria Memorial, Kolkata");
  });

  it("NORM-016: forecast retains spatialResolutionKm as 45 and temporalResolutionHours as 3", () => {
    const fc: NormalizedForecast = {
      id: "cams_grid_test",
      latitude: 22.57,
      longitude: 88.36,
      modelDomain: "cams_global",
      spatialResolutionKm: 45,
      temporalResolutionHours: 3,
      pollutant: "CO",
      forecastValue: 1.2,
      unit: "mg/m³",
      validTime: "2026-11-22T09:00:00Z",
      issueTime: null,
      retrievalTime: "2026-11-22T08:00:00Z",
      typology: "TYPE_D_MODEL_FORECAST",
      license: "CC BY 4.0",
      attribution: "CAMS"
    };
    expect(fc.spatialResolutionKm).toBe(45);
    expect(fc.temporalResolutionHours).toBe(3);
  });

  it("NORM-017: observation requires valid ISO 8601 observationTime ending with Z", () => {
    expect(() =>
      NormalizedObservationSchema.parse({
        id: "obs_bad_time",
        stationId: "s1",
        stationName: "S1",
        providerId: "P1",
        pollutant: "PM2.5",
        value: 50,
        unit: "µg/m³",
        averagingPeriod: "1h",
        typology: "TYPE_C_RAW_MEASUREMENT",
        observationTime: "22-11-2026 13:30", // Not ISO 8601 UTC
        sourceUpdateTime: null,
        retrievalTime: "2026-11-22T08:00:00Z",
        qualityFlag: "VERIFIED",
        license: "L1",
        attribution: "A1"
      })
    ).toThrow();
  });

  it("NORM-018: observation requires valid ISO 8601 retrievalTime", () => {
    expect(() =>
      NormalizedObservationSchema.parse({
        id: "obs_bad_retrieval",
        stationId: "s1",
        stationName: "S1",
        providerId: "P1",
        pollutant: "PM2.5",
        value: 50,
        unit: "µg/m³",
        averagingPeriod: "1h",
        typology: "TYPE_C_RAW_MEASUREMENT",
        observationTime: "2026-11-22T08:00:00Z",
        sourceUpdateTime: null,
        retrievalTime: "invalid-time",
        qualityFlag: "VERIFIED",
        license: "L1",
        attribution: "A1"
      })
    ).toThrow();
  });

  it("NORM-019: forecast requires valid ISO 8601 validTime", () => {
    expect(() =>
      NormalizedForecastSchema.parse({
        id: "fc_bad_time",
        latitude: 28.6,
        longitude: 77.2,
        modelDomain: "cams_global",
        spatialResolutionKm: 45,
        temporalResolutionHours: 3,
        pollutant: "PM2.5",
        forecastValue: 50,
        unit: "µg/m³",
        validTime: "tomorrow afternoon",
        issueTime: null,
        retrievalTime: "2026-11-22T08:00:00Z",
        typology: "TYPE_D_MODEL_FORECAST",
        license: "CC BY 4.0",
        attribution: "CAMS"
      })
    ).toThrow();
  });

  it("NORM-020: station lastReportedAt allows null for newly installed stations", () => {
    const station = NormalizedStationSchema.parse({
      id: "station_new",
      providerId: "CPCB_CAAQMS",
      name: "New Station",
      city: "Bengaluru",
      state: "Karnataka",
      latitude: 12.97,
      longitude: 77.59,
      availablePollutants: [],
      lastReportedAt: null,
      license: "GODL-India",
      attribution: "CPCB"
    });
    expect(station.lastReportedAt).toBeNull();
  });

  // SourceOrchestrator Air Quality & CPCB Sufficiency
  it("NORM-021: returns AVAILABLE and valid calculatedAqi when 3 pollutants including PM2.5 are present with verified 24h averaging", async () => {
    const stationId = "cpcb_dl_delhi_ito";
    const observations: NormalizedObservation[] = [
      {
        id: "obs_1",
        stationId,
        stationName: "ITO, Delhi",
        providerId: "CPCB_CAAQMS",
        pollutant: "PM2.5",
        value: 120.0,
        unit: "µg/m³",
        averagingPeriod: "24h",
        typology: "TYPE_C_RAW_MEASUREMENT",
        observationTime: "2026-11-22T08:00:00Z",
        sourceUpdateTime: null,
        retrievalTime: "2026-11-22T08:05:00Z",
        qualityFlag: "VERIFIED",
        license: "GODL-India",
        attribution: "CPCB"
      },
      {
        id: "obs_2",
        stationId,
        stationName: "ITO, Delhi",
        providerId: "CPCB_CAAQMS",
        pollutant: "PM10",
        value: 200.0,
        unit: "µg/m³",
        averagingPeriod: "24h",
        typology: "TYPE_C_RAW_MEASUREMENT",
        observationTime: "2026-11-22T08:00:00Z",
        sourceUpdateTime: null,
        retrievalTime: "2026-11-22T08:05:00Z",
        qualityFlag: "VERIFIED",
        license: "GODL-India",
        attribution: "CPCB"
      },
      {
        id: "obs_3",
        stationId,
        stationName: "ITO, Delhi",
        providerId: "CPCB_CAAQMS",
        pollutant: "NO2",
        value: 65.0,
        unit: "µg/m³",
        averagingPeriod: "24h",
        typology: "TYPE_C_RAW_MEASUREMENT",
        observationTime: "2026-11-22T08:00:00Z",
        sourceUpdateTime: null,
        retrievalTime: "2026-11-22T08:05:00Z",
        qualityFlag: "VERIFIED",
        license: "GODL-India",
        attribution: "CPCB"
      }
    ];

    mockCpcbProvider.getObservations = vi.fn().mockResolvedValue({
      providerId: "CPCB_CAAQMS",
      observations,
      retrievedAt: "2026-11-22T08:05:00Z",
      status: "CONFIGURED",
      warnings: []
    });

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.getStationAirQuality(stationId);

    expect(result.aqiStatus).toBe("AVAILABLE");
    expect(result.calculatedAqi).not.toBeNull();
    expect(result.calculatedAqi?.overallAqi).toBeGreaterThan(0);
    expect(result.statusMessage).toContain("Independently calculated CPCB-methodology AQI");
  });

  it("NORM-022: returns valid calculatedAqi when 3 pollutants including PM10 are present with verified averaging", async () => {
    const stationId = "cpcb_mh_mumbai_bandra";
    const observations: NormalizedObservation[] = [
      {
        id: "obs_1",
        stationId,
        stationName: "Bandra, Mumbai",
        providerId: "CPCB_CAAQMS",
        pollutant: "PM10",
        value: 150.0,
        unit: "µg/m³",
        averagingPeriod: "24h",
        typology: "TYPE_C_RAW_MEASUREMENT",
        observationTime: "2026-11-22T08:00:00Z",
        sourceUpdateTime: null,
        retrievalTime: "2026-11-22T08:05:00Z",
        qualityFlag: "VERIFIED",
        license: "GODL-India",
        attribution: "CPCB"
      },
      {
        id: "obs_2",
        stationId,
        stationName: "Bandra, Mumbai",
        providerId: "CPCB_CAAQMS",
        pollutant: "SO2",
        value: 25.0,
        unit: "µg/m³",
        averagingPeriod: "24h",
        typology: "TYPE_C_RAW_MEASUREMENT",
        observationTime: "2026-11-22T08:00:00Z",
        sourceUpdateTime: null,
        retrievalTime: "2026-11-22T08:05:00Z",
        qualityFlag: "VERIFIED",
        license: "GODL-India",
        attribution: "CPCB"
      },
      {
        id: "obs_3",
        stationId,
        stationName: "Bandra, Mumbai",
        providerId: "CPCB_CAAQMS",
        pollutant: "CO",
        value: 1.5,
        unit: "mg/m³",
        averagingPeriod: "8h",
        typology: "TYPE_C_RAW_MEASUREMENT",
        observationTime: "2026-11-22T08:00:00Z",
        sourceUpdateTime: null,
        retrievalTime: "2026-11-22T08:05:00Z",
        qualityFlag: "VERIFIED",
        license: "GODL-India",
        attribution: "CPCB"
      }
    ];

    mockCpcbProvider.getObservations = vi.fn().mockResolvedValue({
      providerId: "CPCB_CAAQMS",
      observations,
      retrievedAt: "2026-11-22T08:05:00Z",
      status: "CONFIGURED",
      warnings: []
    });

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.getStationAirQuality(stationId);

    expect(result.aqiStatus).toBe("AVAILABLE");
    expect(result.calculatedAqi?.overallAqi).toBeGreaterThan(0);
  });

  it("NORM-023: returns AQI_UNAVAILABLE when fewer than 3 pollutants are monitored (e.g. only 2 pollutants)", async () => {
    const stationId = "cpcb_ka_bengaluru_btm";
    const observations: NormalizedObservation[] = [
      {
        id: "obs_1",
        stationId,
        stationName: "BTM Layout",
        providerId: "CPCB_CAAQMS",
        pollutant: "PM2.5",
        value: 45.0,
        unit: "µg/m³",
        averagingPeriod: "UNKNOWN",
        typology: "TYPE_C_RAW_MEASUREMENT",
        observationTime: "2026-11-22T08:00:00Z",
        sourceUpdateTime: null,
        retrievalTime: "2026-11-22T08:05:00Z",
        qualityFlag: "VERIFIED",
        license: "GODL-India",
        attribution: "CPCB"
      },
      {
        id: "obs_2",
        stationId,
        stationName: "BTM Layout",
        providerId: "CPCB_CAAQMS",
        pollutant: "PM10",
        value: 80.0,
        unit: "µg/m³",
        averagingPeriod: "UNKNOWN",
        typology: "TYPE_C_RAW_MEASUREMENT",
        observationTime: "2026-11-22T08:00:00Z",
        sourceUpdateTime: null,
        retrievalTime: "2026-11-22T08:05:00Z",
        qualityFlag: "VERIFIED",
        license: "GODL-India",
        attribution: "CPCB"
      }
    ];

    mockCpcbProvider.getObservations = vi.fn().mockResolvedValue({
      providerId: "CPCB_CAAQMS",
      observations,
      retrievedAt: "2026-11-22T08:05:00Z",
      status: "CONFIGURED",
      warnings: []
    });

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.getStationAirQuality(stationId);

    expect(result.aqiStatus).toBe("AQI_UNAVAILABLE");
    expect(result.calculatedAqi).toBeNull();
    expect(result.statusMessage).toContain("fewer than 3 valid pollutants");
  });

  it("NORM-024: returns AQI_UNAVAILABLE when 3 pollutants are monitored but neither PM2.5 nor PM10 is present", async () => {
    const stationId = "cpcb_tn_chennai_t_nagar";
    const observations: NormalizedObservation[] = [
      {
        id: "obs_1",
        stationId,
        stationName: "T Nagar",
        providerId: "CPCB_CAAQMS",
        pollutant: "NO2",
        value: 40.0,
        unit: "µg/m³",
        averagingPeriod: "UNKNOWN",
        typology: "TYPE_C_RAW_MEASUREMENT",
        observationTime: "2026-11-22T08:00:00Z",
        sourceUpdateTime: null,
        retrievalTime: "2026-11-22T08:05:00Z",
        qualityFlag: "VERIFIED",
        license: "GODL-India",
        attribution: "CPCB"
      },
      {
        id: "obs_2",
        stationId,
        stationName: "T Nagar",
        providerId: "CPCB_CAAQMS",
        pollutant: "SO2",
        value: 20.0,
        unit: "µg/m³",
        averagingPeriod: "UNKNOWN",
        typology: "TYPE_C_RAW_MEASUREMENT",
        observationTime: "2026-11-22T08:00:00Z",
        sourceUpdateTime: null,
        retrievalTime: "2026-11-22T08:05:00Z",
        qualityFlag: "VERIFIED",
        license: "GODL-India",
        attribution: "CPCB"
      },
      {
        id: "obs_3",
        stationId,
        stationName: "T Nagar",
        providerId: "CPCB_CAAQMS",
        pollutant: "CO",
        value: 1.0,
        unit: "mg/m³",
        averagingPeriod: "UNKNOWN",
        typology: "TYPE_C_RAW_MEASUREMENT",
        observationTime: "2026-11-22T08:00:00Z",
        sourceUpdateTime: null,
        retrievalTime: "2026-11-22T08:05:00Z",
        qualityFlag: "VERIFIED",
        license: "GODL-India",
        attribution: "CPCB"
      }
    ];

    mockCpcbProvider.getObservations = vi.fn().mockResolvedValue({
      providerId: "CPCB_CAAQMS",
      observations,
      retrievedAt: "2026-11-22T08:05:00Z",
      status: "CONFIGURED",
      warnings: []
    });

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.getStationAirQuality(stationId);

    expect(result.aqiStatus).toBe("AQI_UNAVAILABLE");
    expect(result.calculatedAqi).toBeNull();
    expect(result.statusMessage).toContain("missing particulate parameters");
  });

  it("NORM-025: returns AQI_UNAVAILABLE when 0 observations are returned", async () => {
    const stationId = "cpcb_empty";
    mockCpcbProvider.getObservations = vi.fn().mockResolvedValue({
      providerId: "CPCB_CAAQMS",
      observations: [],
      retrievedAt: "2026-11-22T08:05:00Z",
      status: "CONFIGURED",
      warnings: []
    });

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.getStationAirQuality(stationId);

    expect(result.aqiStatus).toBe("AQI_UNAVAILABLE");
    expect(result.calculatedAqi).toBeNull();
  });

  it("NORM-026: calculates correct overall AQI across all 8 CPCB parameters", async () => {
    const stationId = "cpcb_full_station";
    const observations: NormalizedObservation[] = [
      { id: "o1", stationId, stationName: "Full", providerId: "CPCB_CAAQMS", pollutant: "PM2.5", value: 180.0, unit: "µg/m³", averagingPeriod: "24h", typology: "TYPE_C_RAW_MEASUREMENT", observationTime: "2026-11-22T08:00:00Z", sourceUpdateTime: null, retrievalTime: "2026-11-22T08:05:00Z", qualityFlag: "VERIFIED", license: "L", attribution: "A" },
      { id: "o2", stationId, stationName: "Full", providerId: "CPCB_CAAQMS", pollutant: "PM10", value: 310.0, unit: "µg/m³", averagingPeriod: "24h", typology: "TYPE_C_RAW_MEASUREMENT", observationTime: "2026-11-22T08:00:00Z", sourceUpdateTime: null, retrievalTime: "2026-11-22T08:05:00Z", qualityFlag: "VERIFIED", license: "L", attribution: "A" },
      { id: "o3", stationId, stationName: "Full", providerId: "CPCB_CAAQMS", pollutant: "NO2", value: 75.0, unit: "µg/m³", averagingPeriod: "24h", typology: "TYPE_C_RAW_MEASUREMENT", observationTime: "2026-11-22T08:00:00Z", sourceUpdateTime: null, retrievalTime: "2026-11-22T08:05:00Z", qualityFlag: "VERIFIED", license: "L", attribution: "A" },
      { id: "o4", stationId, stationName: "Full", providerId: "CPCB_CAAQMS", pollutant: "SO2", value: 30.0, unit: "µg/m³", averagingPeriod: "24h", typology: "TYPE_C_RAW_MEASUREMENT", observationTime: "2026-11-22T08:00:00Z", sourceUpdateTime: null, retrievalTime: "2026-11-22T08:05:00Z", qualityFlag: "VERIFIED", license: "L", attribution: "A" },
      { id: "o5", stationId, stationName: "Full", providerId: "CPCB_CAAQMS", pollutant: "CO", value: 3.2, unit: "mg/m³", averagingPeriod: "8h", typology: "TYPE_C_RAW_MEASUREMENT", observationTime: "2026-11-22T08:00:00Z", sourceUpdateTime: null, retrievalTime: "2026-11-22T08:05:00Z", qualityFlag: "VERIFIED", license: "L", attribution: "A" },
      { id: "o6", stationId, stationName: "Full", providerId: "CPCB_CAAQMS", pollutant: "O3", value: 85.0, unit: "µg/m³", averagingPeriod: "8h", typology: "TYPE_C_RAW_MEASUREMENT", observationTime: "2026-11-22T08:00:00Z", sourceUpdateTime: null, retrievalTime: "2026-11-22T08:05:00Z", qualityFlag: "VERIFIED", license: "L", attribution: "A" },
      { id: "o7", stationId, stationName: "Full", providerId: "CPCB_CAAQMS", pollutant: "NH3", value: 120.0, unit: "µg/m³", averagingPeriod: "24h", typology: "TYPE_C_RAW_MEASUREMENT", observationTime: "2026-11-22T08:00:00Z", sourceUpdateTime: null, retrievalTime: "2026-11-22T08:05:00Z", qualityFlag: "VERIFIED", license: "L", attribution: "A" },
      { id: "o8", stationId, stationName: "Full", providerId: "CPCB_CAAQMS", pollutant: "Pb", value: 0.8, unit: "µg/m³", averagingPeriod: "24h", typology: "TYPE_C_RAW_MEASUREMENT", observationTime: "2026-11-22T08:00:00Z", sourceUpdateTime: null, retrievalTime: "2026-11-22T08:05:00Z", qualityFlag: "VERIFIED", license: "L", attribution: "A" }
    ];

    mockCpcbProvider.getObservations = vi.fn().mockResolvedValue({
      providerId: "CPCB_CAAQMS",
      observations,
      retrievedAt: "2026-11-22T08:05:00Z",
      status: "CONFIGURED",
      warnings: []
    });

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.getStationAirQuality(stationId);

    expect(result.aqiStatus).toBe("AVAILABLE");
    expect(result.calculatedAqi?.overallAqi).toBeGreaterThan(0);
    expect(result.calculatedAqi?.prominentPollutant).toBeDefined();
  });

  it("NORM-027: sets windowHours to 8 for CO and O3 in CPCB aggregation", () => {
    const co = createValidatedAggregatedMeasurement({
      stationId: "s1",
      pollutant: "CO",
      concentration: 2.0,
      unit: "mg/m³",
      averagingWindowHours: 8,
      recordedAtUtc: "2026-11-22T08:00:00Z",
      validHoursInWindow: 6
    });
    expect(co.averagingWindowHours).toBe(8);

    const o3 = createValidatedAggregatedMeasurement({
      stationId: "s1",
      pollutant: "O3",
      concentration: 50.0,
      unit: "µg/m³",
      averagingWindowHours: 8,
      recordedAtUtc: "2026-11-22T08:00:00Z",
      validHoursInWindow: 6
    });
    expect(o3.averagingWindowHours).toBe(8);
  });

  it("NORM-028: sets windowHours to 24 for PM2.5, PM10, NO2, SO2, NH3, Pb", () => {
    const pm25 = createValidatedAggregatedMeasurement({
      stationId: "s1",
      pollutant: "PM2.5",
      concentration: 60.0,
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: "2026-11-22T08:00:00Z",
      validHoursInWindow: 16
    });
    expect(pm25.averagingWindowHours).toBe(24);
  });

  it("NORM-029: rejects aggregation if 24h window has fewer than 16 valid hours", () => {
    const res = checkRunningWindowSufficiency("PM2.5", 15, 24);
    expect(res.isSufficient).toBe(false);
    expect(res.requiredHours).toBe(16);
    expect(res.actualHours).toBe(15);
  });

  it("NORM-030: rejects aggregation if 8h window has fewer than 6 valid hours", () => {
    const res = checkRunningWindowSufficiency("CO", 5, 8);
    expect(res.isSufficient).toBe(false);
    expect(res.requiredHours).toBe(6);
    expect(res.actualHours).toBe(5);
  });

  it("NORM-031: rejects wrong unit for CO (µg/m³ instead of mg/m³)", () => {
    expect(CPCB_POLLUTANT_CONFIGS["CO"].unit).toBe("mg/m³");
  });

  it("NORM-032: rejects wrong unit for particulate (mg/m³ instead of µg/m³)", () => {
    expect(CPCB_POLLUTANT_CONFIGS["PM2.5"].unit).toBe("µg/m³");
    expect(CPCB_POLLUTANT_CONFIGS["PM10"].unit).toBe("µg/m³");
  });

  it("NORM-033: calculateStationCpcbAqi returns null overallAqi for insufficient sub-indices", () => {
    const m1 = createValidatedAggregatedMeasurement({
      stationId: "s1",
      pollutant: "PM2.5",
      concentration: 55.0,
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: "2026-11-22T08:00:00Z",
      validHoursInWindow: 16
    });
    const m2 = createValidatedAggregatedMeasurement({
      stationId: "s1",
      pollutant: "PM10",
      concentration: 90.0,
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: "2026-11-22T08:00:00Z",
      validHoursInWindow: 16
    });

    const res = calculateStationCpcbAqi("s1", [m1, m2], "2026-11-22T08:00:00Z");
    expect(res.overallAqi).toBeNull();
    expect(res.category).toBeNull();
    expect(res.sufficiencyStatus).toBe("INSUFFICIENT_DATA");
  });

  it("NORM-034: calculateStationCpcbAqi identifies prominent pollutant matching highest sub-index", () => {
    const m1 = createValidatedAggregatedMeasurement({
      stationId: "s1",
      pollutant: "PM2.5",
      concentration: 150.0, // High sub-index (~323)
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: "2026-11-22T08:00:00Z",
      validHoursInWindow: 16
    });
    const m2 = createValidatedAggregatedMeasurement({
      stationId: "s1",
      pollutant: "PM10",
      concentration: 120.0, // Lower sub-index (113)
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: "2026-11-22T08:00:00Z",
      validHoursInWindow: 16
    });
    const m3 = createValidatedAggregatedMeasurement({
      stationId: "s1",
      pollutant: "NO2",
      concentration: 50.0, // Lower sub-index (63)
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: "2026-11-22T08:00:00Z",
      validHoursInWindow: 16
    });

    const res = calculateStationCpcbAqi("s1", [m1, m2, m3], "2026-11-22T08:00:00Z");
    expect(res.overallAqi).toBeGreaterThan(300);
    expect(res.prominentPollutant).toBe("PM2.5");
  });

  it("NORM-035: preserves stationHint in getStationAirQuality response", async () => {
    const hint: NormalizedStation = {
      id: "cpcb_hint_1",
      providerId: "CPCB_CAAQMS",
      name: "Hint Station",
      city: "Delhi",
      state: "Delhi",
      latitude: 28.6,
      longitude: 77.2,
      availablePollutants: ["PM2.5"],
      lastReportedAt: null,
      license: "GODL-India",
      attribution: "CPCB"
    };

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    const res = await orchestrator.getStationAirQuality("cpcb_hint_1", hint);
    expect(res.station).toEqual(hint);
  });

  // Cross-Station Mixing & Truthfulness Guardrails
  it("NORM-036: calculateStationCpcbAqi rejects measurements with mismatched station IDs", () => {
    const m1 = createValidatedAggregatedMeasurement({
      stationId: "station_A",
      pollutant: "PM2.5",
      concentration: 55.0,
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: "2026-11-22T08:00:00Z",
      validHoursInWindow: 16
    });
    const m2 = createValidatedAggregatedMeasurement({
      stationId: "station_B", // Mismatched station
      pollutant: "PM10",
      concentration: 90.0,
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: "2026-11-22T08:00:00Z",
      validHoursInWindow: 16
    });
    const m3 = createValidatedAggregatedMeasurement({
      stationId: "station_A",
      pollutant: "NO2",
      concentration: 40.0,
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: "2026-11-22T08:00:00Z",
      validHoursInWindow: 16
    });

    const res = calculateStationCpcbAqi("station_A", [m1, m2, m3], "2026-11-22T08:00:00Z");
    expect(res.overallAqi).toBeNull();
    expect(res.explanation).toContain("Cross-station aggregation rejected");
  });

  it("NORM-037: calculateStationCpcbAqi rejects targetStationId mismatch with measurements", () => {
    const m1 = createValidatedAggregatedMeasurement({
      stationId: "station_A",
      pollutant: "PM2.5",
      concentration: 55.0,
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: "2026-11-22T08:00:00Z",
      validHoursInWindow: 16
    });
    const m2 = createValidatedAggregatedMeasurement({
      stationId: "station_A",
      pollutant: "PM10",
      concentration: 90.0,
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: "2026-11-22T08:00:00Z",
      validHoursInWindow: 16
    });
    const m3 = createValidatedAggregatedMeasurement({
      stationId: "station_A",
      pollutant: "NO2",
      concentration: 40.0,
      unit: "µg/m³",
      averagingWindowHours: 24,
      recordedAtUtc: "2026-11-22T08:00:00Z",
      validHoursInWindow: 16
    });

    const res = calculateStationCpcbAqi("station_DIFFERENT", [m1, m2, m3], "2026-11-22T08:00:00Z");
    expect(res.overallAqi).toBeNull();
    expect(res.explanation).toContain("Cross-station aggregation rejected");
  });

  it("NORM-038: createValidatedAggregatedMeasurement rejects negative concentration", () => {
    const rNeg = aggregateRollingHourlyWindow(
      "s1",
      "PM2.5",
      [
        {
          readingId: "r1",
          stationId: "s1",
          pollutant: "PM2.5",
          concentration: -15.0,
          unit: "µg/m³",
          timestampUtc: "2026-11-22T08:00:00Z"
        }
      ],
      24,
      "2026-11-22T08:00:00Z"
    );
    expect(rNeg.diagnostics.discardedFaultOrNegativeCount).toBe(1);
    expect(rNeg.rollingAverageConcentration).toBeNull();
  });

  it("NORM-039: createValidatedAggregatedMeasurement rejects NaN concentration", () => {
    const rNan = aggregateRollingHourlyWindow(
      "s1",
      "PM2.5",
      [
        {
          readingId: "r2",
          stationId: "s1",
          pollutant: "PM2.5",
          concentration: NaN,
          unit: "µg/m³",
          timestampUtc: "2026-11-22T08:00:00Z"
        }
      ],
      24,
      "2026-11-22T08:00:00Z"
    );
    expect(rNan.diagnostics.discardedFaultOrNegativeCount).toBe(1);
    expect(rNan.rollingAverageConcentration).toBeNull();
  });

  it("NORM-040: createValidatedAggregatedMeasurement rejects unforgeable WeakMap bypass", () => {
    // Attempting to pass a plain object that mimics ValidatedAggregatedMeasurement
    const forgedMeasurement = {
      stationId: "s1",
      pollutant: "PM2.5" as const,
      concentration: 55.0,
      unit: "µg/m³" as const,
      averagingWindowHours: 24 as const,
      recordedAtUtc: "2026-11-22T08:00:00Z",
      validHoursInWindow: 16
    };

    const res = calculateStationCpcbAqi(
      "s1",
      [forgedMeasurement as unknown as Parameters<typeof calculateStationCpcbAqi>[1][0]],
      "2026-11-22T08:00:00Z"
    );
    expect(res.overallAqi).toBeNull();
    expect(res.explanation).toContain("Aggregation boundary violation");
  });

  it("NORM-041: does not substitute forecast points as observations", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      openMeteoProvider: mockOpenMeteoProvider,
      cacheService: testCacheService
    });

    const airQuality = await orchestrator.getStationAirQuality("cpcb_no_obs");
    // Ensure observations list does not contain any TYPE_D_MODEL_FORECAST
    for (const obs of airQuality.observations) {
      expect(obs.typology).not.toBe("TYPE_D_MODEL_FORECAST");
      expect(obs.typology).toBe("TYPE_C_RAW_MEASUREMENT");
    }
  });

  it("NORM-042: routes station query with cpcb_ prefix strictly to CPCB provider", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    await orchestrator.getStationAirQuality("cpcb_delhi_station");
    expect(mockCpcbProvider.getObservations).toHaveBeenCalledWith({
      stationId: "cpcb_delhi_station"
    });
    expect(mockOpenaqProvider.getObservations).not.toHaveBeenCalled();
  });

  it("NORM-043: routes station query without cpcb_ prefix strictly to OpenAQ provider", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    await orchestrator.getStationAirQuality("openaq_8899");
    expect(mockOpenaqProvider.getObservations).toHaveBeenCalledWith({
      stationId: "openaq_8899"
    });
    expect(mockCpcbProvider.getObservations).not.toHaveBeenCalled();
  });

  it("NORM-044: isolates errors and reports warnings when calculation engine throws", async () => {
    const singleObs: NormalizedObservation = {
      id: "single_obs",
      stationId: "cpcb_single",
      stationName: "Single",
      providerId: "CPCB_CAAQMS",
      pollutant: "PM2.5",
      value: 50.0,
      unit: "µg/m³",
      averagingPeriod: "UNKNOWN",
      typology: "TYPE_C_RAW_MEASUREMENT",
      observationTime: "2026-11-22T08:00:00Z",
      sourceUpdateTime: null,
      retrievalTime: "2026-11-22T08:05:00Z",
      qualityFlag: "VERIFIED",
      license: "L",
      attribution: "A"
    };

    mockCpcbProvider.getObservations = vi.fn().mockResolvedValue({
      providerId: "CPCB_CAAQMS",
      observations: [singleObs],
      retrievedAt: "2026-11-22T08:05:00Z",
      status: "CONFIGURED",
      warnings: []
    });

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    const res = await orchestrator.getStationAirQuality("cpcb_single");
    expect(res.aqiStatus).toBe("AQI_UNAVAILABLE");
    expect(res.calculatedAqi).toBeNull();
    expect(res.statusMessage).toContain("fewer than 3 valid pollutants");
  });

  it("NORM-045: preserves provider attribution and license in StationAirQualityResult", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    const res = await orchestrator.getStationAirQuality("cpcb_test_id");
    expect(res.provider).toBe("CPCB_CAAQMS");
    expect(res.retrievedAt).toBeDefined();
  });

  // SourceOrchestrator Search & Forecast
  it("NORM-046: searchNearbyStations aggregates stations from both CPCB and OpenAQ", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    const res = await orchestrator.searchNearbyStations({
      latitude: 28.61,
      longitude: 77.20,
      radiusKm: 50
    });

    expect(res.stations).toHaveLength(2);
    const providerIds = res.stations.map((s) => s.providerId);
    expect(providerIds).toContain("CPCB_CAAQMS");
    expect(providerIds).toContain("OPENAQ");
  });

  it("NORM-047: searchNearbyStations sorts results strictly by distanceKm ascending", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    const res = await orchestrator.searchNearbyStations({
      latitude: 28.61,
      longitude: 77.20,
      radiusKm: 50
    });

    expect(res.stations[0]?.distanceKm).toBe(2.1); // openaq_101
    expect(res.stations[1]?.distanceKm).toBe(5.2); // cpcb_anand_vihar
  });

  it("NORM-048: trips circuit breaker after successive provider failures", async () => {
    const failingProvider: AirQualityProvider = {
      ...mockCpcbProvider,
      searchStations: vi.fn().mockRejectedValue(new Error("CPCB API Network Crash"))
    };

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: failingProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    // Fire 5 consecutive requests with distinct coordinates to bypass cache and trip breaker
    for (let i = 0; i < 5; i++) {
      await orchestrator.searchNearbyStations({ latitude: 28.61 + i * 0.1, longitude: 77.20 });
    }

    // 6th request: CPCB circuit breaker is OPEN, falls back to OpenAQ
    const sixthRes = await orchestrator.searchNearbyStations({ latitude: 28.61 + 5 * 0.1, longitude: 77.20 });
    expect(sixthRes.warnings.some((w) => w.includes("circuit breaker is OPEN"))).toBe(true);
    expect(sixthRes.stations).toHaveLength(1);
    expect(sixthRes.stations[0]?.providerId).toBe("OPENAQ");
  });

  it("NORM-049: caches nearby station search to avoid redundant upstream calls", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20, radiusKm: 50 });
    await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20, radiusKm: 50 });

    // Should only have called providers once due to cache
    expect(mockCpcbProvider.searchStations).toHaveBeenCalledTimes(1);
    expect(mockOpenaqProvider.searchStations).toHaveBeenCalledTimes(1);
  });

  it("NORM-050: getForecast delegates to Open-Meteo and returns CAMS forecast", async () => {
    const orchestrator = new SourceOrchestrator({
      openMeteoProvider: mockOpenMeteoProvider,
      cacheService: testCacheService
    });

    const res = await orchestrator.getForecast({
      latitude: 28.61,
      longitude: 77.20,
      horizonDays: 3
    });

    expect(res.modelDomain).toBe("cams_global");
    expect(res.spatialResolutionKm).toBe(45);
    expect(res.temporalResolutionHours).toBe(3);
    expect(res.forecast).toHaveLength(1);
    expect(res.forecast[0]?.pollutant).toBe("PM2.5");
    expect(res.forecast[0]?.typology).toBe("TYPE_D_MODEL_FORECAST");
  });

  it("NORM-051: caches forecast requests for 3600s", async () => {
    const orchestrator = new SourceOrchestrator({
      openMeteoProvider: mockOpenMeteoProvider,
      cacheService: testCacheService
    });

    await orchestrator.getForecast({ latitude: 28.61, longitude: 77.20 });
    await orchestrator.getForecast({ latitude: 28.61, longitude: 77.20 });

    expect(mockOpenMeteoProvider.getForecast).toHaveBeenCalledTimes(1);
  });

  it("NORM-052: caches station air quality observations for 300s", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    await orchestrator.getStationAirQuality("cpcb_cache_station");
    await orchestrator.getStationAirQuality("cpcb_cache_station");

    expect(mockCpcbProvider.getObservations).toHaveBeenCalledTimes(1);
  });

  it("NORM-053: searchNearbyStations ignores Open-Meteo since it provides no stations", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      openMeteoProvider: mockOpenMeteoProvider,
      cacheService: testCacheService
    });

    const res = await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    expect(mockOpenMeteoProvider.searchStations).not.toHaveBeenCalled();
    for (const s of res.stations) {
      expect(s.providerId).not.toBe("OPEN_METEO_CAMS");
    }
  });

  it("NORM-054: handles unconfigured CPCB provider gracefully in searchNearbyStations", async () => {
    const unconfiguredCpcb: AirQualityProvider = {
      ...mockCpcbProvider,
      searchStations: vi.fn().mockResolvedValue({
        providerId: "CPCB_CAAQMS",
        stations: [],
        retrievedAt: "2026-11-22T08:00:00Z",
        status: "NOT_CONFIGURED",
        warnings: ["CPCB is NOT_CONFIGURED"]
      })
    };

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: unconfiguredCpcb,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    const res = await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    expect(res.stations).toHaveLength(1);
    expect(res.stations[0]?.providerId).toBe("OPENAQ");
    expect(res.warnings[0]).toContain("NOT_CONFIGURED");
  });

  it("NORM-055: handles unconfigured OpenAQ provider gracefully in searchNearbyStations", async () => {
    const unconfiguredOpenaq: AirQualityProvider = {
      ...mockOpenaqProvider,
      searchStations: vi.fn().mockResolvedValue({
        providerId: "OPENAQ",
        stations: [],
        retrievedAt: "2026-11-22T08:00:00Z",
        status: "NOT_CONFIGURED",
        warnings: ["OpenAQ is NOT_CONFIGURED"]
      })
    };

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: unconfiguredOpenaq,
      cacheService: testCacheService
    });

    const res = await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    expect(res.stations).toHaveLength(1);
    expect(res.stations[0]?.providerId).toBe("CPCB_CAAQMS");
    expect(res.warnings[0]).toContain("NOT_CONFIGURED");
  });
});
