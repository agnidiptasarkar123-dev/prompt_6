// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState } from "react";
import { AlertTriangle, Info, CheckCircle2, Clock, ArrowRight, MapPin, Radio } from "lucide-react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import { getV2UiStrings } from "@/i18n/v2-translations";
import type { CpcbAqiResult, CpcbSubIndex } from "@/schemas/cpcb.schema";
import type { NormalizedStation, NormalizedObservation } from "@/schemas/providers/normalized-provider.schema";

export interface SearchLocationSummary {
  readonly name: string;
  readonly city: string;
  readonly state: string;
}

export interface AqiSummaryCardProps {
  readonly language: SupportedLanguage;
  readonly searchLocation?: SearchLocationSummary;
  readonly station: NormalizedStation | null;
  readonly calculatedAqi: CpcbAqiResult | null;
  readonly partialSubIndices?: readonly CpcbSubIndex[];
  readonly aqiStatus: "AVAILABLE" | "AQI_UNAVAILABLE" | "STALE";
  readonly statusMessage: string;
  readonly provider: string;
  readonly lastUpdated?: string;
  readonly retrievalTime?: string;
  readonly searchRadiusKm?: number;
  readonly discoveredStationsCount?: number;
  readonly forecastPointsCount?: number;
  readonly isLoading?: boolean;
  readonly onOpenProvenance: () => void;
  readonly observations?: readonly NormalizedObservation[];
  readonly alternativeStation?: NormalizedStation | null;
  readonly onSelectStation?: (station: NormalizedStation) => void;
  readonly onExploreStations?: () => void;
}

