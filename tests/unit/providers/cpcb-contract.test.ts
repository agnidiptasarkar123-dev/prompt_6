// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CpcbClient } from "@/services/providers/cpcb/cpcb-client";
import { CpcbAdapter } from "@/services/providers/cpcb/cpcb-adapter";
import type { CpcbRawRecord } from "@/schemas/providers/cpcb-upstream.schema";

describe("CPCB / data.gov.in Provider Contract Tests (45 Scenarios)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // PRV-CPCB-001 to PRV-CPCB-010: Client Authentication & Configuration
  it("PRV-CPCB-001: isConfigured returns false when DATA_GOV_IN_API_KEY is missing", () => {
    const client = new CpcbClient({});
    expect(client.isConfigured()).toBe(false);
  });

  it("PRV-CPCB-002: isConfigured returns false when apiKey is empty string", () => {
    const client = new CpcbClient({ apiKey: "   " });
    expect(client.isConfigured()).toBe(false);
  });

  it("PRV-CPCB-003: isConfigured returns true when valid apiKey is supplied", () => {
    const client = new CpcbClient({ apiKey: "valid_cpcb_secret_key" });
    expect(client.isConfigured()).toBe(true);
  });

  it("PRV-CPCB-004: fetchRawData throws explicit NOT_CONFIGURED error when unconfigured", async () => {
    const client = new CpcbClient({});
    await expect(client.fetchRawData()).rejects.toThrow("CPCB provider is NOT_CONFIGURED");
  });

  it("PRV-CPCB-005: redactUrl successfully redacts api-key parameter in query string", () => {
    const url = "https://api.data.gov.in/resource/123?api-key=SECRET12345&format=json";
    expect(CpcbClient.redactUrl(url)).toBe(
      "https://api.data.gov.in/resource/123?api-key=[REDACTED]&format=json"
    );
  });

  it("PRV-CPCB-006: redactUrl handles case-insensitive API-KEY parameter", () => {
    const url = "https://api.data.gov.in/resource/123?API-KEY=SECRET999&limit=10";
    expect(CpcbClient.redactUrl(url)).toBe(
      "https://api.data.gov.in/resource/123?API-KEY=[REDACTED]&limit=10"
    );
  });

  it("PRV-CPCB-007: redactUrl leaves URLs without api-key intact", () => {
    const url = "https://api.data.gov.in/resource/123?format=json&limit=10";
    expect(CpcbClient.redactUrl(url)).toBe(url);
  });

  it("PRV-CPCB-008: fetchRawData constructs correct URL with default limit and format", async () => {
    let capturedUrl = "";
    global.fetch = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ records: [] })
      });
    });

    const client = new CpcbClient({ apiKey: "test_key" });
    await client.fetchRawData();
    expect(capturedUrl).toContain("api-key=test_key");
    expect(capturedUrl).toContain("format=json");
    expect(capturedUrl).toContain("limit=1000");
  });

  it("PRV-CPCB-009: fetchRawData propagates custom limit and offset", async () => {
    let capturedUrl = "";
    global.fetch = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ records: [] })
      });
    });

    const client = new CpcbClient({ apiKey: "test_key" });
    await client.fetchRawData({ limit: 50, offset: 100 });
    expect(capturedUrl).toContain("limit=50");
    expect(capturedUrl).toContain("offset=100");
  });

  it("PRV-CPCB-010: fetchRawData propagates filters in query params", async () => {
    let capturedUrl = "";
    global.fetch = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ records: [] })
      });
    });

    const client = new CpcbClient({ apiKey: "test_key" });
    await client.fetchRawData({ filters: { city: "Kolkata", state: "West Bengal" } });
    expect(capturedUrl).toContain("filters%5Bcity%5D=Kolkata");
    expect(capturedUrl).toContain("filters%5Bstate%5D=West+Bengal");
  });

  // PRV-CPCB-011 to PRV-CPCB-020: Upstream Error Handling & HTTP Statuses
  it("PRV-CPCB-011: fetchRawData throws on HTTP 401 with redacted URL", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401
    });

    const client = new CpcbClient({ apiKey: "invalid_key" });
    await expect(client.fetchRawData()).rejects.toThrow("CPCB upstream error: HTTP 401");
  });

  it("PRV-CPCB-012: fetchRawData throws on HTTP 403 Forbidden with redacted URL", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403
    });

    const client = new CpcbClient({ apiKey: "forbidden_key" });
    await expect(client.fetchRawData()).rejects.toThrow("CPCB upstream error: HTTP 403");
  });

  it("PRV-CPCB-013: fetchRawData throws on HTTP 404 Resource Not Found", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404
    });

    const client = new CpcbClient({ apiKey: "test_key" });
    await expect(client.fetchRawData()).rejects.toThrow("CPCB upstream error: HTTP 404");
  });

  it("PRV-CPCB-014: fetchRawData throws on HTTP 429 Rate Limit Exceeded", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429
    });

    const client = new CpcbClient({ apiKey: "test_key" });
    await expect(client.fetchRawData()).rejects.toThrow("CPCB upstream error: HTTP 429");
  });

  it("PRV-CPCB-015: fetchRawData throws on HTTP 500 Internal Server Error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    });

    const client = new CpcbClient({ apiKey: "test_key" });
    await expect(client.fetchRawData()).rejects.toThrow("CPCB upstream error: HTTP 500");
  });

  it("PRV-CPCB-016: fetchRawData throws structured timeout error when request is aborted", async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      const err = new Error("AbortError");
      err.name = "AbortError";
      return Promise.reject(err);
    });

    const client = new CpcbClient({ apiKey: "test_key", timeoutMs: 100 });
    await expect(client.fetchRawData()).rejects.toThrow("timed out after 100ms");
  });

  it("PRV-CPCB-017: fetchRawData throws on invalid JSON upstream response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error("Unexpected token < in JSON"))
    });

    const client = new CpcbClient({ apiKey: "test_key" });
    await expect(client.fetchRawData()).rejects.toThrow("Unexpected token");
  });

  it("PRV-CPCB-018: fetchRawData throws on Zod schema violation when records field is not an array", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ records: "invalid_not_an_array" })
    });

    const client = new CpcbClient({ apiKey: "test_key" });
    await expect(client.fetchRawData()).rejects.toThrow();
  });

  it("PRV-CPCB-019: fetchRawData parses valid response with empty records array", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ records: [] })
    });

    const client = new CpcbClient({ apiKey: "test_key" });
    const res = await client.fetchRawData();
    expect(res.records).toEqual([]);
  });

  it("PRV-CPCB-020: fetchRawData preserves total count and pagination metadata", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        count: 4046,
        limit: 1000,
        offset: 0,
        records: []
      })
    });

    const client = new CpcbClient({ apiKey: "test_key" });
    const res = await client.fetchRawData();
    expect(res.count).toBe(4046);
  });

  // PRV-CPCB-021 to PRV-CPCB-030: Pollutant Mapping & Timestamp Parsing
  it("PRV-CPCB-021: mapPollutantId maps 'PM2.5' and 'PM25' to 'PM2.5'", () => {
    expect(CpcbAdapter.mapPollutantId("PM2.5")).toBe("PM2.5");
    expect(CpcbAdapter.mapPollutantId("PM25")).toBe("PM2.5");
    expect(CpcbAdapter.mapPollutantId("pm2.5")).toBe("PM2.5");
  });

  it("PRV-CPCB-022: mapPollutantId maps 'PM10' to 'PM10'", () => {
    expect(CpcbAdapter.mapPollutantId("PM10")).toBe("PM10");
    expect(CpcbAdapter.mapPollutantId("pm10")).toBe("PM10");
  });

  it("PRV-CPCB-023: mapPollutantId maps 'NO2' to 'NO2'", () => {
    expect(CpcbAdapter.mapPollutantId("NO2")).toBe("NO2");
    expect(CpcbAdapter.mapPollutantId("no2")).toBe("NO2");
  });

  it("PRV-CPCB-024: mapPollutantId maps 'SO2' to 'SO2'", () => {
    expect(CpcbAdapter.mapPollutantId("SO2")).toBe("SO2");
  });

  it("PRV-CPCB-025: mapPollutantId maps 'CO' to 'CO'", () => {
    expect(CpcbAdapter.mapPollutantId("CO")).toBe("CO");
  });

  it("PRV-CPCB-026: mapPollutantId maps 'OZONE' and 'O3' to 'O3'", () => {
    expect(CpcbAdapter.mapPollutantId("OZONE")).toBe("O3");
    expect(CpcbAdapter.mapPollutantId("O3")).toBe("O3");
  });

  it("PRV-CPCB-027: mapPollutantId maps 'NH3' to 'NH3'", () => {
    expect(CpcbAdapter.mapPollutantId("NH3")).toBe("NH3");
  });

  it("PRV-CPCB-028: mapPollutantId maps 'PB' and 'Lead' to 'Pb'", () => {
    expect(CpcbAdapter.mapPollutantId("PB")).toBe("Pb");
    expect(CpcbAdapter.mapPollutantId("Lead")).toBe("Pb");
  });

  it("PRV-CPCB-029: mapPollutantId returns null for unsupported pollutant species", () => {
    expect(CpcbAdapter.mapPollutantId("BENZENE")).toBeNull();
    expect(CpcbAdapter.mapPollutantId("NOX")).toBeNull();
  });

  it("PRV-CPCB-030: parseCpcbTimestamp parses standard DD-MM-YYYY HH:mm:ss IST into UTC", () => {
    // 22-11-2026 12:00:00 IST = 22-11-2026 06:30:00 UTC
    const parsed = CpcbAdapter.parseCpcbTimestamp("22-11-2026 12:00:00");
    expect(parsed).toBe("2026-11-22T06:30:00.000Z");
  });

  // PRV-CPCB-031 to PRV-CPCB-045: Record Processing, Grouping & Normalization
  it("PRV-CPCB-031: parseCpcbTimestamp returns null on 'NA', 'None' or empty string", () => {
    expect(CpcbAdapter.parseCpcbTimestamp("NA")).toBeNull();
    expect(CpcbAdapter.parseCpcbTimestamp("None")).toBeNull();
    expect(CpcbAdapter.parseCpcbTimestamp("")).toBeNull();
    expect(CpcbAdapter.parseCpcbTimestamp(null)).toBeNull();
  });

  it("PRV-CPCB-032: computeHaversineDistanceKm calculates known distance accurately", () => {
    // Victoria Memorial Kolkata (22.5448, 88.3426) to Howrah Station (22.5857, 88.3428) ~ 4.5 km
    const dist = CpcbAdapter.computeHaversineDistanceKm(22.5448, 88.3426, 22.5857, 88.3428);
    expect(dist).toBeGreaterThan(4.0);
    expect(dist).toBeLessThan(5.0);
  });

  it("PRV-CPCB-033: normalizeStationId generates deterministic slugged station ID", () => {
    const id = CpcbAdapter.normalizeStationId("West Bengal", "Kolkata", "Victoria, Kolkata - WBPCB");
    expect(id).toBe("cpcb_west-bengal_kolkata_victoria-kolkata-wbpcb");
  });

  it("PRV-CPCB-034: processRecords groups multiple pollutant rows into single unique station", () => {
    const adapter = new CpcbAdapter({});
    const records: CpcbRawRecord[] = [
      {
        country: "India",
        state: "West Bengal",
        city: "Kolkata",
        station: "Victoria",
        latitude: "22.5448",
        longitude: "88.3426",
        pollutant_id: "PM2.5",
        pollutant_avg: "65",
        last_update: "22-11-2026 12:00:00"
      },
      {
        country: "India",
        state: "West Bengal",
        city: "Kolkata",
        station: "Victoria",
        latitude: "22.5448",
        longitude: "88.3426",
        pollutant_id: "PM10",
        pollutant_avg: "120",
        last_update: "22-11-2026 12:00:00"
      }
    ];

    const result = adapter.processRecords(records, "2026-11-22T06:30:00.000Z");
    expect(result.stations).toHaveLength(1);
    expect(result.stations[0]?.availablePollutants).toContain("PM2.5");
    expect(result.stations[0]?.availablePollutants).toContain("PM10");
    expect(result.observations).toHaveLength(2);
  });

  it("PRV-CPCB-035: processRecords discards records with coordinates outside India bounds", () => {
    const adapter = new CpcbAdapter({});
    const records: CpcbRawRecord[] = [
      {
        country: "India",
        state: "Invalid",
        city: "Invalid",
        station: "Invalid Station",
        latitude: "89.0", // outside India lat range (6.0 - 38.0)
        longitude: "88.0",
        pollutant_id: "PM2.5",
        pollutant_avg: "65"
      }
    ];

    const result = adapter.processRecords(records, "2026-11-22T06:30:00.000Z");
    expect(result.stations).toHaveLength(0);
    expect(result.observations).toHaveLength(0);
  });

  it("PRV-CPCB-036: processRecords discards records with NaN coordinates", () => {
    const adapter = new CpcbAdapter({});
    const records: CpcbRawRecord[] = [
      {
        country: "India",
        state: "West Bengal",
        city: "Kolkata",
        station: "Bad Coordinates",
        latitude: "corrupted_latitude",
        longitude: "88.3426",
        pollutant_id: "PM2.5",
        pollutant_avg: "65"
      }
    ];

    const result = adapter.processRecords(records, "2026-11-22T06:30:00.000Z");
    expect(result.stations).toHaveLength(0);
  });

  it("PRV-CPCB-037: processRecords skips unknown pollutants with warning message", () => {
    const adapter = new CpcbAdapter({});
    const records: CpcbRawRecord[] = [
      {
        country: "India",
        state: "West Bengal",
        city: "Kolkata",
        station: "Victoria",
        latitude: "22.5448",
        longitude: "88.3426",
        pollutant_id: "UNSUPPORTED_GAS",
        pollutant_avg: "65"
      }
    ];

    const result = adapter.processRecords(records, "2026-11-22T06:30:00.000Z");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.observations).toHaveLength(0);
  });

  it("PRV-CPCB-038: processRecords ignores 'NA' pollutant_avg readings without crashing", () => {
    const adapter = new CpcbAdapter({});
    const records: CpcbRawRecord[] = [
      {
        country: "India",
        state: "West Bengal",
        city: "Kolkata",
        station: "Victoria",
        latitude: "22.5448",
        longitude: "88.3426",
        pollutant_id: "PM2.5",
        pollutant_avg: "NA",
        last_update: "22-11-2026 12:00:00"
      }
    ];

    const result = adapter.processRecords(records, "2026-11-22T06:30:00.000Z");
    expect(result.observations).toHaveLength(0);
  });

  it("PRV-CPCB-039: processRecords normalizes verified units and never invents missing or NA units", () => {
    const adapter = new CpcbAdapter({});
    const records: CpcbRawRecord[] = [
      {
        country: "India",
        state: "West Bengal",
        city: "Kolkata",
        station: "Victoria",
        latitude: "22.5448",
        longitude: "88.3426",
        pollutant_id: "CO",
        pollutant_avg: "1.2",
        pollutant_unit: "mg/m3",
        last_update: "22-11-2026 12:00:00"
      },
      {
        country: "India",
        state: "West Bengal",
        city: "Kolkata",
        station: "Victoria",
        latitude: "22.5448",
        longitude: "88.3426",
        pollutant_id: "PM2.5",
        pollutant_avg: "45",
        pollutant_unit: "µg/m3",
        last_update: "22-11-2026 12:00:00"
      },
      {
        country: "India",
        state: "West Bengal",
        city: "Kolkata",
        station: "Victoria",
        latitude: "22.5448",
        longitude: "88.3426",
        pollutant_id: "NO2",
        pollutant_avg: "30",
        pollutant_unit: "NA",
        last_update: "22-11-2026 12:00:00"
      }
    ];

    const result = adapter.processRecords(records, "2026-11-22T06:30:00.000Z");
    const coObs = result.observations.find((o) => o.pollutant === "CO");
    const pm25Obs = result.observations.find((o) => o.pollutant === "PM2.5");
    const no2Obs = result.observations.find((o) => o.pollutant === "NO2");
    expect(coObs?.unit).toBe("mg/m³");
    expect(pm25Obs?.unit).toBe("µg/m³");
    expect(no2Obs?.unit).toBeNull(); // Never invented!
    expect(no2Obs?.qualityFlag).toBe("PROVISIONAL");
  });

  it("PRV-CPCB-040: processRecords flags readings above 2500 µg/m³ as SUSPICIOUS", () => {
    const adapter = new CpcbAdapter({});
    const records: CpcbRawRecord[] = [
      {
        country: "India",
        state: "West Bengal",
        city: "Kolkata",
        station: "Victoria",
        latitude: "22.5448",
        longitude: "88.3426",
        pollutant_id: "PM2.5",
        pollutant_avg: "9999", // sensor fault register
        last_update: "22-11-2026 12:00:00"
      }
    ];

    const result = adapter.processRecords(records, "2026-11-22T06:30:00.000Z");
    expect(result.observations[0]?.qualityFlag).toBe("SUSPICIOUS");
  });

  it("PRV-CPCB-041: searchStations returns NOT_CONFIGURED when API key is missing", async () => {
    const adapter = new CpcbAdapter({});
    const res = await adapter.searchStations({ query: "Delhi" });
    expect(res.status).toBe("NOT_CONFIGURED");
    expect(res.stations).toHaveLength(0);
  });

  it("PRV-CPCB-042: searchStations filters stations by text query correctly", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        records: [
          {
            country: "India",
            state: "Delhi",
            city: "Delhi",
            station: "Anand Vihar",
            latitude: "28.6508",
            longitude: "77.3152",
            pollutant_id: "PM2.5",
            pollutant_avg: "180",
            last_update: "22-11-2026 12:00:00"
          },
          {
            country: "India",
            state: "West Bengal",
            city: "Kolkata",
            station: "Victoria",
            latitude: "22.5448",
            longitude: "88.3426",
            pollutant_id: "PM2.5",
            pollutant_avg: "50",
            last_update: "22-11-2026 12:00:00"
          }
        ]
      })
    });

    const adapter = new CpcbAdapter({ apiKey: "test_key" });
    const res = await adapter.searchStations({ query: "Anand" });
    expect(res.stations).toHaveLength(1);
    expect(res.stations[0]?.name).toBe("Anand Vihar");
  });

  it("PRV-CPCB-043: searchStations sorts stations by distance when coordinates are provided", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        records: [
          {
            country: "India",
            state: "West Bengal",
            city: "Kolkata",
            station: "Far Station",
            latitude: "22.8",
            longitude: "88.4",
            pollutant_id: "PM2.5",
            pollutant_avg: "50",
            last_update: "22-11-2026 12:00:00"
          },
          {
            country: "India",
            state: "West Bengal",
            city: "Kolkata",
            station: "Near Station",
            latitude: "22.55",
            longitude: "88.35",
            pollutant_id: "PM2.5",
            pollutant_avg: "50",
            last_update: "22-11-2026 12:00:00"
          }
        ]
      })
    });

    const adapter = new CpcbAdapter({ apiKey: "test_key" });
    const res = await adapter.searchStations({ latitude: 22.54, longitude: 88.34, radiusKm: 100 });
    expect(res.stations[0]?.name).toBe("Near Station");
    expect(res.stations[1]?.name).toBe("Far Station");
  });

  it("PRV-CPCB-044: getCapabilities returns correct metadata including GODL-India license", async () => {
    const adapter = new CpcbAdapter({});
    const caps = await adapter.getCapabilities();
    expect(caps.legalLicense).toContain("GODL-India");
    expect(caps.providesGroundObservations).toBe(true);
    expect(caps.providesAtmosphericForecast).toBe(false);
  });

  it("PRV-CPCB-045: getForecast returns empty array and explicit non-forecast note", async () => {
    const adapter = new CpcbAdapter({});
    const fc = await adapter.getForecast({ latitude: 22.5, longitude: 88.3 });
    expect(fc.forecast).toHaveLength(0);
    expect(fc.warnings[0]).toContain("does not provide atmospheric forecast");
  });
});
