import { describe, it, expect } from "vitest";
import { assessMemberVulnerabilities } from "@/domain/user-context/sensitivity-evaluator";
import {
  evaluateRoutineExposureWindows,
  MeteorologicalForecastContext
} from "@/domain/user-context/routine-calculator";
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

    const child: HouseholdMember = {
      id: "mem-child",
      nickname: "Anaya",
      ageBracket: "CHILD_3_12",
      sensitivities: {
        respiratorySensitivity: false,
        cardiovascularSensitivity: false,
        pregnancy: false,
        allergiesOrSinusitis: true
      },
      dailyOutdoorHoursEstimate: 2
    };
    const childEval = assessMemberVulnerabilities(child);
    expect(childEval.isSensitiveToSmog).toBe(true);
    expect(childEval.sensitivityFactors).toContain("Developing respiratory system (Age < 13)");
    expect(childEval.sensitivityFactors).toContain("Self-reported dust/airborne allergy sensitivity");

    const elderly: HouseholdMember = {
      id: "mem-elderly",
      nickname: "Dadi",
      ageBracket: "ELDERLY_60_PLUS",
      sensitivities: {
        respiratorySensitivity: false,
        cardiovascularSensitivity: true,
        pregnancy: false,
        allergiesOrSinusitis: false
      },
      dailyOutdoorHoursEstimate: 1
    };
    const elderlyEval = assessMemberVulnerabilities(elderly);
    expect(elderlyEval.isSensitiveToSmog).toBe(true);
    expect(elderlyEval.sensitivityFactors).toContain("Higher vulnerability to fine particulates (Age 60+)");
    expect(elderlyEval.sensitivityFactors).toContain("Self-reported cardiovascular sensitivity");

    const pregnantAdult: HouseholdMember = {
      id: "mem-preg",
      nickname: "Meera",
      ageBracket: "ADULT_18_59",
      sensitivities: {
        respiratorySensitivity: false,
        cardiovascularSensitivity: false,
        pregnancy: true,
        allergiesOrSinusitis: false
      },
      dailyOutdoorHoursEstimate: 1
    };
    const pregnantEval = assessMemberVulnerabilities(pregnantAdult);
    expect(pregnantEval.isSensitiveToSmog).toBe(true);
    expect(pregnantEval.sensitivityFactors).toContain("Pregnancy");

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

  it("identifies NCDC morning peak hour risk (06:00 - 09:30) and suggests schedule shift", () => {
    const activities: RoutineActivity[] = [
      {
        activityId: "act-commute",
        label: "Bike Commute to Office",
        memberIds: ["mem-healthy"],
        locationType: "OUTDOOR",
        physicalIntensity: "MODERATE",
        timeWindow: {
          startMinuteOfDay: 480, // 08:00 AM (inside 360-570 NCDC morning window)
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
    expect(evaluations[0]!.isNcdcPeakHourRisk).toBe(true);
    expect(evaluations[0]!.isMeteorologicalInversionRisk).toBe(false);
    expect(evaluations[0]!.suggestedShiftMinutes).toBe(60);
    expect(evaluations[0]!.guidanceRationale).toContain("NCDC October 2025 Advisory");
  });

  it("identifies NCDC evening peak hour risk (18:00 - 22:00) and suggests earlier shift", () => {
    const activities: RoutineActivity[] = [
      {
        activityId: "act-evening",
        label: "Evening Run",
        memberIds: ["mem-healthy"],
        locationType: "OUTDOOR",
        physicalIntensity: "VIGOROUS",
        timeWindow: {
          startMinuteOfDay: 1140, // 19:00 (7 PM, inside 1080-1320 evening window)
          durationMinutes: 60
        },
        flexibility: {
          canShiftEarlierMinutes: 45,
          canShiftLaterMinutes: 0,
          canSubstituteWithIndoorAlternative: true,
          canChangeTransitMode: false
        }
      }
    ];

    const evaluations = evaluateRoutineExposureWindows(activities, "POOR");
    expect(evaluations[0]!.isNcdcPeakHourRisk).toBe(true);
    expect(evaluations[0]!.suggestedShiftMinutes).toBe(-45);
    expect(evaluations[0]!.guidanceRationale).toContain("evening rush-hour");
  });

  it("evaluates meteorological inversion risk when forecast data is supplied", () => {
    const activities: RoutineActivity[] = [
      {
        activityId: "act-walk",
        label: "Early Walk",
        memberIds: ["mem-healthy"],
        locationType: "OUTDOOR",
        physicalIntensity: "LIGHT",
        timeWindow: {
          startMinuteOfDay: 420, // 07:00 AM
          durationMinutes: 30
        },
        flexibility: {
          canShiftEarlierMinutes: 0,
          canShiftLaterMinutes: 0,
          canSubstituteWithIndoorAlternative: false,
          canChangeTransitMode: false
        }
      }
    ];

    // Forecast with shallow boundary layer (<250m) and calm winds (<7 km/h)
    const shallowForecast: MeteorologicalForecastContext = {
      boundaryLayerHeightMeters: 180,
      windSpeedKmH: 4.5,
      temperatureCelsius: 12,
      source: "TYPE_D_MODEL_FORECAST"
    };

    const evalInversion = evaluateRoutineExposureWindows(activities, "POOR", shallowForecast);
    expect(evalInversion[0]!.isMeteorologicalInversionRisk).toBe(true);
    expect(evalInversion[0]!.guidanceRationale).toContain("MODEL_FORECAST: Shallow boundary layer");

    // Forecast with deep boundary layer (>250m) and high winds (>7 km/h)
    const ventilatedForecast: MeteorologicalForecastContext = {
      boundaryLayerHeightMeters: 800,
      windSpeedKmH: 15,
      temperatureCelsius: 22,
      source: "TYPE_D_MODEL_FORECAST"
    };

    const evalVentilated = evaluateRoutineExposureWindows(activities, "POOR", ventilatedForecast);
    expect(evalVentilated[0]!.isMeteorologicalInversionRisk).toBe(false);
  });

  it("handles low smog conditions and indoor locations gracefully", () => {
    const activities: RoutineActivity[] = [
      {
        activityId: "act-gym",
        label: "Indoor Gym",
        memberIds: ["mem-healthy"],
        locationType: "INDOOR",
        physicalIntensity: "VIGOROUS",
        timeWindow: {
          startMinuteOfDay: 480, // 08:00 AM
          durationMinutes: 60
        },
        flexibility: {
          canShiftEarlierMinutes: 0,
          canShiftLaterMinutes: 0,
          canSubstituteWithIndoorAlternative: false,
          canChangeTransitMode: false
        }
      },
      {
        activityId: "act-park",
        label: "Park Walk in Good Air",
        memberIds: ["mem-healthy"],
        locationType: "OUTDOOR",
        physicalIntensity: "LIGHT",
        timeWindow: {
          startMinuteOfDay: 480,
          durationMinutes: 30
        },
        flexibility: {
          canShiftEarlierMinutes: 0,
          canShiftLaterMinutes: 30,
          canSubstituteWithIndoorAlternative: false,
          canChangeTransitMode: false
        }
      }
    ];

    // Indoor gym during Severe smog -> not flagged as outdoor peak risk
    const evalGym = evaluateRoutineExposureWindows([activities[0]!], "SEVERE");
    expect(evalGym[0]!.isNcdcPeakHourRisk).toBe(false);
    expect(evalGym[0]!.suggestedShiftMinutes).toBe(0);

    // Outdoor walk during Good air -> no shift suggested
    const evalGood = evaluateRoutineExposureWindows([activities[1]!], "GOOD");
    expect(evalGood[0]!.suggestedShiftMinutes).toBe(0);
    expect(evalGood[0]!.guidanceRationale).toContain("falls outside documented peak exposure windows");
  });

  it("analyzes complete household context with indoor dwelling factors in priority order", () => {
    const baseContext: HouseholdContext = {
      householdId: "hh-001",
      updatedAt: new Date().toISOString(),
      preferredLanguage: "en",
      dwelling: {
        dwellingType: "APARTMENT_LOW_RISE",
        floorLevel: 2,
        proximityToMajorRoadMeters: 40,
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

    // 1. Incense priority
    const analysis1 = analyzeHouseholdContext(baseContext, "POOR");
    expect(analysis1.totalMembers).toBe(1);
    expect(analysis1.sensitiveMembersCount).toBe(1);
    expect(analysis1.primaryIndoorRiskFactor).toContain("incense/dhoop burning");

    // 2. Mosquito coil priority (when incense is false)
    const coilContext: HouseholdContext = {
      ...baseContext,
      dwelling: {
        ...baseContext.dwelling,
        indoorSources: {
          ...baseContext.dwelling.indoorSources,
          incenseOrDhoopDaily: false,
          mosquitoCoilUsage: true
        }
      }
    };
    const analysis2 = analyzeHouseholdContext(coilContext, "POOR");
    expect(analysis2.primaryIndoorRiskFactor).toContain("Mosquito coil combustion");

    // 3. Unvented kitchen priority (when incense & coil false)
    const kitchenContext: HouseholdContext = {
      ...baseContext,
      dwelling: {
        ...baseContext.dwelling,
        cooking: {
          ...baseContext.dwelling.cooking,
          kitchenVentilation: "UNVENTED_INDOOR"
        },
        indoorSources: {
          ...baseContext.dwelling.indoorSources,
          incenseOrDhoopDaily: false,
          mosquitoCoilUsage: false
        }
      }
    };
    const analysis3 = analyzeHouseholdContext(kitchenContext, "POOR");
    expect(analysis3.primaryIndoorRiskFactor).toContain("Kitchen lacks dedicated exhaust");

    // 4. Proximity to road (when cooking is vented and no sources)
    const roadContext: HouseholdContext = {
      ...baseContext,
      dwelling: {
        ...baseContext.dwelling,
        cooking: {
          ...baseContext.dwelling.cooking,
          kitchenVentilation: "KITCHEN_HOOD_CHIMNEY"
        },
        indoorSources: {
          ...baseContext.dwelling.indoorSources,
          incenseOrDhoopDaily: false,
          mosquitoCoilUsage: false
        },
        proximityToMajorRoadMeters: 30
      }
    };
    const analysis4 = analyzeHouseholdContext(roadContext, "POOR");
    expect(analysis4.primaryIndoorRiskFactor).toContain("high-traffic corridor");

    // 5. Clean dwelling far from road -> null risk
    const cleanContext: HouseholdContext = {
      ...baseContext,
      dwelling: {
        ...baseContext.dwelling,
        cooking: {
          ...baseContext.dwelling.cooking,
          kitchenVentilation: "KITCHEN_HOOD_CHIMNEY"
        },
        indoorSources: {
          ...baseContext.dwelling.indoorSources,
          incenseOrDhoopDaily: false,
          mosquitoCoilUsage: false
        },
        proximityToMajorRoadMeters: 500
      }
    };
    const analysis5 = analyzeHouseholdContext(cleanContext, "POOR");
    expect(analysis5.primaryIndoorRiskFactor).toBeNull();
  });
});
