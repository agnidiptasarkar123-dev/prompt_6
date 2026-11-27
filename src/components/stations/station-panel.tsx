// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState } from "react";
import { ExternalLink } from "lucide-react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import { getV2UiStrings } from "@/i18n/v2-translations";
import type { NormalizedStation } from "@/schemas/providers/normalized-provider.schema";

export interface StationPanelProps {
  readonly language: SupportedLanguage;
  readonly stations: readonly NormalizedStation[];
  readonly selectedStationId: string | null;
  readonly onSelectStation: (station: NormalizedStation) => void;
  readonly onOpenProvenance: (station: NormalizedStation) => void;
}

export const StationPanel: React.FC<StationPanelProps> = ({
  language,
  stations,
  selectedStationId,
  onSelectStation,
  onOpenProvenance
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS["en-IN"];
  const { strings: v2 } = getV2UiStrings(language);
  const [filterProvider, setFilterProvider] = useState<string>("ALL");

  const filtered = stations.filter((s) => {
    if (filterProvider === "ALL") return true;
    return s.providerId === filterProvider;
  });

  const [nowMs] = useState(() => Date.now());
  const MAX_SKEW_MS = 5 * 60 * 1000;
  const freshStationsCount = stations.filter((s) => {
    if (!s.lastReportedAt) return false;
    const ageMs = nowMs - new Date(s.lastReportedAt).getTime();
    return !isNaN(ageMs) && ageMs >= -MAX_SKEW_MS && ageMs <= 24 * 3600 * 1000;
  }).length;
  const getTier = (s: NormalizedStation): number => {
    if (s.availablePollutants.length === 0) return 3;
    if (!s.lastReportedAt) return 2;
    const ageMs = nowMs - new Date(s.lastReportedAt).getTime();
    if (isNaN(ageMs) || ageMs < -MAX_SKEW_MS) return 2;
    if (ageMs <= 48 * 3600 * 1000) return 0; // Active recent sensor
    if (ageMs <= 7 * 24 * 3600 * 1000) return 1;
    return 2; // Archived historical (>7d)
  };
  const sortedFiltered = [...filtered].sort((a, b) => {
    const tierDiff = getTier(a) - getTier(b);
    if (tierDiff !== 0) return tierDiff;
    return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
  });
  const eligibleCoverageCount = stations.filter(
    (s) =>
      s.availablePollutants.length >= 3 &&
      (s.availablePollutants.includes("PM2.5") || s.availablePollutants.includes("PM10"))
  ).length;
  const rawOnlyCount = stations.filter(
    (s) =>
      s.availablePollutants.length > 0 &&
      !(
        s.availablePollutants.length >= 3 &&
        (s.availablePollutants.includes("PM2.5") || s.availablePollutants.includes("PM10"))
      )
  ).length;
  const noReadingCount = stations.filter((s) => s.availablePollutants.length === 0).length;

  return (
    <section aria-labelledby="stations-heading" className="hs-card rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-5 shadow-card-subtle">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="stations-heading" className="text-base font-bold text-[var(--hs-text-primary)]">
            {t.stationPanelTitle}
          </h2>
          <p className="text-xs text-[var(--hs-text-secondary)]">
            {stations.length} stations discovered within radius • {freshStationsCount} fresh (&le;24h) •{" "}
            {eligibleCoverageCount} multi-pollutant PM • {rawOnlyCount} partial raw • {noReadingCount} inactive
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-1">
          {["ALL", "CPCB_CAAQMS", "OPENAQ"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilterProvider(p)}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition ${filterProvider === p
                ? "bg-[var(--hs-accent)] text-[var(--hs-accent-text)] font-bold shadow-xs"
                : "text-[var(--hs-text-secondary)] hover:text-[var(--hs-text-primary)]"
                }`}
            >
              {p === "ALL" ? "All Sources" : p === "CPCB_CAAQMS" ? "CPCB" : "OpenAQ"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
        {sortedFiltered.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--hs-text-secondary)]">
            No monitoring stations found for the selected filter.
          </p>
        ) : (
          sortedFiltered.map((s) => {
            const isSelected = s.id === selectedStationId;
            const repMs = s.lastReportedAt ? new Date(s.lastReportedAt).getTime() : NaN;
            const ageMs = !isNaN(repMs) ? nowMs - repMs : NaN;
            const isArchived = !isNaN(ageMs) && ageMs > 7 * 24 * 3600 * 1000;
            const repLabel = isNaN(repMs)
              ? null
              : isArchived
                ? `Archived (${new Date(repMs).getUTCFullYear()})`
                : `Active ${new Date(repMs).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST`;
            return (
              <div
                key={s.id}
                className={`flex flex-col justify-between rounded-xl border p-3.5 transition sm:flex-row sm:items-center ${isSelected
                  ? "border-[var(--hs-accent)] bg-[var(--hs-subtle-bg)] shadow-xs"
                  : "border-[var(--hs-border-subtle)] bg-[var(--hs-elevated-bg)] hover:border-[var(--hs-accent)]/50"
                  }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-[var(--hs-text-primary)]">{s.name}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${s.providerId === "CPCB_CAAQMS"
                        ? "border-[var(--hs-info-border)] bg-[var(--hs-info-bg)] text-[var(--hs-accent-blue)]"
                        : "border-[var(--hs-learn-border)] bg-[var(--hs-learn-bg)] text-[var(--hs-accent-violet)]"
                        }`}
                    >
                      {s.providerId === "CPCB_CAAQMS" ? "CPCB Official" : "OpenAQ Sensor"}
                    </span>
                    {repLabel && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${isArchived
                          ? "border-[var(--hs-warm-border)] bg-[var(--hs-warm-bg)] text-[var(--hs-accent-amber)]"
                          : "border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] text-[var(--hs-accent)]"
                          }`}
                      >
                        {repLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 text-xs text-[var(--hs-text-secondary)]">
                    <span>
                      {s.city}, {s.state}
                    </span>
                    {s.distanceKm !== undefined && (
                      <span className="text-[var(--hs-accent)] font-semibold">
                        {t.distance}: {s.distanceKm} km
                      </span>
                    )}
                    <code className="text-[10px] text-[var(--hs-text-secondary)]">{s.id}</code>
                    <span>Pollutants: {s.availablePollutants?.join(", ") || "N/A"}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center space-x-2 sm:mt-0">
                  <button
                    type="button"
                    onClick={() => onSelectStation(s)}
                    className={`min-h-[32px] rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isSelected
                      ? "bg-[var(--hs-accent)] text-[var(--hs-accent-text)] font-bold shadow-xs"
                      : "border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] text-[var(--hs-text-primary)] hover:bg-[var(--hs-subtle-bg)]"
                      }`}
                  >
                    {isSelected ? v2.activeStationLabel : v2.selectStationLabel}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenProvenance(s)}
                    aria-label={`View provenance for ${s.name}`}
                    className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-1.5 text-[var(--hs-text-secondary)] hover:text-[var(--hs-text-primary)]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
