// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenAQClient } from "@/services/providers/openaq/openaq-client";
import { OpenAQAdapter } from "@/services/providers/openaq/openaq-adapter";
import type { OpenAQLocation } from "@/schemas/providers/openaq-upstream.schema";

describe("OpenAQ v3 Provider Contract Tests", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // Client Configuration
  it("PRV-OAQ-001: reports NOT_CONFIGURED when API key is missing", () => {
    const client = new OpenAQClient({});
    expect(client.isConfigured()).toBe(false);
  });

  it("PRV-OAQ-002: reports NOT_CONFIGURED when API key is empty string", () => {
    const client = new OpenAQClient({ apiKey: "   " });
    expect(client.isConfigured()).toBe(false);
  });

  it("PRV-OAQ-003: reports CONFIGURED when valid API key is provided", () => {
    const client = new OpenAQClient({ apiKey: "valid-key-123" });
    expect(client.isConfigured()).toBe(true);
  });

  it("PRV-OAQ-004: throws descriptive error on getLocations when unconfigured", async () => {
    const client = new OpenAQClient({});
    await expect(client.getLocations()).rejects.toThrow(/NOT_CONFIGURED/);
  });

  it("PRV-OAQ-005: throws descriptive error on getSensorMeasurements when unconfigured", async () => {
    const client = new OpenAQClient({});
    await expect(client.getSensorMeasurements(1234)).rejects.toThrow(/NOT_CONFIGURED/);
  });

  // Request URL & Authentication
  it("PRV-OAQ-006: includes X-API-Key header in requests", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [] })
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "secret-test-key" });
    await client.getLocations({ iso: "IN" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const headers = mockFetch.mock.calls[0]?.[1]?.headers;
    expect(headers).toHaveProperty("X-API-Key", "secret-test-key");
  });

  it("PRV-OAQ-007: constructs URL with default ISO IN and limit 100", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [] })
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "key" });
    await client.getLocations();

    const calledUrl = mockFetch.mock.calls[0]?.[0];
    const parsed = new URL(calledUrl);
    expect(parsed.searchParams.get("iso")).toBe("IN");
    expect(parsed.searchParams.get("limit")).toBe("100");
  });

  it("PRV-OAQ-008: constructs URL with coordinates and radiusKm converted to meters", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [] })
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "key" });
    await client.getLocations({
      coordinates: { latitude: 28.61, longitude: 77.20 },
      radiusKm: 25
    });

    const calledUrl = mockFetch.mock.calls[0]?.[0];
    const parsed = new URL(calledUrl);
    expect(parsed.searchParams.get("coordinates")).toBe("28.61,77.2");
    expect(parsed.searchParams.get("radius")).toBe("25000");
  });

  it("PRV-OAQ-009: constructs sensor measurements URL with correct sensor ID and limit", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [] })
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "key" });
    await client.getSensorMeasurements(9876, 48);

    const calledUrl = mockFetch.mock.calls[0]?.[0];
    expect(calledUrl).toContain("/sensors/9876/measurements");
    const parsed = new URL(calledUrl);
    expect(parsed.searchParams.get("limit")).toBe("48");
  });

  // Error Handling
  it("PRV-OAQ-010: handles HTTP 401 Unauthorized with descriptive error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers()
    });

    const client = new OpenAQClient({ apiKey: "bad-key" });
    await expect(client.getLocations()).rejects.toThrow(/HTTP 401/);
  });

  it("PRV-OAQ-011: handles HTTP 403 Forbidden with descriptive error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers()
    });

    const client = new OpenAQClient({ apiKey: "forbidden-key" });
    await expect(client.getLocations()).rejects.toThrow(/HTTP 403/);
  });

  it("PRV-OAQ-012: handles HTTP 404 Not Found error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers()
    });

    const client = new OpenAQClient({ apiKey: "key" });
    await expect(client.getLocations()).rejects.toThrow(/HTTP 404/);
  });

  it("PRV-OAQ-013: handles HTTP 429 Rate Limit Exceeded and extracts Retry-After header", async () => {
    const headers = new Headers();
    headers.set("Retry-After", "30");
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers
    });

    const client = new OpenAQClient({ apiKey: "key" });
    await expect(client.getLocations()).rejects.toThrow(/rate limit exceeded.*30s/);
  });

  it("PRV-OAQ-014: handles HTTP 429 with default retry when Retry-After is absent", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers()
    });

    const client = new OpenAQClient({ apiKey: "key" });
    await expect(client.getLocations()).rejects.toThrow(/rate limit exceeded.*60s/);
  });

  it("PRV-OAQ-015: handles HTTP 500 internal server error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers()
    });

    const client = new OpenAQClient({ apiKey: "key" });
    await expect(client.getLocations()).rejects.toThrow(/HTTP 500/);
  });

  it("PRV-OAQ-016: handles HTTP 502/503 upstream gateway errors", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers()
    });

    const client = new OpenAQClient({ apiKey: "key" });
    await expect(client.getLocations()).rejects.toThrow(/HTTP 503/);
  });

  it("PRV-OAQ-017: handles request abort / timeout", async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });

    const client = new OpenAQClient({ apiKey: "key", timeoutMs: 100 });
    await expect(client.getLocations()).rejects.toThrow(/timed out/);
  });

  it("PRV-OAQ-018: handles malformed JSON responses with schema validation error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: "not-an-array" })
    });

    const client = new OpenAQClient({ apiKey: "key" });
    await expect(client.getLocations()).rejects.toThrow();
  });

  // Parameter Mapping
  it("PRV-OAQ-019: maps parameter pm25 to PM2.5", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("pm25")).toBe("PM2.5");
    expect(OpenAQAdapter.mapParameterToPollutant("PM2.5")).toBe("PM2.5");
    expect(OpenAQAdapter.mapParameterToPollutant("pm_25")).toBe("PM2.5");
  });

  it("PRV-OAQ-020: maps parameter pm10 to PM10", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("pm10")).toBe("PM10");
    expect(OpenAQAdapter.mapParameterToPollutant("PM10")).toBe("PM10");
  });

  it("PRV-OAQ-021: maps parameter no2 to NO2", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("no2")).toBe("NO2");
    expect(OpenAQAdapter.mapParameterToPollutant("NO2")).toBe("NO2");
  });

  it("PRV-OAQ-022: maps parameter so2 to SO2", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("so2")).toBe("SO2");
    expect(OpenAQAdapter.mapParameterToPollutant("SO2")).toBe("SO2");
  });

  it("PRV-OAQ-023: maps parameter co to CO", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("co")).toBe("CO");
    expect(OpenAQAdapter.mapParameterToPollutant("CO")).toBe("CO");
  });

  it("PRV-OAQ-024: maps parameter o3 and ozone to O3", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("o3")).toBe("O3");
    expect(OpenAQAdapter.mapParameterToPollutant("ozone")).toBe("O3");
    expect(OpenAQAdapter.mapParameterToPollutant("O3")).toBe("O3");
  });

  it("PRV-OAQ-025: maps parameter nh3 to NH3", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("nh3")).toBe("NH3");
    expect(OpenAQAdapter.mapParameterToPollutant("NH3")).toBe("NH3");
  });

  it("PRV-OAQ-026: maps parameter pb and lead to Pb", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("pb")).toBe("Pb");
    expect(OpenAQAdapter.mapParameterToPollutant("lead")).toBe("Pb");
  });

  it("PRV-OAQ-027: maps unsupported parameters (e.g., bc, bc_c, temperature) to null", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("bc")).toBeNull();
    expect(OpenAQAdapter.mapParameterToPollutant("temperature")).toBeNull();
    expect(OpenAQAdapter.mapParameterToPollutant("humidity")).toBeNull();
  });

  // Location to Station Normalization
  it("PRV-OAQ-028: normalizes OpenAQLocation to NormalizedStation", () => {
    const loc: OpenAQLocation = {
      id: 101,
      name: "Anand Vihar, Delhi - CPCB",
      locality: "Anand Vihar",
      country: { code: "IN", name: "India" },
      coordinates: { latitude: 28.6468, longitude: 77.316 },
      sensors: [
        { id: 1, parameter: { id: 2, name: "pm25", units: "µg/m³", displayName: "PM2.5" } },
        { id: 2, parameter: { id: 1, name: "pm10", units: "µg/m³", displayName: "PM10" } }
      ],
      licenses: [{ id: 1, name: "CC BY 4.0", url: "https://creativecommons.org" }],
      owner: { id: 1, name: "Central Pollution Control Board" },
      provider: { id: 1, name: "CPCB" }
    };

    const station = OpenAQAdapter.normalizeLocationToStation(loc);
    expect(station.id).toBe("openaq_101");
    expect(station.providerId).toBe("OPENAQ");
    expect(station.name).toBe("Anand Vihar, Delhi - CPCB");
    expect(station.city).toBe("Anand Vihar");
    expect(station.latitude).toBe(28.6468);
    expect(station.longitude).toBe(77.316);
    expect(station.availablePollutants).toEqual(["PM2.5", "PM10"]);
    expect(station.license).toBe("CC BY 4.0");
    expect(station.attribution).toBe("OpenAQ / CPCB");
  });

  it("PRV-OAQ-029: handles missing licenses gracefully in location normalization", () => {
    const loc: OpenAQLocation = {
      id: 102,
      name: "Ballygunge, Kolkata",
      locality: "Kolkata",
      country: { code: "IN", name: "India" },
      coordinates: { latitude: 22.52, longitude: 88.36 },
      sensors: [],
      licenses: []
    };

    const station = OpenAQAdapter.normalizeLocationToStation(loc);
    expect(station.license).toBe("Source Provider Specific License via OpenAQ");
    expect(station.attribution).toBe("OpenAQ / OpenAQ Community Contributor");
  });

  it("PRV-OAQ-030: extracts lastReportedAt timestamp when present", () => {
    const loc: OpenAQLocation = {
      id: 103,
      name: "Fort, Mumbai",
      locality: "Mumbai",
      country: { code: "IN", name: "India" },
      coordinates: { latitude: 18.93, longitude: 72.83 },
      sensors: [],
      licenses: [],
      datetimeLast: { utc: "2026-11-22T08:00:00Z", local: "2026-11-22T13:30:00+05:30" }
    };

    const station = OpenAQAdapter.normalizeLocationToStation(loc);
    expect(station.lastReportedAt).toBe("2026-11-22T08:00:00Z");
  });

  // Adapter Capabilities & Contract
  it("PRV-OAQ-031: returns correct provider capabilities", async () => {
    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const caps = await adapter.getCapabilities();

    expect(caps.providerId).toBe("OPENAQ");
    expect(caps.providesGroundObservations).toBe(true);
    expect(caps.providesAtmosphericForecast).toBe(false);
    expect(caps.providesStationSearch).toBe(true);
    expect(caps.mandatoryAttribution).toContain("OpenAQ");
  });

  it("PRV-OAQ-032: searchStations returns NOT_CONFIGURED status when apiKey is missing", async () => {
    const adapter = new OpenAQAdapter({});
    const res = await adapter.searchStations({ latitude: 28.61, longitude: 77.20 });

    expect(res.status).toBe("NOT_CONFIGURED");
    expect(res.stations).toHaveLength(0);
    expect(res.warnings[0]).toContain("NOT_CONFIGURED");
  });

  it("PRV-OAQ-033: searchStations filters and returns normalized stations sorted by distance", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          {
            id: 201,
            name: "Far Station",
            locality: "Far City",
            country: { code: "IN", name: "India" },
            coordinates: { latitude: 29.0, longitude: 77.5 },
            sensors: []
          },
          {
            id: 202,
            name: "Near Station",
            locality: "Near City",
            country: { code: "IN", name: "India" },
            coordinates: { latitude: 28.62, longitude: 77.21 },
            sensors: []
          }
        ]
      })
    });

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const res = await adapter.searchStations({ latitude: 28.61, longitude: 77.20, radiusKm: 100 });

    expect(res.status).toBe("CONFIGURED");
    expect(res.stations).toHaveLength(2);
    // Closest station first
    expect(res.stations[0]?.id).toBe("openaq_202");
    expect(res.stations[1]?.id).toBe("openaq_201");
  });

  it("PRV-OAQ-034: searchStations applies textual query filter", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          {
            id: 301,
            name: "ITO Crossing",
            locality: "Delhi",
            country: { code: "IN", name: "India" },
            coordinates: { latitude: 28.62, longitude: 77.24 },
            sensors: []
          },
          {
            id: 302,
            name: "Salt Lake",
            locality: "Kolkata",
            country: { code: "IN", name: "India" },
            coordinates: { latitude: 22.58, longitude: 88.42 },
            sensors: []
          }
        ]
      })
    });

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const res = await adapter.searchStations({
      latitude: 28.61,
      longitude: 77.20,
      radiusKm: 2000,
      query: "Delhi"
    });

    expect(res.stations).toHaveLength(1);
    expect(res.stations[0]?.name).toBe("ITO Crossing");
  });

  it("PRV-OAQ-035: getObservations returns NOT_CONFIGURED when unconfigured", async () => {
    const adapter = new OpenAQAdapter({});
    const res = await adapter.getObservations({ stationId: "openaq_101" });

    expect(res.status).toBe("NOT_CONFIGURED");
    expect(res.observations).toHaveLength(0);
  });

  it("PRV-OAQ-036: getObservations parses measurements and returns NormalizedObservation array", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-22T10:00:00Z"));
    try {
      // First call: location details
      // Second call: sensor measurements
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            results: [
              {
                id: 501,
                name: "Jadavpur, Kolkata",
                locality: "Kolkata",
                country: { code: "IN", name: "India" },
                coordinates: { latitude: 22.49, longitude: 88.37 },
                sensors: [
                  { id: 9001, parameter: { id: 2, name: "pm25", units: "µg/m³", displayName: "PM2.5" } }
                ]
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            results: [
              {
                period: {
                  datetimeFrom: { utc: "2026-11-22T06:00:00Z", local: "2026-11-22T11:30:00+05:30" },
                  datetimeTo: { utc: "2026-11-22T07:00:00Z", local: "2026-11-22T12:30:00+05:30" }
                },
                value: 78.5,
                parameter: { id: 2, name: "pm25", units: "µg/m³", displayName: "PM2.5" }
              }
            ]
          })
        });

      const adapter = new OpenAQAdapter({ apiKey: "key" });
      const res = await adapter.getObservations({ stationId: "openaq_501" });

      expect(res.status).toBe("CONFIGURED");
      expect(res.observations).toHaveLength(1);
      const obs = res.observations[0]!;
      expect(obs.pollutant).toBe("PM2.5");
      expect(obs.value).toBe(78.5);
      expect(obs.unit).toBe("µg/m³");
      expect(obs.observationTime).toBe("2026-11-22T07:00:00Z");
      expect(obs.qualityFlag).toBe("VERIFIED");
    } finally {
      vi.useRealTimers();
    }
  });

  it("PRV-OAQ-037: getObservations filters out negative and NaN values", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              id: 601,
              name: "Test Station",
              coordinates: { latitude: 28.5, longitude: 77.2 },
              sensors: [
                { id: 9002, parameter: { id: 1, name: "pm10", units: "µg/m³", displayName: "PM10" } }
              ]
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              period: {
                datetimeTo: { utc: "2026-11-22T07:00:00Z" }
              },
              value: -999.0, // sentinel invalid
              parameter: { id: 1, name: "pm10", units: "µg/m³", displayName: "PM10" }
            },
            {
              period: {
                datetimeTo: { utc: "2026-11-22T06:00:00Z" }
              },
              value: 145.0, // valid
              parameter: { id: 1, name: "pm10", units: "µg/m³", displayName: "PM10" }
            }
          ]
        })
      });

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const res = await adapter.getObservations({ stationId: "openaq_601" });

    expect(res.observations).toHaveLength(1);
    expect(res.observations[0]?.value).toBe(145.0);
  });

  it("PRV-OAQ-038: flags measurements older than 24h as STALE", async () => {
    const oldTimestamp = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              id: 701,
              name: "Old Station",
              coordinates: { latitude: 28.5, longitude: 77.2 },
              sensors: [
                { id: 9003, parameter: { id: 1, name: "so2", units: "µg/m³", displayName: "SO2" } }
              ]
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              period: { datetimeTo: { utc: oldTimestamp } },
              value: 22.4,
              parameter: { id: 1, name: "so2", units: "µg/m³", displayName: "SO2" }
            }
          ]
        })
      });

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const res = await adapter.getObservations({ stationId: "openaq_701" });

    expect(res.observations).toHaveLength(1);
    expect(res.observations[0]?.qualityFlag).toBe("STALE");
  });

  it("PRV-OAQ-039: getForecast returns empty array and appropriate warning", async () => {
    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const res = await adapter.getForecast({ latitude: 28.61, longitude: 77.20 });

    expect(res.providerId).toBe("OPENAQ");
    expect(res.forecast).toHaveLength(0);
    expect(res.warnings[0]).toContain("atmospheric forecast");
  });

  it("PRV-OAQ-040: preserves provider attribution and license on every observation", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              id: 801,
              name: "Attribution Test Station",
              coordinates: { latitude: 28.5, longitude: 77.2 },
              licenses: [{ id: 1, name: "ODbL 1.0", url: "https://opendatacommons.org" }],
              provider: { id: 1, name: "Delhi Pollution Control Committee" },
              sensors: [
                { id: 9004, parameter: { id: 1, name: "no2", units: "µg/m³", displayName: "NO2" } }
              ]
            }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              period: { datetimeTo: { utc: "2026-11-22T08:00:00Z" } },
              value: 55.0,
              parameter: { id: 1, name: "no2", units: "µg/m³", displayName: "NO2" }
            }
          ]
        })
      });

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const res = await adapter.getObservations({ stationId: "openaq_801" });

    expect(res.observations[0]?.license).toBe("ODbL 1.0");
    expect(res.observations[0]?.attribution).toContain("Delhi Pollution Control Committee");
    expect(res.observations[0]?.attribution).toContain("OpenAQ");
  });
});
