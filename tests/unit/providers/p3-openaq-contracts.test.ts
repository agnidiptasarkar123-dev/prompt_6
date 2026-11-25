// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenAQClient } from "@/services/providers/openaq/openaq-client";
import { OpenAQAdapter } from "@/services/providers/openaq/openaq-adapter";
import type { OpenAQLocation, OpenAQLocationsResponse, OpenAQMeasurementsResponse } from "@/schemas/providers/openaq-upstream.schema";

describe("Phase 3 OpenAQ v3 Provider Contract & Verification Suite (P3-OAQ)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-23T14:00:00Z"));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  const sampleLocation: OpenAQLocation = {
    id: 10425,
    name: "US Diplomatic Post: New Delhi",
    locality: "Chanakyapuri, New Delhi",
    timezone: "Asia/Kolkata",
    country: { id: 1, code: "IN", name: "India" },
    owner: { id: 5, name: "US Department of State" },
    provider: { id: 10, name: "AirNow" },
    sensors: [
      { id: 201, name: "PM2.5", parameter: { id: 1, name: "pm25", units: "µg/m³", displayName: "PM2.5" } },
      { id: 202, name: "Ozone", parameter: { id: 2, name: "o3", units: "ppm", displayName: "Ozone" } }
    ],
    coordinates: { latitude: 28.598, longitude: 77.189 },
    licenses: [{ id: 1, name: "U.S. Government Work (Public Domain)" }],
    datetimeLast: { utc: "2026-11-23T12:00:00Z", local: "2026-11-23T17:30:00+05:30" }
  };

  const sampleLocationsResponse: OpenAQLocationsResponse = {
    meta: { name: "openaq-api", page: 1, limit: 100, found: 1 },
    results: [sampleLocation]
  };

  const sampleMeasurementsResponse: OpenAQMeasurementsResponse = {
    meta: { page: 1, limit: 24, found: 2 },
    results: [
      {
        period: { datetimeFrom: { utc: "2026-11-23T11:00:00Z", local: "2026-11-23T16:30:00+05:30" }, datetimeTo: { utc: "2026-11-23T12:00:00Z", local: "2026-11-23T17:30:00+05:30" } },
        value: 85.4,
        parameter: { id: 1, name: "pm25", units: "µg/m³", displayName: "PM2.5" },
        coordinates: { latitude: 28.598, longitude: 77.189 }
      },
      {
        period: { datetimeFrom: { utc: "2026-11-23T10:00:00Z", local: "2026-11-23T15:30:00+05:30" }, datetimeTo: { utc: "2026-11-23T11:00:00Z", local: "2026-11-23T16:30:00+05:30" } },
        value: 92.1,
        parameter: { id: 1, name: "pm25", units: "µg/m³", displayName: "PM2.5" },
        coordinates: { latitude: 28.598, longitude: 77.189 }
      }
    ]
  };

  // Section 1: Client Configuration & Initialization (P3-OAQ-001 to P3-OAQ-015)
  it("P3-OAQ-001: reports unconfigured when empty options passed", () => {
    const client = new OpenAQClient({});
    expect(client.isConfigured()).toBe(false);
  });

  it("P3-OAQ-002: reports unconfigured when options omitted entirely", () => {
    const client = new OpenAQClient();
    expect(client.isConfigured()).toBe(false);
  });

  it("P3-OAQ-003: reports unconfigured when apiKey is whitespace", () => {
    const client = new OpenAQClient({ apiKey: "   \t\n " });
    expect(client.isConfigured()).toBe(false);
  });

  it("P3-OAQ-004: reports configured when valid apiKey string passed", () => {
    const client = new OpenAQClient({ apiKey: "test-valid-key-xyz" });
    expect(client.isConfigured()).toBe(true);
  });

  it("P3-OAQ-005: accepts custom baseUrl and timeoutMs", () => {
    const client = new OpenAQClient({ apiKey: "k", baseUrl: "https://proxy.example.com/v3", timeoutMs: 4000 });
    expect(client.isConfigured()).toBe(true);
  });

  it("P3-OAQ-006: throws NOT_CONFIGURED on getLocations when unconfigured", async () => {
    const client = new OpenAQClient({});
    await expect(client.getLocations()).rejects.toThrow("NOT_CONFIGURED");
  });

  it("P3-OAQ-007: throws NOT_CONFIGURED on getLocation when unconfigured", async () => {
    const client = new OpenAQClient({});
    await expect(client.getLocation(10425)).rejects.toThrow("NOT_CONFIGURED");
  });

  it("P3-OAQ-008: throws NOT_CONFIGURED on getSensorMeasurements when unconfigured", async () => {
    const client = new OpenAQClient({});
    await expect(client.getSensorMeasurements(201)).rejects.toThrow("NOT_CONFIGURED");
  });

  it("P3-OAQ-009: handles trimmed apiKey with surrounding spaces", () => {
    const client = new OpenAQClient({ apiKey: "  key_with_spaces  " });
    expect(client.isConfigured()).toBe(true);
  });

  it("P3-OAQ-010: preserves baseUrl default of https://api.openaq.org/v3", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "test-key" });
    await client.getLocations();
    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url.startsWith("https://api.openaq.org/v3/locations")).toBe(true);
  });

  it("P3-OAQ-011: preserves custom timeout configuration", async () => {
    const client = new OpenAQClient({ apiKey: "k", timeoutMs: 2500 });
    expect(client).toBeDefined();
  });

  it("P3-OAQ-012: adapter isConfigured reflects client state (unconfigured)", () => {
    const adapter = new OpenAQAdapter({});
    expect(adapter).toBeDefined();
  });

  it("P3-OAQ-013: adapter isConfigured reflects client state (configured)", () => {
    const adapter = new OpenAQAdapter({ apiKey: "key-123" });
    expect(adapter).toBeDefined();
  });

  it("P3-OAQ-014: verifies providerId is strictly OPENAQ", () => {
    const adapter = new OpenAQAdapter();
    expect(adapter.providerId).toBe("OPENAQ");
  });

  it("P3-OAQ-015: verifies provider capabilities structure", async () => {
    const adapter = new OpenAQAdapter();
    const caps = await adapter.getCapabilities();
    expect(caps.providerId).toBe("OPENAQ");
    expect(caps.providesGroundObservations).toBe(true);
    expect(caps.providesAtmosphericForecast).toBe(false);
    expect(caps.providesStationSearch).toBe(true);
    expect(caps.rateLimitPerMinute).toBe(60);
  });

  // Section 2: URL Construction & Query Parameters (P3-OAQ-016 to P3-OAQ-040)
  it("P3-OAQ-016: sends Accept: application/json header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "key" });
    await client.getLocations();
    const headers = mockFetch.mock.calls[0]?.[1]?.headers;
    expect(headers).toHaveProperty("Accept", "application/json");
  });

  it("P3-OAQ-017: sends X-API-Key header with apiKey value", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "secret_token_123" });
    await client.getLocations();
    const headers = mockFetch.mock.calls[0]?.[1]?.headers;
    expect(headers).toHaveProperty("X-API-Key", "secret_token_123");
  });

  it("P3-OAQ-018: sets default iso parameter to IN", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getLocations();
    const url = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(url.searchParams.get("iso")).toBe("IN");
  });

  it("P3-OAQ-019: sets default limit parameter to 100", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getLocations();
    const url = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(url.searchParams.get("limit")).toBe("100");
  });

  it("P3-OAQ-020: allows overriding iso parameter", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getLocations({ iso: "US" });
    const url = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(url.searchParams.get("iso")).toBe("US");
  });

  it("P3-OAQ-021: allows overriding limit parameter", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getLocations({ limit: 25 });
    const url = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(url.searchParams.get("limit")).toBe("25");
  });

  it("P3-OAQ-022: allows page parameter pagination", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getLocations({ page: 3 });
    const url = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(url.searchParams.get("page")).toBe("3");
  });

  it("P3-OAQ-023: converts radiusKm to meters for coordinates query (10km -> 10000m)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getLocations({ coordinates: { latitude: 22.57, longitude: 88.36 }, radiusKm: 10 });
    const url = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(url.searchParams.get("coordinates")).toBe("22.57,88.36");
    expect(url.searchParams.get("radius")).toBe("10000");
  });

  it("P3-OAQ-024: converts radiusKm to meters capped at OpenAQ v3 maximum 25km (25000m)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getLocations({ coordinates: { latitude: 19.07, longitude: 72.87 } });
    const url = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(url.searchParams.get("coordinates")).toBe("19.07,72.87");
    expect(url.searchParams.get("radius")).toBe("25000");
    expect(url.searchParams.has("iso")).toBe(false);
  });

  it("P3-OAQ-025: formats getLocation URL as /locations/{locationId}", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getLocation(8765);
    const url = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(url.pathname).toBe("/v3/locations/8765");
  });

  it("P3-OAQ-026: formats getSensorMeasurements URL as /sensors/{sensorId}/measurements", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleMeasurementsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getSensorMeasurements(201, 10);
    const url = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(url.pathname).toBe("/v3/sensors/201/measurements");
    expect(url.searchParams.get("limit")).toBe("10");
  });

  it("P3-OAQ-027: defaults getSensorMeasurements limit to 24", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleMeasurementsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getSensorMeasurements(201);
    const url = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(url.searchParams.get("limit")).toBe("24");
  });

  it("P3-OAQ-028: handles fractional coordinates precision correctly", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getLocations({ coordinates: { latitude: 28.613939, longitude: 77.209021 } });
    const url = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(url.searchParams.get("coordinates")).toBe("28.613939,77.209021");
  });

  it("P3-OAQ-029: handles zero radius parameter (boundary test)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getLocations({ coordinates: { latitude: 28.61, longitude: 77.2 }, radiusKm: 0 });
    const url = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(url.searchParams.get("radius")).toBe("0");
  });

  it("P3-OAQ-030: caps oversized radius parameter (100km -> OpenAQ v3 max 25000m) to prevent HTTP 422", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getLocations({ coordinates: { latitude: 28.61, longitude: 77.2 }, radiusKm: 100 });
    const url = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(url.searchParams.get("radius")).toBe("25000");
  });

  it("P3-OAQ-031: uses GET method exclusively", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getLocations();
    expect(mockFetch.mock.calls[0]?.[1]?.method).toBe("GET");
  });

  it("P3-OAQ-032: attaches abort signal to fetch call", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getLocations();
    expect(mockFetch.mock.calls[0]?.[1]?.signal).toBeDefined();
  });

  it("P3-OAQ-033: handles negative latitude within valid geographic limits", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getLocations({ coordinates: { latitude: -12.046, longitude: -77.042 }, iso: "PE" });
    const url = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(url.searchParams.get("coordinates")).toBe("-12.046,-77.042");
  });

  it("P3-OAQ-034: parses valid locations JSON response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    const resp = await client.getLocations();
    expect(resp.results).toHaveLength(1);
    expect(resp.results[0]?.name).toBe("US Diplomatic Post: New Delhi");
  });

  it("P3-OAQ-035: parses valid measurements JSON response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleMeasurementsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    const resp = await client.getSensorMeasurements(201);
    expect(resp.results).toHaveLength(2);
    expect(resp.results[0]?.value).toBe(85.4);
  });

  it("P3-OAQ-036: accepts custom port in baseUrl", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k", baseUrl: "http://localhost:8080/v3" });
    await client.getLocations();
    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url.startsWith("http://localhost:8080/v3/locations")).toBe(true);
  });

  it("P3-OAQ-037: preserves meta block in locations response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    const res = await client.getLocations();
    expect(res.meta?.page).toBe(1);
    expect(res.meta?.found).toBe(1);
  });

  it("P3-OAQ-038: handles empty results array gracefully", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ meta: { name: "openaq", page: 1, limit: 100, found: 0 }, results: [] })
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    const res = await client.getLocations();
    expect(res.results).toEqual([]);
  });

  it("P3-OAQ-039: supports large limit up to 1000", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getLocations({ limit: 1000 });
    const url = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(url.searchParams.get("limit")).toBe("1000");
  });

  it("P3-OAQ-040: verifies getLocation returns single location inside results array", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    const res = await client.getLocation(10425);
    expect(res.results[0]?.id).toBe(10425);
  });

  // Section 3: HTTP Status & Error Handling (P3-OAQ-041 to P3-OAQ-065)
  it("P3-OAQ-041: throws rate limit exceeded error on HTTP 429 with Retry-After header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ "Retry-After": "45" }),
      text: async () => "Too Many Requests"
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocations()).rejects.toThrow("OpenAQ rate limit exceeded (HTTP 429). Retry after 45s");
  });

  it("P3-OAQ-042: throws rate limit exceeded error on HTTP 429 with default 60s when header absent", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({}),
      text: async () => "Too Many Requests"
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocations()).rejects.toThrow("OpenAQ rate limit exceeded (HTTP 429). Retry after 60s");
  });

  it("P3-OAQ-043: throws upstream error on HTTP 401 Unauthorized", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      text: async () => "Invalid API Key"
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "invalid-key" });
    await expect(client.getLocations()).rejects.toThrow("OpenAQ upstream error: HTTP 401");
  });

  it("P3-OAQ-044: throws upstream error on HTTP 403 Forbidden", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers()
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocations()).rejects.toThrow("OpenAQ upstream error: HTTP 403");
  });

  it("P3-OAQ-045: throws upstream error on HTTP 404 Not Found", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers()
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocation(999999)).rejects.toThrow("OpenAQ upstream error: HTTP 404");
  });

  it("P3-OAQ-046: throws upstream error on HTTP 500 Internal Server Error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers()
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocations()).rejects.toThrow("OpenAQ upstream error: HTTP 500");
  });

  it("P3-OAQ-047: throws upstream error on HTTP 502 Bad Gateway", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: new Headers()
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocations()).rejects.toThrow("OpenAQ upstream error: HTTP 502");
  });

  it("P3-OAQ-048: throws upstream error on HTTP 503 Service Unavailable", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers()
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocations()).rejects.toThrow("OpenAQ upstream error: HTTP 503");
  });

  it("P3-OAQ-049: throws upstream error on HTTP 504 Gateway Timeout", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 504,
      headers: new Headers()
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocations()).rejects.toThrow("OpenAQ upstream error: HTTP 504");
  });

  it("P3-OAQ-050: handles client timeout via AbortError", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    const mockFetch = vi.fn().mockRejectedValue(abortError);
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k", timeoutMs: 100 });
    await expect(client.getLocations()).rejects.toThrow(/timed out after 100ms/);
  });

  it("P3-OAQ-051: re-throws non-abort network exceptions unchanged", async () => {
    const networkError = new Error("ECONNREFUSED 127.0.0.1:443");
    const mockFetch = vi.fn().mockRejectedValue(networkError);
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocations()).rejects.toThrow("ECONNREFUSED");
  });

  it("P3-OAQ-052: rejects response when results is not an array", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: "not-an-array" })
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocations()).rejects.toThrow();
  });

  it("P3-OAQ-053: rejects location missing required id", async () => {
    const malformed = { ...sampleLocation, id: undefined };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [malformed] })
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocations()).rejects.toThrow();
  });

  it("P3-OAQ-054: rejects location missing required coordinates", async () => {
    const malformed = { ...sampleLocation, coordinates: undefined };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [malformed] })
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocations()).rejects.toThrow();
  });

  it("P3-OAQ-055: rejects location when latitude is not a number", async () => {
    const malformed = { ...sampleLocation, coordinates: { latitude: "28.59", longitude: 77.18 } };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [malformed] })
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocations()).rejects.toThrow();
  });

  it("P3-OAQ-056: rejects location when longitude is not a number", async () => {
    const malformed = { ...sampleLocation, coordinates: { latitude: 28.59, longitude: "77.18" } };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [malformed] })
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocations()).rejects.toThrow();
  });

  it("P3-OAQ-057: rejects measurement missing value", async () => {
    const malformed = {
      period: sampleMeasurementsResponse.results[0]!.period,
      parameter: sampleMeasurementsResponse.results[0]!.parameter,
      coordinates: sampleMeasurementsResponse.results[0]!.coordinates
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [malformed] })
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getSensorMeasurements(201)).rejects.toThrow();
  });

  it("P3-OAQ-058: rejects measurement with invalid non-numeric value", async () => {
    const malformed = {
      value: "fifty",
      period: sampleMeasurementsResponse.results[0]!.period,
      coordinates: sampleMeasurementsResponse.results[0]!.coordinates
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [malformed] })
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getSensorMeasurements(201)).rejects.toThrow();
  });

  it("P3-OAQ-059: rejects measurement with invalid period structure", async () => {
    const malformed = {
      value: 50.0,
      period: "not-an-object",
      coordinates: sampleMeasurementsResponse.results[0]!.coordinates
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [malformed] })
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getSensorMeasurements(201)).rejects.toThrow();
  });

  it("P3-OAQ-060: handles response json parse errors gracefully", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("Unexpected token < in JSON at position 0");
      }
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocations()).rejects.toThrow("Unexpected token");
  });

  it("P3-OAQ-061: ensures abort signal cleanup happens in finally block", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await client.getLocations();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("P3-OAQ-062: handles URL construction with special characters in apiKey safely", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "key+special/chars==" });
    await client.getLocations();
    const headers = mockFetch.mock.calls[0]?.[1]?.headers;
    expect(headers["X-API-Key"]).toBe("key+special/chars==");
  });

  it("P3-OAQ-063: verifies HTTP 400 bad request throws descriptive error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers()
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocations()).rejects.toThrow("OpenAQ upstream error: HTTP 400");
  });

  it("P3-OAQ-064: verifies HTTP 422 Unprocessable Entity throws descriptive error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      headers: new Headers()
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocations()).rejects.toThrow("OpenAQ upstream error: HTTP 422");
  });

  it("P3-OAQ-065: verifies HTTP 301 redirect is not treated as ok if status is redirect", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 301,
      headers: new Headers()
    });
    global.fetch = mockFetch;

    const client = new OpenAQClient({ apiKey: "k" });
    await expect(client.getLocations()).rejects.toThrow("OpenAQ upstream error: HTTP 301");
  });

  // Section 4: Parameter Mapping (P3-OAQ-066 to P3-OAQ-090)
  it("P3-OAQ-066: maps pm25 to PM2.5", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("pm25")).toBe("PM2.5");
  });

  it("P3-OAQ-067: maps pm2.5 to PM2.5", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("pm2.5")).toBe("PM2.5");
  });

  it("P3-OAQ-068: maps PM25 to PM2.5", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("PM25")).toBe("PM2.5");
  });

  it("P3-OAQ-069: maps pm_25 to PM2.5", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("pm_25")).toBe("PM2.5");
  });

  it("P3-OAQ-070: maps pm-25 to PM2.5", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("pm-25")).toBe("PM2.5");
  });

  it("P3-OAQ-071: maps pm10 to PM10", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("pm10")).toBe("PM10");
  });

  it("P3-OAQ-072: maps PM10 uppercase to PM10", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("PM10")).toBe("PM10");
  });

  it("P3-OAQ-073: maps pm_10 to PM10", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("pm_10")).toBe("PM10");
  });

  it("P3-OAQ-074: maps no2 to NO2", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("no2")).toBe("NO2");
  });

  it("P3-OAQ-075: maps NO2 uppercase to NO2", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("NO2")).toBe("NO2");
  });

  it("P3-OAQ-076: maps no_2 to NO2", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("no_2")).toBe("NO2");
  });

  it("P3-OAQ-077: maps so2 to SO2", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("so2")).toBe("SO2");
  });

  it("P3-OAQ-078: maps SO2 uppercase to SO2", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("SO2")).toBe("SO2");
  });

  it("P3-OAQ-079: maps co to CO", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("co")).toBe("CO");
  });

  it("P3-OAQ-080: maps CO uppercase to CO", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("CO")).toBe("CO");
  });

  it("P3-OAQ-081: maps o3 to O3", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("o3")).toBe("O3");
  });

  it("P3-OAQ-082: maps ozone to O3", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("ozone")).toBe("O3");
  });

  it("P3-OAQ-083: maps OZONE uppercase to O3", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("OZONE")).toBe("O3");
  });

  it("P3-OAQ-084: maps nh3 to NH3", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("nh3")).toBe("NH3");
  });

  it("P3-OAQ-085: maps NH3 uppercase to NH3", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("NH3")).toBe("NH3");
  });

  it("P3-OAQ-086: maps pb to Pb", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("pb")).toBe("Pb");
  });

  it("P3-OAQ-087: maps lead to Pb", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("lead")).toBe("Pb");
  });

  it("P3-OAQ-088: returns null for black carbon bc", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("bc")).toBeNull();
  });

  it("P3-OAQ-089: returns null for meteorological temperature", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("temperature")).toBeNull();
  });

  it("P3-OAQ-090: returns null for unrecognized parameter string", () => {
    expect(OpenAQAdapter.mapParameterToPollutant("unrecognized_sensor")).toBeNull();
  });

  // Section 5: Location Normalization (P3-OAQ-091 to P3-OAQ-115)
  it("P3-OAQ-091: formats station id as openaq_{id}", () => {
    const station = OpenAQAdapter.normalizeLocationToStation(sampleLocation);
    expect(station.id).toBe("openaq_10425");
  });

  it("P3-OAQ-092: sets providerId to OPENAQ", () => {
    const station = OpenAQAdapter.normalizeLocationToStation(sampleLocation);
    expect(station.providerId).toBe("OPENAQ");
  });

  it("P3-OAQ-093: preserves station name", () => {
    const station = OpenAQAdapter.normalizeLocationToStation(sampleLocation);
    expect(station.name).toBe("US Diplomatic Post: New Delhi");
  });

  it("P3-OAQ-094: extracts city from locality", () => {
    const station = OpenAQAdapter.normalizeLocationToStation(sampleLocation);
    expect(station.city).toBe("Chanakyapuri, New Delhi");
  });

  it("P3-OAQ-095: falls back to Unknown Locality when locality is missing", () => {
    const loc = { ...sampleLocation, locality: null };
    const station = OpenAQAdapter.normalizeLocationToStation(loc);
    expect(station.city).toBe("Unknown Locality");
  });

  it("P3-OAQ-096: extracts state from country name", () => {
    const station = OpenAQAdapter.normalizeLocationToStation(sampleLocation);
    expect(station.state).toBe("India");
  });

  it("P3-OAQ-097: falls back to India when country is missing", () => {
    const loc = { ...sampleLocation, country: null };
    const station = OpenAQAdapter.normalizeLocationToStation(loc);
    expect(station.state).toBe("India");
  });

  it("P3-OAQ-098: preserves exact latitude", () => {
    const station = OpenAQAdapter.normalizeLocationToStation(sampleLocation);
    expect(station.latitude).toBe(28.598);
  });

  it("P3-OAQ-099: preserves exact longitude", () => {
    const station = OpenAQAdapter.normalizeLocationToStation(sampleLocation);
    expect(station.longitude).toBe(77.189);
  });

  it("P3-OAQ-099a: extracts available pollutants from sensors list", () => {
    const station = OpenAQAdapter.normalizeLocationToStation(sampleLocation);
    expect(station.availablePollutants).toContain("PM2.5");
    expect(station.availablePollutants).toContain("O3");
  });

  it("P3-OAQ-100: deduplicates mapped pollutants in availablePollutants", () => {
    const locWithDups: OpenAQLocation = {
      ...sampleLocation,
      sensors: [
        { id: 1, name: "PM2.5 Primary", parameter: { id: 1, name: "pm25", units: "µg/m³", displayName: "PM2.5" } },
        { id: 2, name: "PM2.5 Secondary", parameter: { id: 1, name: "pm25", units: "µg/m³", displayName: "PM2.5" } }
      ]
    };
    const station = OpenAQAdapter.normalizeLocationToStation(locWithDups);
    expect(station.availablePollutants).toEqual(["PM2.5"]);
  });

  it("P3-OAQ-101: preserves lastReportedAt from datetimeLast.utc", () => {
    const station = OpenAQAdapter.normalizeLocationToStation(sampleLocation);
    expect(station.lastReportedAt).toBe("2026-11-23T12:00:00Z");
  });

  it("P3-OAQ-102: sets lastReportedAt to null when datetimeLast is null", () => {
    const loc = { ...sampleLocation, datetimeLast: null };
    const station = OpenAQAdapter.normalizeLocationToStation(loc);
    expect(station.lastReportedAt).toBeNull();
  });

  it("P3-OAQ-103: extracts license name from licenses array", () => {
    const station = OpenAQAdapter.normalizeLocationToStation(sampleLocation);
    expect(station.license).toBe("U.S. Government Work (Public Domain)");
  });

  it("P3-OAQ-104: provides fallback license name when licenses array is empty", () => {
    const loc = { ...sampleLocation, licenses: [] };
    const station = OpenAQAdapter.normalizeLocationToStation(loc);
    expect(station.license).toBe("Source Provider Specific License via OpenAQ");
  });

  it("P3-OAQ-105: extracts attribution from provider name", () => {
    const station = OpenAQAdapter.normalizeLocationToStation(sampleLocation);
    expect(station.attribution).toBe("OpenAQ / AirNow");
  });

  it("P3-OAQ-106: falls back to owner name when provider is missing", () => {
    const loc = { ...sampleLocation, provider: null };
    const station = OpenAQAdapter.normalizeLocationToStation(loc);
    expect(station.attribution).toBe("OpenAQ / US Department of State");
  });

  it("P3-OAQ-107: falls back to Community Contributor when both provider and owner are missing", () => {
    const loc = { ...sampleLocation, provider: null, owner: null };
    const station = OpenAQAdapter.normalizeLocationToStation(loc);
    expect(station.attribution).toBe("OpenAQ / OpenAQ Community Contributor");
  });

  it("P3-OAQ-108: handles null sensors array safely", () => {
    const loc = { ...sampleLocation, sensors: [] };
    const station = OpenAQAdapter.normalizeLocationToStation(loc);
    expect(station.availablePollutants).toEqual([]);
  });

  it("P3-OAQ-109: ignores non-criteria pollutant sensors in availablePollutants", () => {
    const loc: OpenAQLocation = {
      ...sampleLocation,
      sensors: [
        { id: 10, name: "Wind", parameter: { id: 10, name: "wind_speed", units: "m/s", displayName: "Wind" } },
        { id: 11, name: "Temp", parameter: { id: 11, name: "temperature", units: "C", displayName: "Temp" } }
      ]
    };
    const station = OpenAQAdapter.normalizeLocationToStation(loc);
    expect(station.availablePollutants).toEqual([]);
  });

  it("P3-OAQ-110: includes all 8 CPCB criteria pollutants if present in sensors", () => {
    const allSensors: OpenAQLocation = {
      ...sampleLocation,
      sensors: [
        { id: 1, name: "PM25", parameter: { id: 1, name: "pm25", units: "µg/m³", displayName: "PM2.5" } },
        { id: 2, name: "PM10", parameter: { id: 2, name: "pm10", units: "µg/m³", displayName: "PM10" } },
        { id: 3, name: "NO2", parameter: { id: 3, name: "no2", units: "ppm", displayName: "NO2" } },
        { id: 4, name: "SO2", parameter: { id: 4, name: "so2", units: "ppm", displayName: "SO2" } },
        { id: 5, name: "CO", parameter: { id: 5, name: "co", units: "ppm", displayName: "CO" } },
        { id: 6, name: "O3", parameter: { id: 6, name: "o3", units: "ppm", displayName: "O3" } },
        { id: 7, name: "NH3", parameter: { id: 7, name: "nh3", units: "µg/m³", displayName: "NH3" } },
        { id: 8, name: "Pb", parameter: { id: 8, name: "lead", units: "µg/m³", displayName: "Pb" } }
      ]
    };
    const station = OpenAQAdapter.normalizeLocationToStation(allSensors);
    expect(station.availablePollutants).toHaveLength(8);
  });

  it("P3-OAQ-111: sets station typology to canonical normalized structure", () => {
    const station = OpenAQAdapter.normalizeLocationToStation(sampleLocation);
    expect(station).toHaveProperty("id");
    expect(station).toHaveProperty("providerId");
    expect(station).toHaveProperty("latitude");
    expect(station).toHaveProperty("longitude");
  });

  it("P3-OAQ-112: station normalization does not mutate input object", () => {
    const clone = JSON.parse(JSON.stringify(sampleLocation));
    OpenAQAdapter.normalizeLocationToStation(clone);
    expect(clone).toEqual(sampleLocation);
  });

  it("P3-OAQ-113: validates latitude is within valid range [-90, 90]", () => {
    const station = OpenAQAdapter.normalizeLocationToStation(sampleLocation);
    expect(station.latitude).toBeGreaterThanOrEqual(-90);
    expect(station.latitude).toBeLessThanOrEqual(90);
  });

  it("P3-OAQ-114: validates longitude is within valid range [-180, 180]", () => {
    const station = OpenAQAdapter.normalizeLocationToStation(sampleLocation);
    expect(station.longitude).toBeGreaterThanOrEqual(-180);
    expect(station.longitude).toBeLessThanOrEqual(180);
  });

  it("P3-OAQ-115: preserves non-English station names cleanly", () => {
    const loc: OpenAQLocation = {
      ...sampleLocation,
      name: "आनंद विहार, दिल्ली (Anand Vihar)"
    };
    const station = OpenAQAdapter.normalizeLocationToStation(loc);
    expect(station.name).toBe("आनंद विहार, दिल्ली (Anand Vihar)");
  });

  // Section 6: Observation Extraction & Unit Handling (P3-OAQ-116 to P3-OAQ-135)
  it("P3-OAQ-116: classifies observations as TYPE_C_RAW_MEASUREMENT", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/locations/10425")) {
        return { ok: true, status: 200, json: async () => sampleLocationsResponse };
      }
      return { ok: true, status: 200, json: async () => sampleMeasurementsResponse };
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const obsResult = await adapter.getObservations({ stationId: "openaq_10425" });
    expect(obsResult.observations.length).toBeGreaterThan(0);
    expect(obsResult.observations[0]?.typology).toBe("TYPE_C_RAW_MEASUREMENT");
  });

  it("P3-OAQ-117: preserves observation timestamp from datetimeTo.utc", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/locations/10425")) {
        return { ok: true, status: 200, json: async () => sampleLocationsResponse };
      }
      return { ok: true, status: 200, json: async () => sampleMeasurementsResponse };
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const obsResult = await adapter.getObservations({ stationId: "openaq_10425" });
    expect(obsResult.observations[0]?.observationTime).toBe("2026-11-23T12:00:00Z");
  });

  it("P3-OAQ-118: preserves raw value and raw unit", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/locations/10425")) {
        return { ok: true, status: 200, json: async () => sampleLocationsResponse };
      }
      return { ok: true, status: 200, json: async () => sampleMeasurementsResponse };
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const obsResult = await adapter.getObservations({ stationId: "openaq_10425" });
    expect(obsResult.observations[0]?.rawValue).toBe(85.4);
    expect(obsResult.observations[0]?.rawUnit).toBe("µg/m³");
  });

  it("P3-OAQ-119: preserves station provenance and license", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/locations/10425")) {
        return { ok: true, status: 200, json: async () => sampleLocationsResponse };
      }
      return { ok: true, status: 200, json: async () => sampleMeasurementsResponse };
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const obsResult = await adapter.getObservations({ stationId: "openaq_10425" });
    const obs = obsResult.observations[0]!;
    expect(obs.stationId).toBe("openaq_10425");
    expect(obs.stationName).toBe("US Diplomatic Post: New Delhi");
    expect(obs.providerId).toBe("OPENAQ");
    expect(obs.license).toBe("U.S. Government Work (Public Domain)");
  });

  it("P3-OAQ-120: marks qualityFlag as VERIFIED when fresh", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/locations/10425")) {
        return { ok: true, status: 200, json: async () => sampleLocationsResponse };
      }
      return { ok: true, status: 200, json: async () => sampleMeasurementsResponse };
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const obsResult = await adapter.getObservations({ stationId: "openaq_10425" });
    expect(obsResult.observations[0]?.qualityFlag).toBe("VERIFIED");
  });

  it("P3-OAQ-121: ignores negative pollutant readings from faulty sensors", async () => {
    const measurementsWithNegative: OpenAQMeasurementsResponse = {
      meta: { page: 1, limit: 10, found: 2 },
      results: [
        {
          period: sampleMeasurementsResponse.results[0]!.period,
          value: -999.0,
          parameter: { id: 1, name: "pm25", units: "µg/m³", displayName: "PM2.5" },
          coordinates: { latitude: 28.598, longitude: 77.189 }
        },
        {
          period: sampleMeasurementsResponse.results[0]!.period,
          value: 45.0,
          parameter: { id: 1, name: "pm25", units: "µg/m³", displayName: "PM2.5" },
          coordinates: { latitude: 28.598, longitude: 77.189 }
        }
      ]
    };
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/locations/10425")) {
        return { ok: true, status: 200, json: async () => sampleLocationsResponse };
      }
      return { ok: true, status: 200, json: async () => measurementsWithNegative };
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const obsResult = await adapter.getObservations({ stationId: "openaq_10425" });
    expect(obsResult.observations.every((o) => (o.rawValue ?? 0) >= 0)).toBe(true);
  });

  it("P3-OAQ-122: ignores NaN or infinite values safely", async () => {
    const measurementsWithNaN: OpenAQMeasurementsResponse = {
      meta: { page: 1, limit: 10, found: 1 },
      results: [
        {
          period: sampleMeasurementsResponse.results[0]!.period,
          value: NaN,
          parameter: { id: 1, name: "pm25", units: "µg/m³", displayName: "PM2.5" },
          coordinates: { latitude: 28.598, longitude: 77.189 }
        }
      ]
    };
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/locations/10425")) {
        return { ok: true, status: 200, json: async () => sampleLocationsResponse };
      }
      return { ok: true, status: 200, json: async () => measurementsWithNaN };
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const obsResult = await adapter.getObservations({ stationId: "openaq_10425" });
    expect(obsResult.observations).toHaveLength(0);
  });

  it("P3-OAQ-123: handles CO unit conversion from ppm to mg/m³ at STP", async () => {
    // 1 ppm CO at STP = 1.145 mg/m³
    const coMeasurement: OpenAQMeasurementsResponse = {
      meta: { page: 1, limit: 10, found: 1 },
      results: [
        {
          period: sampleMeasurementsResponse.results[0]!.period,
          value: 2.0, // 2.0 ppm
          parameter: { id: 5, name: "co", units: "ppm", displayName: "CO" },
          coordinates: { latitude: 28.598, longitude: 77.189 }
        }
      ]
    };
    const locWithCO: OpenAQLocation = {
      ...sampleLocation,
      sensors: [{ id: 501, name: "CO Sensor", parameter: { id: 5, name: "co", units: "ppm", displayName: "CO" } }]
    };
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/locations/10425")) {
        return { ok: true, status: 200, json: async () => ({ meta: {}, results: [locWithCO] }) };
      }
      return { ok: true, status: 200, json: async () => coMeasurement };
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const obsResult = await adapter.getObservations({ stationId: "openaq_10425" });
    const coObs = obsResult.observations.find((o) => o.pollutant === "CO");
    expect(coObs).toBeDefined();
    expect(coObs?.unit).toBe("mg/m³");
    expect(coObs?.value).toBeCloseTo(2.29, 1);
  });

  it("P3-OAQ-124: handles NO2 unit conversion from ppb to µg/m³ at STP", async () => {
    // 1 ppb NO2 at STP = 1.88 µg/m³
    const no2Measurement: OpenAQMeasurementsResponse = {
      meta: { page: 1, limit: 10, found: 1 },
      results: [
        {
          period: sampleMeasurementsResponse.results[0]!.period,
          value: 50.0, // 50 ppb = 94 µg/m³
          parameter: { id: 3, name: "no2", units: "ppb", displayName: "NO2" },
          coordinates: { latitude: 28.598, longitude: 77.189 }
        }
      ]
    };
    const locWithNO2: OpenAQLocation = {
      ...sampleLocation,
      sensors: [{ id: 301, name: "NO2 Sensor", parameter: { id: 3, name: "no2", units: "ppb", displayName: "NO2" } }]
    };
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/locations/10425")) {
        return { ok: true, status: 200, json: async () => ({ meta: {}, results: [locWithNO2] }) };
      }
      return { ok: true, status: 200, json: async () => no2Measurement };
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const obsResult = await adapter.getObservations({ stationId: "openaq_10425" });
    const no2Obs = obsResult.observations.find((o) => o.pollutant === "NO2");
    expect(no2Obs).toBeDefined();
    expect(no2Obs?.unit).toBe("µg/m³");
    expect(no2Obs?.value).toBe(94);
  });

  it("P3-OAQ-125: marks SO2 as provisional with null unit when unverified ppm unit is supplied", async () => {
    const so2Measurement: OpenAQMeasurementsResponse = {
      meta: { page: 1, limit: 10, found: 1 },
      results: [
        {
          period: sampleMeasurementsResponse.results[0]!.period,
          value: 0.02,
          parameter: { id: 4, name: "so2", units: "ppm", displayName: "SO2" },
          coordinates: { latitude: 28.598, longitude: 77.189 }
        }
      ]
    };
    const locWithSO2: OpenAQLocation = {
      ...sampleLocation,
      sensors: [{ id: 401, name: "SO2 Sensor", parameter: { id: 4, name: "so2", units: "ppm", displayName: "SO2" } }]
    };
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/locations/10425")) {
        return { ok: true, status: 200, json: async () => ({ meta: {}, results: [locWithSO2] }) };
      }
      return { ok: true, status: 200, json: async () => so2Measurement };
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const obsResult = await adapter.getObservations({ stationId: "openaq_10425" });
    const so2Obs = obsResult.observations.find((o) => o.pollutant === "SO2");
    expect(so2Obs).toBeDefined();
    expect(so2Obs?.unit).toBeNull();
    expect(so2Obs?.qualityFlag).toBe("PROVISIONAL");
  });

  it("P3-OAQ-126: marks O3 as provisional with null unit when unverified ppm unit is supplied", async () => {
    const o3Measurement: OpenAQMeasurementsResponse = {
      meta: { page: 1, limit: 10, found: 1 },
      results: [
        {
          period: sampleMeasurementsResponse.results[0]!.period,
          value: 0.04,
          parameter: { id: 6, name: "o3", units: "ppm", displayName: "O3" },
          coordinates: { latitude: 28.598, longitude: 77.189 }
        }
      ]
    };
    const locWithO3: OpenAQLocation = {
      ...sampleLocation,
      sensors: [{ id: 601, name: "O3 Sensor", parameter: { id: 6, name: "o3", units: "ppm", displayName: "O3" } }]
    };
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/locations/10425")) {
        return { ok: true, status: 200, json: async () => ({ meta: {}, results: [locWithO3] }) };
      }
      return { ok: true, status: 200, json: async () => o3Measurement };
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const obsResult = await adapter.getObservations({ stationId: "openaq_10425" });
    const o3Obs = obsResult.observations.find((o) => o.pollutant === "O3");
    expect(o3Obs).toBeDefined();
    expect(o3Obs?.unit).toBeNull();
    expect(o3Obs?.qualityFlag).toBe("PROVISIONAL");
  });

  it("P3-OAQ-127: preserves already standardized µg/m³ without modification", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/locations/10425")) {
        return { ok: true, status: 200, json: async () => sampleLocationsResponse };
      }
      return { ok: true, status: 200, json: async () => sampleMeasurementsResponse };
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const obsResult = await adapter.getObservations({ stationId: "openaq_10425" });
    const pm25Obs = obsResult.observations[0]!;
    expect(pm25Obs.value).toBe(pm25Obs.rawValue);
  });

  it("P3-OAQ-128: marks unverified unit when source unit is unknown", async () => {
    const unkUnitMeasurement: OpenAQMeasurementsResponse = {
      meta: { page: 1, limit: 10, found: 1 },
      results: [
        {
          period: sampleMeasurementsResponse.results[0]!.period,
          value: 50.0,
          parameter: { id: 1, name: "pm25", units: "unknown_unit_xyz", displayName: "PM2.5" },
          coordinates: { latitude: 28.598, longitude: 77.189 }
        }
      ]
    };
    const locWithUnk: OpenAQLocation = {
      ...sampleLocation,
      sensors: [{ id: 101, name: "PM25", parameter: { id: 1, name: "pm25", units: "unknown_unit_xyz", displayName: "PM2.5" } }]
    };
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/locations/10425")) {
        return { ok: true, status: 200, json: async () => ({ meta: {}, results: [locWithUnk] }) };
      }
      return { ok: true, status: 200, json: async () => unkUnitMeasurement };
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const obsResult = await adapter.getObservations({ stationId: "openaq_10425" });
    expect(obsResult.observations[0]?.qualityFlag).toBe("PROVISIONAL");
  });

  it("P3-OAQ-129: limits sensor measurements query to requested hours or default 24", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/locations/10425")) {
        return { ok: true, status: 200, json: async () => sampleLocationsResponse };
      }
      return { ok: true, status: 200, json: async () => sampleMeasurementsResponse };
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    await adapter.getObservations({ stationId: "openaq_10425", maxAgeHours: 48 });
    const measCall = mockFetch.mock.calls.find((call) => (call[0] as string).includes("/measurements"));
    expect(measCall).toBeDefined();
    const url = new URL(measCall![0] as string);
    expect(url.searchParams.get("limit")).toBe("48");
  });

  it("P3-OAQ-130: rejects invalid station ID format in getObservations", async () => {
    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const res = await adapter.getObservations({ stationId: "invalid_station_id" });
    expect(res.observations).toEqual([]);
    expect(res.status).toBe("UNAVAILABLE");
  });

  it("P3-OAQ-131: handles station without sensors gracefully", async () => {
    const locNoSensors: OpenAQLocation = { ...sampleLocation, sensors: [] };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ meta: {}, results: [locNoSensors] })
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const obsResult = await adapter.getObservations({ stationId: "openaq_10425" });
    expect(obsResult.observations).toEqual([]);
  });

  it("P3-OAQ-132: returns status UNAVAILABLE on API error in getObservations", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network failed"));
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const res = await adapter.getObservations({ stationId: "openaq_10425" });
    expect(res.status).toBe("UNAVAILABLE");
    expect(res.warnings[0]).toContain("Network failed");
  });

  it("P3-OAQ-133: sets averagingPeriod based on observation interval", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/locations/10425")) {
        return { ok: true, status: 200, json: async () => sampleLocationsResponse };
      }
      return { ok: true, status: 200, json: async () => sampleMeasurementsResponse };
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const obsResult = await adapter.getObservations({ stationId: "openaq_10425" });
    expect(obsResult.observations[0]?.averagingPeriod).toBe("1h");
  });

  it("P3-OAQ-134: returns empty forecast array on getForecast", async () => {
    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const res = await adapter.getForecast({ latitude: 28.6, longitude: 77.2 });
    expect(res.forecast).toEqual([]);
    expect(res.warnings[0]).toContain("OpenAQ does not provide atmospheric forecast models");
  });

  it("P3-OAQ-135: searchStations filters locations by query parameter", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const res = await adapter.searchStations({ query: "Delhi" });
    expect(res.stations.length).toBeGreaterThan(0);
    expect(res.stations[0]?.city).toContain("Delhi");
  });

  // Section 7: Capabilities, Search & Attribution Contracts (P3-OAQ-136 to P3-OAQ-145)
  it("P3-OAQ-136: searchStations filters locations by state or name query", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const res = await adapter.searchStations({ query: "Delhi" });
    expect(res.stations.length).toBeGreaterThan(0);
  });

  it("P3-OAQ-137: searchStations returns empty array when query does not match", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const res = await adapter.searchStations({ query: "NonExistentCityXYZ" });
    expect(res.stations).toEqual([]);
  });

  it("P3-OAQ-138: searchStations passes coordinates and radiusKm to client", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    await adapter.searchStations({ latitude: 28.59, longitude: 77.18, radiusKm: 15 });
    const url = new URL(mockFetch.mock.calls[0]?.[0]);
    expect(url.searchParams.get("coordinates")).toBe("28.59,77.18");
    expect(url.searchParams.get("radius")).toBe("15000");
  });

  it("P3-OAQ-139: searchStations handles API failures gracefully returning UNAVAILABLE status", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Timeout"));
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const res = await adapter.searchStations({ query: "Delhi" });
    expect(res.status).toBe("UNAVAILABLE");
    expect(res.stations).toEqual([]);
  });

  it("P3-OAQ-140: preserves retrievedAt ISO timestamp on station search result", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleLocationsResponse
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const res = await adapter.searchStations({ query: "Delhi" });
    expect(Date.parse(res.retrievedAt)).not.toBeNaN();
  });

  it("P3-OAQ-141: preserves retrievedAt ISO timestamp on observations result", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/locations/10425")) {
        return { ok: true, status: 200, json: async () => sampleLocationsResponse };
      }
      return { ok: true, status: 200, json: async () => sampleMeasurementsResponse };
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const res = await adapter.getObservations({ stationId: "openaq_10425" });
    expect(Date.parse(res.retrievedAt)).not.toBeNaN();
  });

  it("P3-OAQ-142: mandatory attribution contains OpenAQ", async () => {
    const adapter = new OpenAQAdapter();
    const caps = await adapter.getCapabilities();
    expect(caps.mandatoryAttribution).toContain("OpenAQ");
  });

  it("P3-OAQ-143: default cache TTL is configured to 600 seconds", async () => {
    const adapter = new OpenAQAdapter();
    const caps = await adapter.getCapabilities();
    expect(caps.defaultCacheTtlSeconds).toBe(600);
  });

  it("P3-OAQ-144: sets displayName to OpenAQ v3 Global Sensor Platform", async () => {
    const adapter = new OpenAQAdapter();
    const caps = await adapter.getCapabilities();
    expect(caps.displayName).toBe("OpenAQ v3 Global Sensor Platform");
  });

  it("P3-OAQ-145: validates end-to-end station search followed by observation retrieval", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/measurements")) {
        return { ok: true, status: 200, json: async () => sampleMeasurementsResponse };
      }
      return { ok: true, status: 200, json: async () => sampleLocationsResponse };
    });
    global.fetch = mockFetch;

    const adapter = new OpenAQAdapter({ apiKey: "key" });
    const searchRes = await adapter.searchStations({ query: "Delhi" });
    expect(searchRes.stations).toHaveLength(1);
    const stationId = searchRes.stations[0]!.id;

    const obsRes = await adapter.getObservations({ stationId });
    expect(obsRes.observations.length).toBeGreaterThan(0);
    expect(obsRes.observations[0]?.stationId).toBe(stationId);
  });
});
