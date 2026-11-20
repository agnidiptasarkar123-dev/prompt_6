import { describe, it, expect } from "vitest";
import { checkRoutineSafetyGuardrails } from "@/domain/rules/safety-guardrails";
import { RoutineActivity } from "@/schemas/routine.schema";
import { HouseholdMember } from "@/schemas/household.schema";

describe("Household-Aware Safety Guardrails (MoHFW / NCDC October 2025 Advisory)", () => {
  const vulnerableMember: HouseholdMember = {
    id: "mem-asthma",
    nickname: "Arjun",
    ageBracket: "ADULT_18_59",
    sensitivities: {
      respiratorySensitivity: true,
      cardiovascularSensitivity: false,
      pregnancy: false,
      allergiesOrSinusitis: false
    },
    dailyOutdoorHoursEstimate: 2
  };

  const childMember: HouseholdMember = {
    id: "mem-child",
    nickname: "Tara",
    ageBracket: "CHILD_3_12",
    sensitivities: {
      respiratorySensitivity: false,
      cardiovascularSensitivity: false,
      pregnancy: false,
      allergiesOrSinusitis: false
    },
    dailyOutdoorHoursEstimate: 1
  };

  const healthyAdult: HouseholdMember = {
    id: "mem-healthy",
    nickname: "Kabir",
    ageBracket: "ADULT_18_59",
    sensitivities: {
      respiratorySensitivity: false,
      cardiovascularSensitivity: false,
      pregnancy: false,
      allergiesOrSinusitis: false
    },
    dailyOutdoorHoursEstimate: 2
  };

  const members = [vulnerableMember, childMember, healthyAdult];

  it("triggers emergency cessation of outdoor exertion during SEVERE air quality", () => {
    const activities: RoutineActivity[] = [
      {
        activityId: "act-run",
        label: "Morning Run",
        memberIds: ["mem-healthy"],
        locationType: "OUTDOOR",
        physicalIntensity: "VIGOROUS",
        timeWindow: { startMinuteOfDay: 360, durationMinutes: 45 },
        flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: true, canChangeTransitMode: false }
      },
      {
        activityId: "act-bike",
        label: "Cycling Commute",
        memberIds: ["mem-healthy"],
        locationType: "TRANSIT",
        transitMode: "BICYCLING",
        physicalIntensity: "LIGHT", // Light intensity commute so Rule 2 (Active mobility prohibition) triggers
        timeWindow: { startMinuteOfDay: 500, durationMinutes: 30 },
        flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: false, canChangeTransitMode: true }
      },
      {
        activityId: "act-metro",
        label: "Metro Ride in Severe Smog",
        memberIds: ["mem-healthy"],
        locationType: "TRANSIT",
        transitMode: "METRO_TRAIN", // Enclosed public transit
        physicalIntensity: "RESTING_SEDENTARY",
        timeWindow: { startMinuteOfDay: 500, durationMinutes: 30 },
        flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: false, canChangeTransitMode: false }
      }
    ];

    const violations = checkRoutineSafetyGuardrails(activities, "SEVERE", members);
    expect(violations.length).toBe(2);
    expect(violations[0]!.violationReason).toContain("All physical exertion outdoors must cease");
    expect(violations[1]!.violationReason).toContain("Active outdoor commuting (BICYCLING)");
    expect(violations[0]!.regulatorySource).toBe("NCDC_OCTOBER_2025_ADVISORY");
  });

  it("blocks open transit modes (motorbike / auto rickshaw / walking) during SEVERE smog", () => {
    const activities: RoutineActivity[] = [
      {
        activityId: "act-walk",
        label: "Walk to Metro",
        memberIds: ["mem-healthy"],
        locationType: "TRANSIT",
        transitMode: "WALKING",
        physicalIntensity: "LIGHT", // Light intensity walking transit
        timeWindow: { startMinuteOfDay: 600, durationMinutes: 20 },
        flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: false, canChangeTransitMode: true }
      },
      {
        activityId: "act-moto",
        label: "Motorbike Commute",
        memberIds: ["mem-healthy"],
        locationType: "TRANSIT",
        transitMode: "TWO_WHEELER_MOTORBIKE",
        physicalIntensity: "RESTING_SEDENTARY",
        timeWindow: { startMinuteOfDay: 600, durationMinutes: 35 },
        flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: false, canChangeTransitMode: true }
      },
      {
        activityId: "act-auto",
        label: "Auto Rickshaw Ride",
        memberIds: ["mem-healthy"],
        locationType: "TRANSIT",
        transitMode: "OPEN_AUTO_RICKSHAW",
        physicalIntensity: "RESTING_SEDENTARY",
        timeWindow: { startMinuteOfDay: 600, durationMinutes: 25 },
        flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: false, canChangeTransitMode: true }
      }
    ];

    const violations = checkRoutineSafetyGuardrails(activities, "SEVERE", members);
    expect(violations.length).toBe(3);
    for (const v of violations) {
      expect(v.violationReason).toContain("Active outdoor commuting");
    }
  });

  it("handles VERY_POOR air quality rules for vigorous activity, sensitive members, and peak hours", () => {
    const activities: RoutineActivity[] = [
      {
        // 1. Vigorous outdoor for healthy adult -> violation
        activityId: "act-marathon",
        label: "Marathon Practice",
        memberIds: ["mem-healthy"],
        locationType: "OUTDOOR",
        physicalIntensity: "VIGOROUS",
        timeWindow: { startMinuteOfDay: 720, durationMinutes: 60 }, // Midday (12:00)
        flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: true, canChangeTransitMode: false }
      },
      {
        // 2. Sensitive member (child) moderate outdoor play -> violation
        activityId: "act-play",
        label: "Child Park Play",
        memberIds: ["mem-child"],
        locationType: "OUTDOOR",
        physicalIntensity: "MODERATE",
        timeWindow: { startMinuteOfDay: 720, durationMinutes: 45 },
        flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: true, canChangeTransitMode: false }
      },
      {
        // 3. Peak hour (07:00 AM) light jog/walk for healthy adult -> violation
        activityId: "act-morning-jog",
        label: "Morning Peak Jog",
        memberIds: ["mem-healthy"],
        locationType: "OUTDOOR",
        physicalIntensity: "LIGHT",
        timeWindow: { startMinuteOfDay: 420, durationMinutes: 30 }, // 07:00 AM (in 360-570)
        flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: true, canChangeTransitMode: false }
      },
      {
        // 4. Peak hour outdoor resting/sedentary -> NO violation
        activityId: "act-sit-bench",
        label: "Sitting Quietly on Veranda",
        memberIds: ["mem-healthy"],
        locationType: "OUTDOOR",
        physicalIntensity: "RESTING_SEDENTARY",
        timeWindow: { startMinuteOfDay: 420, durationMinutes: 20 },
        flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: false, canChangeTransitMode: false }
      }
    ];

    const violations = checkRoutineSafetyGuardrails(activities, "VERY_POOR", members);
    expect(violations.length).toBe(3);
    expect(violations[0]!.violationReason).toContain("Vigorous outdoor exercise during VERY POOR air");
    expect(violations[1]!.violationReason).toContain("Vulnerable member (Tara) must stay indoors");
    expect(violations[2]!.violationReason).toContain("Outdoor exercise during morning (06:00–09:30)");
  });

  it("handles POOR air quality rules for sensitive members and intense peak cardio", () => {
    const activities: RoutineActivity[] = [
      {
        // Sensitive adult (asthma) moderate activity -> violation
        activityId: "act-asthma-walk",
        label: "Brisk Walk",
        memberIds: ["mem-asthma"],
        locationType: "OUTDOOR",
        physicalIntensity: "MODERATE",
        timeWindow: { startMinuteOfDay: 720, durationMinutes: 30 },
        flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: true, canChangeTransitMode: false }
      },
      {
        // Sensitive adult (asthma) vigorous activity in POOR air -> violation
        activityId: "act-asthma-run",
        label: "Vigorous Outdoor Run with Asthma",
        memberIds: ["mem-asthma"],
        locationType: "OUTDOOR",
        physicalIntensity: "VIGOROUS",
        timeWindow: { startMinuteOfDay: 720, durationMinutes: 30 },
        flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: true, canChangeTransitMode: false }
      },
      {
        // Healthy adult vigorous workout during evening peak (19:00 / 1140 min) -> violation
        activityId: "act-peak-cardio",
        label: "Evening Track Cardio",
        memberIds: ["mem-healthy"],
        locationType: "OUTDOOR",
        physicalIntensity: "VIGOROUS",
        timeWindow: { startMinuteOfDay: 1140, durationMinutes: 45 },
        flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: true, canChangeTransitMode: false }
      },
      {
        // Healthy adult light walking at midday -> NO violation
        activityId: "act-midday-walk",
        label: "Midday Stroll",
        memberIds: ["mem-healthy"],
        locationType: "OUTDOOR",
        physicalIntensity: "LIGHT",
        timeWindow: { startMinuteOfDay: 780, durationMinutes: 20 },
        flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: true, canChangeTransitMode: false }
      }
    ];

    const violations = checkRoutineSafetyGuardrails(activities, "POOR", members);
    expect(violations.length).toBe(3);
    expect(violations[0]!.violationReason).toContain("People with asthma, lung/heart conditions");
    expect(violations[1]!.violationReason).toContain("People with asthma, lung/heart conditions");
    expect(violations[2]!.violationReason).toContain("Intense outdoor cardio during morning or late evening");
  });

  it("handles MODERATE air quality rules (restricting vigorous exertion for sensitive members)", () => {
    const activities: RoutineActivity[] = [
      {
        activityId: "act-intense-child",
        label: "Soccer Match",
        memberIds: ["mem-child"],
        locationType: "OUTDOOR",
        physicalIntensity: "VIGOROUS",
        timeWindow: { startMinuteOfDay: 600, durationMinutes: 60 },
        flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: true, canChangeTransitMode: false }
      },
      {
        activityId: "act-intense-healthy",
        label: "Healthy Adult Soccer",
        memberIds: ["mem-healthy"],
        locationType: "OUTDOOR",
        physicalIntensity: "VIGOROUS",
        timeWindow: { startMinuteOfDay: 600, durationMinutes: 60 },
        flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: true, canChangeTransitMode: false }
      }
    ];

    const violations = checkRoutineSafetyGuardrails(activities, "MODERATE", members);
    // Only child's vigorous activity is restricted in MODERATE
    expect(violations.length).toBe(1);
    expect(violations[0]!.affectedMemberNickname).toBe("Tara");
    expect(violations[0]!.regulatorySource).toBe("CPCB_NAQI_HEALTH_ADVISORY");
  });

  it("returns zero violations during GOOD or SATISFACTORY air quality", () => {
    const activities: RoutineActivity[] = [
      {
        activityId: "act-run",
        label: "Outdoor Run",
        memberIds: ["mem-asthma"],
        locationType: "OUTDOOR",
        physicalIntensity: "VIGOROUS",
        timeWindow: { startMinuteOfDay: 420, durationMinutes: 60 },
        flexibility: { canShiftEarlierMinutes: 0, canShiftLaterMinutes: 0, canSubstituteWithIndoorAlternative: false, canChangeTransitMode: false }
      }
    ];

    expect(checkRoutineSafetyGuardrails(activities, "GOOD", members).length).toBe(0);
    expect(checkRoutineSafetyGuardrails(activities, "SATISFACTORY", members).length).toBe(0);
  });
});
