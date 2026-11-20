import { describe, it, expect } from "vitest";
import { assessMemberVulnerabilities } from "@/domain/user-context/sensitivity-evaluator";
import { evaluateRoutineExposureWindows } from "@/domain/user-context/routine-calculator";
import { analyzeHouseholdContext } from "@/domain/user-context/context-engine";
import { HouseholdMember } from "@/schemas/household.schema";
import { HouseholdContext } from "@/schemas/user-context.schema";
import { RoutineActivity } from "@/schemas/routine.schema";

describe("Dynamic User Context Engine (Anti-Enum, Non-Diagnostic)", () => {
  it("evaluates diverse multi-generational sensitivities without clinical diagnosis", () => {
    const infant: HouseholdMember = {
      id: "mem-infant",
      nickname: "Aarav",
      ageBracket: "INFANT_0_2",
      sensitivities: {
        respiratorySensitivity: false,
        cardiovascularSensitivity: false,
        pregnancy: false,
        allergiesOrSinusitis: false
      },
      dailyOutdoorHoursEstimate: 1
    };
    const infantEval = assessMemberVulnerabilities(infant);
    expect(infantEval.isSensitiveToSmog).toBe(true);
    expect(infantEval.sensitivityFactors).toContain("Developing respiratory system (Age < 13)");

    const adultWithAsthma: HouseholdMember = {
      id: "mem-adult",
      nickname: "Pooja",
      ageBracket: "ADULT_18_59",
      sensitivities: {
        respiratorySensitivity: true,
        cardiovascularSensitivity: false,
        pregnancy: false,
        allergiesOrSinusitis: false
      },
      dailyOutdoorHoursEstimate: 3
    };
    const adultEval = assessMemberVulnerabilities(adultWithAsthma);
    expect(adultEval.isSensitiveToSmog).toBe(true);
    expect(adultEval.sensitivityFactors).toContain("Self-reported respiratory sensitivity");

    const healthyAdult: HouseholdMember = {
      id: "mem-healthy",
      nickname: "Vikram",
      ageBracket: "ADULT_18_59",
      sensitivities: {
        respiratorySensitivity: false,
        cardiovascularSensitivity: false,
        pregnancy: false,
        allergiesOrSinusitis: false
      },
      dailyOutdoorHoursEstimate: 4
    };
    const healthyEval = assessMemberVulnerabilities(healthyAdult);
    expect(healthyEval.isSensitiveToSmog).toBe(false);
    expect(healthyEval.sensitivityFactors.length).toBe(0);
  });

  it("identifies morning inversion window risk (07:00 - 09:30) and suggests schedule shift", () => {
    const activities: RoutineActivity[] = [
      {
        activityId: "act-commute",
        label: "Bike Commute to Office",
        memberIds: ["mem-healthy"],
        locationType: "OUTDOOR",
        physicalIntensity: "MODERATE",
        timeWindow: {
          startMinuteOfDay: 480, // 08:00 AM (inside 420-570 inversion window)
          durationMinutes: 45
        },
        transitMode: "TWO_WHEELER_MOTORBIKE",
        flexibility: {
          canShiftEarlierMinutes: 0,
          canShiftLaterMinutes: 60,
          canSubstituteWithIndoorAlternative: false,
          canChangeTransitMode: true
        }
      }
    ];

    const evaluations = evaluateRoutineExposureWindows(activities, "VERY_POOR");
    expect(evaluations[0]!.isInversionPeakRisk).toBe(true);
    expect(evaluations[0]!.suggestedShiftMinutes).toBe(60);
  });

  it("analyzes complete household context with indoor dwelling factors", () => {
    const context: HouseholdContext = {
      householdId: "hh-001",
      updatedAt: new Date().toISOString(),
      preferredLanguage: "en",
      dwelling: {
        dwellingType: "APARTMENT_LOW_RISE",
        floorLevel: 2,
        proximityToMajorRoadMeters: 40, // Road close
        cooking: {
          primaryFuel: "LPG",
          kitchenVentilation: "OPEN_WINDOW_ONLY",
          averageDailyCookingHours: 2
        },
        indoorSources: {
          incenseOrDhoopDaily: true,
          mosquitoCoilUsage: false,
          indoorSmoking: false,
          unventedGasHeater: false
        },
        filtration: {
          hasAirPurifier: false,
          purifierLocations: []
        },
        windowSealingQuality: "STANDARD_WINDOWS"
      },
      members: [
        {
          id: "m1",
          nickname: "Grandma",
          ageBracket: "ELDERLY_60_PLUS",
          sensitivities: {
            respiratorySensitivity: true,
            cardiovascularSensitivity: false,
            pregnancy: false,
            allergiesOrSinusitis: false
          },
          dailyOutdoorHoursEstimate: 1
        }
      ],
      routine: [],
      constraints: {
        affordabilityTier: "LOW_COST",
        priorityGoals: ["PROTECT_VULNERABLE_MEMBER"]
      }
    };

    const analysis = analyzeHouseholdContext(context, "POOR");
    expect(analysis.totalMembers).toBe(1);
    expect(analysis.sensitiveMembersCount).toBe(1);
    expect(analysis.primaryIndoorRiskFactor).toContain("incense/dhoop burning");
  });
});
