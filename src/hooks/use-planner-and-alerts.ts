// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect, useMemo } from "react";
import { evaluateSmartAlerts } from "@/domain/alerts/smart-alert-engine";
import { getBrowserLocalStorage, readValidatedJsonStorage, writeJsonStorage } from "@/lib/storage/safe-storage";
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

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAlertPreferencesState(raw: unknown): raw is AlertPreferencesState {
  return (
    isRecordObject(raw) &&
    typeof raw.severityThreshold === "string" &&
    typeof raw.hysteresisEnabled === "boolean" &&
    typeof raw.quietHoursEnabled === "boolean"
  );
}

function isPlannedActivityArray(raw: unknown): raw is PlannedActivity[] {
  return Array.isArray(raw) && raw.every((item) => isRecordObject(item) && typeof item.id === "string");
}

function isSavedPlaceArray(raw: unknown): raw is SavedPlace[] {
  return Array.isArray(raw) && raw.every((item) => isRecordObject(item) && typeof item.id === "string");
}

function isExposureDiaryArray(raw: unknown): raw is ExposureDiaryEntry[] {
  return Array.isArray(raw) && raw.every((item) => isRecordObject(item) && typeof item.id === "string");
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
    const storage = getBrowserLocalStorage();
    const savedPrefs = readValidatedJsonStorage(storage, "hs_alert_preferences", isAlertPreferencesState);
    if (savedPrefs) setAlertPreferences(savedPrefs);
    const savedPlan = readValidatedJsonStorage(storage, "hs_planner_activities_v2", isPlannedActivityArray);
    if (savedPlan) setPlannerActivities(savedPlan);
    const savedPl = readValidatedJsonStorage(storage, "hs_saved_places_v2", isSavedPlaceArray);
    if (savedPl) setSavedPlaces(savedPl);
    const savedDiary = readValidatedJsonStorage(storage, "hs_exposure_diary_v2", isExposureDiaryArray);
    if (savedDiary) setDiaryEntries(savedDiary);
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
    writeJsonStorage(window.localStorage, "hs_planner_activities_v2", next);
  };

  const handleUpdateSavedPlaces = (next: SavedPlace[]) => {
    setSavedPlaces(next);
    writeJsonStorage(window.localStorage, "hs_saved_places_v2", next);
  };

  const handleUpdateDiary = (next: ExposureDiaryEntry[]) => {
    setDiaryEntries(next);
    writeJsonStorage(window.localStorage, "hs_exposure_diary_v2", next);
  };

  const savePreferences = (prefs: AlertPreferencesState) => {
    setAlertPreferences(prefs);
    writeJsonStorage(window.localStorage, "hs_alert_preferences", prefs);
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
