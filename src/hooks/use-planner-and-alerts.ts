// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect, useMemo } from "react";
import { evaluateSmartAlerts } from "@/domain/alerts/smart-alert-engine";
import type { EnvironmentalAlert } from "@/components/alerts/notification-center";
import type { AlertPreferencesState } from "@/components/alerts/alert-preferences-modal";
import type {
  NormalizedStation,
  NormalizedObservation,
  NormalizedForecast
} from "@/schemas/providers/normalized-provider.schema";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";
import type { PlannedActivity, SavedPlace, ExposureDiaryEntry } from "@/schemas/planner.schema";

export interface PlannerAndAlertsInput {
  readonly loadingAirQuality: boolean;
  readonly selectedStation: NormalizedStation | null;
  readonly calculatedAqi: CpcbAqiResult | null;
  readonly aqiStatus: "AVAILABLE" | "AQI_UNAVAILABLE" | "STALE";
  readonly observations: readonly NormalizedObservation[];
  readonly forecast: readonly NormalizedForecast[];
}

export function usePlannerAndAlerts(input: PlannerAndAlertsInput) {
  const [plannerActivities, setPlannerActivities] = useState<PlannedActivity[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<ExposureDiaryEntry[]>([]);
  const [alerts, setAlerts] = useState<EnvironmentalAlert[]>([]);
  const [alertPreferences, setAlertPreferences] = useState<AlertPreferencesState>({
    severityThreshold: "POOR",
    hysteresisEnabled: true,
    quietHoursEnabled: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00"
  });

  useEffect(() => {
    try {
      const savedPrefs = window.localStorage?.getItem?.("hs_alert_preferences");
      if (savedPrefs) {
        setAlertPreferences(JSON.parse(savedPrefs) as AlertPreferencesState);
      }
      const savedPlan = window.localStorage?.getItem?.("hs_planner_activities_v2");
      if (savedPlan) {
        setPlannerActivities(JSON.parse(savedPlan) as PlannedActivity[]);
      }
      const savedPl = window.localStorage?.getItem?.("hs_saved_places_v2");
      if (savedPl) {
        setSavedPlaces(JSON.parse(savedPl) as SavedPlace[]);
      }
      const savedDiary = window.localStorage?.getItem?.("hs_exposure_diary_v2");
      if (savedDiary) {
        setDiaryEntries(JSON.parse(savedDiary) as ExposureDiaryEntry[]);
      }
    } catch {
      // Ignore malformed local state safely
    }
  }, []);

  useEffect(() => {
    if (input.loadingAirQuality) return;
    setAlerts((prev) => {
      const existingKeys = new Set(prev.map((a) => a.id));
      const evaluated = evaluateSmartAlerts({
        station: input.selectedStation,
        aqiResult: input.calculatedAqi,
        aqiStatus: input.aqiStatus,
        observations: input.observations,
        forecast: input.forecast,
        rules: {
          ...alertPreferences,
          notifyOnStaleData: true,
          notifyOnStationUnavailable: false,
          notifyOnForecastExceedance: true
        },
        existingDedupeKeys: existingKeys
      });

      const mapped = evaluated
        .filter((e) => !prev.some((p) => p.title === e.title && p.message === e.message))
        .map<EnvironmentalAlert>((e) => ({
          id: e.dedupeKey,
          severity: e.severity,
          title: e.title,
          message: e.message,
          timestamp: e.timestamp,
          source: e.source,
          isRead: false,
          provenanceTag: e.provenanceTag
        }));

      return mapped.length > 0 ? [...mapped, ...prev].slice(0, 20) : prev;
    });
  }, [
    input.loadingAirQuality,
    input.selectedStation,
    input.calculatedAqi,
    input.aqiStatus,
    input.observations,
    input.forecast,
    alertPreferences
  ]);

  const handleUpdateActivities = (next: PlannedActivity[]) => {
    setPlannerActivities(next);
    try {
      window.localStorage?.setItem?.("hs_planner_activities_v2", JSON.stringify(next));
    } catch {
      // Ignore quota
    }
  };

  const handleUpdateSavedPlaces = (next: SavedPlace[]) => {
    setSavedPlaces(next);
    try {
      window.localStorage?.setItem?.("hs_saved_places_v2", JSON.stringify(next));
    } catch {
      // Ignore quota
    }
  };

  const handleUpdateDiary = (next: ExposureDiaryEntry[]) => {
    setDiaryEntries(next);
    try {
      window.localStorage?.setItem?.("hs_exposure_diary_v2", JSON.stringify(next));
    } catch {
      // Ignore quota
    }
  };

  const savePreferences = (prefs: AlertPreferencesState) => {
    setAlertPreferences(prefs);
    try {
      window.localStorage?.setItem?.("hs_alert_preferences", JSON.stringify(prefs));
    } catch {
      // Ignore quota
    }
  };

  const unreadCount = useMemo(() => alerts.filter((a) => !a.isRead).length, [alerts]);

  return {
    plannerActivities,
    savedPlaces,
    diaryEntries,
    alerts,
    setAlerts,
    alertPreferences,
    unreadCount,
    handleUpdateActivities,
    handleUpdateSavedPlaces,
    handleUpdateDiary,
    savePreferences
  };
}
