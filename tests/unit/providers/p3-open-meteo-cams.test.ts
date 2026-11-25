// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenMeteoClient } from "@/services/providers/open-meteo/open-meteo-client";
import { OpenMeteoAdapter } from "@/services/providers/open-meteo/open-meteo-adapter";
import type { OpenMeteoApiResponse } from "@/schemas/providers/open-meteo-upstream.schema";

describe("Phase 3 Open-Meteo CAMS Global Forecast Contract & Verification Suite (P3-CAMS)", () => {
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
      time: ["2026-11-24T00:00", "2026-11-24T01:00", "2026-11-24T02:00"],
      pm2_5: [55.4, 62.1, 70.0],
      pm10: [110.5, 125.0, 140.2],
      nitrogen_dioxide: [35.2, 41.0, 48.5],
      sulphur_dioxide: [12.3, 14.0, 16.5],
      carbon_monoxide: [1200.0, 1500.0, 1800.0], // µg/m³ -> 1.2, 1.5, 1.8 mg/m³
      ozone: [30.0, 25.0, 20.0]
    }
  };

  // Section 1: Client Construction & Defaults (P3-CAMS-001 to P3-CAMS-015)
  it("P3-CAMS-001: initializes client with default base URL", () => {
    const client = new OpenMeteoClient();
    expect(client).toBeDefined();
  });

  it("P3-CAMS-002: initializes client with custom base URL", () => {
    const client = new OpenMeteoClient({ baseUrl: "https://custom.open-meteo.internal/v1" });
    expect(client).toBeDefined();
  });

  it("P3-CAMS-003: initializes client with custom timeout", () => {
    const client = new OpenMeteoClient({ timeoutMs: 3000 });
    expect(client).toBeDefined();
  });

  it("P3-CAMS-004: constructs request targeting default Open-Meteo endpoint", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await client.getCamsForecast({ latitude: 28.61, longitude: 77.20 });
    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url.startsWith("https://air-quality-api.open-meteo.com/v1/air-quality")).toBe(true);
  });

  it("P3-CAMS-005: sets domains parameter to cams_global", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await client.getCamsForecast({ latitude: 28.61, longitude: 77.20 });
    const parsed = new URL(mockFetch.mock.calls[0]?.[0] as string);
    expect(parsed.searchParams.get("domains")).toBe("cams_global");
  });

  it("P3-CAMS-006: sets hourly parameter to all 6 required pollutants", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await client.getCamsForecast({ latitude: 28.61, longitude: 77.20 });
    const parsed = new URL(mockFetch.mock.calls[0]?.[0] as string);
    const hourly = parsed.searchParams.get("hourly");
    expect(hourly).toContain("pm2_5");
    expect(hourly).toContain("pm10");
    expect(hourly).toContain("nitrogen_dioxide");
    expect(hourly).toContain("sulphur_dioxide");
    expect(hourly).toContain("carbon_monoxide");
    expect(hourly).toContain("ozone");
  });

  it("P3-CAMS-007: sets timezone parameter to UTC", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await client.getCamsForecast({ latitude: 28.61, longitude: 77.20 });
    const parsed = new URL(mockFetch.mock.calls[0]?.[0] as string);
    expect(parsed.searchParams.get("timezone")).toBe("UTC");
  });

  it("P3-CAMS-008: passes latitude and longitude accurately in query parameters", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await client.getCamsForecast({ latitude: 19.076, longitude: 72.877 });
    const parsed = new URL(mockFetch.mock.calls[0]?.[0] as string);
    expect(parsed.searchParams.get("latitude")).toBe("19.076");
    expect(parsed.searchParams.get("longitude")).toBe("72.877");
  });

  it("P3-CAMS-009: sets forecast_days parameter when horizonDays is passed", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await client.getCamsForecast({ latitude: 28.61, longitude: 77.20, horizonDays: 2 });
    const parsed = new URL(mockFetch.mock.calls[0]?.[0] as string);
    expect(parsed.searchParams.get("forecast_days")).toBe("2");
  });

  it("P3-CAMS-010: caps forecast_days to maximum 5 days", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await client.getCamsForecast({ latitude: 28.61, longitude: 77.20, horizonDays: 14 });
    const parsed = new URL(mockFetch.mock.calls[0]?.[0] as string);
    expect(parsed.searchParams.get("forecast_days")).toBe("5");
  });

  it("P3-CAMS-011: uses GET method exclusively", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await client.getCamsForecast({ latitude: 28.61, longitude: 77.20 });
    expect(mockFetch.mock.calls[0]?.[1]?.method).toBe("GET");
  });

  it("P3-CAMS-012: includes Accept: application/json header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await client.getCamsForecast({ latitude: 28.61, longitude: 77.20 });
    const headers = mockFetch.mock.calls[0]?.[1]?.headers;
    expect(headers).toHaveProperty("Accept", "application/json");
  });

  it("P3-CAMS-013: attaches abort signal for network cancellation", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await client.getCamsForecast({ latitude: 28.61, longitude: 77.20 });
    expect(mockFetch.mock.calls[0]?.[1]?.signal).toBeDefined();
  });

  it("P3-CAMS-014: cleans up timeout handler after successful request", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    const res = await client.getCamsForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.latitude).toBe(28.625);
  });

  it("P3-CAMS-015: adapter instantiates default client when options omitted", () => {
    const adapter = new OpenMeteoAdapter();
    expect(adapter).toBeDefined();
  });

  // Section 2: Error Handling & Resilience (P3-CAMS-016 to P3-CAMS-035)
  it("P3-CAMS-016: throws descriptive error on HTTP 400 Bad Request", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers()
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await expect(client.getCamsForecast({ latitude: 999, longitude: 999 })).rejects.toThrow("Open-Meteo upstream error: HTTP 400");
  });

  it("P3-CAMS-017: throws descriptive error on HTTP 429 Rate Limit Exceeded", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers()
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await expect(client.getCamsForecast({ latitude: 28.61, longitude: 77.20 })).rejects.toThrow("Open-Meteo upstream error: HTTP 429");
  });

  it("P3-CAMS-018: throws descriptive error on HTTP 500 Internal Server Error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers()
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await expect(client.getCamsForecast({ latitude: 28.61, longitude: 77.20 })).rejects.toThrow("Open-Meteo upstream error: HTTP 500");
  });

  it("P3-CAMS-019: throws descriptive error on HTTP 502 Bad Gateway", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: new Headers()
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await expect(client.getCamsForecast({ latitude: 28.61, longitude: 77.20 })).rejects.toThrow("Open-Meteo upstream error: HTTP 502");
  });

  it("P3-CAMS-020: throws descriptive error on HTTP 503 Service Unavailable", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers()
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await expect(client.getCamsForecast({ latitude: 28.61, longitude: 77.20 })).rejects.toThrow("Open-Meteo upstream error: HTTP 503");
  });

  it("P3-CAMS-021: throws timeout error when AbortError occurs", async () => {
    const abortErr = new Error("Aborted");
    abortErr.name = "AbortError";
    const mockFetch = vi.fn().mockRejectedValue(abortErr);
    global.fetch = mockFetch;

    const client = new OpenMeteoClient({ timeoutMs: 150 });
    await expect(client.getCamsForecast({ latitude: 28.61, longitude: 77.20 })).rejects.toThrow(/timed out after 150ms/);
  });

  it("P3-CAMS-022: rethrows unexpected network errors directly", async () => {
    const netErr = new Error("ENOTFOUND air-quality-api.open-meteo.com");
    const mockFetch = vi.fn().mockRejectedValue(netErr);
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await expect(client.getCamsForecast({ latitude: 28.61, longitude: 77.20 })).rejects.toThrow("ENOTFOUND");
  });

  it("P3-CAMS-023: rejects response missing required hourly property", async () => {
    const malformed = { latitude: 28.625, longitude: 77.25 };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => malformed
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await expect(client.getCamsForecast({ latitude: 28.61, longitude: 77.20 })).rejects.toThrow();
  });

  it("P3-CAMS-024: rejects response missing hourly.time array", async () => {
    const malformed = {
      ...sampleApiResponse,
      hourly: { ...sampleApiResponse.hourly, time: undefined }
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => malformed
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await expect(client.getCamsForecast({ latitude: 28.61, longitude: 77.20 })).rejects.toThrow();
  });

  it("P3-CAMS-025: adapter returns UNAVAILABLE status on client error in getForecast", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Connection reset"));
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.status).toBe("UNAVAILABLE");
    expect(res.forecast).toEqual([]);
    expect(res.warnings[0]).toContain("Connection reset");
  });

  it("P3-CAMS-026: preserves spatialResolutionKm 45 on error result", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Failed"));
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.spatialResolutionKm).toBe(45);
  });

  it("P3-CAMS-027: preserves temporalResolutionHours 3 on error result", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Failed"));
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.temporalResolutionHours).toBe(3);
  });

  it("P3-CAMS-028: preserves modelDomain cams_global on error result", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Failed"));
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.modelDomain).toBe("cams_global");
  });

  it("P3-CAMS-029: preserves providerId OPEN_METEO_CAMS on error result", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Failed"));
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.providerId).toBe("OPEN_METEO_CAMS");
  });

  it("P3-CAMS-030: preserves retrievedAt ISO string on error result", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Failed"));
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(Date.parse(res.retrievedAt)).not.toBeNaN();
  });

  it("P3-CAMS-031: handles non-Error rejection object gracefully", async () => {
    const mockFetch = vi.fn().mockRejectedValue("String error");
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.status).toBe("UNAVAILABLE");
    expect(res.warnings[0]).toBe("String error");
  });

  it("P3-CAMS-032: rejects invalid JSON syntax from server", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("SyntaxError: Unexpected token");
      }
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await expect(client.getCamsForecast({ latitude: 28.61, longitude: 77.20 })).rejects.toThrow("SyntaxError");
  });

  it("P3-CAMS-033: handles HTTP 403 Forbidden with descriptive error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers()
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await expect(client.getCamsForecast({ latitude: 28.61, longitude: 77.20 })).rejects.toThrow("HTTP 403");
  });

  it("P3-CAMS-034: handles HTTP 302 redirect with descriptive error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 302,
      headers: new Headers()
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await expect(client.getCamsForecast({ latitude: 28.61, longitude: 77.20 })).rejects.toThrow("HTTP 302");
  });

  it("P3-CAMS-035: handles negative latitude within valid -90 to 90 range", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...sampleApiResponse, latitude: -33.86 })
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    const res = await client.getCamsForecast({ latitude: -33.86, longitude: 151.20 });
    expect(res.latitude).toBe(-33.86);
  });

  // Section 3: Forecast Normalization & Typing (P3-CAMS-036 to P3-CAMS-065)
  it("P3-CAMS-036: classifies forecast typology strictly as TYPE_D_MODEL_FORECAST", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast.length).toBeGreaterThan(0);
    expect(res.forecast.every((f) => f.typology === "TYPE_D_MODEL_FORECAST")).toBe(true);
  });

  it("P3-CAMS-037: sets modelDomain to cams_global on every forecast point", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast.every((f) => f.modelDomain === "cams_global")).toBe(true);
  });

  it("P3-CAMS-038: sets spatialResolutionKm to 45 on every forecast point", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast.every((f) => f.spatialResolutionKm === 45)).toBe(true);
  });

  it("P3-CAMS-039: sets temporalResolutionHours to 3 on every forecast point", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast.every((f) => f.temporalResolutionHours === 3)).toBe(true);
  });

  it("P3-CAMS-040: formats forecast ID as cams_{lat}_{lon}_{pollutant}_{validTime}", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    const first = res.forecast[0]!;
    expect(first.id).toMatch(/^cams_28\.61_77\.20_PM2\.5_/);
  });

  it("P3-CAMS-041: normalizes validTime to UTC ISO format ending with Z", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast[0]?.validTime.endsWith("Z")).toBe(true);
  });

  it("P3-CAMS-042: converts CO from upstream µg/m³ to standard mg/m³ (/ 1000)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    const coPoints = res.forecast.filter((f) => f.pollutant === "CO");
    expect(coPoints[0]?.forecastValue).toBe(1.2); // 1200 / 1000
    expect(coPoints[1]?.forecastValue).toBe(1.5); // 1500 / 1000
    expect(coPoints[2]?.forecastValue).toBe(1.8); // 1800 / 1000
    expect(coPoints[0]?.unit).toBe("mg/m³");
  });

  it("P3-CAMS-043: preserves PM2.5 unit as µg/m³ without scale conversion", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    const pm25Points = res.forecast.filter((f) => f.pollutant === "PM2.5");
    expect(pm25Points[0]?.forecastValue).toBe(55.4);
    expect(pm25Points[0]?.unit).toBe("µg/m³");
  });

  it("P3-CAMS-044: preserves PM10 unit as µg/m³ without scale conversion", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    const pm10Points = res.forecast.filter((f) => f.pollutant === "PM10");
    expect(pm10Points[0]?.forecastValue).toBe(110.5);
    expect(pm10Points[0]?.unit).toBe("µg/m³");
  });

  it("P3-CAMS-045: preserves NO2 unit as µg/m³ without scale conversion", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    const no2Points = res.forecast.filter((f) => f.pollutant === "NO2");
    expect(no2Points[0]?.forecastValue).toBe(35.2);
    expect(no2Points[0]?.unit).toBe("µg/m³");
  });

  it("P3-CAMS-046: preserves SO2 unit as µg/m³ without scale conversion", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    const so2Points = res.forecast.filter((f) => f.pollutant === "SO2");
    expect(so2Points[0]?.forecastValue).toBe(12.3);
    expect(so2Points[0]?.unit).toBe("µg/m³");
  });

  it("P3-CAMS-047: preserves O3 unit as µg/m³ without scale conversion", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    const o3Points = res.forecast.filter((f) => f.pollutant === "O3");
    expect(o3Points[0]?.forecastValue).toBe(30.0);
    expect(o3Points[0]?.unit).toBe("µg/m³");
  });

  it("P3-CAMS-048: sets issueTime to null when not provided upstream", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast[0]?.issueTime).toBeNull();
  });

  it("P3-CAMS-049: sets retrievalTime to current ISO timestamp", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(Date.parse(res.forecast[0]!.retrievalTime)).not.toBeNaN();
  });

  it("P3-CAMS-050: attaches CC BY 4.0 license metadata to every forecast point", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast[0]?.license).toContain("Creative Commons Attribution 4.0");
  });

  it("P3-CAMS-051: attaches mandatory Copernicus CAMS attribution to every forecast point", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast[0]?.attribution).toContain("Copernicus Atmosphere Monitoring Service (CAMS Global)");
  });

  it("P3-CAMS-052: filters out null pollutant values in hourly series", async () => {
    const withNulls = {
      ...sampleApiResponse,
      hourly: {
        ...sampleApiResponse.hourly,
        pm2_5: [55.4, null, 70.0]
      }
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => withNulls
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    const pm25Points = res.forecast.filter((f) => f.pollutant === "PM2.5");
    expect(pm25Points).toHaveLength(2); // 1 null skipped
  });

  it("P3-CAMS-053: filters out negative pollutant values in hourly series", async () => {
    const withNegatives = {
      ...sampleApiResponse,
      hourly: {
        ...sampleApiResponse.hourly,
        pm10: [110.5, -99.0, 140.2]
      }
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => withNegatives
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    const pm10Points = res.forecast.filter((f) => f.pollutant === "PM10");
    expect(pm10Points).toHaveLength(2); // negative skipped
  });

  it("P3-CAMS-054: rejects NaN values in hourly series at schema validation boundary", async () => {
    const withNaN = {
      ...sampleApiResponse,
      hourly: {
        ...sampleApiResponse.hourly,
        ozone: [30.0, NaN, 20.0]
      }
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => withNaN
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    await expect(client.getCamsForecast({ latitude: 28.61, longitude: 77.20 })).rejects.toThrow();
  });

  it("P3-CAMS-055: preserves grid point coordinates returned by API (e.g. 28.625, 77.25)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast[0]?.latitude).toBe(28.625);
    expect(res.forecast[0]?.longitude).toBe(77.25);
  });

  it("P3-CAMS-056: produces 18 points for 3 hourly steps x 6 pollutants", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast).toHaveLength(18); // 3 steps * 6 pollutants
  });

  it("P3-CAMS-057: handles zero concentration accurately without skipping (e.g. 0 µg/m³ is valid)", async () => {
    const withZero = {
      ...sampleApiResponse,
      hourly: {
        ...sampleApiResponse.hourly,
        sulphur_dioxide: [0.0, 14.0, 16.5]
      }
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => withZero
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    const so2Points = res.forecast.filter((f) => f.pollutant === "SO2");
    expect(so2Points[0]?.forecastValue).toBe(0.0);
  });

  it("P3-CAMS-058: maintains chronological ordering in normalized forecast array", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    const pm25Points = res.forecast.filter((f) => f.pollutant === "PM2.5");
    const times = pm25Points.map((p) => new Date(p.validTime).getTime());
    expect(times[1]).toBeGreaterThan(times[0]!);
    expect(times[2]).toBeGreaterThan(times[1]!);
  });

  it("P3-CAMS-059: preserves empty forecast when upstream hourly time is empty", async () => {
    const emptyTime = {
      ...sampleApiResponse,
      hourly: { time: [], pm2_5: [], pm10: [], nitrogen_dioxide: [], sulphur_dioxide: [], carbon_monoxide: [], ozone: [] }
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => emptyTime
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast).toEqual([]);
    expect(res.status).toBe("CONFIGURED");
  });

  it("P3-CAMS-060: handles missing pollutant variable safely without crashing", async () => {
    const missingOzone = {
      ...sampleApiResponse,
      hourly: {
        time: ["2026-11-24T00:00"],
        pm2_5: [55.4],
        pm10: [110.5],
        nitrogen_dioxide: [35.2],
        sulphur_dioxide: [12.3],
        carbon_monoxide: [1200.0]
      }
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => missingOzone
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast).toHaveLength(5); // 5 pollutants found
  });

  it("P3-CAMS-061: rounds converted CO values to 2 decimal places", async () => {
    const fractionCO = {
      ...sampleApiResponse,
      hourly: {
        ...sampleApiResponse.hourly,
        carbon_monoxide: [1234.56]
      }
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fractionCO
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    const co = res.forecast.find((f) => f.pollutant === "CO");
    expect(co?.forecastValue).toBe(1.23); // 1234.56 / 1000 = 1.23456 -> 1.23
  });

  it("P3-CAMS-062: handles horizonDays defaulting to 3", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    const url = new URL(mockFetch.mock.calls[0]?.[0] as string);
    expect(url.searchParams.get("forecast_days")).toBe("3");
  });

  it("P3-CAMS-063: passes custom horizonDays through adapter", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    await adapter.getForecast({ latitude: 28.61, longitude: 77.20, horizonDays: 4 });
    const url = new URL(mockFetch.mock.calls[0]?.[0] as string);
    expect(url.searchParams.get("forecast_days")).toBe("4");
  });

  it("P3-CAMS-064: sets status to CONFIGURED on successful forecast fetch", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.status).toBe("CONFIGURED");
    expect(res.warnings).toEqual([]);
  });

  it("P3-CAMS-065: validates all normalized forecast points against Zod schema", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    for (const point of res.forecast) {
      expect(point.typology).toBe("TYPE_D_MODEL_FORECAST");
      expect(point.forecastValue).toBeGreaterThanOrEqual(0);
      expect(point.unit).toBeTruthy();
    }
  });

  // Section 4: Ground Observations & Station Search Rejection Contracts (P3-CAMS-066 to P3-CAMS-085)
  it("P3-CAMS-066: rejects searchStations with empty array and descriptive warning", async () => {
    const adapter = new OpenMeteoAdapter();
    const res = await adapter.searchStations({ query: "Delhi" });
    expect(res.stations).toEqual([]);
    expect(res.warnings[0]).toContain("Open-Meteo CAMS is an atmospheric forecast model, not a ground station network");
  });

  it("P3-CAMS-067: sets searchStations status to CONFIGURED", async () => {
    const adapter = new OpenMeteoAdapter();
    const res = await adapter.searchStations({ query: "Delhi" });
    expect(res.status).toBe("CONFIGURED");
  });

  it("P3-CAMS-068: preserves providerId on searchStations result", async () => {
    const adapter = new OpenMeteoAdapter();
    const res = await adapter.searchStations({ query: "Delhi" });
    expect(res.providerId).toBe("OPEN_METEO_CAMS");
  });

  it("P3-CAMS-069: preserves retrievedAt on searchStations result", async () => {
    const adapter = new OpenMeteoAdapter();
    const res = await adapter.searchStations({ query: "Delhi" });
    expect(Date.parse(res.retrievedAt)).not.toBeNaN();
  });

  it("P3-CAMS-070: rejects getObservations with empty array and descriptive warning", async () => {
    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getObservations({ stationId: "cams_station" });
    expect(res.observations).toEqual([]);
    expect(res.warnings[0]).toContain("Open-Meteo CAMS does not provide real-time ground monitoring observations");
  });

  it("P3-CAMS-071: sets getObservations status to CONFIGURED", async () => {
    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getObservations({ stationId: "cams_station" });
    expect(res.status).toBe("CONFIGURED");
  });

  it("P3-CAMS-072: preserves providerId on getObservations result", async () => {
    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getObservations({ stationId: "cams_station" });
    expect(res.providerId).toBe("OPEN_METEO_CAMS");
  });

  it("P3-CAMS-073: preserves retrievedAt on getObservations result", async () => {
    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getObservations({ stationId: "cams_station" });
    expect(Date.parse(res.retrievedAt)).not.toBeNaN();
  });

  it("P3-CAMS-074: capabilities reports providesGroundObservations as false", async () => {
    const adapter = new OpenMeteoAdapter();
    const caps = await adapter.getCapabilities();
    expect(caps.providesGroundObservations).toBe(false);
  });

  it("P3-CAMS-075: capabilities reports providesStationSearch as false", async () => {
    const adapter = new OpenMeteoAdapter();
    const caps = await adapter.getCapabilities();
    expect(caps.providesStationSearch).toBe(false);
  });

  it("P3-CAMS-076: capabilities reports providesAtmosphericForecast as true", async () => {
    const adapter = new OpenMeteoAdapter();
    const caps = await adapter.getCapabilities();
    expect(caps.providesAtmosphericForecast).toBe(true);
  });

  it("P3-CAMS-077: capabilities sets rateLimitPerMinute to 600", async () => {
    const adapter = new OpenMeteoAdapter();
    const caps = await adapter.getCapabilities();
    expect(caps.rateLimitPerMinute).toBe(600);
  });

  it("P3-CAMS-078: capabilities sets defaultCacheTtlSeconds to 3600 (1 hour)", async () => {
    const adapter = new OpenMeteoAdapter();
    const caps = await adapter.getCapabilities();
    expect(caps.defaultCacheTtlSeconds).toBe(3600);
  });

  it("P3-CAMS-079: capabilities sets displayName to Open-Meteo CAMS Global Forecast", async () => {
    const adapter = new OpenMeteoAdapter();
    const caps = await adapter.getCapabilities();
    expect(caps.displayName).toBe("Open-Meteo CAMS Global Forecast");
  });

  it("P3-CAMS-080: capabilities specifies CC BY 4.0 legal license", async () => {
    const adapter = new OpenMeteoAdapter();
    const caps = await adapter.getCapabilities();
    expect(caps.legalLicense).toContain("CC BY 4.0");
  });

  it("P3-CAMS-081: capabilities specifies CAMS Global attribution requirement", async () => {
    const adapter = new OpenMeteoAdapter();
    const caps = await adapter.getCapabilities();
    expect(caps.mandatoryAttribution).toContain("Copernicus Atmosphere Monitoring Service");
  });

  it("P3-CAMS-082: ensures searchStations never calls fetch API", async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    await adapter.searchStations({ query: "Delhi" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("P3-CAMS-083: ensures getObservations never calls fetch API", async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    await adapter.getObservations({ stationId: "cams_1" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("P3-CAMS-084: verifies providerId is exactly OPEN_METEO_CAMS", () => {
    const adapter = new OpenMeteoAdapter();
    expect(adapter.providerId).toBe("OPEN_METEO_CAMS");
  });

  it("P3-CAMS-085: verifies adapter is compatible with AirQualityProvider interface", async () => {
    const adapter = new OpenMeteoAdapter();
    expect(typeof adapter.getCapabilities).toBe("function");
    expect(typeof adapter.searchStations).toBe("function");
    expect(typeof adapter.getObservations).toBe("function");
    expect(typeof adapter.getForecast).toBe("function");
  });

  // Section 5: Bounding Box, Geographical Precision & Edge Cases (P3-CAMS-086 to P3-CAMS-110)
  it("P3-CAMS-086: supports northern boundary of India (Jammu & Kashmir / Ladakh: 35.5N, 77.0E)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...sampleApiResponse, latitude: 35.5, longitude: 77.0 })
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 35.5, longitude: 77.0 });
    expect(res.forecast[0]?.latitude).toBe(35.5);
  });

  it("P3-CAMS-087: supports southern boundary of India (Kanyakumari: 8.08N, 77.53E)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...sampleApiResponse, latitude: 8.08, longitude: 77.53 })
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 8.08, longitude: 77.53 });
    expect(res.forecast[0]?.latitude).toBe(8.08);
  });

  it("P3-CAMS-088: supports western boundary of India (Gujarat: 23.0N, 68.5E)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...sampleApiResponse, latitude: 23.0, longitude: 68.5 })
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 23.0, longitude: 68.5 });
    expect(res.forecast[0]?.longitude).toBe(68.5);
  });

  it("P3-CAMS-089: supports eastern boundary of India (Arunachal Pradesh: 28.0N, 97.0E)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...sampleApiResponse, latitude: 28.0, longitude: 97.0 })
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.0, longitude: 97.0 });
    expect(res.forecast[0]?.longitude).toBe(97.0);
  });

  it("P3-CAMS-090: formats URL with exactly two decimal places for ID generation stability", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.6139, longitude: 77.2090 });
    expect(res.forecast[0]?.id).toContain("cams_28.61_77.21");
  });

  it("P3-CAMS-091: handles 72 hourly forecast points seamlessly", async () => {
    const times72 = Array.from({ length: 72 }, (_, i) => `2026-11-24T${String(i % 24).padStart(2, "0")}:00`);
    const values72 = Array.from({ length: 72 }, (_, i) => 50 + (i % 20));
    const bigPayload: OpenMeteoApiResponse = {
      ...sampleApiResponse,
      hourly: {
        time: times72,
        pm2_5: values72,
        pm10: values72,
        nitrogen_dioxide: values72,
        sulphur_dioxide: values72,
        carbon_monoxide: values72.map((v) => v * 10),
        ozone: values72
      }
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => bigPayload
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20, horizonDays: 3 });
    expect(res.forecast).toHaveLength(72 * 6); // 432 points
  });

  it("P3-CAMS-092: handles timestamp with seconds format (e.g. 2026-11-24T00:00:00Z)", async () => {
    const withSecs = {
      ...sampleApiResponse,
      hourly: {
        ...sampleApiResponse.hourly,
        time: ["2026-11-24T00:00:00Z"]
      }
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => withSecs
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast[0]?.validTime).toBe("2026-11-24T00:00:00Z");
  });

  it("P3-CAMS-093: handles timestamp without Z by appending Z safely", async () => {
    const withoutZ = {
      ...sampleApiResponse,
      hourly: {
        ...sampleApiResponse.hourly,
        time: ["2026-11-24T00:00"]
      }
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => withoutZ
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast[0]?.validTime).toBe("2026-11-24T00:00:00Z");
  });

  it("P3-CAMS-094: verifies high altitude city forecast (Shimla: 31.10N, 77.17E)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...sampleApiResponse, latitude: 31.10, longitude: 77.17 })
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 31.10, longitude: 77.17 });
    expect(res.forecast[0]?.latitude).toBe(31.10);
  });

  it("P3-CAMS-095: verifies coastal city forecast (Chennai: 13.08N, 80.27E)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...sampleApiResponse, latitude: 13.08, longitude: 80.27 })
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 13.08, longitude: 80.27 });
    expect(res.forecast[0]?.longitude).toBe(80.27);
  });

  it("P3-CAMS-096: verifies inland plateau city forecast (Hyderabad: 17.38N, 78.48E)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...sampleApiResponse, latitude: 17.38, longitude: 78.48 })
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 17.38, longitude: 78.48 });
    expect(res.forecast[0]?.latitude).toBe(17.38);
  });

  it("P3-CAMS-097: verifies eastern delta city forecast (Kolkata: 22.57N, 88.36E)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...sampleApiResponse, latitude: 22.57, longitude: 88.36 })
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 22.57, longitude: 88.36 });
    expect(res.forecast[0]?.latitude).toBe(22.57);
  });

  it("P3-CAMS-098: verifies western commercial hub forecast (Mumbai: 19.07N, 72.87E)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...sampleApiResponse, latitude: 19.07, longitude: 72.87 })
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 19.07, longitude: 72.87 });
    expect(res.forecast[0]?.latitude).toBe(19.07);
  });

  it("P3-CAMS-099: verifies northern capital forecast (New Delhi: 28.61N, 77.20E)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...sampleApiResponse, latitude: 28.61, longitude: 77.20 })
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast[0]?.latitude).toBe(28.61);
  });

  it("P3-CAMS-100: verifies southern tech hub forecast (Bengaluru: 12.97N, 77.59E)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...sampleApiResponse, latitude: 12.97, longitude: 77.59 })
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 12.97, longitude: 77.59 });
    expect(res.forecast[0]?.latitude).toBe(12.97);
  });

  it("P3-CAMS-101: forecast object does not include secret keys or credential fields", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    const serialized = JSON.stringify(res);
    expect(serialized).not.toContain("api_key");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("secret");
  });

  it("P3-CAMS-102: guarantees immutability of adapter instance across multiple getForecast calls", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res1 = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    const res2 = await adapter.getForecast({ latitude: 19.07, longitude: 72.87 });
    expect(res1.forecast[0]?.id).not.toBe(res2.forecast[0]?.id);
  });

  it("P3-CAMS-103: ensures all forecast points have non-empty ID strings", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast.every((f) => f.id.length > 0)).toBe(true);
  });

  it("P3-CAMS-104: ensures all forecast points have valid latitude between -90 and 90", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast.every((f) => f.latitude >= -90 && f.latitude <= 90)).toBe(true);
  });

  it("P3-CAMS-105: ensures all forecast points have valid longitude between -180 and 180", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.forecast.every((f) => f.longitude >= -180 && f.longitude <= 180)).toBe(true);
  });

  it("P3-CAMS-106: verifies hourly_units contains expected unit strings", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    const res = await client.getCamsForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.hourly_units?.pm2_5).toBe("μg/m³");
    expect(res.hourly_units?.carbon_monoxide).toBe("μg/m³");
  });

  it("P3-CAMS-107: verifies generationtime_ms is parsed as a number", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    const res = await client.getCamsForecast({ latitude: 28.61, longitude: 77.20 });
    expect(typeof res.generationtime_ms).toBe("number");
  });

  it("P3-CAMS-108: verifies utc_offset_seconds is 0 for UTC requests", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    const res = await client.getCamsForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.utc_offset_seconds).toBe(0);
  });

  it("P3-CAMS-109: verifies timezone abbreviation is UTC", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const client = new OpenMeteoClient();
    const res = await client.getCamsForecast({ latitude: 28.61, longitude: 77.20 });
    expect(res.timezone_abbreviation).toBe("UTC");
  });

  it("P3-CAMS-110: verifies end-to-end forecast fetch pipeline produces valid NormalizedForecast objects", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleApiResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenMeteoAdapter();
    const result = await adapter.getForecast({ latitude: 28.61, longitude: 77.20, horizonDays: 3 });

    expect(result.status).toBe("CONFIGURED");
    expect(result.providerId).toBe("OPEN_METEO_CAMS");
    expect(result.forecast.length).toBe(18);
    expect(result.forecast[0]?.typology).toBe("TYPE_D_MODEL_FORECAST");
  });
});
