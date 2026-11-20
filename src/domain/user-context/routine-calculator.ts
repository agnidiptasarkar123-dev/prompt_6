import { RoutineActivity } from "@/schemas/routine.schema";
import { CpcbCategory } from "@/schemas/cpcb.schema";

export interface MeteorologicalForecastContext {
  boundaryLayerHeightMeters?: number;
  windSpeedKmH?: number;
  temperatureCelsius?: number;
  source: "TYPE_D_MODEL_FORECAST";
}

export interface DiurnalExposureWindow {
  activityId: string;
  label: string;
  startHour: number;
  endHour: number;
  isNcdcPeakHourRisk: boolean; // Morning (06:00-09:30) or late evening (18:00-22:00) per NCDC October 2025
  isMeteorologicalInversionRisk: boolean; // Grounded in atmospheric boundary layer height (<250m) & low wind (<7 km/h)
  suggestedShiftMinutes: number;
  guidanceRationale: string;
}

/**
 * Calculates diurnal exposure risks for daily routine activities.
 * Grounded in:
 * 1. Ministry of Health & Family Welfare / NCDC October 2025 Health Advisory:
 *    Recommends avoiding outdoor physical activities and keeping external openings shut
 *    during morning (06:00 - 09:30) and late evening (18:00 - 22:00) pollution peak hours.
 * 2. Atmospheric Boundary Layer Meteorology:
 *    Only flags true physical thermal radiation inversion when forecast/modeled boundary layer
 *    height is shallow (< 250m) and wind speed is calm (< 7 km/h / 2 m/s). Modelled forecasts
 *    are strictly identified as model estimates.
 */
export function evaluateRoutineExposureWindows(
  activities: RoutineActivity[],
  currentCategory: CpcbCategory,
  forecast?: MeteorologicalForecastContext
): DiurnalExposureWindow[] {
  return activities.map((act) => {
    const startHour = Math.floor(act.timeWindow.startMinuteOfDay / 60);
    const endHour = Math.floor(
      (act.timeWindow.startMinuteOfDay + act.timeWindow.durationMinutes) / 60
    );

    // NCDC documented peak hours:
    // Morning peak: 06:00 to 09:30 (360 - 570 mins)
    // Evening peak: 18:00 to 22:00 (1080 - 1320 mins)
    const isMorningNcdc =
      act.timeWindow.startMinuteOfDay >= 360 && act.timeWindow.startMinuteOfDay <= 570;
    const isEveningNcdc =
      act.timeWindow.startMinuteOfDay >= 1080 && act.timeWindow.startMinuteOfDay <= 1320;
    const isNcdcPeakHour = (isMorningNcdc || isEveningNcdc) && act.locationType !== "INDOOR";

    // Meteorology-dependent inversion verification:
    // Only affirmed when atmospheric boundary layer height is shallow (<250m) and surface wind is stagnant (<7 km/h)
    let isMeteorologicalInversionRisk = false;
    if (forecast) {
      const isShallowBlh =
        forecast.boundaryLayerHeightMeters !== undefined && forecast.boundaryLayerHeightMeters < 250;
      const isCalmWind = forecast.windSpeedKmH !== undefined && forecast.windSpeedKmH < 7;
      isMeteorologicalInversionRisk = isShallowBlh && isCalmWind && act.locationType !== "INDOOR";
    }

    const isHighSmog =
      currentCategory === "POOR" ||
      currentCategory === "VERY_POOR" ||
      currentCategory === "SEVERE";

    let suggestedShift = 0;
    let rationale = "Routine timing falls outside documented peak exposure windows.";

    if (isHighSmog && act.locationType === "OUTDOOR") {
      if (isMorningNcdc && act.flexibility.canShiftLaterMinutes > 0) {
        suggestedShift = Math.min(60, act.flexibility.canShiftLaterMinutes);
        rationale = "NCDC October 2025 Advisory: Shift outdoor departure past morning peak hours (06:00–09:30) toward midday when solar mixing improves atmospheric dispersion.";
      } else if (isEveningNcdc && act.flexibility.canShiftEarlierMinutes > 0) {
        suggestedShift = -Math.min(60, act.flexibility.canShiftEarlierMinutes);
        rationale = "NCDC October 2025 Advisory: Complete outdoor commute prior to evening rush-hour pollution accumulation (18:00–22:00).";
      }
    }

    if (isMeteorologicalInversionRisk) {
      rationale += " [MODEL_FORECAST: Shallow boundary layer (<250m) and stagnant wind indicate atmospheric inversion trapping ground emissions.]";
    }

    return {
      activityId: act.activityId,
      label: act.label,
      startHour,
      endHour,
      isNcdcPeakHourRisk: isNcdcPeakHour,
      isMeteorologicalInversionRisk,
      suggestedShiftMinutes: suggestedShift,
      guidanceRationale: rationale
    };
  });
}
