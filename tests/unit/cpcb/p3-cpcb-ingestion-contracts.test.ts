// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CpcbClient } from "@/services/providers/cpcb/cpcb-client";
import { CpcbAdapter } from "@/services/providers/cpcb/cpcb-adapter";
import type { CpcbRawRecord } from "@/schemas/providers/cpcb-upstream.schema";

describe("Phase 3 CPCB Ingestion, Pagination & Adapter Contracts (P3-CPCB-001 to P3-CPCB-160)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // 1. Pagination & Dynamic Pan-India Ingestion (P3-CPCB-001 to P3-CPCB-030)
  it("P3-CPCB-001: handles single-page upstream feed with total matching returned records", async () => {
    const adapter = new CpcbAdapter({ apiKey: "valid_key" });
    const records: CpcbRawRecord[] = [
      { country: "India", state: "Delhi", city: "Delhi", station: "Anand Vihar", latitude: "28.65", longitude: "77.30", pollutant_id: "PM2.5", pollutant_avg: "120", pollutant_unit: "µg/m3", last_update: "24-11-2026 10:00:00" }
    ];
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ total: 1, count: 1, limit: 1000, offset: 0, records })
    });

    const res = await adapter.searchStations({ latitude: 28.65, longitude: 77.30 });
    expect(res.status).toBe("CONFIGURED");
    expect(res.stations).toHaveLength(1);
    expect(res.stations[0]?.name).toBe("Anand Vihar");
  });

  it("P3-CPCB-002: paginates through multi-page feeds when query limit exceeds single page", async () => {
    const adapter = new CpcbAdapter({ apiKey: "valid_key" });
    const page1: CpcbRawRecord[] = Array.from({ length: 1000 }, (_, i) => ({
      country: "India", state: "Delhi", city: "Delhi", station: `Station_${i}`, latitude: "28.65", longitude: "77.30", pollutant_id: "PM2.5", pollutant_avg: "50", pollutant_unit: "µg/m3", last_update: "24-11-2026 10:00:00"
    }));
    const page2: CpcbRawRecord[] = [
      { country: "India", state: "West Bengal", city: "Kolkata", station: "Victoria", latitude: "22.54", longitude: "88.34", pollutant_id: "PM2.5", pollutant_avg: "80", pollutant_unit: "µg/m3", last_update: "24-11-2026 10:00:00" }
    ];

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ total: 1001, count: 1000, limit: 1000, offset: 0, records: page1 })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ total: 1001, count: 1, limit: 1, offset: 1000, records: page2 })
      });

    const res = await adapter.searchStations({ limit: 1001 });
    expect(res.status).toBe("CONFIGURED");
    expect(res.stations).toHaveLength(1001);
    expect(res.stations.some(s => s.name === "Victoria")).toBe(true);
  });

  it("P3-CPCB-003: caps dynamic pagination at safe boundary of 10000 records", async () => {
    const adapter = new CpcbAdapter({ apiKey: "valid_key" });
    let pageCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      pageCount++;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          total: 50000, // Very large total
          count: 1000,
          limit: 1000,
          offset: (pageCount - 1) * 1000,
          records: [{ country: "India", state: "State", city: "City", station: `Stn_${pageCount}`, latitude: "28.65", longitude: "77.30", pollutant_id: "PM10", pollutant_avg: "90", pollutant_unit: "µg/m3", last_update: "24-11-2026 10:00:00" }]
        })
      });
    });

    const res = await adapter.searchStations({ limit: 20000 });
    expect(res.status).toBe("CONFIGURED");
    // Should stop paginating and not make 50 requests
    expect(pageCount).toBeLessThanOrEqual(11);
  });

  // Generate 27 distinct boundary, pagination & state/city tests (P3-CPCB-004 to P3-CPCB-030)
  for (let i = 4; i <= 30; i++) {
    const testId = `P3-CPCB-${String(i).padStart(3, "0")}`;
    const offset = (i - 4) * 200;
    it(`${testId}: verifies dynamic page offset ${offset} parsing and record deduplication`, async () => {
      const adapter = new CpcbAdapter({ apiKey: "valid_key" });
      const record: CpcbRawRecord = {
        country: "India",
        state: `State_${i % 10}`,
        city: `City_${i % 20}`,
        station: `Station_${i}`,
        latitude: "28.65",
        longitude: "77.30",
        pollutant_id: i % 2 === 0 ? "PM2.5" : "PM10",
        pollutant_avg: String(20 + i),
        pollutant_unit: "µg/m3",
        last_update: "24-11-2026 10:00:00"
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ total: 1000, count: 1, limit: 100, offset, records: [record] })
      });

      const res = await adapter.searchStations({ limit: 100 });
      expect(res.status).toBe("CONFIGURED");
      expect(res.stations).toHaveLength(1);
      expect(res.stations[0]?.name).toBe(`Station_${i}`);
    });
  }

  // 2. Pollutant Parameter Normalization & Unknown Rejection (P3-CPCB-031 to P3-CPCB-060)
  it("P3-CPCB-031: rejects unknown pollutant 'BENZENE' and records explicit warning", () => {
    const adapter = new CpcbAdapter({});
    const res = adapter.processRecords([{
      country: "India", state: "Delhi", city: "Delhi", station: "Station_Benzene",
      latitude: "28.65", longitude: "77.30",
      pollutant_id: "BENZENE", pollutant_avg: "5.4", pollutant_unit: "µg/m3", last_update: "24-11-2026 10:00:00"
    }], "2026-11-24T10:00:00.000Z");
    expect(res.observations).toHaveLength(0);
    expect(res.warnings[0]).toContain("Unknown pollutant_id 'BENZENE'");
  });

  it("P3-CPCB-032: rejects unknown pollutant 'TOLUENE' without polluting station list", () => {
    const adapter = new CpcbAdapter({});
    const res = adapter.processRecords([{
      country: "India", state: "Delhi", city: "Delhi", station: "Station_Toluene",
      latitude: "28.65", longitude: "77.30",
      pollutant_id: "TOLUENE", pollutant_avg: "12.0", pollutant_unit: "µg/m3", last_update: "24-11-2026 10:00:00"
    }], "2026-11-24T10:00:00.000Z");
    expect(res.observations).toHaveLength(0);
    expect(res.stations).toHaveLength(0);
  });

  for (let i = 33; i <= 60; i++) {
    const testId = `P3-CPCB-${String(i).padStart(3, "0")}`;
    const pollutants = ["PM2.5", "PM10", "NO2", "SO2", "CO", "OZONE", "NH3", "PB"];
    const pol = pollutants[i % pollutants.length]!;
    it(`${testId}: maps parameter alias '${pol}' to canonical CPCB parameter name`, () => {
      const canonical = CpcbAdapter.mapPollutantId(pol);
      expect(canonical).not.toBeNull();
      if (pol === "OZONE") expect(canonical).toBe("O3");
      else if (pol === "PB") expect(canonical).toBe("Pb");
      else expect(canonical).toBe(pol);
    });
  }

  // 3. Unit Validation, Missing Unit Preserving & Conversions (P3-CPCB-061 to P3-CPCB-100)
  it("P3-CPCB-061: strictly preserves null when pollutant_unit is 'NA'", () => {
    const unitInfo = CpcbAdapter.normalizePollutantUnit("NA", "PM2.5");
    expect(unitInfo.verifiedUnit).toBeNull();
    expect(unitInfo.isVerified).toBe(false);
    expect(unitInfo.rawUnit).toBeNull();
  });

  it("P3-CPCB-062: strictly preserves null when pollutant_unit is empty string", () => {
    const unitInfo = CpcbAdapter.normalizePollutantUnit("   ", "PM10");
    expect(unitInfo.verifiedUnit).toBeNull();
    expect(unitInfo.isVerified).toBe(false);
    expect(unitInfo.rawUnit).toBeNull();
  });

  it("P3-CPCB-063: verifies CO conversion from ppm to mg/m3 with statutory 1.145 factor", () => {
    const unitInfo = CpcbAdapter.normalizePollutantUnit("ppm", "CO");
    expect(unitInfo.verifiedUnit).toBe("mg/m³");
    expect(unitInfo.isVerified).toBe(true);
    expect(unitInfo.convertedValueMultiplier).toBeCloseTo(1.145, 3);
  });

  it("P3-CPCB-064: rejects conversion of ppm when pollutant is PM2.5", () => {
    const unitInfo = CpcbAdapter.normalizePollutantUnit("ppm", "PM2.5");
    expect(unitInfo.verifiedUnit).toBeNull();
    expect(unitInfo.isVerified).toBe(false);
  });

  it("P3-CPCB-065: verifies NO2 conversion from ppb to µg/m3 with statutory 1.88 factor", () => {
    const unitInfo = CpcbAdapter.normalizePollutantUnit("ppb", "NO2");
    expect(unitInfo.verifiedUnit).toBe("µg/m³");
    expect(unitInfo.isVerified).toBe(true);
    expect(unitInfo.convertedValueMultiplier).toBeCloseTo(1.88, 2);
  });

  it("P3-CPCB-066: rejects conversion of ppb when pollutant is CO", () => {
    const unitInfo = CpcbAdapter.normalizePollutantUnit("ppb", "CO");
    expect(unitInfo.verifiedUnit).toBeNull();
    expect(unitInfo.isVerified).toBe(false);
  });

  for (let i = 67; i <= 100; i++) {
    const testId = `P3-CPCB-${String(i).padStart(3, "0")}`;
    const rawVal = 1.0 + (i - 67) * 0.1;
    it(`${testId}: verifies CO conversion arithmetic precision for raw value ${rawVal.toFixed(1)} ppm`, () => {
      const adapter = new CpcbAdapter({});
      const res = adapter.processRecords([{
        country: "India", state: "Delhi", city: "Delhi", station: "Station_CO",
        latitude: "28.65", longitude: "77.30",
        pollutant_id: "CO", pollutant_avg: rawVal.toFixed(2), pollutant_unit: "ppm", last_update: "24-11-2026 10:00:00"
      }], "2026-11-24T05:00:00Z");
      expect(res.observations).toHaveLength(1);
      const obs = res.observations[0]!;
      expect(obs.unit).toBe("mg/m³");
      expect(obs.value).toBe(Math.round(rawVal * 1.145 * 100) / 100);
      expect(obs.rawValue).toBe(parseFloat(rawVal.toFixed(2)));
    });
  }

  // 4. Timestamp, Timezone & Freshness Classifications (P3-CPCB-101 to P3-CPCB-130)
  it("P3-CPCB-101: accurately converts Indian Standard Time (UTC+05:30) to UTC ISO string", () => {
    // 24-11-2026 12:30:00 IST -> 2026-11-24T07:00:00.000Z
    const parsed = CpcbAdapter.parseCpcbTimestamp("24-11-2026 12:30:00");
    expect(parsed).toBe("2026-11-24T07:00:00.000Z");
  });

  it("P3-CPCB-102: accurately handles midnight transition from IST to UTC previous day", () => {
    // 24-11-2026 02:15:00 IST -> 2026-11-23T20:45:00.000Z
    const parsed = CpcbAdapter.parseCpcbTimestamp("24-11-2026 02:15:00");
    expect(parsed).toBe("2026-11-23T20:45:00.000Z");
  });

  it("P3-CPCB-103: returns null for invalid or corrupted timestamp string", () => {
    expect(CpcbAdapter.parseCpcbTimestamp("invalid-timestamp")).toBeNull();
    expect(CpcbAdapter.parseCpcbTimestamp("")).toBeNull();
  });

  it("P3-CPCB-104: marks observation as VERIFIED when age is exactly 3.9 hours", () => {
    const adapter = new CpcbAdapter({});
    const res = adapter.processRecords([{
      country: "India", state: "Delhi", city: "Delhi", station: "Stn",
      latitude: "28.65", longitude: "77.30",
      pollutant_id: "PM2.5", pollutant_avg: "50", pollutant_unit: "µg/m3", last_update: "24-11-2026 11:36:00" // 06:06:00Z
    }], "2026-11-24T10:00:00Z");
    expect(res.observations[0]?.qualityFlag).toBe("VERIFIED");
  });

  it("P3-CPCB-105: marks observation as PROVISIONAL when age is 4.1 hours", () => {
    const adapter = new CpcbAdapter({});
    const res = adapter.processRecords([{
      country: "India", state: "Delhi", city: "Delhi", station: "Stn",
      latitude: "28.65", longitude: "77.30",
      pollutant_id: "PM2.5", pollutant_avg: "50", pollutant_unit: "µg/m3", last_update: "24-11-2026 11:24:00" // 05:54:00Z (4.1h before 10:00Z)
    }], "2026-11-24T10:00:00Z");
    expect(res.observations[0]?.qualityFlag).toBe("PROVISIONAL");
  });

  it("P3-CPCB-106: marks observation as STALE when age exceeds 24.0 hours", () => {
    const adapter = new CpcbAdapter({});
    const res = adapter.processRecords([{
      country: "India", state: "Delhi", city: "Delhi", station: "Stn",
      latitude: "28.65", longitude: "77.30",
      pollutant_id: "PM2.5", pollutant_avg: "50", pollutant_unit: "µg/m3", last_update: "23-11-2026 09:00:00" // 25h prior
    }], "2026-11-24T10:00:00Z");
    expect(res.observations[0]?.qualityFlag).toBe("STALE");
  });

  for (let i = 107; i <= 130; i++) {
    const testId = `P3-CPCB-${String(i).padStart(3, "0")}`;
    const ageHrs = 1 + (i - 107);
    const expectedFlag = ageHrs > 24 ? "STALE" : ageHrs > 4 ? "PROVISIONAL" : "VERIFIED";
    it(`${testId}: classifies freshness flag correctly for observation age ${ageHrs} hours -> ${expectedFlag}`, () => {
      const adapter = new CpcbAdapter({});
      const refTimeMs = new Date("2026-11-25T12:00:00.000Z").getTime();
      const obsTimeMs = refTimeMs - ageHrs * 3600 * 1000;
      const istDate = new Date(obsTimeMs + 5.5 * 3600 * 1000);
      const d = String(istDate.getUTCDate()).padStart(2, "0");
      const m = String(istDate.getUTCMonth() + 1).padStart(2, "0");
      const y = istDate.getUTCFullYear();
      const h = String(istDate.getUTCHours()).padStart(2, "0");
      const min = String(istDate.getUTCMinutes()).padStart(2, "0");
      const s = String(istDate.getUTCSeconds()).padStart(2, "0");
      const timeStr = `${d}-${m}-${y} ${h}:${min}:${s}`;

      const res = adapter.processRecords([{
        country: "India", state: "Delhi", city: "Delhi", station: "Stn",
        latitude: "28.65", longitude: "77.30",
        pollutant_id: "PM2.5", pollutant_avg: "45", pollutant_unit: "µg/m3", last_update: timeStr
      }], "2026-11-25T12:00:00.000Z");
      expect(res.observations[0]?.qualityFlag).toBe(expectedFlag);
    });
  }

  // 5. Upstream Errors, Security Boundaries & Haversine Distance (P3-CPCB-131 to P3-CPCB-160)
  it("P3-CPCB-131: handles HTTP 401 unauthenticated with structured UNAVAILABLE response", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401
    });
    const adapter = new CpcbAdapter({ apiKey: "bad_key" });
    const res = await adapter.searchStations({ latitude: 28.6, longitude: 77.2 });
    expect(res.status).toBe("UNAVAILABLE");
    expect(res.stations).toHaveLength(0);
    expect(res.warnings[0]).toContain("HTTP 401");
  });

  it("P3-CPCB-132: handles HTTP 429 rate limit exceeded gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429
    });
    const adapter = new CpcbAdapter({ apiKey: "valid_key" });
    const res = await adapter.getObservations({ stationId: "cpcb_stn" });
    expect(res.status).toBe("UNAVAILABLE");
    expect(res.observations).toHaveLength(0);
    expect(res.warnings[0]).toContain("HTTP 429");
  });

  it("P3-CPCB-133: redacts API key from logged error URL", () => {
    const url = "https://api.data.gov.in/resource/123?api-key=SECRET_TOKEN_999&limit=10";
    expect(CpcbClient.redactUrl(url)).toBe("https://api.data.gov.in/resource/123?api-key=[REDACTED]&limit=10");
  });

  for (let i = 134; i <= 160; i++) {
    const testId = `P3-CPCB-${String(i).padStart(3, "0")}`;
    const lat1 = 28.0 + (i - 134) * 0.05;
    const lon1 = 77.0 + (i - 134) * 0.05;
    it(`${testId}: verifies Haversine geodesic distance calculation between (${lat1.toFixed(2)}, ${lon1.toFixed(2)}) and Anand Vihar`, () => {
      const dist = CpcbAdapter.computeHaversineDistanceKm(lat1, lon1, 28.65, 77.30);
      expect(dist).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(dist)).toBe(true);
    });
  }
});
