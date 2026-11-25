// SPDX-License-Identifier: Apache-2.0
import type { PlannedActivity } from "@/schemas/planner.schema";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";
import type { NormalizedObservation, NormalizedForecast } from "@/schemas/providers/normalized-provider.schema";

export type SuitabilityStatus = "RECOMMENDED" | "CAUTION" | "AVOID_OR_RESCHEDULE" | "UNVERIFIED_PRECAUTION";
export type ProvenanceBasis = "MEASURED_AQI" | "RAW_OBSERVATIONS" | "CAMS_FORECAST" | "GENERAL_GUIDANCE";

export interface ActivityEvaluation {
  readonly activityId: string;
  readonly suitability: SuitabilityStatus;
  readonly provenanceBasis: ProvenanceBasis;
  readonly confidenceLabel: "Verified Ground Data" | "Limited (Partial Data / Forecast)" | "General Guidance Only";
  readonly explanation: string;
  readonly suggestedRescheduleWindow?: string;
  readonly ventilationAdvice?: string;
  readonly exposureDisclaimer: string;
}

export interface ScheduleConflict {
  readonly activityAId: string;
  readonly activityBId: string;
  readonly overlapMinutes: number;
  readonly message: string;
}

export interface DailyScheduleEvaluation {
  readonly evaluatedAt: string;
  readonly evaluations: readonly ActivityEvaluation[];
  readonly conflicts: readonly ScheduleConflict[];
  readonly bestOutdoorWindow: string;
  readonly bestVentilationWindow: string;
  readonly overallConfidence: "HIGH" | "LIMITED" | "PRECAUTIONARY";
  readonly summaryNote: string;
}

