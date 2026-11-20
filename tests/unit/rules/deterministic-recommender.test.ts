import { describe, it, expect } from "vitest";
import { generateDeterministicRecommendations } from "@/domain/rules/deterministic-recommender";
import { checkRoutineSafetyGuardrails } from "@/domain/rules/safety-guardrails";
import { HouseholdContext } from "@/schemas/user-context.schema";
import { CpcbAqiResult } from "@/schemas/cpcb.schema";

describe("Deterministic Recommendation Engine & Safety Guardrails", () => {
  const sampleContext: HouseholdContext = {
    householdId: "hh-test-1",
    updatedAt: new Date().toISOString(),
    preferredLanguage: "en",
    dwelling: {
      dwellingType: "APARTMENT_HIGH_RISE",
      floorLevel: 8,
      proximityToMajorRoadMeters: 200,
      cooking: {
        primaryFuel: "INDUCTION_ELECTRIC",
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
    routine: [
      {
        activityId: "act-run",
        label: "Outdoor 10km Marathon Training",
        memberIds: ["mem-1"],
        locationType: "OUTDOOR",
        physicalIntensity: "VIGOROUS",
        timeWindow: {
          startMinuteOfDay: 360, // 06:00 AM
          durationMinutes: 60
        },
        flexibility: {
          canShiftEarlierMinutes: 0,
          canShiftLaterMinutes: 0,
          canSubstituteWithIndoorAlternative: true,
          canChangeTransitMode: false
        }
      }
    ],
    constraints: {
      affordabilityTier: "NO_ADDITIONAL_COST",
      priorityGoals: ["MAINTAIN_FITNESS_SAFELY"]
    }
  };

  it("blocks vigorous outdoor workout during Severe air quality (Hard Safety Guardrail)", () => {
    const violations = checkRoutineSafetyGuardrails(sampleContext.routine, "SEVERE");
    expect(violations.length).toBe(1);
    expect(violations[0]!.label).toBe("Outdoor 10km Marathon Training");
    expect(violations[0]!.violationReason).toContain("Vigorous outdoor activity during SEVERE air quality");
    expect(violations[0]!.mandatoryCorrection).toContain("Shift workout indoors");
  });

  it("generates deterministic recommendations citing evidence and never inventing measurements", () => {
    const cpcbResult: CpcbAqiResult = {
      stationId: "ANAND-VIHAR-01",
      calculatedAtUtc: new Date().toISOString(),
      overallAqi: 345,
      category: "VERY_POOR",
      prominentPollutant: "PM2.5",
      sufficiencyStatus: "SUFFICIENT",
      subIndices: [],
      explanation: "AQI 345 driven by PM2.5"
    };

    const recommendation = generateDeterministicRecommendations(sampleContext, cpcbResult);

    expect(recommendation.generator).toBe("RULE_ENGINE");
    expect(recommendation.actions.length).toBeGreaterThanOrEqual(1);

    // Ventilation window action must recommend KEEP_SEALED during Very Poor air
    const ventAction = recommendation.actions.find((a) => a.category === "VENTILATION_WINDOW");
    expect(ventAction).toBeDefined();
    expect(ventAction!.actionSummary).toContain("closed");

    // All actions must have valid evidence citations
    for (const act of recommendation.actions) {
      expect(act.evidenceReferences.length).toBeGreaterThanOrEqual(1);
      expect(act.evidenceReferences[0]!.evidenceId).toBe("EVID-STATION-ANAND-VIHAR-01-AQI-345");
      expect(act.evidenceReferences[0]!.measuredValue).toContain("345");
    }
  });

  it("handles unobserved conditions without fabricating AQI numbers", () => {
    // When cpcbResult is null (data unavailable)
    const recommendation = generateDeterministicRecommendations(sampleContext, null);

    expect(recommendation.generator).toBe("RULE_ENGINE");
    expect(recommendation.actions.length).toBeGreaterThanOrEqual(1);
    expect(recommendation.overallRiskSummary).toContain("Unobserved");
  });

  it("recommends commute timing shifts and indoor source control when applicable", () => {
    const contextualUser: HouseholdContext = {
      ...sampleContext,
      dwelling: {
        ...sampleContext.dwelling,
        indoorSources: {
          ...sampleContext.dwelling.indoorSources,
          incenseOrDhoopDaily: true
        }
      },
      routine: [
        {
          activityId: "act-commute",
          label: "Morning Bike Commute",
          memberIds: ["mem-1"],
          locationType: "OUTDOOR",
          physicalIntensity: "MODERATE",
          timeWindow: {
            startMinuteOfDay: 480, // 08:00 AM (inversion window)
            durationMinutes: 45
          },
          flexibility: {
            canShiftEarlierMinutes: 0,
            canShiftLaterMinutes: 60,
            canSubstituteWithIndoorAlternative: false,
            canChangeTransitMode: true
          }
        }
      ]
    };

    const cpcbResult: CpcbAqiResult = {
      stationId: "SITE-02",
      calculatedAtUtc: new Date().toISOString(),
      overallAqi: 280,
      category: "POOR",
      prominentPollutant: "PM10",
      sufficiencyStatus: "SUFFICIENT",
      subIndices: [],
      explanation: "AQI 280 driven by PM10"
    };

    const recommendation = generateDeterministicRecommendations(contextualUser, cpcbResult);
    const commuteAction = recommendation.actions.find((a) => a.category === "COMMUTE_TIMING");
    const sourceAction = recommendation.actions.find((a) => a.category === "SOURCE_CONTROL_INDOOR");

    expect(commuteAction).toBeDefined();
    expect(commuteAction!.actionSummary).toContain("Shift Morning Bike Commute");
    expect(sourceAction).toBeDefined();
    expect(sourceAction!.actionSummary).toContain("incense");
  });
});
