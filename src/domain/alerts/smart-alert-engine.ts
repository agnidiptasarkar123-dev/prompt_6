// SPDX-License-Identifier: Apache-2.0
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";
import type { NormalizedStation, NormalizedObservation, NormalizedForecast } from "@/schemas/providers/normalized-provider.schema";

export interface SmartAlertRuleSet {
  readonly severityThreshold: "MODERATE" | "POOR" | "VERY_POOR" | "SEVERE";
  readonly hysteresisEnabled: boolean;
  readonly quietHoursEnabled: boolean;
  readonly quietHoursStart: string;
  readonly quietHoursEnd: string;
  readonly pm25ThresholdUgM3?: number;
  readonly pm10ThresholdUgM3?: number;
  readonly notifyOnStaleData?: boolean;
  readonly notifyOnStationUnavailable?: boolean;
  readonly notifyOnForecastExceedance?: boolean;
}

export interface EvaluatedSmartAlert {
  readonly id: string;
  readonly dedupeKey: string;
  readonly kind: "MEASURED_AQI" | "POLLUTANT_THRESHOLD" | "FORECAST_WARNING" | "STALE_DATA" | "STATION_UNAVAILABLE";
  readonly severity: "MODERATE" | "POOR" | "VERY_POOR" | "SEVERE";
  readonly title: string;
  readonly message: string;
  readonly explanation: string;
  readonly source: string;
  readonly provenanceTag: "TYPE_B_CALCULATED_AQI" | "TYPE_C_RAW_MEASUREMENT" | "TYPE_D_MODEL_FORECAST" | "SYSTEM_STATUS";
  readonly timestamp: string;
  readonly isRead: boolean;
}

export function isWithinQuietHours(start: string, end: string, hour: number): boolean {
  const startH = parseInt(start.split(":")[0] || "0", 10);
  const endH = parseInt(end.split(":")[0] || "0", 10);
  if (isNaN(startH) || isNaN(endH)) return false;
  return startH > endH ? hour >= startH || hour < endH : hour >= startH && hour < endH;
}

