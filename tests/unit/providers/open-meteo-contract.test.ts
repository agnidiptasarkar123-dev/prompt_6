// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenMeteoClient } from "@/services/providers/open-meteo/open-meteo-client";
import { OpenMeteoAdapter } from "@/services/providers/open-meteo/open-meteo-adapter";
import type { OpenMeteoApiResponse } from "@/schemas/providers/open-meteo-upstream.schema";

describe("Open-Meteo CAMS Global Provider Contract Tests", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const sampleApiResponse: OpenMeteoApiResponse = {
    latitude: 28.625,
    longitude: 77.25,
    generationtime_ms: 1.25,
    utc_offset_seconds: 0,
    timezone: "UTC",
    timezone_abbreviation: "UTC",
    hourly_units: {
      time: "iso8601",
      pm2_5: "μg/m³",
      pm10: "μg/m³",
      nitrogen_dioxide: "μg/m³",
      sulphur_dioxide: "μg/m³",
      carbon_monoxide: "μg/m³",
      ozone: "μg/m³"
    },
    hourly: {
      time: ["2026-11-22T00:00", "2026-11-22T01:00"],
      pm2_5: [65.4, 72.1],
      pm10: [120.5, 135.0],
      nitrogen_dioxide: [40.2, 45.0],
      sulphur_dioxide: [15.3, 16.0],
      carbon_monoxide: [1500.0, 1800.0], // in µg/m³ from Open-Meteo
      ozone: [25.0, 22.0]
    }
  };

  // Client Tests
  it("PRV-MET-001: initializes with default base URL and timeout", () => {
    const client = new OpenMeteoClient();
    expect(client).toBeDefined();
  });

  it("PRV-MET-002: initializes with custom base URL and timeout", () => {
    const client = new OpenMeteoClient({
      baseUrl: "https://custom.open-meteo.com",
      timeoutMs: 5000
    });
    expect(client).toBeDefined();
  });

  it("PRV-MET-003: constructs request URL with domains=cams_global", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await client.getCamsForecast({ latitude: 28.61, longitude: 77.20 });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(calledUrl.searchParams.get("domains")).toBe("cams_global");
    expect(calledUrl.searchParams.get("latitude")).toBe("28.61");
    expect(calledUrl.searchParams.get("longitude")).toBe("77.2");
  });

  it("PRV-MET-004: constructs request URL with all 6 required CAMS pollutant variables", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await client.getCamsForecast({ latitude: 28.61, longitude: 77.20 });

    const calledUrl = new URL(mockFetch.mock.calls[0]?.[0]);
    const hourlyParam = calledUrl.searchParams.get("hourly");
    expect(hourlyParam).toContain("pm2_5");
    expect(hourlyParam).toContain("pm10");
    expect(hourlyParam).toContain("nitrogen_dioxide");
    expect(hourlyParam).toContain("sulphur_dioxide");
    expect(hourlyParam).toContain("carbon_monoxide");
    expect(hourlyParam).toContain("ozone");
  });

  it("PRV-MET-005: sets timezone to UTC in request", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await client.getCamsForecast({ latitude: 28.61, longitude: 77.20 });

    const calledUrl = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(calledUrl.searchParams.get("timezone")).toBe("UTC");
  });

  it("PRV-MET-006: caps horizonDays parameter to at most 5 days", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await client.getCamsForecast({ latitude: 28.61, longitude: 77.20, horizonDays: 14 });

    const calledUrl = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(calledUrl.searchParams.get("forecast_days")).toBe("5");
  });

  it("PRV-MET-007: passes valid horizonDays when under 5 days", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await client.getCamsForecast({ latitude: 28.61, longitude: 77.20, horizonDays: 3 });

    const calledUrl = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(calledUrl.searchParams.get("forecast_days")).toBe("3");
  });

  it("PRV-MET-008: handles HTTP 400 Bad Request error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers()
    });

    const client = new OpenMeteoClient();
    await expect(client.getCamsForecast({ latitude: 999, longitude: 999 })).rejects.toThrow(
      /HTTP 400/
    );
  });

  it("PRV-MET-009: handles HTTP 429 Rate Limit error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers()
    });

    const client = new OpenMeteoClient();
    await expect(client.getCamsForecast({ latitude: 28.61, longitude: 77.20 })).rejects.toThrow(
      /HTTP 429/
    );
  });

  it("PRV-MET-010: handles HTTP 500/503 upstream errors", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers()
    });

    const client = new OpenMeteoClient();
    await expect(client.getCamsForecast({ latitude: 28.61, longitude: 77.20 })).rejects.toThrow(
      /HTTP 503/
    );
  });

  it("PRV-MET-011: handles request timeout via AbortError", async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });

    const client = new OpenMeteoClient({ timeoutMs: 100 });
    await expect(client.getCamsForecast({ latitude: 28.61, longitude: 77.20 })).rejects.toThrow(
      /timed out/
    );
  });

  it("PRV-MET-012: validates upstream JSON response with Zod schema", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ unexpected: "data" })
    });

    const client = new OpenMeteoClient();
    await expect(client.getCamsForecast({ latitude: 28.61, longitude: 77.20 })).rejects.toThrow();
  });

  // Adapter Capabilities & Truthfulness
  it("PRV-MET-013: reports correct capabilities with providesAtmosphericForecast true", async () => {
    const adapter = new OpenMeteoAdapter();
    const caps = await adapter.getCapabilities();

    expect(caps.providerId).toBe("OPEN_METEO_CAMS");
    expect(caps.providesAtmosphericForecast).toBe(true);
    expect(caps.providesGroundObservations).toBe(false);
    expect(caps.providesStationSearch).toBe(false);
  });

  it("PRV-MET-014: provides CC BY 4.0 license and Copernicus CAMS attribution", async () => {
    const adapter = new OpenMeteoAdapter();
    const caps = await adapter.getCapabilities();

    expect(caps.legalLicense).toContain("CC BY 4.0");
    expect(caps.mandatoryAttribution).toContain("Copernicus Atmosphere Monitoring Service");
    expect(caps.mandatoryAttribution).toContain("CAMS Global");
  });

  it("PRV-MET-015: searchStations returns empty list with explicit model warning", async () => {
    const adapter = new OpenMeteoAdapter();
    const res = await adapter.searchStations({ latitude: 28.61, longitude: 77.20 });

    expect(res.providerId).toBe("OPEN_METEO_CAMS");
    expect(res.stations).toHaveLength(0);
    expect(res.status).toBe("CONFIGURED");
    expect(res.warnings[0]).toContain("not a ground station network");
  });

  it("PRV-MET-016: getObservations returns empty list with explicit non-ground warning", async () => {
    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getObservations({ stationId: "cams_grid_1" });

    expect(res.providerId).toBe("OPEN_METEO_CAMS");
    expect(res.observations).toHaveLength(0);
    expect(res.status).toBe("CONFIGURED");
    expect(res.warnings[0]).toContain("does not provide real-time ground monitoring");
  });

  // Forecast Transformation & Provenance
  it("PRV-MET-017: converts Open-Meteo CO from µg/m³ to mg/m³", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });

    const coForecasts = res.forecast.filter((f) => f.pollutant === "CO");
    expect(coForecasts.length).toBeGreaterThan(0);
    expect(coForecasts[0]?.unit).toBe("mg/m³");
    // 1500 µg/m³ -> 1.5 mg/m³
    expect(coForecasts[0]?.forecastValue).toBe(1.5);
    // 1800 µg/m³ -> 1.8 mg/m³
    expect(coForecasts[1]?.forecastValue).toBe(1.8);
  });

  it("PRV-MET-018: preserves PM2.5, PM10, NO2, SO2, O3 units as µg/m³", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });

    const pm25 = res.forecast.find((f) => f.pollutant === "PM2.5");
    expect(pm25?.unit).toBe("µg/m³");
    expect(pm25?.forecastValue).toBe(65.4);

    const pm10 = res.forecast.find((f) => f.pollutant === "PM10");
    expect(pm10?.unit).toBe("µg/m³");
    expect(pm10?.forecastValue).toBe(120.5);

    const no2 = res.forecast.find((f) => f.pollutant === "NO2");
    expect(no2?.unit).toBe("µg/m³");
    expect(no2?.forecastValue).toBe(40.2);

    const so2 = res.forecast.find((f) => f.pollutant === "SO2");
    expect(so2?.unit).toBe("µg/m³");
    expect(so2?.forecastValue).toBe(15.3);

    const o3 = res.forecast.find((f) => f.pollutant === "O3");
    expect(o3?.unit).toBe("µg/m³");
    expect(o3?.forecastValue).toBe(25.0);
  });

  it("PRV-MET-019: strictly tags every forecast point as TYPE_D_MODEL_FORECAST", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });

    for (const point of res.forecast) {
      expect(point.typology).toBe("TYPE_D_MODEL_FORECAST");
    }
  });

  it("PRV-MET-020: sets modelDomain to CAMS_GLOBAL with ~45 km spatial resolution", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });

    expect(res.modelDomain).toBe("cams_global");
    expect(res.spatialResolutionKm).toBe(45);
    expect(res.temporalResolutionHours).toBe(3);

    for (const point of res.forecast) {
      expect(point.modelDomain).toBe("cams_global");
      expect(point.spatialResolutionKm).toBe(45);
      expect(point.temporalResolutionHours).toBe(3);
    }
  });

  it("PRV-MET-021: sets valid ISO 8601 UTC timestamp ending in Z for validTime", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });

    for (const point of res.forecast) {
      expect(point.validTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
    }
  });

  it("PRV-MET-022: filters out negative forecast values", async () => {
    const invalidApiResponse: OpenMeteoApiResponse = {
      ...sampleApiResponse,
      hourly: {
        time: ["2026-11-22T00:00"],
        pm2_5: [-99.0], // negative value
        pm10: [100.0],
        nitrogen_dioxide: [null], // null
        sulphur_dioxide: [null], // null
        carbon_monoxide: [1200.0],
        ozone: [30.0]
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => invalidApiResponse
    });

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });

    const pm25 = res.forecast.find((f) => f.pollutant === "PM2.5");
    expect(pm25).toBeUndefined();

    const no2 = res.forecast.find((f) => f.pollutant === "NO2");
    expect(no2).toBeUndefined();

    const so2 = res.forecast.find((f) => f.pollutant === "SO2");
    expect(so2).toBeUndefined();

    const pm10 = res.forecast.find((f) => f.pollutant === "PM10");
    expect(pm10).toBeDefined();
    expect(pm10?.forecastValue).toBe(100.0);
  });

  it("PRV-MET-023: includes query coordinates in each normalized forecast item", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...sampleApiResponse, latitude: 22.57, longitude: 88.36 })
    });

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 22.57, longitude: 88.36 });

    for (const point of res.forecast) {
      expect(point.latitude).toBe(22.57);
      expect(point.longitude).toBe(88.36);
    }
  });

  it("PRV-MET-024: generates deterministic unique ID for each forecast point", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });

    const ids = new Set(res.forecast.map((f) => f.id));
    expect(ids.size).toBe(res.forecast.length);
    for (const id of ids) {
      expect(id).toMatch(/^cams_/);
    }
  });

  it("PRV-MET-025: attaches CC BY 4.0 license to every forecast item", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });

    for (const point of res.forecast) {
      expect(point.license).toContain("CC BY 4.0");
      expect(point.attribution).toContain("Copernicus Atmosphere Monitoring Service");
    }
  });

  it("PRV-MET-026: returns UNAVAILABLE status with warnings when fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network connection refused"));

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });

    expect(res.status).toBe("UNAVAILABLE");
    expect(res.forecast).toHaveLength(0);
    expect(res.warnings[0]).toContain("Network connection refused");
  });

  it("PRV-MET-027: returns UNAVAILABLE when upstream times out", async () => {
    const err = new Error("The operation was aborted");
    err.name = "AbortError";
    global.fetch = vi.fn().mockRejectedValue(err);

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });

    expect(res.status).toBe("UNAVAILABLE");
    expect(res.warnings[0]).toContain("timed out");
  });

  it("PRV-MET-028: handles empty hourly time array gracefully", async () => {
    const emptyTimeResponse: OpenMeteoApiResponse = {
      ...sampleApiResponse,
      hourly: {
        time: [],
        pm2_5: [],
        pm10: [],
        nitrogen_dioxide: [],
        sulphur_dioxide: [],
        carbon_monoxide: [],
        ozone: []
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => emptyTimeResponse
    });

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });

    expect(res.status).toBe("CONFIGURED");
    expect(res.forecast).toHaveLength(0);
  });

  it("PRV-MET-029: handles missing pollutants in hourly object gracefully", async () => {
    const partialResponse: OpenMeteoApiResponse = {
      ...sampleApiResponse,
      hourly: {
        time: ["2026-11-22T00:00"],
        pm2_5: [55.0]
        // other pollutants missing / undefined
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => partialResponse
    });

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });

    expect(res.status).toBe("CONFIGURED");
    expect(res.forecast).toHaveLength(1);
    expect(res.forecast[0]?.pollutant).toBe("PM2.5");
    expect(res.forecast[0]?.forecastValue).toBe(55.0);
  });

  it("PRV-MET-030: sets retrievalTime to valid current ISO timestamp", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });

    const adapter = new OpenMeteoAdapter();
    const before = Date.now();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    const after = Date.now();

    const retTime = new Date(res.retrievedAt).getTime();
    expect(retTime).toBeGreaterThanOrEqual(before - 1000);
    expect(retTime).toBeLessThanOrEqual(after + 1000);
  });

  it("PRV-MET-031: supports southern hemisphere / negative coordinates without errors", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...sampleApiResponse, latitude: -12.04, longitude: -77.03 })
    });

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: -12.04, longitude: -77.03 });

    expect(res.status).toBe("CONFIGURED");
    expect(res.forecast[0]?.latitude).toBe(-12.04);
    expect(res.forecast[0]?.longitude).toBe(-77.03);
  });

  it("PRV-MET-032: handles fractional concentration values correctly without precision corruption", async () => {
    const fractionalResponse: OpenMeteoApiResponse = {
      ...sampleApiResponse,
      hourly: {
        time: ["2026-11-22T00:00"],
        pm2_5: [33.3333],
        pm10: [77.7777],
        carbon_monoxide: [1234.56]
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fractionalResponse
    });

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });

    const pm25 = res.forecast.find((f) => f.pollutant === "PM2.5");
    expect(pm25?.forecastValue).toBe(33.3333);

    const co = res.forecast.find((f) => f.pollutant === "CO");
    expect(co?.forecastValue).toBe(1.23); // 1234.56 / 1000 rounded to 2 decimals
  });

  it("PRV-MET-033: returns empty array when time string is invalid / null", async () => {
    const malformedTimeResponse: OpenMeteoApiResponse = {
      ...sampleApiResponse,
      hourly: {
        time: ["" as unknown as string],
        pm2_5: [50.0]
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => malformedTimeResponse
    });

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });

    expect(res.forecast).toHaveLength(0);
  });

  it("PRV-MET-034: sets default cache TTL to 3600s in capabilities", async () => {
    const adapter = new OpenMeteoAdapter();
    const caps = await adapter.getCapabilities();
    expect(caps.defaultCacheTtlSeconds).toBe(3600);
  });

  it("PRV-MET-035: sets rate limit to 600 req/min in capabilities", async () => {
    const adapter = new OpenMeteoAdapter();
    const caps = await adapter.getCapabilities();
    expect(caps.rateLimitPerMinute).toBe(600);
  });
});
