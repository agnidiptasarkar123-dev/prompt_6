import { RoutineActivity } from "@/schemas/routine.schema";
import { CpcbCategory } from "@/schemas/cpcb.schema";

export interface DiurnalExposureWindow {
  activityId: string;
  label: string;
  startHour: number;
  endHour: number;
  isInversionPeakRisk: boolean; // 07:00 - 09:30 morning peak or late night
  suggestedShiftMinutes: number;
}

/**
 * Calculates diurnal exposure risks for daily routine activities.
 * Morning inversion peaks in Indian urban winters typically occur between 07:00 and 09:30.
 */
export function evaluateRoutineExposureWindows(
  activities: RoutineActivity[],
  currentCategory: CpcbCategory
): DiurnalExposureWindow[] {
  return activities.map((act) => {
    const startHour = Math.floor(act.timeWindow.startMinuteOfDay / 60);
    const endHour = Math.floor(
      (act.timeWindow.startMinuteOfDay + act.timeWindow.durationMinutes) / 60
    );

    // Morning inversion window in Indian cities: 07:00 to 09:30 (420 - 570 mins)
    const isMorningPeak =
      act.timeWindow.startMinuteOfDay >= 420 && act.timeWindow.startMinuteOfDay <= 570;

    const isHighSmog =
      currentCategory === "POOR" ||
      currentCategory === "VERY_POOR" ||
      currentCategory === "SEVERE";

    let suggestedShift = 0;
    if (isMorningPeak && isHighSmog && act.locationType === "OUTDOOR") {
      // Suggest shifting later if flexibility allows
      suggestedShift = Math.min(60, act.flexibility.canShiftLaterMinutes);
    }

    return {
      activityId: act.activityId,
      label: act.label,
      startHour,
      endHour,
      isInversionPeakRisk: isMorningPeak && act.locationType !== "INDOOR",
      suggestedShiftMinutes: suggestedShift
    };
  });
}