export function evaluateSmartAlerts(params: {
  readonly station: NormalizedStation | null;
  readonly aqiResult: CpcbAqiResult | null;
  readonly aqiStatus: "AVAILABLE" | "AQI_UNAVAILABLE" | "STALE";
  readonly observations: readonly NormalizedObservation[];
  readonly forecast: readonly NormalizedForecast[];
  readonly rules: SmartAlertRuleSet;
  readonly existingDedupeKeys?: ReadonlySet<string>;
  readonly currentHour?: number;
}): EvaluatedSmartAlert[] {
  const {
    station,
    aqiResult,
    aqiStatus,
    observations,
    forecast,
    rules,
    existingDedupeKeys = new Set<string>(),
    currentHour = new Date().getHours()
  } = params;

  const candidates: EvaluatedSmartAlert[] = [];
  const stationLabel = station?.name || "Selected Location";
  const inQuiet = rules.quietHoursEnabled && isWithinQuietHours(rules.quietHoursStart, rules.quietHoursEnd, currentHour);
  const tsLabel = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // 1. Measured CPCB AQI Threshold Alert
  if (aqiResult && aqiResult.overallAqi !== null && aqiResult.category) {
    const thresholdMap = { MODERATE: 100, POOR: 200, VERY_POOR: 300, SEVERE: 400 };
    const limit = thresholdMap[rules.severityThreshold];
    const buffer = rules.hysteresisEnabled ? 5 : 0;

    if (aqiResult.overallAqi >= limit + buffer && (!inQuiet || aqiResult.category === "SEVERE")) {
      const key = `aqi-${station?.id || "none"}-${aqiResult.category}-${aqiResult.overallAqi}`;
      if (!existingDedupeKeys.has(key)) {
        candidates.push({
          id: `alert-${key}-${Date.now()}`,
          dedupeKey: key,
          kind: "MEASURED_AQI",
          severity: aqiResult.category === "GOOD" || aqiResult.category === "SATISFACTORY" ? "MODERATE" : aqiResult.category,
          title: `${aqiResult.category.replace("_", " ")} Verified AQI Alert`,
          message: `CPCB-methodology AQI at ${stationLabel} reached ${aqiResult.overallAqi} (${aqiResult.category}). Driver: ${aqiResult.prominentPollutant || "Particulate Matter"}.`,
          explanation: `Triggered because verified AQI (${aqiResult.overallAqi}) exceeded your threshold (${limit} + ${buffer} hysteresis).`,
          source: station?.providerId || "CPCB_CAAQMS",
          provenanceTag: "TYPE_B_CALCULATED_AQI",
          timestamp: tsLabel,
          isRead: false
        });
      }
    }
  }

  // 2. Individual Pollutant Threshold Alerts (even when overall AQI is unavailable!)
  const pm25Limit = rules.pm25ThresholdUgM3 ?? 60;
  const pm25 = observations.find((o) => o.pollutant === "PM2.5");
  if (pm25 && pm25.value >= pm25Limit && !inQuiet) {
    const key = `pm25-${station?.id || "none"}-${Math.round(pm25.value)}`;
    if (!existingDedupeKeys.has(key)) {
      const sev: EvaluatedSmartAlert["severity"] =
        pm25.value > 250 ? "SEVERE" : pm25.value > 120 ? "VERY_POOR" : pm25.value > 90 ? "POOR" : "MODERATE";
      candidates.push({
        id: `alert-${key}-${Date.now()}`,
        dedupeKey: key,
        kind: "POLLUTANT_THRESHOLD",
        severity: sev,
        title: `Elevated PM2.5 Reading (${pm25.value} ${pm25.unit || "µg/m³"})`,
        message: `Type C raw PM2.5 observation at ${stationLabel} is ${pm25.value} ${pm25.unit || "µg/m³"} (threshold ${pm25Limit}).`,
        explanation: "Individual pollutant reading alert operates independently of overall CPCB 3-pollutant AQI sufficiency.",
        source: pm25.providerId,
        provenanceTag: "TYPE_C_RAW_MEASUREMENT",
        timestamp: tsLabel,
        isRead: false
      });
    }
  }

  // 3. Stale Data & Station Availability Alerts
  if (rules.notifyOnStaleData && aqiStatus === "STALE" && !inQuiet) {
    const key = `stale-${station?.id || "none"}`;
    if (!existingDedupeKeys.has(key)) {
      candidates.push({
        id: `alert-${key}-${Date.now()}`,
        dedupeKey: key,
        kind: "STALE_DATA",
        severity: "MODERATE",
        title: "Stale Monitoring Station Data",
        message: `Latest observations from ${stationLabel} are older than 24 hours and should not be treated as live conditions.`,
        explanation: "HawaSaathi flags stale feeds to avoid driving decisions on outdated sensor telemetry.",
        source: station?.providerId || "SYSTEM",
        provenanceTag: "SYSTEM_STATUS",
        timestamp: tsLabel,
        isRead: false
      });
    }
  }

  if (rules.notifyOnStationUnavailable && !station && !inQuiet) {
    const key = "station-unavailable";
    if (!existingDedupeKeys.has(key)) {
      candidates.push({
        id: `alert-${key}-${Date.now()}`,
        dedupeKey: key,
        kind: "STATION_UNAVAILABLE",
        severity: "MODERATE",
        title: "No Active Ground Station Within Radius",
        message: "No CPCB or OpenAQ monitoring station returned active telemetry within the search radius.",
        explanation: "Use Type D CAMS atmospheric forecasts for directional guidance while ground telemetry is unavailable.",
        source: "ORCHESTRATOR",
        provenanceTag: "SYSTEM_STATUS",
        timestamp: tsLabel,
        isRead: false
      });
    }
  }

  // 4. Tagged Forecast Exceedance Warning (never confused with measured data)
  if (rules.notifyOnForecastExceedance && !inQuiet) {
    const highForecast = forecast.find((f) => f.pollutant === "PM2.5" && f.forecastValue >= 120);
    if (highForecast) {
      const key = `forecast-${highForecast.validTime}`;
      if (!existingDedupeKeys.has(key)) {
        candidates.push({
          id: `alert-${key}-${Date.now()}`,
          dedupeKey: key,
          kind: "FORECAST_WARNING",
          severity: "POOR",
          title: "[MODEL FORECAST] Elevated PM2.5 Outlook",
          message: `Open-Meteo CAMS forecast predicts PM2.5 ~${Math.round(highForecast.forecastValue)} µg/m³ around ${new Date(highForecast.validTime).toUTCString()}.`,
          explanation: "This is a Type D atmospheric model forecast (~45 km grid), not a verified ground station measurement.",
          source: "OPEN_METEO_CAMS",
          provenanceTag: "TYPE_D_MODEL_FORECAST",
          timestamp: tsLabel,
          isRead: false
        });
      }
    }
  }

  return candidates;
}