export function timeToMinutes(hhmm: string): number {
  const parts = hhmm.split(":");
  const h = parseInt(parts[0] || "0", 10);
  const m = parseInt(parts[1] || "0", 10);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

export function detectScheduleConflicts(activities: readonly PlannedActivity[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  for (let i = 0; i < activities.length; i++) {
    for (let j = i + 1; j < activities.length; j++) {
      const a = activities[i]!;
      const b = activities[j]!;
      const startA = timeToMinutes(a.startTime);
      const endA = timeToMinutes(a.endTime);
      const startB = timeToMinutes(b.startTime);
      const endB = timeToMinutes(b.endTime);

      const overlapStart = Math.max(startA, startB);
      const overlapEnd = Math.min(endA, endB);
      if (overlapEnd > overlapStart) {
        conflicts.push({
          activityAId: a.id,
          activityBId: b.id,
          overlapMinutes: overlapEnd - overlapStart,
          message: `'${a.title}' (${a.startTime}-${a.endTime}) overlaps with '${b.title}' (${b.startTime}-${b.endTime}) by ${overlapEnd - overlapStart} minutes.`
        });
      }
    }
  }
  return conflicts;
}

export function findOptimalForecastWindow(forecast: readonly NormalizedForecast[]): {
  bestWindow: string;
  basisLabel: string;
} {
  const pm25Points = forecast.filter((f) => f.pollutant === "PM2.5");
  if (pm25Points.length === 0) {
    return {
      bestWindow: "12:00 - 15:00 (General midday solar mixing window)",
      basisLabel: "GENERAL_GUIDANCE"
    };
  }

  // Pick lowest forecasted PM2.5 hour within daytime hours (06:00 - 20:00)
  let bestPoint = pm25Points[0]!;
  for (const pt of pm25Points) {
    if (pt.forecastValue < bestPoint.forecastValue) {
      bestPoint = pt;
    }
  }
  const d = new Date(bestPoint.validTime);
  const startH = String(d.getUTCHours()).padStart(2, "0");
  const endH = String((d.getUTCHours() + 2) % 24).padStart(2, "0");
  return {
    bestWindow: `${startH}:00 - ${endH}:00 UTC (CAMS Forecast PM2.5 ~${Math.round(bestPoint.forecastValue)} µg/m³)`,
    basisLabel: "CAMS_FORECAST"
  };
}

export function evaluateScheduleDay(params: {
  readonly activities: readonly PlannedActivity[];
  readonly aqiResult: CpcbAqiResult | null;
  readonly observations: readonly NormalizedObservation[];
  readonly forecast: readonly NormalizedForecast[];
}): DailyScheduleEvaluation {
  const { activities, aqiResult, observations, forecast } = params;
  const conflicts = detectScheduleConflicts(activities);
  const hasVerifiedAqi = aqiResult !== null && aqiResult.overallAqi !== null && aqiResult.category !== null;
  const hasRawObs = observations.length > 0;
  const { bestWindow, basisLabel } = findOptimalForecastWindow(forecast);
  const overallConfidence: DailyScheduleEvaluation["overallConfidence"] = hasVerifiedAqi
    ? "HIGH"
    : hasRawObs || forecast.length > 0
      ? "LIMITED"
      : "PRECAUTIONARY";

  const pm25Obs = observations.find((o) => o.pollutant === "PM2.5");
  const evaluations: ActivityEvaluation[] = activities.map((act) => {
    const startMin = timeToMinutes(act.startTime);
    const isNcdcMorning = startMin >= 360 && startMin <= 570; // 06:00 - 09:30
    const isNcdcEvening = startMin >= 1080 && startMin <= 1320; // 18:00 - 22:00
    const isPeakHour = isNcdcMorning || isNcdcEvening;

    const exposureDisclaimer =
      "Informational schedule estimate grounded in ambient station/model context; not a medical or personal-dosimeter measurement.";

    if (act.category === "VENTILATION_WINDOW") {
      if (hasVerifiedAqi) {
        const aqi = aqiResult!.overallAqi!;
        const isUnsafe = aqi > 200;
        return {
          activityId: act.id,
          suitability: isUnsafe ? "AVOID_OR_RESCHEDULE" : "RECOMMENDED",
          provenanceBasis: "MEASURED_AQI",
          confidenceLabel: "Verified Ground Data",
          explanation: isUnsafe
            ? `Current verified CPCB AQI is ${aqi} (${aqiResult!.category}). Keep exterior windows closed unless indoor combustion exhaust is required.`
            : `Verified AQI is ${aqi} (${aqiResult!.category}). Cross-ventilation is suitable, especially during midday solar mixing.`,
          suggestedRescheduleWindow: isUnsafe ? "Switch to mechanical filtration / exhaust only" : bestWindow,
          ventilationAdvice: isUnsafe ? "KEEP_SEALED" : "OPEN_CROSS_VENTILATION",
          exposureDisclaimer
        };
      }
      return {
        activityId: act.id,
        suitability: "UNVERIFIED_PRECAUTION",
        provenanceBasis: basisLabel === "CAMS_FORECAST" ? "CAMS_FORECAST" : "GENERAL_GUIDANCE",
        confidenceLabel: forecast.length > 0 ? "Limited (Partial Data / Forecast)" : "General Guidance Only",
        explanation:
          "Overall CPCB AQI is unavailable. Ventilate cautiously during midday (12:00-15:00) only if outdoor air appears visually clear.",
        suggestedRescheduleWindow: bestWindow,
        ventilationAdvice: "EXHAUST_ONLY",
        exposureDisclaimer
      };
    }

    if (act.environment === "INDOOR") {
      return {
        activityId: act.id,
        suitability: "RECOMMENDED",
        provenanceBasis: hasVerifiedAqi ? "MEASURED_AQI" : "GENERAL_GUIDANCE",
        confidenceLabel: hasVerifiedAqi ? "Verified Ground Data" : "General Guidance Only",
        explanation:
          "Indoor activity reduces direct exposure to roadside vehicle exhaust. Remember indoor air quality depends on avoiding incense/smoke and operating exhaust fans.",
        exposureDisclaimer
      };
    }

    // OUTDOOR or TRANSIT evaluation
    if (hasVerifiedAqi) {
      const aqi = aqiResult!.overallAqi!;
      const isVigorous = act.category === "RUNNING" || act.category === "CYCLING" || act.category === "OUTDOOR_SPORTS";

      if (aqi > 300 || (aqi > 200 && isVigorous)) {
        return {
          activityId: act.id,
          suitability: "AVOID_OR_RESCHEDULE",
          provenanceBasis: "MEASURED_AQI",
          confidenceLabel: "Verified Ground Data",
          explanation: `Verified CPCB AQI is ${aqi} (${aqiResult!.category}). Elevated inhalation rates during ${act.category.toLowerCase().replace(/_/g, " ")} significantly increase particulate dose.`,
          suggestedRescheduleWindow: act.environment === "TRANSIT" ? "Prefer enclosed AC/Metro transit & wear N95" : bestWindow,
          exposureDisclaimer
        };
      }

      if (aqi > 100 || isPeakHour) {
        return {
          activityId: act.id,
          suitability: "CAUTION",
          provenanceBasis: "MEASURED_AQI",
          confidenceLabel: "Verified Ground Data",
          explanation: isPeakHour
            ? `Scheduled during NCDC peak pollution accumulation hours (${act.startTime}) with AQI ${aqi}. Consider shifting toward midday.`
            : `AQI is ${aqi} (${aqiResult!.category}). Keep effort moderate and prefer green corridors away from main roads.`,
          suggestedRescheduleWindow: isPeakHour ? bestWindow : undefined,
          exposureDisclaimer
        };
      }

      return {
        activityId: act.id,
        suitability: "RECOMMENDED",
        provenanceBasis: "MEASURED_AQI",
        confidenceLabel: "Verified Ground Data",
        explanation: `Verified CPCB AQI is ${aqi} (${aqiResult!.category}). Favourable conditions for this activity.`,
        exposureDisclaimer
      };
    }

    // Fallback when overall AQI is unavailable
    if (pm25Obs) {
      const highPm25 = pm25Obs.value > 90;
      return {
        activityId: act.id,
        suitability: highPm25 ? "CAUTION" : "UNVERIFIED_PRECAUTION",
        provenanceBasis: "RAW_OBSERVATIONS",
        confidenceLabel: "Limited (Partial Data / Forecast)",
        explanation: `Overall CPCB AQI is unavailable, but Type C raw PM2.5 is ${pm25Obs.value} ${pm25Obs.unit || "µg/m³"}. ${
          highPm25 ? "Because PM2.5 exceeds 90 µg/m³, limit strenuous outdoor exertion." : "Proceed cautiously and avoid peak traffic hours."
        }`,
        suggestedRescheduleWindow: isPeakHour || highPm25 ? bestWindow : undefined,
        exposureDisclaimer
      };
    }

    return {
      activityId: act.id,
      suitability: "UNVERIFIED_PRECAUTION",
      provenanceBasis: forecast.length > 0 ? "CAMS_FORECAST" : "GENERAL_GUIDANCE",
      confidenceLabel: forecast.length > 0 ? "Limited (Partial Data / Forecast)" : "General Guidance Only",
      explanation: isPeakHour
        ? `Real-time CPCB AQI is unavailable and ${act.startTime} falls in NCDC morning/evening inversion hours. Shifting to midday may reduce traffic exhaust exposure.`
        : "Real-time CPCB AQI is unavailable at the selected station. Follow general precautions and verify local visibility.",
      suggestedRescheduleWindow: isPeakHour ? bestWindow : undefined,
      exposureDisclaimer
    };
  });

  return {
    evaluatedAt: new Date().toISOString(),
    evaluations,
    conflicts,
    bestOutdoorWindow: bestWindow,
    bestVentilationWindow: hasVerifiedAqi && aqiResult!.overallAqi! > 200 ? "Keep sealed (mechanical HEPA only)" : "12:00 - 15:30",
    overallConfidence,
    summaryNote: hasVerifiedAqi
      ? `Schedule evaluated against verified CPCB AQI ${aqiResult!.overallAqi} (${aqiResult!.category}).`
      : "Overall CPCB AQI is unavailable; guidance combines available raw readings, Type D CAMS forecasts, and NCDC diurnal rules."
  };
}

export const DEFAULT_PLANNER_TEMPLATES: readonly Omit<PlannedActivity, "id">[] = [
  {
    title: "Morning Walk",
    category: "WALKING",
    environment: "OUTDOOR",
    startTime: "06:30",
    endTime: "07:15",
    locationName: "Neighbourhood Park",
    isFavorite: true,
    reminderEnabled: false
  },
  {
    title: "Office / College Commute",
    category: "OFFICE_COMMUTE",
    environment: "TRANSIT",
    startTime: "08:45",
    endTime: "09:30",
    locationName: "Main Transit Corridor",
    isFavorite: true,
    reminderEnabled: false
  },
  {
    title: "Midday Home Cross-Ventilation",
    category: "VENTILATION_WINDOW",
    environment: "INDOOR",
    startTime: "13:00",
    endTime: "13:30",
    locationName: "Home Living Area",
    isFavorite: false,
    reminderEnabled: false
  },
  {
    title: "Evening Grocery Run",
    category: "SHOPPING",
    environment: "OUTDOOR",
    startTime: "18:30",
    endTime: "19:15",
    locationName: "Local Market",
    isFavorite: false,
    reminderEnabled: false
  }
];
