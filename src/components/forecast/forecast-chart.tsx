// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useMemo, useState } from "react";
import { Info, Table2 } from "lucide-react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import type { NormalizedForecast } from "@/schemas/providers/normalized-provider.schema";

export interface ForecastChartProps {
  readonly language: SupportedLanguage;
  readonly forecast: readonly NormalizedForecast[];
  readonly modelDomain?: string;
  readonly spatialResolutionKm?: number;
  readonly timeZone?: string;
  readonly isLoading?: boolean;
}

export interface NormalizedForecastBarPoint {
  readonly id: string;
  readonly validTimeUtc: string;
  readonly timestampMs: number;
  readonly value: number;
  readonly unit: string;
  readonly retrievalTime: string;
  readonly localTimeLabel: string;
  readonly localDateTimeLabel: string;
  readonly leadHours: number;
  readonly cadenceHours: number;
}

export interface NormalizedForecastSeries {
  readonly points: readonly NormalizedForecastBarPoint[];
  readonly cadenceHours: number;
  readonly cadenceLabel: string;
  readonly horizonHours: number;
  readonly horizonLabel: string;
  readonly yMax: number;
  readonly timeZone: string;
  readonly missingCount: number;
  readonly unavailableLabels: readonly string[];
}

function formatLocalTime(ms: number, timeZone: string, withDate: boolean): string {
  try {
    const d = new Date(ms);
    if (withDate) {
      return d.toLocaleString("en-IN", {
        timeZone,
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    return d.toLocaleTimeString("en-IN", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return new Date(ms).toISOString().slice(11, 16);
  }
}

export function normalizePm25Forecast(
  forecast: readonly NormalizedForecast[],
  timeZone: string = "Asia/Kolkata"
): NormalizedForecastSeries {
  const validByTime = new Map<string, NormalizedForecast>();
  const unavailableSet = new Set<string>();
  let missingCount = 0;

  for (const item of forecast) {
    const ts = Date.parse(item.validTime);
    if (item.pollutant !== "PM2.5" || !Number.isFinite(ts) || !Number.isFinite(item.forecastValue) || item.forecastValue < 0) {
      missingCount += 1;
      if (Number.isFinite(ts)) {
        unavailableSet.add(new Date(ts).toISOString().slice(11, 16) + " UTC");
      }
      continue;
    }
    validByTime.set(new Date(ts).toISOString(), item);
  }

  const sorted = Array.from(validByTime.entries())
    .map(([iso, item]) => ({ iso, ts: Date.parse(iso), item }))
    .sort((a, b) => a.ts - b.ts);

  if (sorted.length === 0) {
    return {
      points: [],
      cadenceHours: 1,
      cadenceLabel: "Unavailable",
      horizonHours: 0,
      horizonLabel: "Unavailable",
      yMax: 100,
      timeZone,
      missingCount,
      unavailableLabels: Array.from(unavailableSet),
    };
  }

  let cadenceHours = sorted[0]!.item.temporalResolutionHours || 1;
  if (sorted.length >= 2) {
    const diffs = sorted
      .slice(1)
      .map((cur, idx) => Math.max(1, Math.round((cur.ts - sorted[idx]!.ts) / 3600_000)))
      .sort((a, b) => a - b);
    cadenceHours = diffs[Math.floor(diffs.length / 2)]!;
  }

  const firstTs = sorted[0]!.ts;
  const lastTs = sorted[sorted.length - 1]!.ts;
  const horizonHours = Math.max(cadenceHours, Math.round((lastTs - firstTs) / 3600_000) + cadenceHours);
  const cadenceLabel = cadenceHours === 1 ? "1-hourly" : `${cadenceHours}-hourly`;
  const horizonLabel = `Next ${horizonHours}h (${sorted.length} ${cadenceLabel} intervals)`;

  const points: NormalizedForecastBarPoint[] = sorted.map(({ iso, ts, item }) => ({
    id: item.id,
    validTimeUtc: iso,
    timestampMs: ts,
    value: item.forecastValue,
    unit: item.unit || "µg/m³",
    retrievalTime: item.retrievalTime,
    localTimeLabel: formatLocalTime(ts, timeZone, false),
    localDateTimeLabel: `${formatLocalTime(ts, timeZone, true)} (${timeZone === "Asia/Kolkata" ? "IST" : timeZone})`,
    leadHours: Math.round((ts - firstTs) / 3600_000),
    cadenceHours,
  }));

  const maxVal = Math.max(...points.map((p) => p.value), 0);
  const yMax = Math.max(50, Math.ceil(maxVal / 25) * 25);

  return {
    points,
    cadenceHours,
    cadenceLabel,
    horizonHours,
    horizonLabel,
    yMax,
    timeZone,
    missingCount,
    unavailableLabels: Array.from(unavailableSet),
  };
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  language,
  forecast,
  modelDomain = "cams_global",
  spatialResolutionKm = 45,
  timeZone = "Asia/Kolkata",
  isLoading = false,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS["en-IN"];
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const series = useMemo(() => normalizePm25Forecast(forecast, timeZone), [forecast, timeZone]);
  const activePoint = series.points[selectedIdx] ?? series.points[0] ?? null;

  return (
    <section
      aria-labelledby="forecast-heading"
      className="hs-card mt-8 scroll-mt-24 rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-5 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="forecast-heading" className="text-base font-bold text-[var(--hs-text-primary)]">
              {t.forecastTitle}
            </h3>
            <span className="rounded-full border border-[var(--hs-border-subtle)] bg-[var(--hs-info-bg)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--hs-accent-blue)]">
              Type D: Model Forecast
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--hs-text-secondary)]">
            {t.forecastSubtitle} (~{spatialResolutionKm} km grid, {series.points.length > 0 ? (series.cadenceHours === 1 ? "1-hourly interpolated output from native 3-hourly CAMS Global regional assimilation model" : `${series.cadenceLabel} CAMS Global regional dispersion model`) : "regional dispersion model"} — separate from ground station readings)
          </p>
        </div>

        <span className="hs-tabular shrink-0 rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-2.5 py-1 text-xs font-medium text-[var(--hs-text-primary)]">
          Horizon: {series.horizonLabel}
        </span>
      </div>

      {isLoading ? (
        <div role="status" className="py-10 text-center text-xs text-[var(--hs-text-secondary)]">
          Loading CAMS atmospheric forecast...
        </div>
      ) : series.points.length === 0 ? (
        <div className="py-8 text-center text-xs text-[var(--hs-text-secondary)] space-y-1">
          <p>Atmospheric forecast data is currently unavailable for this region.</p>
          {series.unavailableLabels.length > 0 && (
            <p className="text-[11px] hs-tabular">
              PM2.5 unavailable for interval(s): {series.unavailableLabels.join(", ")} (no zero values fabricated).
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {/* Interactive Tooltip / Point Inspector */}
          {activePoint && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-info-bg)] px-3.5 py-2.5 text-xs"
            >
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0 text-[var(--hs-accent-blue)]" />
                <span className="font-semibold text-[var(--hs-text-primary)] hs-tabular">
                  {activePoint.localDateTimeLabel}: {activePoint.value} {activePoint.unit} PM2.5
                </span>
                <span className="text-[11px] text-[var(--hs-text-secondary)] hs-tabular">
                  (Lead +{activePoint.leadHours}h • {series.cadenceLabel})
                </span>
              </div>
              <span className="text-[11px] text-[var(--hs-text-secondary)]">
                Modelled forecast only (not measured ground-station air)
              </span>
            </div>
          )}

          {/* Responsive Bar Chart with Fixed-Height Plot Track */}
          <div className="relative rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-3 sm:p-4">
            <div className="flex gap-2">
              {/* Y-Axis Scale (0 to yMax µg/m³) */}
              <div className="flex h-44 flex-col justify-between pb-6 pr-2 text-right text-[10px] font-medium text-[var(--hs-text-secondary)] hs-tabular">
                <span>{series.yMax}</span>
                <span>{Math.round(series.yMax * 0.5)}</span>
                <span>0 µg/m³</span>
              </div>

              {/* Scrollable Bars Plot Grid */}
              <div className="relative flex-1 overflow-x-auto pb-1">
                <div className="relative flex h-44 min-w-full items-stretch gap-1.5 border-b border-l border-[var(--hs-border-strong)] px-2 pt-2">
                  {/* Subtle Horizontal Gridlines */}
                  <div className="pointer-events-none absolute inset-x-0 top-2 bottom-6 flex flex-col justify-between opacity-30">
                    <div className="border-t border-dashed border-[var(--hs-border-strong)]" />
                    <div className="border-t border-dashed border-[var(--hs-border-strong)]" />
                    <div />
                  </div>

                  {series.points.map((pt, idx) => {
                    const barHeightPct = pt.value === 0 ? 0 : Math.min(100, Math.max(4, (pt.value / series.yMax) * 100));
                    const isSelected = idx === selectedIdx;
                    const hideMobileTick = series.points.length > 12 && idx % 2 === 1;

                    return (
                      <div key={pt.id} className="relative z-10 flex h-full min-w-[28px] flex-1 flex-col items-center">
                        <span className="mb-1 text-[10px] font-semibold text-[var(--hs-text-primary)] hs-tabular">
                          {Math.round(pt.value)}
                        </span>
                        <div className="flex w-full flex-1 items-end justify-center px-0.5">
                          <button
                            type="button"
                            onClick={() => setSelectedIdx(idx)}
                            onMouseEnter={() => setSelectedIdx(idx)}
                            onFocus={() => setSelectedIdx(idx)}
                            aria-label={`PM2.5 forecast ${pt.value} ${pt.unit} at ${pt.localDateTimeLabel}`}
                            title={`PM2.5: ${pt.value} ${pt.unit} at ${pt.localDateTimeLabel} (${modelDomain})`}
                            style={{ height: `${barHeightPct}%` }}
                            className={`w-full max-w-[28px] rounded-t transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hs-focus-ring)] ${
                              isSelected
                                ? "bg-[var(--hs-accent)] ring-1 ring-[var(--hs-focus-ring)]"
                                : "bg-[var(--hs-accent-blue)] hover:opacity-90"
                            }`}
                          />
                        </div>
                        <span
                          className={`mt-1.5 text-[9px] text-[var(--hs-text-secondary)] hs-tabular ${
                            hideMobileTick ? "hidden sm:inline" : "inline"
                          }`}
                        >
                          {pt.localTimeLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Accessible Textual Data Table Fallback */}
          <details className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3.5 py-2 text-xs">
            <summary className="flex cursor-pointer items-center gap-1.5 font-semibold text-[var(--hs-text-primary)]">
              <Table2 className="h-3.5 w-3.5 text-[var(--hs-accent-blue)]" />
              <span>View Accessible Forecast Data Table ({series.points.length} intervals)</span>
            </summary>
            <div className="mt-2 max-h-48 overflow-auto">
              <table className="min-w-full border-collapse text-left text-[11px] hs-tabular">
                <thead>
                  <tr className="border-b border-[var(--hs-border-subtle)] text-[var(--hs-text-secondary)]">
                    <th className="py-1 pr-3">Local Time ({series.timeZone})</th>
                    <th className="py-1 pr-3">Provider UTC</th>
                    <th className="py-1 pr-3">PM2.5 ({series.points[0]!.unit})</th>
                    <th className="py-1">Lead</th>
                  </tr>
                </thead>
                <tbody>
                  {series.points.map((pt) => (
                    <tr key={pt.id} className="border-b border-[var(--hs-border-subtle)]/50 text-[var(--hs-text-primary)]">
                      <td className="py-1 pr-3">{pt.localDateTimeLabel}</td>
                      <td className="py-1 pr-3 font-mono text-[10px] text-[var(--hs-text-secondary)]">{pt.validTimeUtc}</td>
                      <td className="py-1 pr-3 font-semibold">{pt.value}</td>
                      <td className="py-1">+{pt.leadHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--hs-border-subtle)] pt-3 text-xs text-[var(--hs-text-secondary)]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center space-x-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded bg-[var(--hs-accent-blue)]" />
                <span className="font-medium text-[var(--hs-text-primary)]">Forecasted PM2.5 (µg/m³)</span>
              </span>
              <span>Domain: {modelDomain}</span>
              <span>Timezone: {series.timeZone}</span>
            </div>

            <p className="text-[11px] text-[var(--hs-text-secondary)]">
              Copernicus Atmosphere Monitoring Service (CAMS) under CC BY 4.0
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
