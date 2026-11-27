// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState, useMemo } from "react";
import { Radio, CheckCircle2, ArrowRightLeft } from "lucide-react";
import type { NormalizedStation, PollutantType } from "@/schemas/providers/normalized-provider.schema";
import type { SupportedLanguage } from "@/i18n/translations";
import { getV2UiStrings } from "@/i18n/v2-translations";

export interface StationComparisonProps {
  readonly stations: readonly NormalizedStation[];
  readonly selectedStationId: string | null;
  readonly onSelectStation: (station: NormalizedStation) => void;
  readonly language: SupportedLanguage;
}

export const StationComparison: React.FC<StationComparisonProps> = ({
  stations,
  selectedStationId,
  onSelectStation,
  language
}) => {
  const { strings: v2 } = getV2UiStrings(language);
  const [comparedIds, setComparedIds] = useState<string[]>(() =>
    stations.slice(0, 3).map((s) => s.id)
  );

  const toggleStation = (id: string) => {
    setComparedIds((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((x) => x !== id) : prev;
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const comparedStations = useMemo(() => {
    const matched = stations.filter((s) => comparedIds.includes(s.id));
    return matched.length > 0 ? matched : stations.slice(0, 3);
  }, [stations, comparedIds]);

  const allPollutants: readonly PollutantType[] = ["PM2.5", "PM10", "NO2", "SO2", "CO", "O3", "NH3"];

  return (
    <section
      aria-labelledby="station-comparison-heading"
      className="hs-card rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--hs-border-subtle)] pb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--hs-accent)]/15 text-[var(--hs-accent)]">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="station-comparison-heading" className="text-base font-bold text-[var(--hs-text-primary)] hs-wrap-safe">
              {v2.comparisonTitle}
            </h2>
            <p className="text-xs text-[var(--hs-text-secondary)]">
              Compare up to 4 stations side-by-side on distance, telemetry coverage, CPCB sufficiency, and upstream license.
            </p>
          </div>
        </div>
      </div>

      {stations.length === 0 ? (
        <div className="mt-6 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-6 text-center text-xs text-[var(--hs-text-secondary)]">
          No monitoring stations discovered yet for this location. Search another Indian city above.
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {stations.slice(0, 12).map((s) => {
              const checked = comparedStations.some((c) => c.id === s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleStation(s.id)}
                  aria-pressed={checked}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    checked
                      ? "border-[var(--hs-accent)] bg-[var(--hs-accent)]/15 text-[var(--hs-accent)] font-semibold"
                      : "border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] text-[var(--hs-text-secondary)]"
                  }`}
                >
                  <Radio className="h-3 w-3" />
                  <span className="max-w-[180px] truncate">{s.name}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--hs-border-subtle)]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] text-[11px] uppercase text-[var(--hs-text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Metric</th>
                  {comparedStations.map((st) => (
                    <th key={st.id} className="px-4 py-3 font-bold text-[var(--hs-text-primary)] min-w-[160px]">
                      <div className="flex flex-col gap-1">
                        <span className="truncate">{st.name}</span>
                        <span className="text-[10px] font-normal text-[var(--hs-text-secondary)]">
                          {st.providerId === "CPCB_CAAQMS" ? "CPCB Official" : "OpenAQ Sensor"}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hs-border-subtle)] text-[var(--hs-text-primary)]">
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-[var(--hs-text-secondary)]">Distance</td>
                  {comparedStations.map((st) => (
                    <td key={st.id} className="px-4 py-2.5">
                      {st.distanceKm !== undefined ? `${st.distanceKm.toFixed(1)} km` : "N/A"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-[var(--hs-text-secondary)]">CPCB NAQI Eligible</td>
                  {comparedStations.map((st) => {
                    const hasPm = st.availablePollutants.includes("PM2.5") || st.availablePollutants.includes("PM10");
                    const eligible = st.availablePollutants.length >= 3 && hasPm;
                    return (
                      <td key={st.id} className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            eligible ? "bg-emerald-500/15 text-[var(--hs-accent)]" : "bg-amber-500/15 text-[var(--hs-accent-amber)]"
                          }`}
                        >
                          {eligible ? "Eligible (≥3 incl. PM)" : "Partial / Raw Only"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-[var(--hs-text-secondary)]">Pollutants Monitored</td>
                  {comparedStations.map((st) => (
                    <td key={st.id} className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {allPollutants.map((p) => (
                          <span
                            key={p}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                              st.availablePollutants.includes(p)
                                ? "bg-[var(--hs-accent)]/15 text-[var(--hs-accent)] font-bold"
                                : "bg-[var(--hs-subtle-bg)] text-[var(--hs-text-secondary)] opacity-50"
                            }`}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-[var(--hs-text-secondary)]">Last Reported (Freshness)</td>
                  {comparedStations.map((st) => (
                    <td key={st.id} className="px-4 py-2.5 text-[11px] text-[var(--hs-text-secondary)]">
                      {st.lastReportedAt ? new Date(st.lastReportedAt).toLocaleString() : "Timestamp Unavailable"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-[var(--hs-text-secondary)]">License &amp; Provenance</td>
                  {comparedStations.map((st) => (
                    <td key={st.id} className="px-4 py-2.5 text-[11px] text-[var(--hs-text-secondary)]">
                      {st.license} • {st.attribution}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-[var(--hs-text-secondary)]">Action</td>
                  {comparedStations.map((st) => {
                    const isActive = st.id === selectedStationId;
                    return (
                      <td key={st.id} className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => onSelectStation(st)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                            isActive
                              ? "bg-emerald-700 text-white"
                              : "bg-[var(--hs-accent)] text-[var(--hs-accent-text)] hover:opacity-90"
                          }`}
                        >
                          {isActive && <CheckCircle2 className="h-3.5 w-3.5" />}
                          <span>{isActive ? "Active Station" : "Select Station"}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};
