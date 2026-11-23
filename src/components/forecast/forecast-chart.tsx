// SPDX-License-Identifier: Apache-2.0
"use client";

import React from "react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import type { NormalizedForecast } from "@/schemas/providers/normalized-provider.schema";

export interface ForecastChartProps {
  readonly language: SupportedLanguage;
  readonly forecast: readonly NormalizedForecast[];
  readonly modelDomain?: string;
  readonly spatialResolutionKm?: number;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  language,
  forecast,
  modelDomain = "cams_global",
  spatialResolutionKm = 45
}) => {
  const t = TRANSLATIONS[language];

  // Filter PM2.5 points sorted by validTime
  const pm25Points = forecast.filter((f) => f.pollutant === "PM2.5");

  const timelineTimes = Array.from(new Set(forecast.map((f) => f.validTime))).slice(0, 24);

  const maxVal = Math.max(
    ...forecast.map((f) => f.forecastValue),
    100
  );

  return (
    <section aria-labelledby="forecast-heading" className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h3 id="forecast-heading" className="text-base font-bold text-white">
              {t.forecastTitle}
            </h3>
            <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-bold text-teal-400 ring-1 ring-teal-500/20">
              Type D: Model Forecast
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {t.forecastSubtitle} (~{spatialResolutionKm} km grid, 3-hourly underlying model)
          </p>
        </div>

        <span className="text-xs text-slate-400">Horizon: Next 24-72 Hours</span>
      </div>

      {timelineTimes.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-500">
          Atmospheric forecast data is currently unavailable for this region.
        </p>
      ) : (
        <div className="mt-6">
          {/* Simple responsive bar/timeline representation */}
          <div className="flex h-36 items-end gap-1.5 overflow-x-auto pb-2">
            {timelineTimes.map((timeStr) => {
              const pm25 = pm25Points.find((p) => p.validTime === timeStr);

              const val25 = pm25 ? pm25.forecastValue : 0;
              const heightPct = Math.min(100, Math.max(10, (val25 / maxVal) * 100));

              const dateObj = new Date(timeStr);
              const hourLabel = `${dateObj.getUTCHours()}:00`;

              return (
                <div key={timeStr} className="flex min-w-[36px] flex-1 flex-col items-center">
                  <span className="text-[10px] font-semibold text-slate-300">{Math.round(val25)}</span>
                  <div
                    className="mt-1 w-full rounded-t bg-teal-500/80 transition hover:bg-teal-400"
                    style={{ height: `${heightPct}%` }}
                    title={`PM2.5: ${val25} µg/m³ at ${dateObj.toUTCString()}`}
                  />
                  <span className="mt-1.5 text-[9px] text-slate-500">{hourLabel}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded bg-teal-500" />
                <span>Forecasted PM2.5 (µg/m³)</span>
              </span>
              <span className="text-slate-500">Domain: {modelDomain}</span>
            </div>

            <p className="text-[11px] text-slate-500">
              Copernicus Atmosphere Monitoring Service (CAMS) under CC BY 4.0
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