export const AqiSummaryCard: React.FC<AqiSummaryCardProps> = ({
  language,
  searchLocation,
  station,
  calculatedAqi,
  partialSubIndices = [],
  aqiStatus,
  statusMessage,
  provider,
  lastUpdated,
  retrievalTime,
  searchRadiusKm = 35,
  discoveredStationsCount,
  forecastPointsCount = 0,
  isLoading = false,
  onOpenProvenance,
  observations = [],
  alternativeStation = null,
  onSelectStation,
  onExploreStations
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS["en-IN"];
  const { strings: v2 } = getV2UiStrings(language);

  const getCategoryTheme = (category?: string | null) => {
    switch (category) {
      case "GOOD":
      case "Good":
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/35",
          text: "text-[var(--hs-accent)]",
          badgeBg: "bg-emerald-500 text-slate-950",
          label: t.categoryGood
        };
      case "SATISFACTORY":
      case "Satisfactory":
        return {
          bg: "bg-lime-500/10",
          border: "border-lime-500/35",
          text: "text-[var(--hs-accent)]",
          badgeBg: "bg-lime-500 text-slate-950",
          label: t.categorySatisfactory
        };
      case "MODERATE":
      case "Moderate":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/35",
          text: "text-[var(--hs-accent-amber)]",
          badgeBg: "bg-amber-500 text-slate-950",
          label: t.categoryModerate
        };
      case "POOR":
      case "Poor":
        return {
          bg: "bg-orange-500/10",
          border: "border-orange-500/35",
          text: "text-[var(--hs-accent-amber)]",
          badgeBg: "bg-orange-500 text-slate-950",
          label: t.categoryPoor
        };
      case "VERY_POOR":
      case "Very Poor":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/35",
          text: "text-[var(--hs-accent-coral)]",
          badgeBg: "bg-red-500 text-slate-950",
          label: t.categoryVeryPoor
        };
      case "SEVERE":
      case "Severe":
        return {
          bg: "bg-rose-950/30",
          border: "border-rose-600/50",
          text: "text-[var(--hs-accent-coral)]",
          badgeBg: "bg-rose-600 text-white",
          label: t.categorySevere
        };
      default:
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/35",
          text: "text-[var(--hs-text-secondary)]",
          badgeBg: "bg-slate-700 text-white",
          label: "Unavailable"
        };
    }
  };

  const theme = getCategoryTheme(calculatedAqi?.category);
  const hasCalculatedAqi = Boolean(calculatedAqi && calculatedAqi.overallAqi !== null && calculatedAqi.overallAqi !== undefined);
  const hasRawObservations = observations.length > 0;
  const isOfficialBulletin = hasCalculatedAqi && provider === "CPCB_OFFICIAL";
  const hasForecastOnly = !station && !hasCalculatedAqi && !hasRawObservations && forecastPointsCount > 0;

  const monitoredSet = new Set(observations.map((o) => o.pollutant));
  const hasParticulate = monitoredSet.has("PM2.5") || monitoredSet.has("PM10");
  const missingReasons: string[] = [];
  if (!station) {
    missingReasons.push(`No qualifying monitoring station found within ${searchRadiusKm} km radius`);
  } else {
    if (monitoredSet.size < 3) {
      missingReasons.push(`${monitoredSet.size}/3 minimum distinct pollutants available`);
    }
    if (!hasParticulate) {
      missingReasons.push("PM2.5 and PM10 both missing (at least 1 required by CPCB)");
    }
  }

  const [nowMs] = useState(() => Date.now());
  const MAX_SKEW_MS = 5 * 60 * 1000;
  const formatIstTime = (iso: string) => {
    const ms = new Date(iso).getTime();
    if (isNaN(ms)) return "Invalid time";
    const formatted = new Date(ms).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata"
    });
    return ms - nowMs > MAX_SKEW_MS ? `${formatted} IST (Future/Skewed)` : `${formatted} IST`;
  };
  const formatIstFull = (iso: string) => {
    const ms = new Date(iso).getTime();
    if (isNaN(ms)) return "Invalid timestamp";
    const formatted = new Date(ms).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    return ms - nowMs > MAX_SKEW_MS ? `${formatted} IST (Future/Skewed)` : `${formatted} IST`;
  };

  const latestObservationTime =
    lastUpdated ||
    observations.reduce<string | undefined>((latest, o) => {
      const ms = new Date(o.observationTime).getTime();
      if (isNaN(ms) || ms - nowMs > MAX_SKEW_MS) return latest;
      if (!latest) return o.observationTime;
      return o.observationTime > latest ? o.observationTime : latest;
    }, undefined) ||
    station?.lastReportedAt ||
    undefined;

  const provenanceBadge = isOfficialBulletin
    ? {
      label: "Type A: Official CPCB AQI",
      cls: "bg-[var(--hs-info-bg)] text-[var(--hs-accent-blue)] ring-1 ring-[var(--hs-info-border)]"
    }
    : hasCalculatedAqi
      ? {
        label: v2.typeBCalculatedLabel,
        cls: "bg-[var(--hs-accent)]/15 text-[var(--hs-accent)] ring-1 ring-[var(--hs-accent)]/30"
      }
      : hasRawObservations
        ? {
          label: "Type C: Raw Monitored",
          cls: "bg-[var(--hs-warm-bg)] text-[var(--hs-accent-amber)] ring-1 ring-[var(--hs-warm-border)]"
        }
        : hasForecastOnly
          ? {
            label: "Type D: Model Forecast Context",
            cls: "bg-[var(--hs-learn-bg)] text-[var(--hs-accent-violet)] ring-1 ring-[var(--hs-learn-border)]"
          }
          : {
            label: "No verified observation available",
            cls: "bg-[var(--hs-subtle-bg)] text-[var(--hs-text-secondary)] ring-1 ring-[var(--hs-border-subtle)]"
          };

  return (
    <div
      className={`hs-card relative overflow-hidden rounded-2xl border p-6 transition bg-[var(--hs-surface-bg)] shadow-sm ${theme.border}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--hs-text-secondary)]">
              {t.aqiSummaryTitle}
            </span>
            <span className="rounded-full bg-[var(--hs-subtle-bg)] border border-[var(--hs-border-subtle)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--hs-text-secondary)]">
              {station ? provider : "NO_STATION"}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${provenanceBadge.cls}`}>
              {provenanceBadge.label}
            </span>
            {aqiStatus === "STALE" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--hs-warm-bg)] border border-[var(--hs-warm-border)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--hs-accent-amber)]">
                <Clock className="h-3 w-3" /> STALE (&gt;24h)
              </span>
            )}
          </div>

          {searchLocation && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--hs-accent)]">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Search Location: {searchLocation.name}
                {searchLocation.city && searchLocation.city !== searchLocation.name ? `, ${searchLocation.city}` : ""}, {searchLocation.state}
              </span>
            </p>
          )}

          <h2 className="mt-1.5 text-2xl font-bold text-[var(--hs-text-primary)] sm:text-3xl hs-wrap-safe">
            {station
              ? station.name
              : searchLocation
                ? `Location: ${searchLocation.name}, ${searchLocation.city || searchLocation.state}`
                : "Selected Location"}
          </h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--hs-text-secondary)]">
            {station ? (
              <>
                <span className="inline-flex items-center gap-1">
                  <Radio className="h-3 w-3 text-[var(--hs-accent)]" aria-hidden="true" />
                  Station ID: <code className="font-mono text-[11px]">{station.id}</code>
                </span>
                <span>
                  {station.city}, {station.state}
                </span>
                {station.distanceKm !== undefined && (
                  <span className="font-semibold text-[var(--hs-accent)]">{station.distanceKm} km from center</span>
                )}
              </>
            ) : isLoading ? (
              <span>Discovering nearby air quality monitoring stations...</span>
            ) : (
              <span>No eligible monitoring station found within {searchRadiusKm} km radius.</span>
            )}
          </p>
        </div>

        {/* Provenance Button */}
        <button
          type="button"
          onClick={onOpenProvenance}
          className="inline-flex shrink-0 items-center space-x-1.5 self-start rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--hs-text-primary)] hover:border-[var(--hs-accent)] transition"
        >
          <Info className="h-3.5 w-3.5 text-[var(--hs-accent)]" />
          <span>{t.provenanceTitle}</span>
        </button>
      </div>

      {/* Main AQI Display */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        {hasCalculatedAqi && aqiStatus === "AVAILABLE" ? (
          <div>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-6xl font-extrabold tracking-tight text-[var(--hs-text-primary)]">
                {calculatedAqi!.overallAqi}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1 text-sm font-bold shadow-sm ${theme.badgeBg}`}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>{theme.label}</span>
              </span>
            </div>
            {calculatedAqi!.prominentPollutant && (
              <p className="mt-2 text-xs font-medium text-[var(--hs-text-secondary)]">
                {t.prominentPollutant}:{" "}
                <span className="font-bold text-[var(--hs-text-primary)]">{calculatedAqi!.prominentPollutant}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1 rounded-xl border border-[var(--hs-warm-border)] bg-[var(--hs-warm-bg)] p-4 space-y-3">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--hs-accent-amber)]" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--hs-text-primary)]">
                  {aqiStatus === "STALE" ? "Verified AQI Stale (>24h)" : t.aqiUnavailable}
                </p>
                <p className="mt-1 text-xs text-[var(--hs-text-secondary)] hs-wrap-safe">
                  {statusMessage || t.aqiUnavailableDesc}
                </p>
              </div>
            </div>

            {/* Missing criteria, raw readings, and coverage */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-[11px]">
              <div className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-2.5">
                <span className="font-semibold text-[var(--hs-text-primary)] block mb-1">{v2.missingCriteriaLabel}</span>
                <p className="text-[var(--hs-text-secondary)]">
                  {missingReasons.length > 0 ? missingReasons.join(" • ") : "Verify physical units (µg/m³ / mg/m³) & 16-hour CPCB averaging window."}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-2.5">
                <span className="font-semibold text-[var(--hs-text-primary)] block mb-1">{v2.availableRawReadingsLabel}</span>
                <p className="text-[var(--hs-text-secondary)]">
                  {hasRawObservations
                    ? observations.slice(0, 4).map((o) => `${o.pollutant}: ${o.value} ${o.unit || ""}`).join(" | ")
                    : "No raw observations reported by this station."}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-2.5">
                <span className="font-semibold text-[var(--hs-text-primary)] block mb-1">{v2.nearbyCoverageLabel}</span>
                <p className="text-[var(--hs-text-secondary)]">
                  {discoveredStationsCount !== undefined
                    ? `Nearby: ${discoveredStationsCount} station(s) within ${searchRadiusKm} km`
                    : station
                      ? "Single station view"
                      : `Radius: ${searchRadiusKm} km`}{" "}
                  • {latestObservationTime ? `Selected Obs: ${formatIstTime(latestObservationTime)}` : "No live obs timestamp"}
                </p>
              </div>
            </div>

            {(calculatedAqi?.subIndices ?? partialSubIndices).some((s) => s.subIndex !== null) && (
              <div className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-3 py-2 text-[11px] text-[var(--hs-text-secondary)]">
                <span className="font-semibold text-[var(--hs-text-primary)] mr-1.5">{v2.eligibleSubIndicesLabel}:</span>
                {(calculatedAqi?.subIndices ?? partialSubIndices)
                  .filter((s) => s.subIndex !== null)
                  .map((s) => `${s.pollutant}: ${s.subIndex}`)
                  .join(" • ")}
              </div>
            )}

            {/* Nearby Station Discovery / Switch Action */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {alternativeStation && onSelectStation && (
                <button
                  type="button"
                  onClick={() => onSelectStation(alternativeStation)}
                  className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-[var(--hs-accent)] px-3 py-1.5 text-xs font-bold text-[var(--hs-accent-text)] hover:opacity-90 transition"
                >
                  <span>
                    {v2.tryNearbyLabel}: {alternativeStation.name}
                    {alternativeStation.distanceKm !== undefined ? ` (${alternativeStation.distanceKm} km)` : ""}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
              {alternativeStation && (
                <span className="text-[11px] text-[var(--hs-text-secondary)]">
                  {alternativeStation.providerId === "CPCB_CAAQMS" ? "CPCB" : "OpenAQ"} •{" "}
                  {alternativeStation.availablePollutants.length} pollutant(s)
                  {alternativeStation.lastReportedAt
                    ? ` • Nearby Obs: ${formatIstTime(alternativeStation.lastReportedAt)}`
                    : ""}
                </span>
              )}
              {onExploreStations && (
                <button
                  type="button"
                  onClick={onExploreStations}
                  className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--hs-text-primary)] hover:border-[var(--hs-accent)] transition"
                >
                  <span>{v2.exploreOtherStationsLabel}</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="text-left lg:text-right lg:self-end shrink-0 space-y-1">
          {hasCalculatedAqi && aqiStatus === "AVAILABLE" && (
            <p className="text-xs font-medium text-[var(--hs-text-secondary)]">{statusMessage}</p>
          )}
          {latestObservationTime && (
            <p className="text-[11px] text-[var(--hs-text-secondary)] opacity-90">
              {t.lastUpdated}: {formatIstFull(latestObservationTime)}
            </p>
          )}
          {retrievalTime && (
            <p className="text-[10px] text-[var(--hs-text-secondary)] opacity-75">
              Retrieved: {formatIstTime(retrievalTime)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
