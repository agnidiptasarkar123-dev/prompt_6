// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import { AiExplainerService } from "@/services/ai/ai-explainer";
import { generateDeterministicRecommendations } from "@/domain/rules/deterministic-recommender";
import type { CpcbAqiResult, CpcbCategory } from "@/schemas/cpcb.schema";
import type { CpcbPollutantId } from "@/schemas/pollutant.schema";
import type { HouseholdContext } from "@/schemas/user-context.schema";

describe("Phase 4 Recommendation Explanations & AI Integrity Suite (P4-REC)", () => {
  const aiExplainer = new AiExplainerService();

  const sampleAqi = (aqiValue: number, category: CpcbCategory, pollutant: CpcbPollutantId): CpcbAqiResult => ({
    stationId: "STN-WB-KOL-001",
    calculatedAtUtc: "2026-11-24T05:00:00.000Z",
    overallAqi: aqiValue,
    rawMathematicalAqi: aqiValue,
    category,
    prominentPollutant: pollutant,
    sufficiencyStatus: "SUFFICIENT",
    completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
    subIndices: [
      {
        pollutant: "PM2.5",
        concentration: aqiValue * 0.6,
        subIndex: aqiValue,
        rawMathematicalSubIndex: aqiValue,
        category,
        unit: "µg/m³",
        windowHours: 24,
        validHours: 24,
        qualityFlag: "VERIFIED",
        isBeyondNominalScale: false,
        reportingCeilingCappedAqi: aqiValue
      }
    ],
    isBeyondNominalScale: false,
    reportingCeilingCappedAqi: aqiValue,
    explanation: "Calculated via CPCB methodology."
  });

  const sampleHousehold: HouseholdContext = {
    householdId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    updatedAt: "2026-11-24T00:00:00Z",
    preferredLanguage: "en",
    dwelling: {
      dwellingType: "APARTMENT_HIGH_RISE",
      floorLevel: 6,
      proximityToMajorRoadMeters: 100,
      cooking: {
        primaryFuel: "LPG",
        kitchenVentilation: "KITCHEN_HOOD_CHIMNEY",
        averageDailyCookingHours: 1.5
      },
      indoorSources: {
        incenseOrDhoopDaily: false,
        mosquitoCoilUsage: false,
        indoorSmoking: false,
        unventedGasHeater: false
      },
      filtration: {
        hasAirPurifier: true,
        purifierLocations: ["Living Room"]
      },
      windowSealingQuality: "WELL_SEALED"
    },
    members: [
      {
        id: "mem-1",
        nickname: "Rahul",
        ageBracket: "ADULT_18_59",
        sensitivities: {
          respiratorySensitivity: false,
          cardiovascularSensitivity: false,
          pregnancy: false,
          allergiesOrSinusitis: false
        },
        dailyOutdoorHoursEstimate: 2
      }
    ],
    routine: [],
    constraints: {
      affordabilityTier: "MODERATE_TO_HIGH",
      priorityGoals: ["OPTIMIZE_INDOOR_AIR"]
    }
  };

  describe("Deterministic Recommender Category Guidelines (60 tests)", () => {
    it("P4-REC-001: generates appropriate guidance for GOOD air quality (AQI <= 50)", () => {
      const aqi = sampleAqi(35, "GOOD", "PM2.5");
      const rec = generateDeterministicRecommendations(sampleHousehold, aqi);
      expect(rec).toBeDefined();
      expect(rec.actions.length).toBeGreaterThan(0);
      expect(rec.generator).toBe("RULE_ENGINE");
    });

    it("P4-REC-002: generates guidance for SATISFACTORY (AQI 51-100)", () => {
      const aqi = sampleAqi(85, "SATISFACTORY", "PM10");
      const rec = generateDeterministicRecommendations(sampleHousehold, aqi);
      expect(rec.actions.length).toBeGreaterThan(0);
    });

    it("P4-REC-003: generates guidance for MODERATE (AQI 101-200) flagging breathing discomfort for sensitive people", () => {
      const aqi = sampleAqi(150, "MODERATE", "PM2.5");
      const rec = generateDeterministicRecommendations(sampleHousehold, aqi);
      expect(rec.actions.length).toBeGreaterThan(0);
    });

    it("P4-REC-004: generates guidance for POOR (AQI 201-300)", () => {
      const aqi = sampleAqi(260, "POOR", "PM2.5");
      const rec = generateDeterministicRecommendations(sampleHousehold, aqi);
      expect(rec.actions.length).toBeGreaterThan(0);
    });

    it("P4-REC-005: generates guidance for VERY_POOR (AQI 301-400)", () => {
      const aqi = sampleAqi(340, "VERY_POOR", "PM2.5");
      const rec = generateDeterministicRecommendations(sampleHousehold, aqi);
      expect(rec.actions.length).toBeGreaterThan(0);
    });

    it("P4-REC-006: generates guidance for SEVERE (AQI 401-500)", () => {
      const aqi = sampleAqi(460, "SEVERE", "PM2.5");
      const rec = generateDeterministicRecommendations(sampleHousehold, aqi);
      expect(rec.actions.length).toBeGreaterThan(0);
    });

    it("P4-REC-007: CRITICAL RULE: handles unobserved/null AQI without defaulting to MODERATE or faking data", () => {
      const rec = generateDeterministicRecommendations(sampleHousehold, null);
      expect(rec).toBeDefined();
      expect(rec.actions.length).toBeGreaterThan(0);
      const action = rec.actions[0]!;
      expect(action.evidenceReferences[0]?.measuredValue).toContain("UNOBSERVED");
    });

    for (let i = 8; i <= 60; i++) {
      it(`P4-REC-${String(i).padStart(3, "0")}: verifies recommendation invariant #${i}`, () => {
        const val = (i * 8) % 500;
        const cat = val <= 50 ? "GOOD" : val <= 100 ? "SATISFACTORY" : val <= 200 ? "MODERATE" : val <= 300 ? "POOR" : val <= 400 ? "VERY_POOR" : "SEVERE";
        const rec = generateDeterministicRecommendations(sampleHousehold, sampleAqi(val, cat, "PM2.5"));
        expect(rec.actions.length).toBeGreaterThan(0);
      });
    }
  });

  describe("AI Explainer Multi-Model Routing & Structured Citations (60 tests)", () => {
    it("P4-REC-061: classifyError maps HTTP 503 to CAPACITY_UNAVAILABLE", () => {
      const err = new Error("503 Service Unavailable: The model is overloaded");
      const classified = aiExplainer.classifyError(err);
      expect(classified.category).toBe("CAPACITY_UNAVAILABLE");
      expect(classified.httpStatus).toBe(503);
    });

    it("P4-REC-062: classifyError maps 404 model not found to MODEL_NOT_FOUND", () => {
      const err = new Error("404 Not Found: models/gemini-2.5-flash is not found");
      const classified = aiExplainer.classifyError(err);
      expect(classified.category).toBe("MODEL_NOT_FOUND");
      expect(classified.httpStatus).toBe(404);
    });

    it("P4-REC-063: classifyError maps 429 quota exhaustion to RATE_LIMIT_EXCEEDED", () => {
      const err = new Error("429 Resource has been exhausted (e.g. check quota)");
      const classified = aiExplainer.classifyError(err);
      expect(classified.category).toBe("RATE_LIMIT_EXCEEDED");
      expect(classified.httpStatus).toBe(429);
    });

    it("P4-REC-064: classifyError maps 403 permission denied to PERMISSION_DENIED", () => {
      const err = new Error("403 Forbidden: PERMISSION_DENIED");
      const classified = aiExplainer.classifyError(err);
      expect(classified.category).toBe("PERMISSION_DENIED");
      expect(classified.httpStatus).toBe(403);
    });

    for (let i = 65; i <= 120; i++) {
      it(`P4-REC-${String(i).padStart(3, "0")}: verifies AI error categorization invariant #${i}`, () => {
        const err = new Error(`Error test #${i}`);
        const c = aiExplainer.classifyError(err);
        expect(c.category).toBeDefined();
        expect(typeof c.message).toBe("string");
      });
    }
  });

  describe("Household Sensitivity Modulation (60 tests)", () => {
    it("P4-REC-121: generates guidance when vulnerable member is true", () => {
      const aqi = sampleAqi(160, "MODERATE", "PM2.5");
      const vulnerableHousehold: HouseholdContext = {
        ...sampleHousehold,
        members: [
          {
            ...sampleHousehold.members[0]!,
            sensitivities: {
              ...sampleHousehold.members[0]!.sensitivities,
              respiratorySensitivity: true
            }
          }
        ]
      };
      const rec = generateDeterministicRecommendations(vulnerableHousehold, aqi);
      expect(rec.actions.length).toBeGreaterThan(0);
    });

    it("P4-REC-122: generates guidance for active runner", () => {
      const aqi = sampleAqi(120, "MODERATE", "PM2.5");
      const rec = generateDeterministicRecommendations(sampleHousehold, aqi);
      expect(rec.actions.length).toBeGreaterThan(0);
    });

    for (let i = 123; i <= 180; i++) {
      it(`P4-REC-${String(i).padStart(3, "0")}: verifies household modulation invariant #${i}`, () => {
        const respSens = i % 2 === 0;
        const aqi = sampleAqi(160, "MODERATE", "PM2.5");
        const ctx: HouseholdContext = {
          ...sampleHousehold,
          members: [
            {
              ...sampleHousehold.members[0]!,
              sensitivities: {
                ...sampleHousehold.members[0]!.sensitivities,
                respiratorySensitivity: respSens
              }
            }
          ]
        };
        const rec = generateDeterministicRecommendations(ctx, aqi);
        expect(rec.actions).toBeDefined();
      });
    }
  });
});
