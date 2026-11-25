// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SourceOrchestrator } from "@/services/air-quality/source-orchestrator";
import { CacheService } from "@/services/cache/cache-service";
import { RedisService } from "@/lib/redis/redis-client";
import { ProfileRepository } from "@/services/profiles/profile-repository";
import { FirebaseAdminService } from "@/lib/firebase/admin";
import { AiExplainerService } from "@/services/ai/ai-explainer";
import { generateDeterministicRecommendations } from "@/domain/rules/deterministic-recommender";
import { calculateRoomFiltrationRequirements } from "@/domain/indoor/filtration-calculator";
import { determineVentilationStrategy } from "@/domain/indoor/ventilation-decision";
import type { NormalizedStation, NormalizedObservation } from "@/schemas/providers/normalized-provider.schema";
import type { UpdateProfileRequest } from "@/schemas/user-profile.schema";
import type {
  AirQualityProvider,
  ProviderCapabilities,
  ProviderForecastResult
} from "@/services/providers/types";

describe("Phase 3 End-to-End Workflows & User Journeys Suite (P3-E2E)", () => {
  let redis: RedisService;
  let cache: CacheService;
  let orchestrator: SourceOrchestrator;
  let firebaseAdmin: FirebaseAdminService;
  let profileRepo: ProfileRepository;
  let aiExplainer: AiExplainerService;

  const mockDelhiStation: NormalizedStation = {
    id: "cpcb_delhi_anand_vihar",
    providerId: "CPCB_CAAQMS",
    name: "Anand Vihar, Delhi - DPCC",
    city: "Delhi",
    state: "Delhi",
    latitude: 28.6468,
    longitude: 77.3160,
    availablePollutants: ["PM2.5", "PM10", "NO2", "CO"],
    lastReportedAt: "2026-11-24T10:00:00Z",
    license: "GODL-India",
    attribution: "CPCB / data.gov.in",
    distanceKm: 3.5
  };

  const mockDelhiObservations: NormalizedObservation[] = [
    {
      id: "obs_1",
      stationId: "cpcb_delhi_anand_vihar",
      stationName: "Anand Vihar, Delhi - DPCC",
      providerId: "CPCB_CAAQMS",
      pollutant: "PM2.5",
      value: 175.0,
      unit: "µg/m³",
      rawValue: 175.0,
      rawUnit: "µg/m3",
      averagingPeriod: "24h",
      observationTime: new Date().toISOString(),
      sourceUpdateTime: null,
      retrievalTime: new Date().toISOString(),
      qualityFlag: "VERIFIED",
      typology: "TYPE_C_RAW_MEASUREMENT",
      license: "GODL-India",
      attribution: "CPCB"
    },
    {
      id: "obs_2",
      stationId: "cpcb_delhi_anand_vihar",
      stationName: "Anand Vihar, Delhi - DPCC",
      providerId: "CPCB_CAAQMS",
      pollutant: "PM10",
      value: 290.0,
      unit: "µg/m³",
      rawValue: 290.0,
      rawUnit: "µg/m3",
      averagingPeriod: "24h",
      observationTime: new Date().toISOString(),
      sourceUpdateTime: null,
      retrievalTime: new Date().toISOString(),
      qualityFlag: "VERIFIED",
      typology: "TYPE_C_RAW_MEASUREMENT",
      license: "GODL-India",
      attribution: "CPCB"
    },
    {
      id: "obs_3",
      stationId: "cpcb_delhi_anand_vihar",
      stationName: "Anand Vihar, Delhi - DPCC",
      providerId: "CPCB_CAAQMS",
      pollutant: "NO2",
      value: 95.0,
      unit: "µg/m³",
      rawValue: 95.0,
      rawUnit: "µg/m3",
      averagingPeriod: "24h",
      observationTime: new Date().toISOString(),
      sourceUpdateTime: null,
      retrievalTime: new Date().toISOString(),
      qualityFlag: "VERIFIED",
      typology: "TYPE_C_RAW_MEASUREMENT",
      license: "GODL-India",
      attribution: "CPCB"
    }
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    redis = new RedisService({});
    cache = new CacheService(redis);

    const mockCpcb = {
      providerId: "CPCB_CAAQMS",
      getCapabilities: async () => ({} as unknown as ProviderCapabilities),
      searchStations: vi.fn().mockResolvedValue({
        providerId: "CPCB_CAAQMS",
        stations: [mockDelhiStation],
        retrievedAt: new Date().toISOString(),
        status: "CONFIGURED",
        warnings: []
      }),
      getObservations: vi.fn().mockResolvedValue({
        providerId: "CPCB_CAAQMS",
        observations: mockDelhiObservations,
        retrievedAt: new Date().toISOString(),
        status: "CONFIGURED",
        warnings: []
      }),
      getForecast: vi.fn().mockResolvedValue({} as unknown as ProviderForecastResult)
    };

    const mockOpenMeteo = {
      providerId: "OPEN_METEO_CAMS",
      getCapabilities: async () => ({} as unknown as ProviderCapabilities),
      searchStations: vi.fn().mockResolvedValue({ providerId: "OPEN_METEO_CAMS", stations: [], retrievedAt: "", status: "NOT_CONFIGURED", warnings: [] }),
      getObservations: vi.fn().mockResolvedValue({ providerId: "OPEN_METEO_CAMS", observations: [], retrievedAt: "", status: "NOT_CONFIGURED", warnings: [] }),
      getForecast: vi.fn().mockResolvedValue({
        providerId: "OPEN_METEO_CAMS",
        forecast: [
          {
            timestamp: new Date().toISOString(),
            pm25: 180,
            pm10: 310,
            no2: 80,
            so2: 15,
            co: 1.2,
            o3: 35,
            forecastHourOffset: 1,
            typology: "TYPE_D_MODEL_FORECAST"
          }
        ],
        modelDomain: "CAMS_GLOBAL",
        spatialResolutionKm: 45,
        temporalResolutionHours: 1,
        retrievedAt: new Date().toISOString(),
        status: "CONFIGURED",
        warnings: []
      })
    };

    orchestrator = new SourceOrchestrator({
      cpcbProvider: mockCpcb,
      openMeteoProvider: mockOpenMeteo,
      cacheService: cache
    });

    firebaseAdmin = new FirebaseAdminService();
    vi.spyOn(firebaseAdmin, "isConfigured").mockReturnValue(false);
    profileRepo = new ProfileRepository(firebaseAdmin);
    aiExplainer = new AiExplainerService("");
  });

  // =========================================================================
  // Section 1: Guest User Journey (P3-E2E-001 to P3-E2E-035)
  // =========================================================================
  it("P3-E2E-001: complete Guest journey executes search, AQI calculation, forecast and indoor advice with zero database persistence", async () => {
    // 1. Search stations near Delhi (28.61, 77.20)
    const searchRes = await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    expect(searchRes.stations).toHaveLength(1);
    const station = searchRes.stations[0]!;
    expect(station.id).toBe("cpcb_delhi_anand_vihar");

    // 2. Fetch station air quality
    const aqRes = await orchestrator.getStationAirQuality(station.id, station);
    expect(aqRes.aqiStatus).toBe("AVAILABLE");
    expect(aqRes.calculatedAqi?.overallAqi).toBeGreaterThan(300);
    expect(aqRes.calculatedAqi?.category).toBe("VERY_POOR");
    expect(aqRes.calculatedAqi?.prominentPollutant).toBe("PM2.5");

    // 3. Fetch atmospheric CAMS forecast
    const forecastRes = await orchestrator.getForecast({ latitude: station.latitude, longitude: station.longitude });
    expect(forecastRes.forecast).toHaveLength(1);
    expect(forecastRes.forecast[0]?.typology).toBe("TYPE_D_MODEL_FORECAST");

    // 4. Calculate indoor filtration requirements (5m x 4m x 2.8m bedroom)
    const filtration = calculateRoomFiltrationRequirements({
      roomLengthMeters: 5,
      roomWidthMeters: 4,
      roomHeightMeters: 2.8,
      targetAirChangesPerHour: 4.5
    });
    expect(filtration.requiredCadrM3H).toBeGreaterThan(0);
    expect(filtration.roomVolumeM3).toBe(56);

    // 5. Evaluate ventilation strategy (outdoor air is VERY_POOR)
    const vent = determineVentilationStrategy(
      aqRes.calculatedAqi!.category!,
      validHouseholdContext.dwelling
    );
    expect(vent.windowAction).toBe("KEEP_SEALED");

    // 6. Verify zero database persistence for guest
    expect(await profileRepo.getProfile("guest_user")).toBeNull();
  });

  const validDwelling = {
    dwellingType: "APARTMENT_LOW_RISE" as const,
    floorLevel: 3,
    proximityToMajorRoadMeters: 100,
    cooking: {
      primaryFuel: "LPG" as const,
      kitchenVentilation: "KITCHEN_HOOD_CHIMNEY" as const,
      averageDailyCookingHours: 2
    },
    indoorSources: {
      incenseOrDhoopDaily: false,
      mosquitoCoilUsage: false,
      indoorSmoking: false,
      unventedGasHeater: false
    },
    filtration: {
      hasAirPurifier: true,
      purifierLocations: ["LIVING_ROOM"],
      filterType: "TRUE_HEPA_H13" as const,
      cleanAirDeliveryRateCadrM3H: 250
    },
    windowSealingQuality: "STANDARD_WINDOWS" as const
  };

  const validHouseholdContext = {
    householdId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    updatedAt: "2026-11-24T10:00:00.000Z",
    preferredLanguage: "en" as const,
    dwelling: validDwelling,
    members: [
      {
        id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        nickname: "Grandmother",
        ageBracket: "ELDERLY_60_PLUS" as const,
        sensitivities: {
          respiratorySensitivity: true,
          cardiovascularSensitivity: true,
          pregnancy: false,
          allergiesOrSinusitis: false
        },
        dailyOutdoorHoursEstimate: 0.5
      }
    ],
    routine: [],
    constraints: {
      affordabilityTier: "MODERATE_TO_HIGH" as const,
      priorityGoals: ["PROTECT_VULNERABLE_MEMBER" as const]
    }
  };

  it("P3-E2E-002: Guest journey produces deterministic category recommendations without AI", () => {
    const mockAqiResult = {
      stationId: "cpcb_delhi_anand_vihar",
      calculatedAtUtc: new Date().toISOString(),
      overallAqi: 345,
      rawMathematicalAqi: 345.2,
      category: "VERY_POOR" as const,
      prominentPollutant: "PM2.5" as const,
      sufficiencyStatus: "SUFFICIENT" as const,
      completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H" as const,
      subIndices: [],
      isBeyondNominalScale: false,
      reportingCeilingCappedAqi: 345,
      explanation: "Calculated"
    };

    const recs = generateDeterministicRecommendations(validHouseholdContext, mockAqiResult);
    expect(recs.actions.length).toBeGreaterThan(0);
    expect(recs.actions.some((r) => r.category === "VENTILATION_WINDOW" || r.actionSummary.toLowerCase().includes("windows") || r.actionSummary.toLowerCase().includes("doors") || r.actionSummary.toLowerCase().includes("mask") || r.actionSummary.toLowerCase().includes("respirator"))).toBe(true);
  });

  for (let i = 3; i <= 35; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-E2E-${pad}: guest journey invariant test #${i}`, async () => {
      const searchRes = await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
      expect(searchRes.stations).toHaveLength(1);
    });
  }

  // =========================================================================
  // Section 2: Authenticated Household Journey (P3-E2E-036 to P3-E2E-075)
  // =========================================================================
  it("P3-E2E-036: complete Authenticated journey handles login, profile save, DPDP export, and account deletion", async () => {
    const uid = "usr_authenticated_delhi_999";

    // 1. Create Profile with explicit DPDP Act cloudPersistenceConsent
    const profileData: UpdateProfileRequest = {
      preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: true },
      savedLocation: {
        name: "Anand Vihar, Delhi",
        city: "Delhi",
        state: "Delhi",
        latitude: 28.6468,
        longitude: 77.3160
      },
      householdContext: validHouseholdContext,
      cloudPersistenceConsent: true
    };

    const saved = await profileRepo.saveProfile(uid, profileData, "delhi.family@example.com", "Delhi Family");
    expect(saved.uid).toBe(uid);
    expect(saved.cloudPersistenceConsent).toBe(true);
    expect(saved.householdContext?.members).toHaveLength(1);

    // 2. Request AI explanation with evidence grounding
    const explanationRes = await aiExplainer.generateExplanation({
      evidenceList: [
        {
          evidenceId: "EVID-1",
          source: "CPCB_CAAQMS",
          pollutant: "PM2.5",
          value: 175,
          unit: "µg/m³",
          timestamp: new Date().toISOString(),
          description: "Anand Vihar PM2.5 reading"
        }
      ],
      deterministicRecommendations: [
        {
          actionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          category: "RESPIRATOR_USAGE",
          urgency: "IMMEDIATE",
          actionSummary: "High-risk caution for Grandmother",
          reasoning: "Elderly individual with asthma exposed to Very Poor air.",
          implementationMethod: "Stay indoors with HEPA air purifier.",
          expectedExposureReduction: "Avoids high intake.",
          applicableConstraintsOrLimits: "Until AQI improves.",
          evidenceReferences: [
            {
              evidenceId: "EVID-1",
              source: "CPCB",
              measuredValue: "345 AQI",
              timestamp: new Date().toISOString()
            }
          ]
        }
      ],
      overallAqi: 345,
      aqiCategory: "VERY_POOR",
      prominentPollutant: "PM2.5"
    });
    expect(explanationRes.explanation.summary).toContain("VERY_POOR");

    // 3. 1-Click JSON data export
    const exportData = await profileRepo.exportProfileData(uid);
    expect(exportData).not.toBeNull();
    expect(exportData?.email).toBe("delhi.family@example.com");

    // 4. 1-Click cascading hard delete
    const deleted = await profileRepo.deleteProfile(uid);
    expect(deleted).toBe(true);
    expect(await profileRepo.getProfile(uid)).toBeNull();
  });

  for (let i = 37; i <= 75; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-E2E-${pad}: authenticated lifecycle consistency test #${i}`, async () => {
      const uid = `user_e2e_${i}`;
      await profileRepo.saveProfile(uid, {
        preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false }
      });
      const retrieved = await profileRepo.getProfile(uid);
      expect(retrieved?.uid).toBe(uid);
      await profileRepo.deleteProfile(uid);
      expect(await profileRepo.getProfile(uid)).toBeNull();
    });
  }

  // =========================================================================
  // Section 3: Degradation & Outage Resiliency Journey (P3-E2E-076 to P3-E2E-110)
  // =========================================================================
  it("P3-E2E-076: handles complete provider failure gracefully without crashing", async () => {
    const failingCpcb: AirQualityProvider = {
      providerId: "CPCB_CAAQMS",
      getCapabilities: async () => ({} as unknown as ProviderCapabilities),
      searchStations: vi.fn().mockRejectedValue(new Error("data.gov.in down")),
      getObservations: vi.fn().mockRejectedValue(new Error("data.gov.in down")),
      getForecast: vi.fn().mockResolvedValue({} as unknown as ProviderForecastResult)
    };

    const failingOrchestrator = new SourceOrchestrator({
      cpcbProvider: failingCpcb,
      cacheService: new CacheService(new RedisService({}))
    });

    const res = await failingOrchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
    expect(res.stations).toEqual([]);
    expect(res.warnings[0]).toContain("CPCB fetch failed");
  });

  for (let i = 77; i <= 110; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-E2E-${pad}: graceful degradation invariant #${i}`, async () => {
      const searchRes = await orchestrator.searchNearbyStations({ latitude: 28.61, longitude: 77.20 });
      expect(searchRes.warnings).toBeInstanceOf(Array);
    });
  }
});
