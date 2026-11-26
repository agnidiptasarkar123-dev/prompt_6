// SPDX-License-Identifier: Apache-2.0
"use client";

import React from "react";
import { TrendingUp, Database, Radio, Info } from "lucide-react";
import type { SupportedLanguage } from "@/i18n/translations";
import { getV2UiStrings } from "@/i18n/v2-translations";
import type {
  NormalizedStation,
  NormalizedObservation,
  NormalizedForecast,
  PollutantType
} from "@/schemas/providers/normalized-provider.schema";
import { ForecastChart } from "@/components/forecast/forecast-chart";

export interface InsightsWorkspaceProps {
  readonly language: SupportedLanguage;
  readonly stations: readonly NormalizedStation[];
  readonly selectedStation: NormalizedStation | null;
  readonly observations: readonly NormalizedObservation[];
  readonly forecast: readonly NormalizedForecast[];
}

export const InsightsWorkspace: React.FC<InsightsWorkspaceProps> = ({
  language,
  stations,
  selectedStation,
  observations,
  forecast
}) => {
  const { strings: v2 } = getV2UiStrings(language);

  const cpcbCount = stations.filter((s) => s.providerId === "CPCB_CAAQMS").length;
  const openaqCount = stations.filter((s) => s.providerId === "OPENAQ").length;
  const eligibleCount = stations.filter(
    (s) =>
      s.availablePollutants.length >= 3 &&
      (s.availablePollutants.includes("PM2.5") || s.availablePollutants.includes("PM10"))
  ).length;

  const trackedPollutants: readonly PollutantType[] = ["PM2.5", "PM10", "NO2", "SO2", "CO", "O3", "NH3"];

  return (
    <section aria-labelledby="insights-heading" className="space-y-6">
      <div className="hs-card rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 border-b border-[var(--hs-border-subtle)] pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--hs-accent)]/15 text-[var(--hs-accent)]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="insights-heading" className="text-base font-bold text-[var(--hs-text-primary)] hs-wrap-safe">
              {v2.insightsTitle}
            </h2>
            <p className="text-xs text-[var(--hs-text-secondary)]">{v2.insightsSubtitle}</p>
          </div>
        </div>

        {/* City Coverage Metrics */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[var(--hs-info-border)] bg-[var(--hs-info-bg)] p-4">
            <p className="text-[11px] font-semibold uppercase text-[var(--hs-accent-blue)]">Discovered Stations</p>
            <p className="mt-1 text-2xl font-extrabold text-[var(--hs-text-primary)] hs-tabular">{stations.length}</p>
            <p className="text-[11px] text-[var(--hs-text-secondary)]">
              {cpcbCount} CPCB Official • {openaqCount} OpenAQ
            </p>
          </div>
          <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4">
            <p className="text-[11px] font-semibold uppercase text-[var(--hs-accent)]">CPCB NAQI Eligible</p>
            <p className="mt-1 text-2xl font-extrabold text-[var(--hs-accent)] hs-tabular">{eligibleCount}</p>
            <p className="text-[11px] text-[var(--hs-text-secondary)]">Stations meeting ≥3 pollutant rule</p>
          </div>
          <div className="rounded-xl border border-[var(--hs-warm-border)] bg-[var(--hs-warm-bg)] p-4">
            <p className="text-[11px] font-semibold uppercase text-[var(--hs-accent-amber)]">Active Measurements</p>
            <p className="mt-1 text-2xl font-extrabold text-[var(--hs-text-primary)] hs-tabular">{observations.length}</p>
            <p className="text-[11px] text-[var(--hs-text-secondary)]">
              Selected: {selectedStation?.name || "None"}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--hs-learn-border)] bg-[var(--hs-learn-bg)] p-4">
            <p className="text-[11px] font-semibold uppercase text-[var(--hs-accent-violet)]">CAMS Grid Outlook</p>
            <p className="mt-1 text-2xl font-extrabold text-[var(--hs-accent-violet)] hs-tabular">{forecast.length}</p>
            <p className="text-[11px] text-[var(--hs-text-secondary)]">Type D ~45 km forecast points</p>
          </div>
        </div>

        {/* Network Parameter Availability Breakdown */}
        <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4">
          <h3 className="text-xs font-bold text-[var(--hs-text-primary)] flex items-center gap-1.5 mb-3">
            <Database className="h-4 w-4 text-[var(--hs-accent)]" />
            <span>Parameter Coverage Across Nearby Stations</span>
          </h3>
          <div className="space-y-2.5">
            {trackedPollutants.map((pol) => {
              const count = stations.filter((s) => s.availablePollutants.includes(pol)).length;
              const pct = stations.length > 0 ? Math.round((count / stations.length) * 100) : 0;
              return (
                <div key={pol} className="flex items-center gap-3 text-xs">
                  <span className="w-14 font-mono font-bold text-[var(--hs-text-primary)]">{pol}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-[var(--hs-surface-bg)] overflow-hidden border border-[var(--hs-border-subtle)]">
                    <div
                      className="h-full bg-[var(--hs-accent)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-24 text-right text-[11px] text-[var(--hs-text-secondary)]">
                    {count}/{stations.length} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-3.5 text-[11px] text-[var(--hs-text-secondary)]">
            <Info className="h-4 w-4 shrink-0 text-[var(--hs-accent)] mt-0.5" />
            <div>
              <p className="font-bold text-[var(--hs-text-primary)] mb-0.5">City Coverage &amp; Non-Averaging Policy</p>
              <span>
                <Radio className="mr-1 inline h-3 w-3" />
                {eligibleCount}/{stations.length} stations meet CPCB 3-pollutant + PM sufficiency. HawaSaathi never averages incompatible stations into a synthetic city score.
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-3.5 text-[11px] text-[var(--hs-text-secondary)]">
            <Database className="h-4 w-4 shrink-0 text-[var(--hs-accent)] mt-0.5" />
            <div>
              <p className="font-bold text-[var(--hs-text-primary)] mb-0.5">Forecast vs Measured Separation</p>
              <span>
                Modelled CAMS trends (Type D, ~45 km grid) support 24–72h dispersion outlook only and never substitute for missing ground sensor telemetry.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Type D Forecast Chart */}
      <ForecastChart forecast={forecast} language={language} />
    </section>
  );
};
