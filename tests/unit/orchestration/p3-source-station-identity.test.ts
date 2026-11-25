// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SourceOrchestrator } from "@/services/air-quality/source-orchestrator";
import { CacheService } from "@/services/cache/cache-service";
import { RedisService } from "@/lib/redis/redis-client";
import type { AirQualityProvider } from "@/services/providers/types";
import type { NormalizedStation, NormalizedObservation } from "@/schemas/providers/normalized-provider.schema";

describe("Phase 3 Source Orchestration & Station Identity Suite (P3-ORCH)", () => {
  let mockCpcbProvider: AirQualityProvider;
  let mockOpenaqProvider: AirQualityProvider;
  let mockOpenMeteoProvider: AirQualityProvider;
  let testCacheService: CacheService;

  const recentObsTime = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const recentRetTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const sampleCpcbStation: NormalizedStation = {
    id: "cpcb_delhi_delhi_anand-vihar",
    providerId: "CPCB_CAAQMS",
    name: "Anand Vihar, Delhi - DPCC",
    city: "Delhi",
    state: "Delhi",
    latitude: 28.6468,
    longitude: 77.3160,
    distanceKm: 2.5,
    availablePollutants: ["PM2.5", "PM10", "NO2", "SO2", "CO", "O3"],
    lastReportedAt: recentObsTime,
    license: "Government Open Data License - India (GODL)",
    attribution: "CPCB / data.gov.in"
  };

  const sampleOpenaqStation: NormalizedStation = {
    id: "openaq_10425",
    providerId: "OPENAQ",
    name: "US Diplomatic Post: New Delhi",
    city: "New Delhi",
    state: "Delhi",
    latitude: 28.598,
    longitude: 77.189,
    distanceKm: 12.1,
    availablePollutants: ["PM2.5", "O3"],
    lastReportedAt: recentObsTime,
    license: "U.S. Government Work",
    attribution: "OpenAQ / US Department of State"
  };

  const sampleCpcbObservations: NormalizedObservation[] = [
    {
      id: "cpcb_delhi_anand-vihar_pm25_1",
      stationId: "cpcb_delhi_delhi_anand-vihar",
      stationName: "Anand Vihar, Delhi - DPCC",
      providerId: "CPCB_CAAQMS",
      pollutant: "PM2.5",
      value: 75.0,
      unit: "µg/m³",
      rawUnit: "µg/m3",
      rawValue: 75.0,
      averagingPeriod: "24h",
      typology: "TYPE_C_RAW_MEASUREMENT",
      observationTime: recentObsTime,
      sourceUpdateTime: null,
      retrievalTime: recentRetTime,
      qualityFlag: "VERIFIED",
      license: "GODL-India",
      attribution: "CPCB / data.gov.in"
    },
    {
      id: "cpcb_delhi_anand-vihar_pm10_1",
      stationId: "cpcb_delhi_delhi_anand-vihar",
      stationName: "Anand Vihar, Delhi - DPCC",
      providerId: "CPCB_CAAQMS",
      pollutant: "PM10",
      value: 150.0,
      unit: "µg/m³",
      rawUnit: "µg/m3",
      rawValue: 150.0,
      averagingPeriod: "24h",
      typology: "TYPE_C_RAW_MEASUREMENT",
      observationTime: recentObsTime,
      sourceUpdateTime: null,
      retrievalTime: recentRetTime,
      qualityFlag: "VERIFIED",
      license: "GODL-India",
      attribution: "CPCB / data.gov.in"
    },
    {
      id: "cpcb_delhi_anand-vihar_no2_1",
      stationId: "cpcb_delhi_delhi_anand-vihar",
      stationName: "Anand Vihar, Delhi - DPCC",
      providerId: "CPCB_CAAQMS",
      pollutant: "NO2",
      value: 45.0,
      unit: "µg/m³",
      rawUnit: "µg/m3",
      rawValue: 45.0,
      averagingPeriod: "24h",
      typology: "TYPE_C_RAW_MEASUREMENT",
      observationTime: recentObsTime,
      sourceUpdateTime: null,
      retrievalTime: recentRetTime,
      qualityFlag: "VERIFIED",
      license: "GODL-India",
      attribution: "CPCB / data.gov.in"
    }
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    testCacheService = new CacheService(new RedisService({}));

    mockCpcbProvider = {
      providerId: "CPCB_CAAQMS",
      getCapabilities: async () => ({
        providerId: "CPCB_CAAQMS",
        displayName: "CPCB CAAQMS",
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
        stations: [sampleCpcbStation],
        retrievedAt: new Date().toISOString(),
        status: "CONFIGURED",
        warnings: []
      }),
      getObservations: vi.fn().mockResolvedValue({
        providerId: "CPCB_CAAQMS",
        observations: sampleCpcbObservations,
        retrievedAt: new Date().toISOString(),
        status: "CONFIGURED",
        warnings: []
      }),
      getForecast: vi.fn().mockResolvedValue({
        providerId: "CPCB_CAAQMS",
        forecast: [],
        retrievedAt: new Date().toISOString(),
        status: "CONFIGURED",
        warnings: ["No forecast support"]
      })
    };

    mockOpenaqProvider = {
      providerId: "OPENAQ",
      getCapabilities: async () => ({
        providerId: "OPENAQ",
        displayName: "OpenAQ v3",
        providesGroundObservations: true,
        providesAtmosphericForecast: false,
        providesStationSearch: true,
        rateLimitPerMinute: 60,
        defaultCacheTtlSeconds: 600,
        legalLicense: "OpenAQ Terms",
        mandatoryAttribution: "OpenAQ"
      }),
      searchStations: vi.fn().mockResolvedValue({
        providerId: "OPENAQ",
        stations: [sampleOpenaqStation],
        retrievedAt: new Date().toISOString(),
        status: "CONFIGURED",
        warnings: []
      }),
      getObservations: vi.fn().mockResolvedValue({
        providerId: "OPENAQ",
        observations: [],
        retrievedAt: new Date().toISOString(),
        status: "CONFIGURED",
        warnings: []
      }),
      getForecast: vi.fn().mockResolvedValue({
        providerId: "OPENAQ",
        forecast: [],
        retrievedAt: new Date().toISOString(),
        status: "CONFIGURED",
        warnings: ["No forecast support"]
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
        retrievedAt: new Date().toISOString(),
        status: "CONFIGURED",
        warnings: ["Forecast model only"]
      }),
      getObservations: vi.fn().mockResolvedValue({
        providerId: "OPEN_METEO_CAMS",
        observations: [],
        retrievedAt: new Date().toISOString(),
        status: "CONFIGURED",
        warnings: ["Forecast model only"]
      }),
      getForecast: vi.fn().mockResolvedValue({
        providerId: "OPEN_METEO_CAMS",
        forecast: [],
        retrievedAt: new Date().toISOString(),
        status: "CONFIGURED",
        warnings: []
      })
    };
  });

  // Section 1: Multi-Provider Search Orchestration (P3-ORCH-001 to P3-ORCH-030)
  it("P3-ORCH-001: combines stations from CPCB and OpenAQ into a unified search result", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      openMeteoProvider: mockOpenMeteoProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    expect(result.stations).toHaveLength(2);
    expect(result.stations.map((s) => s.id)).toContain("cpcb_delhi_delhi_anand-vihar");
    expect(result.stations.map((s) => s.id)).toContain("openaq_10425");
  });

  it("P3-ORCH-002: preserves distinct providerId on each station (CPCB vs OPENAQ)", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    const cpcbStn = result.stations.find((s) => s.providerId === "CPCB_CAAQMS");
    const openaqStn = result.stations.find((s) => s.providerId === "OPENAQ");
    expect(cpcbStn).toBeDefined();
    expect(openaqStn).toBeDefined();
  });

  it("P3-ORCH-003: sorts nearby stations by distanceKm in ascending order (closest first)", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    expect(result.stations[0]!.distanceKm!).toBeLessThanOrEqual(result.stations[1]!.distanceKm!);
  });

  it("P3-ORCH-004: caches search results and does not re-invoke providers on cache hit", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });

    expect(mockCpcbProvider.searchStations).toHaveBeenCalledTimes(1);
    expect(mockOpenaqProvider.searchStations).toHaveBeenCalledTimes(1);
  });

  it("P3-ORCH-005: handles CPCB search failure gracefully by serving OpenAQ stations with warning", async () => {
    mockCpcbProvider.searchStations = vi.fn().mockRejectedValue(new Error("CPCB 500 error"));

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    expect(result.stations).toHaveLength(1);
    expect(result.stations[0]?.providerId).toBe("OPENAQ");
    expect(result.warnings.some((w) => w.includes("CPCB fetch failed"))).toBe(true);
  });

  it("P3-ORCH-006: handles OpenAQ search failure gracefully by serving CPCB stations with warning", async () => {
    mockOpenaqProvider.searchStations = vi.fn().mockRejectedValue(new Error("OpenAQ timeout"));

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    expect(result.stations).toHaveLength(1);
    expect(result.stations[0]?.providerId).toBe("CPCB_CAAQMS");
    expect(result.warnings.some((w) => w.includes("OpenAQ fetch failed"))).toBe(true);
  });

  it("P3-ORCH-007: handles both providers failing by returning empty array and combined warnings", async () => {
    mockCpcbProvider.searchStations = vi.fn().mockRejectedValue(new Error("CPCB down"));
    mockOpenaqProvider.searchStations = vi.fn().mockRejectedValue(new Error("OpenAQ down"));

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    expect(result.stations).toEqual([]);
    expect(result.warnings).toHaveLength(2);
  });

  it("P3-ORCH-008: circuit breaker trips after 5 consecutive failures for CPCB", async () => {
    mockCpcbProvider.searchStations = vi.fn().mockRejectedValue(new Error("Failure"));

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: new CacheService(new RedisService({})) // fresh cache per call
    });

    for (let i = 0; i < 5; i++) {
      await orchestrator.searchNearbyStations({ latitude: 28.61 + i * 0.1, longitude: 77.20 });
    }

    // 6th call should trip circuit breaker and skip CPCB provider entirely
    mockCpcbProvider.searchStations = vi.fn();
    const result = await orchestrator.searchNearbyStations({ latitude: 30.0, longitude: 77.0 });
    expect(mockCpcbProvider.searchStations).not.toHaveBeenCalled();
    expect(result.warnings.some((w) => w.includes("Circuit breaker open for CPCB_CAAQMS"))).toBe(true);
  });

  it("P3-ORCH-009: never queries Open-Meteo CAMS for nearby stations (CAMS has no ground stations)", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      openMeteoProvider: mockOpenMeteoProvider,
      cacheService: testCacheService
    });

    await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    expect(mockOpenMeteoProvider.searchStations).not.toHaveBeenCalled();
  });

  it("P3-ORCH-010: passes query string filter to provider search calls", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20, query: "Anand" });
    expect(mockCpcbProvider.searchStations).toHaveBeenCalledWith(
      expect.objectContaining({ query: "Anand" })
    );
  });

  it("P3-ORCH-011: uses default radiusKm of 50 when not specified", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    expect(mockCpcbProvider.searchStations).toHaveBeenCalledWith(
      expect.objectContaining({ radiusKm: 50 })
    );
  });

  it("P3-ORCH-012: passes custom radiusKm to providers", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20, radiusKm: 15 });
    expect(mockCpcbProvider.searchStations).toHaveBeenCalledWith(
      expect.objectContaining({ radiusKm: 15 })
    );
  });

  it("P3-ORCH-013: preserves availablePollutants list on each station", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    const cpcb = result.stations.find((s) => s.id === "cpcb_delhi_delhi_anand-vihar");
    expect(cpcb?.availablePollutants).toContain("PM2.5");
    expect(cpcb?.availablePollutants).toContain("PM10");
  });

  it("P3-ORCH-014: preserves exact station coordinates", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    const stn = result.stations[0]!;
    expect(stn.latitude).toBeCloseTo(28.6468, 3);
    expect(stn.longitude).toBeCloseTo(77.3160, 3);
  });

  it("P3-ORCH-015: preserves mandatory licensing notice on each station", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    expect(result.stations[0]?.license).toBeTruthy();
    expect(result.stations[1]?.license).toBeTruthy();
  });

  // Section 2: Station Identity & Anti-Merging Rules (P3-ORCH-016 to P3-ORCH-045)
  it("P3-ORCH-016: refuses to merge nearby CPCB and OpenAQ stations even if distance < 200m", async () => {
    // Two stations with near-identical coordinates (<100m apart)
    const veryCloseOpenaq: NormalizedStation = {
      ...sampleOpenaqStation,
      latitude: 28.6469, // ~15m from Anand Vihar
      longitude: 77.3161
    };
    mockOpenaqProvider.searchStations = vi.fn().mockResolvedValue({
      providerId: "OPENAQ",
      stations: [veryCloseOpenaq],
      retrievedAt: new Date().toISOString(),
      status: "CONFIGURED",
      warnings: []
    });

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.searchNearbyStations({ latitude: 28.64, longitude: 77.31 });
    // Both stations must be retained distinctly as separate station entities
    expect(result.stations).toHaveLength(2);
    expect(result.stations.map((s) => s.id)).toEqual([
      "cpcb_delhi_delhi_anand-vihar",
      "openaq_10425"
    ]);
  });

  it("P3-ORCH-017: refuses to merge two distinct CPCB stations in the same city", async () => {
    const cpcbStation2: NormalizedStation = {
      ...sampleCpcbStation,
      id: "cpcb_delhi_delhi_ito",
      name: "ITO, Delhi - CPCB",
      latitude: 28.628,
      longitude: 77.241
    };
    mockCpcbProvider.searchStations = vi.fn().mockResolvedValue({
      providerId: "CPCB_CAAQMS",
      stations: [sampleCpcbStation, cpcbStation2],
      retrievedAt: new Date().toISOString(),
      status: "CONFIGURED",
      warnings: []
    });

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    const cpcbIds = result.stations.filter((s) => s.providerId === "CPCB_CAAQMS").map((s) => s.id);
    expect(cpcbIds).toHaveLength(2);
    expect(cpcbIds).toContain("cpcb_delhi_delhi_anand-vihar");
    expect(cpcbIds).toContain("cpcb_delhi_delhi_ito");
  });

  it("P3-ORCH-018: station IDs are case-sensitive and preserved without accidental lowercasing of OpenAQ IDs", () => {
    expect(sampleOpenaqStation.id).toBe("openaq_10425");
  });

  it("P3-ORCH-019: station provenance contract guarantees providerId is immutable", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    const result = await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    for (const s of result.stations) {
      expect(["CPCB_CAAQMS", "OPENAQ"]).toContain(s.providerId);
    }
  });

  it("P3-ORCH-020: never generates synthetic blended AQI across stations from different providers", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    // Querying air quality for CPCB station Anand Vihar
    const aq = await orchestrator.getStationAirQuality("cpcb_delhi_delhi_anand-vihar");
    expect(aq.station?.providerId).toBe("CPCB_CAAQMS");
    expect(aq.observations.every((o) => o.providerId === "CPCB_CAAQMS")).toBe(true);
  });

  // Section 3: Station Air Quality Retrieval & CPCB Type B Calculation (P3-ORCH-046 to P3-ORCH-085)
  it("P3-ORCH-046: getStationAirQuality routes CPCB stationId to CPCB provider", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    await orchestrator.getStationAirQuality("cpcb_delhi_delhi_anand-vihar");
    expect(mockCpcbProvider.getObservations).toHaveBeenCalledWith(
      expect.objectContaining({ stationId: "cpcb_delhi_delhi_anand-vihar" })
    );
    expect(mockOpenaqProvider.getObservations).not.toHaveBeenCalled();
  });

  it("P3-ORCH-047: getStationAirQuality routes OpenAQ stationId to OpenAQ provider", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    await orchestrator.getStationAirQuality("openaq_10425");
    expect(mockOpenaqProvider.getObservations).toHaveBeenCalledWith(
      expect.objectContaining({ stationId: "openaq_10425" })
    );
    expect(mockCpcbProvider.getObservations).not.toHaveBeenCalled();
  });

  it("P3-ORCH-048: calculates Type B AQI when station observations satisfy CPCB sufficiency (>=3 pollutants with PM)", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    const aq = await orchestrator.getStationAirQuality("cpcb_delhi_delhi_anand-vihar");
    expect(aq.aqiStatus).toBe("AVAILABLE");
    expect(aq.calculatedAqi).not.toBeNull();
    expect(aq.calculatedAqi?.overallAqi).toBe(150); // PM2.5 = 75 µg/m³ -> 150
    expect(aq.calculatedAqi?.prominentPollutant).toBe("PM2.5");
  });

  it("P3-ORCH-049: marks aqiStatus as AQI_UNAVAILABLE when observations have fewer than 3 pollutants", async () => {
    // Only 2 pollutants
    mockCpcbProvider.getObservations = vi.fn().mockResolvedValue({
      providerId: "CPCB_CAAQMS",
      observations: [sampleCpcbObservations[0]!, sampleCpcbObservations[1]!],
      retrievedAt: new Date().toISOString(),
      status: "CONFIGURED",
      warnings: []
    });

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    const aq = await orchestrator.getStationAirQuality("cpcb_delhi_delhi_anand-vihar");
    expect(aq.aqiStatus).toBe("AQI_UNAVAILABLE");
    expect(aq.calculatedAqi).toBeNull();
    expect(aq.statusMessage).toContain("fewer than 3 valid pollutants");
  });

  it("P3-ORCH-050: marks aqiStatus as AQI_UNAVAILABLE when observations are missing PM2.5 and PM10", async () => {
    // 3 gaseous pollutants but NO particulate
    const gasesOnly = [
      sampleCpcbObservations[2]!, // NO2
      { ...sampleCpcbObservations[0]!, pollutant: "SO2", value: 30 },
      { ...sampleCpcbObservations[0]!, pollutant: "NH3", value: 100 }
    ];
    mockCpcbProvider.getObservations = vi.fn().mockResolvedValue({
      providerId: "CPCB_CAAQMS",
      observations: gasesOnly,
      retrievedAt: new Date().toISOString(),
      status: "CONFIGURED",
      warnings: []
    });

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    const aq = await orchestrator.getStationAirQuality("cpcb_delhi_delhi_anand-vihar");
    expect(aq.aqiStatus).toBe("AQI_UNAVAILABLE");
    expect(aq.calculatedAqi).toBeNull();
  });

  it("P3-ORCH-051: marks aqiStatus as STALE when observation timestamp is older than 24 hours", async () => {
    const staleObs = sampleCpcbObservations.map((o) => ({
      ...o,
      observationTime: "2026-11-20T00:00:00Z" // >24h old
    }));
    mockCpcbProvider.getObservations = vi.fn().mockResolvedValue({
      providerId: "CPCB_CAAQMS",
      observations: staleObs,
      retrievedAt: new Date().toISOString(),
      status: "CONFIGURED",
      warnings: []
    });

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    const aq = await orchestrator.getStationAirQuality("cpcb_delhi_delhi_anand-vihar");
    expect(aq.aqiStatus).toBe("STALE");
  });

  it("P3-ORCH-052: caches station air quality result for 300 seconds", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    await orchestrator.getStationAirQuality("cpcb_delhi_delhi_anand-vihar");
    await orchestrator.getStationAirQuality("cpcb_delhi_delhi_anand-vihar");

    expect(mockCpcbProvider.getObservations).toHaveBeenCalledTimes(1);
  });

  it("P3-ORCH-053: returns AQI_UNAVAILABLE when station has no recorded observations", async () => {
    mockCpcbProvider.getObservations = vi.fn().mockResolvedValue({
      providerId: "CPCB_CAAQMS",
      observations: [],
      retrievedAt: new Date().toISOString(),
      status: "CONFIGURED",
      warnings: ["No active telemetry"]
    });

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    const aq = await orchestrator.getStationAirQuality("cpcb_delhi_delhi_anand-vihar");
    expect(aq.aqiStatus).toBe("AQI_UNAVAILABLE");
    expect(aq.calculatedAqi).toBeNull();
  });

  it("P3-ORCH-054: preserves raw records and units on observations in returned result", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    const aq = await orchestrator.getStationAirQuality("cpcb_delhi_delhi_anand-vihar");
    expect(aq.observations[0]?.rawValue).toBe(75.0);
    expect(aq.observations[0]?.rawUnit).toBe("µg/m3");
    expect(aq.observations[0]?.unit).toBe("µg/m³");
  });

  it("P3-ORCH-055: sets provider name to CPCB_CAAQMS for CPCB stations", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    const aq = await orchestrator.getStationAirQuality("cpcb_delhi_delhi_anand-vihar");
    expect(aq.provider).toBe("CPCB_CAAQMS");
  });

  it("P3-ORCH-056: sets provider name to OPENAQ for OpenAQ stations", async () => {
    const orchestrator = new SourceOrchestrator({
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    const aq = await orchestrator.getStationAirQuality("openaq_10425");
    expect(aq.provider).toBe("OPENAQ");
  });

  it("P3-ORCH-057: handles unknown provider prefix safely returning AQI_UNAVAILABLE", async () => {
    const orchestrator = new SourceOrchestrator({
      cacheService: testCacheService
    });

    const aq = await orchestrator.getStationAirQuality("unknown_prefix_123");
    expect(aq.aqiStatus).toBe("AQI_UNAVAILABLE");
    expect(aq.warnings[0]).toContain("Unknown provider prefix");
  });

  // Section 4: Atmospheric Forecast Orchestration (P3-ORCH-086 to P3-ORCH-120)
  it("P3-ORCH-086: getForecast routes exclusively to Open-Meteo CAMS provider", async () => {
    const orchestrator = new SourceOrchestrator({
      openMeteoProvider: mockOpenMeteoProvider,
      cacheService: testCacheService
    });

    await orchestrator.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(mockOpenMeteoProvider.getForecast).toHaveBeenCalledTimes(1);
  });

  it("P3-ORCH-087: caches forecast result for 1800 seconds (30 minutes)", async () => {
    const orchestrator = new SourceOrchestrator({
      openMeteoProvider: mockOpenMeteoProvider,
      cacheService: testCacheService
    });

    await orchestrator.getForecast({ latitude: 28.61, longitude: 77.20 });
    await orchestrator.getForecast({ latitude: 28.61, longitude: 77.20 });

    expect(mockOpenMeteoProvider.getForecast).toHaveBeenCalledTimes(1);
  });

  it("P3-ORCH-088: rounds coordinates to 2 decimal places in forecast cache key", async () => {
    const orchestrator = new SourceOrchestrator({
      openMeteoProvider: mockOpenMeteoProvider,
      cacheService: testCacheService
    });

    await orchestrator.getForecast({ latitude: 28.61234, longitude: 77.20987 });
    await orchestrator.getForecast({ latitude: 28.61499, longitude: 77.20700 });

    // Both round to 28.61, 77.21 so second call is a cache hit!
    expect(mockOpenMeteoProvider.getForecast).toHaveBeenCalledTimes(1);
  });

  it("P3-ORCH-089: passes horizonDays to Open-Meteo provider", async () => {
    const orchestrator = new SourceOrchestrator({
      openMeteoProvider: mockOpenMeteoProvider,
      cacheService: testCacheService
    });

    await orchestrator.getForecast({ latitude: 28.61, longitude: 77.20, horizonDays: 2 });
    expect(mockOpenMeteoProvider.getForecast).toHaveBeenCalledWith(
      expect.objectContaining({ horizonDays: 2 })
    );
  });

  it("P3-ORCH-090: handles forecast provider errors gracefully", async () => {
    mockOpenMeteoProvider.getForecast = vi.fn().mockRejectedValue(new Error("CAMS endpoint down"));

    const orchestrator = new SourceOrchestrator({
      openMeteoProvider: mockOpenMeteoProvider,
      cacheService: testCacheService
    });

    const res = await orchestrator.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast).toEqual([]);
    expect(res.warnings[0]).toContain("CAMS endpoint down");
  });

  it("P3-ORCH-091: verifies circuit breaker isolation: CPCB failure does not trip Open-Meteo", async () => {
    mockCpcbProvider.searchStations = vi.fn().mockRejectedValue(new Error("CPCB down"));

    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openMeteoProvider: mockOpenMeteoProvider,
      cacheService: new CacheService(new RedisService({}))
    });

    // Fail CPCB 5 times
    for (let i = 0; i < 5; i++) {
      await orchestrator.searchNearbyStations({ latitude: 28.61 + i * 0.1, longitude: 77.20 });
    }

    // Open-Meteo should still be fully functional
    const forecast = await orchestrator.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(forecast.warnings).toEqual([]);
  });

  it("P3-ORCH-092: handles concurrent search requests without race conditions", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      openaqProvider: mockOpenaqProvider,
      cacheService: testCacheService
    });

    const [r1, r2, r3] = await Promise.all([
      orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 }),
      orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 }),
      orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 })
    ]);

    expect(r1.stations).toHaveLength(2);
    expect(r2.stations).toHaveLength(2);
    expect(r3.stations).toHaveLength(2);
  });

  it("P3-ORCH-093: end-to-end station air quality pipeline resolves station, observations, and AQI", async () => {
    const orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcbProvider,
      cacheService: testCacheService
    });

    const res = await orchestrator.getStationAirQuality("cpcb_delhi_delhi_anand-vihar");
    expect(res.station?.name).toBe("Anand Vihar, Delhi - DPCC");
    expect(res.observations).toHaveLength(3);
    expect(res.calculatedAqi?.overallAqi).toBe(150);
    expect(res.aqiStatus).toBe("AVAILABLE");
  });
});
