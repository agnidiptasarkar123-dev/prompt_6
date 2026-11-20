import { describe, it, expect } from "vitest";
import { generateDeterministicRecommendations } from "@/domain/rules/deterministic-recommender";
import { HouseholdContext } from "@/schemas/user-context.schema";
import { CpcbAqiResult } from "@/schemas/cpcb.schema";

describe("Deterministic Recommendation Engine (Transparent, Evidence-Grounded)", () => {
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

  it("generates deterministic recommendations citing evidence and never inventing measurements", () => {
    const cpcbResult: CpcbAqiResult = {
      stationId: "ANAND-VIHAR-01",
      calculatedAtUtc: new Date().toISOString(),
      overallAqi: 345,
      category: "VERY_POOR",
      prominentPollutant: "PM2.5",
      sufficiencyStatus: "SUFFICIENT",
      completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
      subIndices: [],
      explanation: "AQI 345 driven by PM2.5"
    };

    const recommendation = generateDeterministicRecommendations(sampleContext, cpcbResult);

    expect(recommendation.generator).toBe("RULE_ENGINE");
    expect(recommendation.actions.length).toBeGreaterThanOrEqual(1);

    // Ventilation window action must recommend keeping windows shut during Very Poor air
    const ventAction = recommendation.actions.find((a) => a.category === "VENTILATION_WINDOW");
    expect(ventAction).toBeDefined();
    expect(ventAction!.actionSummary).toContain("shut");
    expect(ventAction!.urgency).toBe("IMMEDIATE");

    // All actions must have valid evidence citations
    for (const act of recommendation.actions) {
      expect(act.evidenceReferences.length).toBeGreaterThanOrEqual(1);
      expect(act.evidenceReferences[0]!.evidenceId).toBe("EVID-STATION-ANAND-VIHAR-01-AQI-345");
      expect(act.evidenceReferences[0]!.measuredValue).toContain("345");
    }
  });

  it("overrides sealed ventilation with IMMEDIATE exhaust when indoor combustion sources are burning", () => {
    const combustionContext: HouseholdContext = {
      ...sampleContext,
      dwelling: {
        ...sampleContext.dwelling,
        cooking: {
          primaryFuel: "BIOMASS_KEROSENE",
          kitchenVentilation: "UNVENTED_INDOOR",
          averageDailyCookingHours: 2
        }
      }
    };

    const cpcbResult: CpcbAqiResult = {
      stationId: "SITE-01",
      calculatedAtUtc: new Date().toISOString(),
      overallAqi: 450,
      category: "SEVERE",
      prominentPollutant: "PM2.5",
      sufficiencyStatus: "SUFFICIENT",
      completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
      subIndices: [],
      explanation: "AQI 450 driven by PM2.5"
    };

    const rec = generateDeterministicRecommendations(combustionContext, cpcbResult);
    const ventAction = rec.actions.find((a) => a.category === "VENTILATION_WINDOW");
    expect(ventAction).toBeDefined();
    expect(ventAction!.urgency).toBe("IMMEDIATE");
    expect(ventAction!.expectedExposureReduction).toContain("indoor CO & PM spikes");
    expect(ventAction!.applicableConstraintsOrLimits).toContain("CRITICAL LIFE-SAFETY RULE");
  });

  it("handles unobserved conditions without fabricating AQI numbers", () => {
    const unobservedContext: HouseholdContext = {
      ...sampleContext,
      members: [
        {
          id: "mem-asthma",
          nickname: "Aarav",
          ageBracket: "CHILD_3_12",
          sensitivities: {
            respiratorySensitivity: true,
            cardiovascularSensitivity: false,
            pregnancy: false,
            allergiesOrSinusitis: false
          },
          dailyOutdoorHoursEstimate: 1
        }
      ],
      routine: [
        {
          activityId: "act-run",
          label: "Outdoor Running",
          memberIds: ["mem-asthma"],
          locationType: "OUTDOOR",
          physicalIntensity: "VIGOROUS",
          timeWindow: { startMinuteOfDay: 360, durationMinutes: 60 },
          flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: true, canChangeTransitMode: false }
        }
      ]
    };

    const recommendation = generateDeterministicRecommendations(unobservedContext, null);

    expect(recommendation.generator).toBe("RULE_ENGINE");
    expect(recommendation.actions.length).toBeGreaterThanOrEqual(1);
    expect(recommendation.overallRiskSummary).toContain("unobserved");

    const ventAction = recommendation.actions.find((a) => a.category === "VENTILATION_WINDOW");
    expect(ventAction).toBeDefined();
    expect(ventAction!.evidenceReferences[0]!.evidenceId).toBe("EVID-SEASONAL-CLIMATOLOGY");
    expect(ventAction!.evidenceReferences[0]!.measuredValue).toBe("Unobserved ambient air");

    const exerciseAction = recommendation.actions.find((a) => a.category === "EXERCISE_ADAPTATION");
    expect(exerciseAction).toBeDefined();
    expect(exerciseAction!.evidenceReferences[0]!.measuredValue).toBe("Unobserved ambient air");
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
          physicalIntensity: "LIGHT", // Light intensity so it doesn't trigger emergency hard guardrail in Poor
          timeWindow: {
            startMinuteOfDay: 480, // 08:00 AM (in 360-570 morning peak)
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
      completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
      subIndices: [],
      explanation: "AQI 280 driven by PM10"
    };

    const recommendation = generateDeterministicRecommendations(contextualUser, cpcbResult);
    const commuteAction = recommendation.actions.find((a) => a.category === "COMMUTE_TIMING");
    const sourceAction = recommendation.actions.find((a) => a.category === "SOURCE_CONTROL_INDOOR");

    expect(commuteAction).toBeDefined();
    expect(commuteAction!.actionSummary).toContain("Morning Bike Commute");
    expect(sourceAction).toBeDefined();
    expect(sourceAction!.actionSummary).toContain("incense");
  });

  it("handles GOOD air quality with scheduled ventilation and vulnerable member adaptations", () => {
    const vulnerableUser: HouseholdContext = {
      ...sampleContext,
      members: [
        {
          id: "mem-vulnerable",
          nickname: "Aarav",
          ageBracket: "CHILD_3_12",
          sensitivities: {
            respiratorySensitivity: true,
            cardiovascularSensitivity: false,
            pregnancy: false,
            allergiesOrSinusitis: false
          },
          dailyOutdoorHoursEstimate: 1
        }
      ],
      routine: [
        {
          activityId: "act-run-child",
          label: "Intense Sprint Training",
          memberIds: ["mem-vulnerable"],
          locationType: "OUTDOOR",
          physicalIntensity: "VIGOROUS",
          timeWindow: {
            startMinuteOfDay: 420,
            durationMinutes: 45
          },
          flexibility: {
            canShiftEarlierMinutes: 0,
            canShiftLaterMinutes: 0,
            canSubstituteWithIndoorAlternative: true,
            canChangeTransitMode: false
          }
        }
      ]
    };

    // Test with MODERATE air quality (triggers vulnerable member adaptation)
    const modResult: CpcbAqiResult = {
      stationId: "SITE-MOD",
      calculatedAtUtc: new Date().toISOString(),
      overallAqi: 150,
      category: "MODERATE",
      prominentPollutant: "PM2.5",
      sufficiencyStatus: "SUFFICIENT",
      completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
      subIndices: [],
      explanation: "AQI 150"
    };

    const recMod = generateDeterministicRecommendations(vulnerableUser, modResult);
    const exerciseAction = recMod.actions.find((a) => a.category === "EXERCISE_ADAPTATION");
    expect(exerciseAction).toBeDefined();
    expect(exerciseAction!.applicableConstraintsOrLimits).toContain("Applies to vulnerable member: Aarav");

    // Test with GOOD air quality (scheduled ventilation)
    const goodResult: CpcbAqiResult = {
      stationId: "SITE-GOOD",
      calculatedAtUtc: new Date().toISOString(),
      overallAqi: 35,
      category: "GOOD",
      prominentPollutant: "PM2.5",
      sufficiencyStatus: "SUFFICIENT",
      completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
      subIndices: [],
      explanation: "AQI 35"
    };

    const recGood = generateDeterministicRecommendations(vulnerableUser, goodResult);
    const ventGood = recGood.actions.find((a) => a.category === "VENTILATION_WINDOW");
    expect(ventGood).toBeDefined();
    expect(ventGood!.urgency).toBe("SCHEDULED");
    expect(ventGood!.actionSummary).toContain("Open opposite windows");
  });
});
