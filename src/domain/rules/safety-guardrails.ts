// SPDX-License-Identifier: Apache-2.0
import { CpcbCategory } from "@/schemas/cpcb.schema";
import { RoutineActivity } from "@/schemas/routine.schema";
import { HouseholdMember } from "@/schemas/household.schema";

export interface SafetyViolation {
  activityId: string;
  label: string;
  affectedMemberNickname?: string;
  violationReason: string;
  mandatoryCorrection: string;
  regulatorySource: "NCDC_OCTOBER_2025_ADVISORY" | "CPCB_NAQI_HEALTH_ADVISORY";
}

/**
 * Household-Aware Safety Guardrails:
 * Grounded in the Ministry of Health and Family Welfare / National Centre for Disease Control
 * (MoHFW / NCDC) Health Advisory on Air Pollution (October 2025) and CPCB NAQI Guidelines.
 * 
 * Inspects household members associated with activities, evaluating age brackets,
 * respiratory & cardiovascular sensitivities, pregnancy, commute modes, and diurnal timing.
 */
export function checkRoutineSafetyGuardrails(
  activities: RoutineActivity[],
  currentCategory: CpcbCategory,
  members: HouseholdMember[] = []
): SafetyViolation[] {
  const violations: SafetyViolation[] = [];
  const memberMap = new Map<string, HouseholdMember>(members.map((m) => [m.id, m]));

  for (const act of activities) {
    const isOutdoorOrTransit = act.locationType === "OUTDOOR" || act.locationType === "TRANSIT";
    const associatedMembers = act.memberIds
      .map((id) => memberMap.get(id))
      .filter((m): m is HouseholdMember => m !== undefined);

    // Identify if any participating member has vulnerabilities
    const sensitiveParticipants = associatedMembers.filter(
      (m) =>
        m.ageBracket === "INFANT_0_2" ||
        m.ageBracket === "CHILD_3_12" ||
        m.ageBracket === "ELDERLY_60_PLUS" ||
        m.sensitivities.respiratorySensitivity ||
        m.sensitivities.cardiovascularSensitivity ||
        m.sensitivities.pregnancy
    );

    const hasSensitiveMember = sensitiveParticipants.length > 0;
    const sensitiveNick = sensitiveParticipants[0]?.nickname;

    // Check NCDC diurnal peak hours: morning (06:00 - 09:30, 360 - 570 mins) or late evening (18:00 - 22:00, 1080 - 1320 mins)
    const isNcdcPeakHour =
      (act.timeWindow.startMinuteOfDay >= 360 && act.timeWindow.startMinuteOfDay <= 570) ||
      (act.timeWindow.startMinuteOfDay >= 1080 && act.timeWindow.startMinuteOfDay <= 1320);

    // ------------------------------------------------------------------------
    // SEVERE AQI (401 - 500): Emergency Conditions
    // ------------------------------------------------------------------------
    if (currentCategory === "SEVERE") {
      // Rule 1: Complete cessation of all outdoor physical exertion for all individuals
      if (isOutdoorOrTransit && (act.physicalIntensity === "VIGOROUS" || act.physicalIntensity === "MODERATE")) {
        violations.push({
          activityId: act.activityId,
          label: act.label,
          affectedMemberNickname: sensitiveNick,
          violationReason: `All physical exertion outdoors must cease during SEVERE air quality (NCDC October 2025 Emergency Advisory). Inhaling high particulate loads at elevated ventilation rates causes acute cardiovascular and pulmonary distress.`,
          mandatoryCorrection: "Cease outdoor activity immediately; shift exercise indoors with filtered air or defer until air dispersion improves.",
          regulatorySource: "NCDC_OCTOBER_2025_ADVISORY"
        });
        continue;
      }

      // Rule 2: Active mobility (walking / cycling / open two-wheelers) prohibited
      if (
        act.transitMode === "BICYCLING" ||
        act.transitMode === "WALKING" ||
        act.transitMode === "TWO_WHEELER_MOTORBIKE" ||
        act.transitMode === "OPEN_AUTO_RICKSHAW"
      ) {
        violations.push({
          activityId: act.activityId,
          label: act.label,
          affectedMemberNickname: sensitiveNick,
          violationReason: `Active outdoor commuting (${act.transitMode}) during SEVERE smog increases toxic particle inhalation by up to 5x.`,
          mandatoryCorrection: "Switch to enclosed public transport (Metro / AC Bus) or request work-from-home.",
          regulatorySource: "NCDC_OCTOBER_2025_ADVISORY"
        });
        continue;
      }
    }

    // ------------------------------------------------------------------------
    // VERY POOR AQI (301 - 400)
    // ------------------------------------------------------------------------
    if (currentCategory === "VERY_POOR") {
      // Rule 1: No vigorous outdoor exercise for anyone
      if (isOutdoorOrTransit && act.physicalIntensity === "VIGOROUS") {
        violations.push({
          activityId: act.activityId,
          label: act.label,
          violationReason: `Vigorous outdoor exercise during VERY POOR air quality causes deep alveolar particulate deposition and airway hyper-reactivity.`,
          mandatoryCorrection: "Move workout indoors or substitute with low-intensity restorative exercises.",
          regulatorySource: "NCDC_OCTOBER_2025_ADVISORY"
        });
        continue;
      }

      // Rule 2: Sensitive members must completely avoid outdoor exertion
      if (isOutdoorOrTransit && hasSensitiveMember && act.physicalIntensity === "MODERATE") {
        violations.push({
          activityId: act.activityId,
          label: act.label,
          affectedMemberNickname: sensitiveNick,
          violationReason: `Vulnerable member (${sensitiveNick}) must stay indoors and avoid outdoor physical exertion during VERY POOR air quality (NCDC October 2025).`,
          mandatoryCorrection: "Keep vulnerable members indoors with clean air; cancel outdoor sports/play.",
          regulatorySource: "NCDC_OCTOBER_2025_ADVISORY"
        });
        continue;
      }

      // Rule 3: NCDC morning / late-evening outdoor physical workouts avoided
      if (isOutdoorOrTransit && isNcdcPeakHour && act.physicalIntensity !== "RESTING_SEDENTARY") {
        violations.push({
          activityId: act.activityId,
          label: act.label,
          violationReason: `Outdoor exercise during morning (06:00–09:30) or late evening (18:00–22:00) hours coincides with diurnal pollution peaks (NCDC October 2025).`,
          mandatoryCorrection: "Avoid outdoor workouts during morning and late evening; shift to afternoon (12:00–16:00) or indoor fitness.",
          regulatorySource: "NCDC_OCTOBER_2025_ADVISORY"
        });
        continue;
      }
    }

    // ------------------------------------------------------------------------
    // POOR AQI (201 - 300)
    // ------------------------------------------------------------------------
    if (currentCategory === "POOR") {
      // Sensitive members: avoid outdoor physical exertion
      if (isOutdoorOrTransit && hasSensitiveMember && (act.physicalIntensity === "MODERATE" || act.physicalIntensity === "VIGOROUS")) {
        violations.push({
          activityId: act.activityId,
          label: act.label,
          affectedMemberNickname: sensitiveNick,
          violationReason: `People with asthma, lung/heart conditions, children, and elderly must avoid outdoor physical exertion during POOR air quality (NCDC October 2025).`,
          mandatoryCorrection: "Shift physical exertion indoors; avoid prolonged outdoor exposure.",
          regulatorySource: "NCDC_OCTOBER_2025_ADVISORY"
        });
        continue;
      }

      // Peak hour intense workout restriction
      if (isOutdoorOrTransit && isNcdcPeakHour && act.physicalIntensity === "VIGOROUS") {
        violations.push({
          activityId: act.activityId,
          label: act.label,
          violationReason: `Intense outdoor cardio during morning or late evening peak hours increases particulate intake during POOR air quality.`,
          mandatoryCorrection: "Shift cardio workout to midday (12:00–16:00) or exercise indoors.",
          regulatorySource: "NCDC_OCTOBER_2025_ADVISORY"
        });
        continue;
      }
    }

    // ------------------------------------------------------------------------
    // MODERATE AQI (101 - 200)
    // ------------------------------------------------------------------------
    if (currentCategory === "MODERATE") {
      if (isOutdoorOrTransit && hasSensitiveMember && act.physicalIntensity === "VIGOROUS") {
        violations.push({
          activityId: act.activityId,
          label: act.label,
          affectedMemberNickname: sensitiveNick,
          violationReason: `Vulnerable members with respiratory/cardiac conditions or developing lungs should reduce prolonged strenuous outdoor exertion during MODERATE air quality.`,
          mandatoryCorrection: "Reduce workout intensity or take frequent rest breaks.",
          regulatorySource: "CPCB_NAQI_HEALTH_ADVISORY"
        });
        continue;
      }
    }
  }

  return violations;
}
