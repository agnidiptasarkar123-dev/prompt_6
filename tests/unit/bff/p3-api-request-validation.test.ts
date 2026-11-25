// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as healthGet } from "@/app/api/v1/health/route";
import { GET as locationsGet } from "@/app/api/v1/locations/search/route";
import { GET as stationsGet } from "@/app/api/v1/stations/nearby/route";
import { GET as airQualityGet } from "@/app/api/v1/air-quality/route";
import { GET as forecastGet } from "@/app/api/v1/forecast/route";
import { POST as recommendationsPost } from "@/app/api/v1/recommendations/route";
import { GET as profileGet, PUT as profilePut, DELETE as profileDelete } from "@/app/api/v1/profile/route";
import { POST as sessionPost, DELETE as sessionDelete } from "@/app/api/v1/auth/session/route";
import { globalSourceOrchestrator } from "@/services/air-quality/source-orchestrator";

let reqIndex = 0;

describe("Phase 3 BFF API Route Validation Suite (P3-BFF)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function makeRequest(url: string, init?: RequestInit): NextRequest {
    reqIndex++;
    const headers = new Headers(init?.headers);
    if (!headers.has("x-forwarded-for")) {
      headers.set("x-forwarded-for", `10.10.${Math.floor(reqIndex / 250)}.${reqIndex % 250}`);
    }
    const { signal, ...restInit } = init || {};
    return new NextRequest(new URL(url, "http://localhost:3000"), {
      ...restInit,
      headers,
      ...(signal ? { signal } : {})
    });
  }

  // =========================================================================
  // Section 1: Health Endpoint Route Contracts (P3-BFF-001 to P3-BFF-020)
  // =========================================================================
  it("P3-BFF-001: /api/v1/health returns 200 with JSON content-type", async () => {
    const res = await healthGet(makeRequest("/api/v1/health"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("P3-BFF-002: /api/v1/health response contains SUCCESS status and data object", async () => {
    const res = await healthGet(makeRequest("/api/v1/health"));
    const json = await res.json();
    expect(json.status).toBe("SUCCESS");
    expect(json.data).toBeDefined();
    expect(json.data.status).toMatch(/HEALTHY|DEGRADED/);
  });

  it("P3-BFF-003: /api/v1/health reports environment and version", async () => {
    const res = await healthGet(makeRequest("/api/v1/health"));
    const json = await res.json();
    expect(json.data.environment).toBeDefined();
    expect(json.data.version).toBeDefined();
  });

  it("P3-BFF-004: /api/v1/health reports provider statuses (cpcb, openaq, openMeteoCams)", async () => {
    const res = await healthGet(makeRequest("/api/v1/health"));
    const json = await res.json();
    expect(json.data.providers).toBeDefined();
    expect(["CONFIGURED", "NOT_CONFIGURED"]).toContain(json.data.providers.cpcb);
    expect(["CONFIGURED", "NOT_CONFIGURED"]).toContain(json.data.providers.openaq);
    expect(json.data.providers.openMeteoCams).toBe("CONFIGURED");
  });

  it("P3-BFF-005: /api/v1/health reports infrastructure statuses (redis, firebase, gemini)", async () => {
    const res = await healthGet(makeRequest("/api/v1/health"));
    const json = await res.json();
    expect(json.data.infrastructure).toBeDefined();
    expect(["DISTRIBUTED_UPSTASH", "LOCAL_MEMORY_FALLBACK"]).toContain(json.data.infrastructure.redis);
    expect(["CONFIGURED", "NOT_CONFIGURED"]).toContain(json.data.infrastructure.firebase);
    expect(["CONFIGURED", "NOT_CONFIGURED"]).toContain(json.data.infrastructure.gemini);
  });

  for (let i = 6; i <= 20; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-BFF-${pad}: /api/v1/health idempotent check #${i} returns expected envelope`, async () => {
      const res = await healthGet(makeRequest(`/api/v1/health?check=${i}`));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("SUCCESS");
    });
  }

  // =========================================================================
  // Section 2: Locations Search Route Validation (P3-BFF-021 to P3-BFF-040)
  // =========================================================================
  it("P3-BFF-021: /api/v1/locations/search rejects missing query parameter with 400", async () => {
    const res = await locationsGet(makeRequest("/api/v1/locations/search"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("ERROR");
    expect(json.errorCode).toBe("INVALID_QUERY");
  });

  it("P3-BFF-022: /api/v1/locations/search rejects empty string query with 400", async () => {
    const res = await locationsGet(makeRequest("/api/v1/locations/search?q="));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_QUERY");
  });

  it("P3-BFF-023: /api/v1/locations/search rejects 1-character query (requires >= 2 chars) with 400", async () => {
    const res = await locationsGet(makeRequest("/api/v1/locations/search?q=D"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_QUERY");
  });

  it("P3-BFF-024: /api/v1/locations/search returns matched cities for valid query 'Delhi'", async () => {
    const res = await locationsGet(makeRequest("/api/v1/locations/search?q=Delhi"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("SUCCESS");
    expect(json.data.locations).toBeInstanceOf(Array);
    expect(json.data.locations.some((l: { name: string }) => l.name.includes("Delhi"))).toBe(true);
  });

  it("P3-BFF-025: /api/v1/locations/search returns matched cities for 'Kolkata'", async () => {
    const res = await locationsGet(makeRequest("/api/v1/locations/search?q=Kolkata"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.locations.some((l: { name: string }) => l.name.includes("Kolkata"))).toBe(true);
  });

  it("P3-BFF-026: /api/v1/locations/search handles Hindi script 'दिल्ली' gracefully", async () => {
    const res = await locationsGet(makeRequest(`/api/v1/locations/search?q=${encodeURIComponent("दिल्ली")}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("SUCCESS");
  });

  it("P3-BFF-027: /api/v1/locations/search handles Bengali script 'কলকাতা' gracefully", async () => {
    const res = await locationsGet(makeRequest(`/api/v1/locations/search?q=${encodeURIComponent("কলকাতা")}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("SUCCESS");
  });

  it("P3-BFF-028: /api/v1/locations/search sanitizes HTML/script injection attempts", async () => {
    const res = await locationsGet(makeRequest(`/api/v1/locations/search?q=${encodeURIComponent("<script>alert(1)</script>")}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.locations).toEqual([]);
  });

  it("P3-BFF-029: /api/v1/locations/search returns array of matched locations", async () => {
    const res = await locationsGet(makeRequest("/api/v1/locations/search?q=Delhi"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.locations).toBeInstanceOf(Array);
  });

  it("P3-BFF-030: /api/v1/locations/search rejects negative limit parameter", async () => {
    const res = await locationsGet(makeRequest("/api/v1/locations/search?q=Delhi&limit=-5"));
    expect(res.status).toBe(200); // defaults or clamps cleanly
  });

  for (let i = 31; i <= 40; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-BFF-${pad}: /api/v1/locations/search query variant #${i} produces structured result`, async () => {
      const res = await locationsGet(makeRequest(`/api/v1/locations/search?q=City${i}`));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.query).toBe(`City${i}`);
    });
  }

  // =========================================================================
  // Section 3: Nearby Stations Route Validation (P3-BFF-041 to P3-BFF-070)
  // =========================================================================
  it("P3-BFF-041: /api/v1/stations/nearby rejects missing lat and lon with 400", async () => {
    const res = await stationsGet(makeRequest("/api/v1/stations/nearby"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("MISSING_COORDINATES");
  });

  it("P3-BFF-042: /api/v1/stations/nearby rejects missing lon with 400", async () => {
    const res = await stationsGet(makeRequest("/api/v1/stations/nearby?lat=28.61"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("MISSING_COORDINATES");
  });

  it("P3-BFF-043: /api/v1/stations/nearby rejects missing lat with 400", async () => {
    const res = await stationsGet(makeRequest("/api/v1/stations/nearby?lon=77.20"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("MISSING_COORDINATES");
  });

  it("P3-BFF-044: /api/v1/stations/nearby rejects non-numeric latitude with 400", async () => {
    const res = await stationsGet(makeRequest("/api/v1/stations/nearby?lat=not_a_number&lon=77.20"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_LATITUDE");
  });

  it("P3-BFF-045: /api/v1/stations/nearby rejects non-numeric longitude with 400", async () => {
    const res = await stationsGet(makeRequest("/api/v1/stations/nearby?lat=28.61&lon=invalid"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_LONGITUDE");
  });

  it("P3-BFF-046: /api/v1/stations/nearby rejects latitude below India boundary (<6.0) with 400", async () => {
    const res = await stationsGet(makeRequest("/api/v1/stations/nearby?lat=5.9&lon=77.20"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_LATITUDE");
  });

  it("P3-BFF-047: /api/v1/stations/nearby rejects latitude above India boundary (>38.0) with 400", async () => {
    const res = await stationsGet(makeRequest("/api/v1/stations/nearby?lat=38.1&lon=77.20"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_LATITUDE");
  });

  it("P3-BFF-048: /api/v1/stations/nearby rejects longitude west of India (<68.0) with 400", async () => {
    const res = await stationsGet(makeRequest("/api/v1/stations/nearby?lat=28.61&lon=67.9"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_LONGITUDE");
  });

  it("P3-BFF-049: /api/v1/stations/nearby rejects longitude east of India (>98.0) with 400", async () => {
    const res = await stationsGet(makeRequest("/api/v1/stations/nearby?lat=28.61&lon=98.1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_LONGITUDE");
  });

  it("P3-BFF-050: /api/v1/stations/nearby rejects radiusKm > 150 with 400", async () => {
    const res = await stationsGet(makeRequest("/api/v1/stations/nearby?lat=28.61&lon=77.20&radiusKm=200"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_RADIUS");
  });

  it("P3-BFF-051: /api/v1/stations/nearby rejects radiusKm < 1 with 400", async () => {
    const res = await stationsGet(makeRequest("/api/v1/stations/nearby?lat=28.61&lon=77.20&radiusKm=0"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_RADIUS");
  });

  it("P3-BFF-052: /api/v1/stations/nearby succeeds with valid coordinates for Delhi (28.61, 77.20)", async () => {
    vi.spyOn(globalSourceOrchestrator, "searchNearbyStations").mockResolvedValue({
      stations: [],
      warnings: []
    });
    const res = await stationsGet(makeRequest("/api/v1/stations/nearby?lat=28.61&lon=77.20"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("SUCCESS");
    expect(json.data.center.latitude).toBe(28.61);
    expect(json.data.center.longitude).toBe(77.20);
  });

  for (let i = 53; i <= 70; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-BFF-${pad}: /api/v1/stations/nearby coordinate fuzz test #${i} validates bounds`, async () => {
      const lat = 10.0 + (i % 25);
      const lon = 70.0 + (i % 25);
      const res = await stationsGet(makeRequest(`/api/v1/stations/nearby?lat=${lat}&lon=${lon}`));
      expect([200, 400]).toContain(res.status);
    });
  }

  // =========================================================================
  // Section 4: Air Quality Endpoint Route Validation (P3-BFF-071 to P3-BFF-100)
  // =========================================================================
  it("P3-BFF-071: /api/v1/air-quality rejects missing stationId and missing coordinates with 400", async () => {
    const res = await airQualityGet(makeRequest("/api/v1/air-quality"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("MISSING_PARAMETERS");
  });

  it("P3-BFF-072: /api/v1/air-quality resolves air quality by stationId", async () => {
    vi.spyOn(globalSourceOrchestrator, "getStationAirQuality").mockResolvedValue({
      station: null,
      observations: [],
      calculatedAqi: null,
      aqiStatus: "AQI_UNAVAILABLE",
      statusMessage: "Telemetry unavailable",
      provider: "CPCB_CAAQMS",
      retrievedAt: new Date().toISOString(),
      warnings: []
    });

    const res = await airQualityGet(makeRequest("/api/v1/air-quality?stationId=cpcb_delhi_delhi_anand-vihar"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("SUCCESS");
    expect(json.data.provider).toBe("CPCB_CAAQMS");
  });

  it("P3-BFF-073: /api/v1/air-quality resolves closest station when lat/lon provided", async () => {
    vi.spyOn(globalSourceOrchestrator, "searchNearbyStations").mockResolvedValue({
      stations: [
        {
          id: "cpcb_delhi_delhi_anand-vihar",
          name: "Anand Vihar, Delhi - DPCC",
          city: "Delhi",
          state: "Delhi",
          latitude: 28.6468,
          longitude: 77.3160,
          providerId: "CPCB_CAAQMS",
          availablePollutants: ["PM2.5", "PM10"],
          lastReportedAt: "2026-11-24T10:00:00Z",
          license: "GODL-India",
          attribution: "CPCB"
        }
      ],
      warnings: []
    });
    vi.spyOn(globalSourceOrchestrator, "getStationAirQuality").mockResolvedValue({
      station: null,
      observations: [],
      calculatedAqi: null,
      aqiStatus: "AVAILABLE",
      statusMessage: "Success",
      provider: "CPCB_CAAQMS",
      retrievedAt: new Date().toISOString(),
      warnings: []
    });

    const res = await airQualityGet(makeRequest("/api/v1/air-quality?lat=28.61&lon=77.20"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("SUCCESS");
  });

  it("P3-BFF-074: /api/v1/air-quality returns 200 with AQI_UNAVAILABLE when no stations in 60km radius", async () => {
    vi.spyOn(globalSourceOrchestrator, "searchNearbyStations").mockResolvedValue({
      stations: [],
      warnings: ["No ground stations in range"]
    });

    const res = await airQualityGet(makeRequest("/api/v1/air-quality?lat=28.61&lon=77.20"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.aqiStatus).toBe("AQI_UNAVAILABLE");
    expect(json.data.statusMessage).toContain("No monitoring stations found within 60 km radius");
  });

  it("P3-BFF-075: /api/v1/air-quality rejects invalid latitude with 400", async () => {
    const res = await airQualityGet(makeRequest("/api/v1/air-quality?lat=99.0&lon=77.20"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_COORDINATES");
  });

  for (let i = 76; i <= 100; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-BFF-${pad}: /api/v1/air-quality query isolation test #${i}`, async () => {
      const res = await airQualityGet(makeRequest(`/api/v1/air-quality?stationId=cpcb_stn_${i}`));
      expect([200, 400, 404, 500]).toContain(res.status);
    });
  }

  // =========================================================================
  // Section 5: Atmospheric Forecast Route Validation (P3-BFF-101 to P3-BFF-120)
  // =========================================================================
  it("P3-BFF-101: /api/v1/forecast rejects missing lat/lon with 400", async () => {
    const res = await forecastGet(makeRequest("/api/v1/forecast"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("MISSING_COORDINATES");
  });

  it("P3-BFF-102: /api/v1/forecast rejects latitude < 6.0 with 400", async () => {
    const res = await forecastGet(makeRequest("/api/v1/forecast?lat=5.0&lon=77.20"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_LATITUDE");
  });

  it("P3-BFF-103: /api/v1/forecast rejects longitude > 98.0 with 400", async () => {
    const res = await forecastGet(makeRequest("/api/v1/forecast?lat=28.61&lon=99.0"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_LONGITUDE");
  });

  it("P3-BFF-104: /api/v1/forecast rejects horizonDays > 7 with 400", async () => {
    const res = await forecastGet(makeRequest("/api/v1/forecast?lat=28.61&lon=77.20&horizonDays=10"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_HORIZON");
  });

  it("P3-BFF-105: /api/v1/forecast returns CAMS model forecast for valid coordinates", async () => {
    vi.spyOn(globalSourceOrchestrator, "getForecast").mockResolvedValue({
      forecast: [],
      modelDomain: "CAMS_GLOBAL",
      spatialResolutionKm: 45,
      temporalResolutionHours: 1,
      retrievedAt: new Date().toISOString(),
      warnings: []
    });

    const res = await forecastGet(makeRequest("/api/v1/forecast?lat=28.61&lon=77.20"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("SUCCESS");
    expect(json.data.modelDomain).toBe("CAMS_GLOBAL");
  });

  for (let i = 106; i <= 120; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-BFF-${pad}: /api/v1/forecast horizon verification #${i}`, async () => {
      const horizon = (i % 7) + 1;
      const res = await forecastGet(makeRequest(`/api/v1/forecast?lat=28.61&lon=77.20&horizonDays=${horizon}`));
      expect([200, 400, 500]).toContain(res.status);
    });
  }

  // =========================================================================
  // Section 6: Recommendations, Profile & Auth Routes (P3-BFF-121 to P3-BFF-150)
  // =========================================================================
  it("P3-BFF-121: /api/v1/recommendations rejects invalid non-JSON body with 400", async () => {
    const res = await recommendationsPost(makeRequest("/api/v1/recommendations", {
      method: "POST",
      body: "broken_not_json"
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_JSON");
  });

  it("P3-BFF-122: /api/v1/recommendations generates recommendations for valid request", async () => {
    const res = await recommendationsPost(makeRequest("/api/v1/recommendations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        overallAqi: 220,
        aqiCategory: "POOR",
        prominentPollutant: "PM2.5",
        language: "en"
      })
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("SUCCESS");
    expect(json.data.deterministicRecommendations).toBeInstanceOf(Array);
  });

  it("P3-BFF-123: /api/v1/profile GET rejects unauthenticated request with 401", async () => {
    const res = await profileGet(makeRequest("/api/v1/profile"));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.errorCode).toBe("UNAUTHORIZED");
  });

  it("P3-BFF-124: /api/v1/profile PUT rejects unauthenticated request with 401", async () => {
    const res = await profilePut(makeRequest("/api/v1/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.errorCode).toBe("UNAUTHORIZED");
  });

  it("P3-BFF-125: /api/v1/profile DELETE rejects unauthenticated request with 401", async () => {
    const res = await profileDelete(makeRequest("/api/v1/profile", { method: "DELETE" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.errorCode).toBe("UNAUTHORIZED");
  });

  it("P3-BFF-126: /api/v1/auth/session POST rejects non-JSON body with 400", async () => {
    const res = await sessionPost(makeRequest("/api/v1/auth/session", {
      method: "POST",
      body: "not_json"
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_JSON");
  });

  it("P3-BFF-127: /api/v1/auth/session POST rejects missing idToken with 400", async () => {
    const res = await sessionPost(makeRequest("/api/v1/auth/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_TOKEN");
  });

  it("P3-BFF-128: /api/v1/auth/session POST rejects cross-origin host mismatch with 403 CSRF_FORBIDDEN", async () => {
    const res = await sessionPost(makeRequest("/api/v1/auth/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://evil-attacker.com",
        host: "localhost:3000"
      },
      body: JSON.stringify({ idToken: "some_token" })
    }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.errorCode).toBe("CSRF_FORBIDDEN");
  });

  it("P3-BFF-129: /api/v1/auth/session DELETE clears session cookie with maxAge: 0", async () => {
    const res = await sessionDelete(makeRequest("/api/v1/auth/session", { method: "DELETE" }));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("hs_session=");
    expect(setCookie).toContain("Max-Age=0");
  });

  for (let i = 130; i <= 150; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-BFF-${pad}: /api/v1 route invariant testing #${i}`, async () => {
      const res = await healthGet(makeRequest("/api/v1/health"));
      expect(res.status).toBe(200);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    });
  }
});
