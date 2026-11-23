// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getLocationsSearch } from "@/app/api/v1/locations/search/route";
import { GET as getNearbyStations } from "@/app/api/v1/stations/nearby/route";
import { GET as getAirQuality } from "@/app/api/v1/air-quality/route";
import { GET as getForecast } from "@/app/api/v1/forecast/route";
import { POST as postRecommendations } from "@/app/api/v1/recommendations/route";
import { POST as postSession, DELETE as deleteSession } from "@/app/api/v1/auth/session/route";
import { GET as getProfile, PUT as putProfile, DELETE as deleteProfile } from "@/app/api/v1/profile/route";
import { GET as getHealth } from "@/app/api/v1/health/route";
import { globalFirebaseAuth } from "@/lib/firebase/admin";
import type { DecodedIdToken } from "firebase-admin/auth";
import { globalRateLimiter } from "@/services/rate-limit/rate-limiter";

describe("BFF / API Route Handlers Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(globalRateLimiter, "checkLimit").mockResolvedValue({
      allowed: true,
      limit: 1000,
      remaining: 999,
      resetSeconds: 60,
      isDistributed: false
    });
  });

  // 1. Locations Search Route (BFF-001 to BFF-008)
  it("BFF-001: /api/v1/locations/search rejects query shorter than 2 chars with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/locations/search?q=a");
    const res = await getLocationsSearch(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_QUERY");
  });

  it("BFF-002: /api/v1/locations/search rejects missing query param with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/locations/search");
    const res = await getLocationsSearch(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_QUERY");
  });

  it("BFF-003: /api/v1/locations/search rejects query longer than 100 chars with 400", async () => {
    const longQuery = "a".repeat(101);
    const req = new NextRequest(`http://localhost:3000/api/v1/locations/search?q=${longQuery}`);
    const res = await getLocationsSearch(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("QUERY_TOO_LONG");
  });

  it("BFF-004: /api/v1/locations/search returns matching cities for valid query", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/locations/search?q=Delhi");
    const res = await getLocationsSearch(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.query).toBe("Delhi");
    expect(json.data.locations.length).toBeGreaterThan(0);
    expect(json.data.locations[0].name).toContain("Delhi");
  });

  it("BFF-005: /api/v1/locations/search performs case-insensitive match (e.g. kolkata vs Kolkata)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/locations/search?q=kolkata");
    const res = await getLocationsSearch(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.locations.length).toBeGreaterThan(0);
    expect(json.data.locations[0].name).toBe("Kolkata");
  });

  it("BFF-006: /api/v1/locations/search includes X-Content-Type-Options: nosniff header", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/locations/search?q=Delhi");
    const res = await getLocationsSearch(req);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("BFF-007: /api/v1/locations/search includes X-Request-Id header", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/locations/search?q=Delhi");
    const res = await getLocationsSearch(req);
    expect(res.headers.get("X-Request-Id")).toBeDefined();
    expect(res.headers.get("X-Request-Id")).toMatch(/^req_/);
  });

  it("BFF-008: /api/v1/locations/search handles rate limiting by returning 429 when checkLimit disallows", async () => {
    vi.spyOn(globalRateLimiter, "checkLimit").mockResolvedValueOnce({
      allowed: false,
      limit: 60,
      remaining: 0,
      resetSeconds: 45,
      isDistributed: false
    });

    const req = new NextRequest("http://localhost:3000/api/v1/locations/search?q=Mumbai");
    const res = await getLocationsSearch(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.errorCode).toBe("RATE_LIMIT_EXCEEDED");
  });

  // 2. Nearby Stations Route (BFF-009 to BFF-018)
  it("BFF-009: /api/v1/stations/nearby rejects missing lat parameter with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/stations/nearby?lon=77.20");
    const res = await getNearbyStations(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("MISSING_COORDINATES");
  });

  it("BFF-010: /api/v1/stations/nearby rejects missing lon parameter with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/stations/nearby?lat=28.61");
    const res = await getNearbyStations(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("MISSING_COORDINATES");
  });

  it("BFF-011: /api/v1/stations/nearby rejects out-of-bounds latitude (>38) with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/stations/nearby?lat=45.0&lon=77.20");
    const res = await getNearbyStations(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_LATITUDE");
  });

  it("BFF-012: /api/v1/stations/nearby rejects out-of-bounds latitude (<6) with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/stations/nearby?lat=4.0&lon=77.20");
    const res = await getNearbyStations(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_LATITUDE");
  });

  it("BFF-013: /api/v1/stations/nearby rejects out-of-bounds longitude (>98) with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/stations/nearby?lat=28.61&lon=105.0");
    const res = await getNearbyStations(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_LONGITUDE");
  });

  it("BFF-014: /api/v1/stations/nearby rejects non-numeric coordinates with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/stations/nearby?lat=invalid&lon=77.20");
    const res = await getNearbyStations(req);
    expect(res.status).toBe(400);
  });

  it("BFF-015: /api/v1/stations/nearby accepts valid coordinates and returns station search structure", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/stations/nearby?lat=28.61&lon=77.20");
    const res = await getNearbyStations(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveProperty("stations");
    expect(json.data).toHaveProperty("count");
    expect(json.data).toHaveProperty("center");
  });

  it("BFF-016: /api/v1/stations/nearby accepts custom radiusKm parameter", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/stations/nearby?lat=28.61&lon=77.20&radiusKm=25");
    const res = await getNearbyStations(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.radiusKm).toBe(25);
  });

  it("BFF-017: /api/v1/stations/nearby accepts textual query filter", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/stations/nearby?lat=28.61&lon=77.20&query=Anand");
    const res = await getNearbyStations(req);
    expect(res.status).toBe(200);
  });

  it("BFF-018: /api/v1/stations/nearby rejects radiusKm exceeding maximum 150km with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/stations/nearby?lat=28.61&lon=77.20&radiusKm=500");
    const res = await getNearbyStations(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_RADIUS");
  });

  // 3. Air Quality Route (BFF-019 to BFF-028)
  it("BFF-019: /api/v1/air-quality rejects missing parameters with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/air-quality");
    const res = await getAirQuality(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("MISSING_PARAMETERS");
  });

  it("BFF-020: /api/v1/air-quality rejects out-of-range lat/lon with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/air-quality?lat=99.0&lon=77.20");
    const res = await getAirQuality(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_COORDINATES");
  });

  it("BFF-021: /api/v1/air-quality returns 200 with StationAirQualityResult structure", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/air-quality?stationId=cpcb_delhi_station");
    const res = await getAirQuality(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveProperty("observations");
    expect(json.data).toHaveProperty("aqiStatus");
    expect(json.data).toHaveProperty("statusMessage");
    expect(json.data).toHaveProperty("provider");
  });

  it("BFF-022: /api/v1/air-quality sets Cache-Control header with no-store", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/air-quality?stationId=cpcb_delhi_station");
    const res = await getAirQuality(req);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("BFF-023: /api/v1/air-quality accepts valid station coordinates (lat, lon)", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/air-quality?lat=28.61&lon=77.20");
    const res = await getAirQuality(req);
    expect(res.status).toBe(200);
  });

  it("BFF-024: /api/v1/air-quality handles unknown station ID gracefully", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/air-quality?stationId=cpcb_non_existent");
    const res = await getAirQuality(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.aqiStatus).toBe("AQI_UNAVAILABLE");
  });

  it("BFF-025: /api/v1/air-quality preserves CPCB_CAAQMS provider ID for cpcb_ stations", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/air-quality?stationId=cpcb_station_1");
    const res = await getAirQuality(req);
    const json = await res.json();
    expect(json.data.provider).toBe("CPCB_CAAQMS");
  });

  it("BFF-026: /api/v1/air-quality preserves OPENAQ provider ID for non-cpcb stations", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/air-quality?stationId=openaq_12345");
    const res = await getAirQuality(req);
    const json = await res.json();
    expect(json.data.provider).toBe("OPENAQ");
  });

  it("BFF-027: /api/v1/air-quality returns aqiStatus AQI_UNAVAILABLE when observations are empty", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/air-quality?stationId=cpcb_no_readings");
    const res = await getAirQuality(req);
    const json = await res.json();
    expect(json.data.aqiStatus).toBe("AQI_UNAVAILABLE");
    expect(json.data.calculatedAqi).toBeNull();
  });

  it("BFF-028: /api/v1/air-quality includes security headers in response", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/air-quality?stationId=cpcb_delhi_station");
    const res = await getAirQuality(req);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  // 4. Forecast Route (BFF-029 to BFF-038)
  it("BFF-029: /api/v1/forecast rejects missing lat parameter with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/forecast?lon=77.20");
    const res = await getForecast(req);
    expect(res.status).toBe(400);
  });

  it("BFF-030: /api/v1/forecast rejects missing lon parameter with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/forecast?lat=28.61");
    const res = await getForecast(req);
    expect(res.status).toBe(400);
  });

  it("BFF-031: /api/v1/forecast rejects out-of-bounds coordinates with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/forecast?lat=99.0&lon=77.20");
    const res = await getForecast(req);
    expect(res.status).toBe(400);
  });

  it("BFF-032: /api/v1/forecast accepts valid coordinates and returns forecast structure", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/forecast?lat=28.61&lon=77.20");
    const res = await getForecast(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveProperty("forecast");
    expect(json.data).toHaveProperty("modelDomain");
    expect(json.data).toHaveProperty("spatialResolutionKm");
    expect(json.data).toHaveProperty("temporalResolutionHours");
  });

  it("BFF-033: /api/v1/forecast reports modelDomain as cams_global", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/forecast?lat=28.61&lon=77.20");
    const res = await getForecast(req);
    const json = await res.json();
    expect(json.data.modelDomain).toBe("cams_global");
  });

  it("BFF-034: /api/v1/forecast reports spatialResolutionKm as 45 km", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/forecast?lat=28.61&lon=77.20");
    const res = await getForecast(req);
    const json = await res.json();
    expect(json.data.spatialResolutionKm).toBe(45);
  });

  it("BFF-035: /api/v1/forecast reports temporalResolutionHours as 3 hours", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/forecast?lat=28.61&lon=77.20");
    const res = await getForecast(req);
    const json = await res.json();
    expect(json.data.temporalResolutionHours).toBe(3);
  });

  it("BFF-036: /api/v1/forecast accepts custom horizonDays parameter up to 5", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/forecast?lat=28.61&lon=77.20&horizonDays=3");
    const res = await getForecast(req);
    expect(res.status).toBe(200);
  });

  it("BFF-037: /api/v1/forecast sets Cache-Control header with no-store", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/forecast?lat=28.61&lon=77.20");
    const res = await getForecast(req);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("BFF-038: /api/v1/forecast includes security headers in response", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/forecast?lat=28.61&lon=77.20");
    const res = await getForecast(req);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  // 5. Recommendations Route (BFF-039 to BFF-048)
  it("BFF-039: /api/v1/recommendations rejects invalid non-JSON body with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/recommendations", {
      method: "POST",
      body: "NOT_VALID_JSON"
    });
    const res = await postRecommendations(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_JSON");
  });

  it("BFF-040: /api/v1/recommendations rejects invalid language code with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/recommendations", {
      method: "POST",
      body: JSON.stringify({
        overallAqi: 150,
        aqiCategory: "MODERATE",
        language: "de" // unsupported language
      })
    });
    const res = await postRecommendations(req);
    expect(res.status).toBe(400);
  });

  it("BFF-041: /api/v1/recommendations returns guidance for MODERATE AQI", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/recommendations", {
      method: "POST",
      body: JSON.stringify({
        overallAqi: 150,
        aqiCategory: "MODERATE",
        prominentPollutant: "PM2.5",
        language: "en"
      })
    });
    const res = await postRecommendations(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveProperty("deterministicRecommendations");
    expect(json.data).toHaveProperty("aiExplanation");
    expect(json.data).toHaveProperty("indoorAirCoach");
  });

  it("BFF-042: /api/v1/recommendations returns severe protection advice for SEVERE AQI", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/recommendations", {
      method: "POST",
      body: JSON.stringify({
        overallAqi: 450,
        aqiCategory: "SEVERE",
        prominentPollutant: "PM2.5",
        language: "en"
      })
    });
    const res = await postRecommendations(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.deterministicRecommendations.length).toBeGreaterThan(0);
  });

  it("BFF-043: /api/v1/recommendations includes indoor ventilation strategy", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/recommendations", {
      method: "POST",
      body: JSON.stringify({
        overallAqi: 280,
        aqiCategory: "POOR",
        prominentPollutant: "PM10"
      })
    });
    const res = await postRecommendations(req);
    const json = await res.json();
    expect(json.data.indoorAirCoach).toHaveProperty("ventilation");
    expect(json.data.indoorAirCoach.ventilation).toHaveProperty("windowAction");
  });

  it("BFF-044: /api/v1/recommendations calculates CADR requirements when room dimensions provided", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/recommendations", {
      method: "POST",
      body: JSON.stringify({
        overallAqi: 320,
        aqiCategory: "VERY_POOR",
        prominentPollutant: "PM2.5",
        purifierRoomDimensions: {
          lengthMeters: 5,
          widthMeters: 4,
          heightMeters: 3
        }
      })
    });
    const res = await postRecommendations(req);
    const json = await res.json();
    expect(json.data.indoorAirCoach.filtration).toBeDefined();
    expect(json.data.indoorAirCoach.filtration.requiredCadrM3H).toBeGreaterThan(0);
  });

  it("BFF-045: /api/v1/recommendations returns Bengali explanation when language is bn", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/recommendations", {
      method: "POST",
      body: JSON.stringify({
        overallAqi: 120,
        aqiCategory: "MODERATE",
        prominentPollutant: "PM2.5",
        language: "bn"
      })
    });
    const res = await postRecommendations(req);
    const json = await res.json();
    expect(json.data.aiExplanation.language).toBe("bn");
    expect(json.data.aiExplanation.summary).toContain("বাতাসের");
  });

  it("BFF-046: /api/v1/recommendations returns Hindi explanation when language is hi", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/recommendations", {
      method: "POST",
      body: JSON.stringify({
        overallAqi: 120,
        aqiCategory: "MODERATE",
        prominentPollutant: "PM2.5",
        language: "hi"
      })
    });
    const res = await postRecommendations(req);
    const json = await res.json();
    expect(json.data.aiExplanation.language).toBe("hi");
    expect(json.data.aiExplanation.summary).toContain("वायु");
  });

  it("BFF-047: /api/v1/recommendations includes evidence citations in aiExplanation", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/recommendations", {
      method: "POST",
      body: JSON.stringify({
        overallAqi: 80,
        aqiCategory: "SATISFACTORY",
        prominentPollutant: "PM2.5",
        evidenceList: [
          {
            evidenceId: "ev_cpcb_1",
            source: "CPCB_CAAQMS",
            description: "PM2.5 concentration is 35 µg/m³",
            timestamp: "2026-11-22T08:00:00Z"
          }
        ]
      })
    });
    const res = await postRecommendations(req);
    const json = await res.json();
    expect(json.data.aiExplanation).toHaveProperty("actionGuidance");
  });

  it("BFF-048: /api/v1/recommendations includes security headers in response", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/recommendations", {
      method: "POST",
      body: JSON.stringify({
        overallAqi: 100,
        aqiCategory: "SATISFACTORY"
      })
    });
    const res = await postRecommendations(req);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  // 6. Auth / Session Route (BFF-049 to BFF-058)
  it("BFF-049: /api/v1/auth/session rejects non-JSON body with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/auth/session", {
      method: "POST",
      body: "INVALID_JSON"
    });
    const res = await postSession(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_JSON");
  });

  it("BFF-050: /api/v1/auth/session rejects missing idToken with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/auth/session", {
      method: "POST",
      body: JSON.stringify({})
    });
    const res = await postSession(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe("INVALID_TOKEN");
  });

  it("BFF-051: /api/v1/auth/session blocks cross-origin session creation with 403 CSRF_FORBIDDEN", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/auth/session", {
      method: "POST",
      headers: {
        origin: "https://malicious-attacker.com",
        host: "localhost:3000"
      },
      body: JSON.stringify({ idToken: "token" })
    });
    const res = await postSession(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.errorCode).toBe("CSRF_FORBIDDEN");
  });

  it("BFF-052: /api/v1/auth/session returns 503 AUTH_NOT_CONFIGURED when Firebase Admin is not configured", async () => {
    vi.spyOn(globalFirebaseAuth, "isConfigured").mockReturnValue(false);

    const req = new NextRequest("http://localhost:3000/api/v1/auth/session", {
      method: "POST",
      body: JSON.stringify({ idToken: "test-token" })
    });
    const res = await postSession(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.errorCode).toBe("AUTH_NOT_CONFIGURED");
  });

  it("BFF-053: /api/v1/auth/session sets HttpOnly session cookie on successful auth", async () => {
    vi.spyOn(globalFirebaseAuth, "isConfigured").mockReturnValue(true);
    vi.spyOn(globalFirebaseAuth, "verifyIdToken").mockResolvedValue({
      uid: "user_test_123",
      email: "test@example.com",
      auth_time: Math.floor(Date.now() / 1000)
    } as unknown as DecodedIdToken);
    vi.spyOn(globalFirebaseAuth, "createSessionCookie").mockResolvedValue("mock_session_cookie_abc");

    const req = new NextRequest("http://localhost:3000/api/v1/auth/session", {
      method: "POST",
      body: JSON.stringify({ idToken: "valid-firebase-token" })
    });
    const res = await postSession(req);
    expect(res.status).toBe(200);

    const cookie = res.cookies.get("hs_session");
    expect(cookie).toBeDefined();
    expect(cookie?.value).toBe("mock_session_cookie_abc");
    expect(cookie?.httpOnly).toBe(true);
  });

  it("BFF-054: /api/v1/auth/session returns user identity in response data", async () => {
    vi.spyOn(globalFirebaseAuth, "isConfigured").mockReturnValue(true);
    vi.spyOn(globalFirebaseAuth, "verifyIdToken").mockResolvedValue({
      uid: "user_test_456",
      email: "hello@hawasaathi.org",
      auth_time: 1234567890
    } as unknown as DecodedIdToken);
    vi.spyOn(globalFirebaseAuth, "createSessionCookie").mockResolvedValue("cookie_xyz");

    const req = new NextRequest("http://localhost:3000/api/v1/auth/session", {
      method: "POST",
      body: JSON.stringify({ idToken: "token-456" })
    });
    const res = await postSession(req);
    const json = await res.json();
    expect(json.data.uid).toBe("user_test_456");
    expect(json.data.email).toBe("hello@hawasaathi.org");
  });

  it("BFF-055: /api/v1/auth/session DELETE clears session cookie", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/auth/session", {
      method: "DELETE"
    });
    const res = await deleteSession(req);
    expect(res.status).toBe(200);
    const cookie = res.cookies.get("hs_session");
    expect(cookie?.maxAge).toBe(0);
  });

  it("BFF-056: /api/v1/auth/session DELETE revokes refresh tokens if session cookie present", async () => {
    vi.spyOn(globalFirebaseAuth, "isConfigured").mockReturnValue(true);
    vi.spyOn(globalFirebaseAuth, "verifySessionCookie").mockResolvedValue({
      uid: "user_revoke_789"
    } as unknown as DecodedIdToken);
    const revokeSpy = vi.spyOn(globalFirebaseAuth, "revokeRefreshTokens").mockResolvedValue();

    const req = new NextRequest("http://localhost:3000/api/v1/auth/session", {
      method: "DELETE"
    });
    req.cookies.set("hs_session", "active_cookie");

    const res = await deleteSession(req);
    expect(res.status).toBe(200);
    expect(revokeSpy).toHaveBeenCalledWith("user_revoke_789");
  });

  it("BFF-057: /api/v1/auth/session handles invalid/expired idToken with 401", async () => {
    vi.spyOn(globalFirebaseAuth, "isConfigured").mockReturnValue(true);
    vi.spyOn(globalFirebaseAuth, "verifyIdToken").mockRejectedValue(new Error("Firebase ID token has expired"));

    const req = new NextRequest("http://localhost:3000/api/v1/auth/session", {
      method: "POST",
      body: JSON.stringify({ idToken: "expired-token" })
    });
    const res = await postSession(req);
    expect(res.status).toBe(401);
  });

  it("BFF-058: /api/v1/auth/session returns 403 on origin mismatch with port", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/auth/session", {
      method: "POST",
      headers: {
        origin: "http://attacker:8080",
        host: "localhost:3000"
      },
      body: JSON.stringify({ idToken: "tok" })
    });
    const res = await postSession(req);
    expect(res.status).toBe(403);
  });

  // 7. Profile Route (BFF-059 to BFF-066)
  it("BFF-059: /api/v1/profile GET returns 401 UNAUTHORIZED when no session cookie is provided", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/profile");
    const res = await getProfile(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.errorCode).toBe("UNAUTHORIZED");
  });

  it("BFF-060: /api/v1/profile GET returns 404 when user has not saved profile yet", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/profile", {
      headers: { "x-mock-auth-uid": "new_user_without_profile" }
    });
    req.cookies.set("hs_session", "valid");
    const res = await getProfile(req);
    expect(res.status).toBe(404);
  });

  it("BFF-061: /api/v1/profile PUT returns 401 UNAUTHORIZED when unauthenticated", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/profile", {
      method: "PUT",
      body: JSON.stringify({ preferences: { language: "hi" } })
    });
    const res = await putProfile(req);
    expect(res.status).toBe(401);
  });

  it("BFF-062: /api/v1/profile PUT rejects sensitive household context without explicit DPDP consent", async () => {
    const householdId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    const req = new NextRequest("http://localhost:3000/api/v1/profile", {
      method: "PUT",
      headers: { "x-mock-auth-uid": "user_dpdp_test" },
      body: JSON.stringify({
        householdContext: {
          householdId,
          updatedAt: new Date().toISOString(),
          preferredLanguage: "en",
          members: [
            {
              id: memberId,
              nickname: "Baby",
              ageBracket: "INFANT_0_2",
              sensitivities: { respiratorySensitivity: true, cardiovascularSensitivity: false, pregnancy: false, allergiesOrSinusitis: false },
              dailyOutdoorHoursEstimate: 1
            }
          ],
          dwelling: {
            dwellingType: "APARTMENT_LOW_RISE",
            floorLevel: 1,
            proximityToMajorRoadMeters: 50,
            cooking: { primaryFuel: "LPG", kitchenVentilation: "OPEN_WINDOW_ONLY", averageDailyCookingHours: 2 },
            indoorSources: { incenseOrDhoopDaily: false, mosquitoCoilUsage: false, indoorSmoking: false, unventedGasHeater: false },
            filtration: { hasAirPurifier: false, purifierLocations: [] },
            windowSealingQuality: "STANDARD_WINDOWS"
          },
          routine: [],
          constraints: { affordabilityTier: "MODERATE_TO_HIGH", priorityGoals: ["PROTECT_VULNERABLE_MEMBER"] }
        },
        cloudPersistenceConsent: false // Missing consent
      })
    });
    req.cookies.set("hs_session", "valid");

    const res = await putProfile(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toContain("DPDP Act Consent Required");
  });

  it("BFF-063: /api/v1/profile PUT successfully updates profile when cloudPersistenceConsent is true", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/profile", {
      method: "PUT",
      headers: { "x-mock-auth-uid": "user_consent_granted" },
      body: JSON.stringify({
        preferences: { language: "bn", temperatureUnit: "C", notificationsEnabled: false },
        cloudPersistenceConsent: true
      })
    });
    req.cookies.set("hs_session", "valid");

    const res = await putProfile(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.preferences.language).toBe("bn");
    expect(json.data.cloudPersistenceConsent).toBe(true);
  });

  it("BFF-064: /api/v1/profile GET returns profile data after creation", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/profile", {
      headers: { "x-mock-auth-uid": "user_consent_granted" }
    });
    req.cookies.set("hs_session", "valid");

    const res = await getProfile(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.uid).toBe("user_consent_granted");
    expect(json.data.preferences.language).toBe("bn");
  });

  it("BFF-065: /api/v1/profile DELETE returns 401 UNAUTHORIZED when unauthenticated", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/profile", {
      method: "DELETE"
    });
    const res = await deleteProfile(req);
    expect(res.status).toBe(401);
  });

  it("BFF-066: /api/v1/profile DELETE deletes profile completely and subsequent GET returns 404", async () => {
    const delReq = new NextRequest("http://localhost:3000/api/v1/profile", {
      method: "DELETE",
      headers: { "x-mock-auth-uid": "user_consent_granted" }
    });
    delReq.cookies.set("hs_session", "valid");

    const delRes = await deleteProfile(delReq);
    expect(delRes.status).toBe(200);

    const getReq = new NextRequest("http://localhost:3000/api/v1/profile", {
      headers: { "x-mock-auth-uid": "user_consent_granted" }
    });
    getReq.cookies.set("hs_session", "valid");

    const getRes = await getProfile(getReq);
    expect(getRes.status).toBe(404);
  });

  // 8. Health Route (BFF-067 to BFF-070)
  it("BFF-067: /api/v1/health GET returns 200 with status HEALTHY or DEGRADED", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/health");
    const res = await getHealth(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(["HEALTHY", "DEGRADED"]).toContain(json.data.status);
    expect(json.data).toHaveProperty("version");
    expect(json.data).toHaveProperty("environment");
  });

  it("BFF-068: /api/v1/health reports provider configuration status", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/health");
    const res = await getHealth(req);
    const json = await res.json();
    expect(json.data).toHaveProperty("providers");
    expect(json.data.providers).toHaveProperty("cpcb");
    expect(json.data.providers).toHaveProperty("openaq");
    expect(json.data.providers).toHaveProperty("openMeteoCams");
  });

  it("BFF-069: /api/v1/health reports infrastructure status", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/health");
    const res = await getHealth(req);
    const json = await res.json();
    expect(json.data).toHaveProperty("infrastructure");
    expect(json.data.infrastructure).toHaveProperty("redis");
    expect(json.data.infrastructure).toHaveProperty("firebase");
    expect(json.data.infrastructure).toHaveProperty("gemini");
  });

  it("BFF-070: /api/v1/health includes no-store header", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/health");
    const res = await getHealth(req);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });
});
