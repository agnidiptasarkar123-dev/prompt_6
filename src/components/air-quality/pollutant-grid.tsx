// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import { getV2UiStrings } from "@/i18n/v2-translations";
import type { NormalizedObservation, PollutantType } from "@/schemas/providers/normalized-provider.schema";
import type { CpcbAqiResult, CpcbSubIndex } from "@/schemas/cpcb.schema";

export interface PollutantGridProps {
  readonly language: SupportedLanguage;
  readonly observations: readonly NormalizedObservation[];
  readonly calculatedAqi: CpcbAqiResult | null;
  readonly partialSubIndices?: readonly CpcbSubIndex[];
  readonly providerUnavailable?: boolean;
  readonly stationSelected?: boolean;
}

const ALL_POLLUTANTS: readonly { id: PollutantType; name: string; standardWindow: string; formula: string }[] = [
  { id: "PM2.5", name: "PM2.5", standardWindow: "24-hr", formula: "Particulate < 2.5 µm" },
  { id: "PM10", name: "PM10", standardWindow: "24-hr", formula: "Particulate < 10 µm" },
  { id: "NO2", name: "Nitrogen Dioxide", standardWindow: "24-hr", formula: "NO₂" },
  { id: "SO2", name: "Sulphur Dioxide", standardWindow: "24-hr", formula: "SO₂" },
  { id: "CO", name: "Carbon Monoxide", standardWindow: "8-hr", formula: "CO" },
  { id: "O3", name: "Ozone", standardWindow: "8-hr / 1-hr", formula: "O₃" },
  { id: "NH3", name: "Ammonia", standardWindow: "24-hr", formula: "NH₃" },
  { id: "Pb", name: "Lead", standardWindow: "24-hr", formula: "Pb" }
];

function getQualityBadge(flag: NormalizedObservation["qualityFlag"]) {
  switch (flag) {
    case "VERIFIED":
      return { label: "VERIFIED", cls: "bg-[var(--hs-accent)]/15 text-[var(--hs-accent)] border-[var(--hs-accent)]/30" };
    case "PROVISIONAL":
      return { label: "PROVISIONAL", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30" };
    case "STALE":
      return { label: "STALE (>24h)", cls: "bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/35" };
    default:
      return { label: "SUSPICIOUS", cls: "bg-rose-500/15 text-rose-500 border-rose-500/35" };
  }
}

export const PollutantGrid: React.FC<PollutantGridProps> = ({
  language,
  observations,
  calculatedAqi,
  partialSubIndices = [],
  providerUnavailable = false,
  stationSelected = true
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS["en-IN"];
  const { strings: v2 } = getV2UiStrings(language);

  const obsMap = new Map<PollutantType, NormalizedObservation>();
  const [nowMs] = useState(() => Date.now());
  for (const obs of observations) {
    const prev = obsMap.get(obs.pollutant);
    if (!prev) {
      obsMap.set(obs.pollutant, obs);
      continue;
    }
    const prevMs = new Date(prev.observationTime).getTime();
    const curMs = new Date(obs.observationTime).getTime();
    const prevValid = !isNaN(prevMs) && prevMs - nowMs <= 5 * 60 * 1000 && prev.qualityFlag !== "SUSPICIOUS";
    const curValid = !isNaN(curMs) && curMs - nowMs <= 5 * 60 * 1000 && obs.qualityFlag !== "SUSPICIOUS";
    if ((curValid && !prevValid) || (curValid && prevValid && curMs > prevMs)) {
      obsMap.set(obs.pollutant, obs);
    }
  }

  return (
    <section aria-labelledby="pollutants-heading" className="mt-8">
      <div className="flex items-center justify-between">
        <h3 id="pollutants-heading" className="text-lg font-bold text-[#102A2A]">
          {t.pollutantBreakdownTitle}
        </h3>
        <span className="text-xs font-medium text-[var(--hs-text-secondary)]">
          {!stationSelected
            ? "Select a Monitoring Station • CPCB NAQI (2014) Parameters"
            : providerUnavailable
              ? "Provider Unavailable • CPCB NAQI (2014) Parameters"
              : observations.length > 0
                ? "Type C Raw Observations • CPCB NAQI (2014) Parameters"
                : "No Raw Observations Available • CPCB NAQI (2014) Parameters"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        {ALL_POLLUTANTS.map((item) => {
          const obs = obsMap.get(item.id);
          const subIndexObj = (calculatedAqi?.subIndices ?? partialSubIndices).find((s) => s.pollutant === item.id);
          const subIndex = subIndexObj?.subIndex;
          const isProminent = calculatedAqi?.prominentPollutant === item.id;
          const hasValidUnit = Boolean(obs?.unit);
          const qBadge = obs ? getQualityBadge(obs.qualityFlag) : null;

          return (
            <div
              key={item.id}
              className={`hs-card min-w-0 flex flex-col justify-between rounded-xl border p-4 transition ${
                isProminent ? "ring-2 ring-rose-500/50 " : ""
              }${
                obs
                  ? "border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] hover:border-[var(--hs-accent)] shadow-sm"
                  : "border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#102A2A]">{item.name}</span>
                  <span className="text-[10px] font-semibold text-[#526466]">{item.formula}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-[#526466]">CPCB Window: {item.standardWindow}</p>
              </div>

              <div className="mt-3">
                {obs ? (
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline space-x-1">
                        <span className="text-2xl font-extrabold text-[var(--hs-text-primary)]">
                          {Number.isInteger(obs.value) ? obs.value : obs.value.toFixed(1)}
                        </span>
                        <span className="text-xs font-medium text-[var(--hs-text-secondary)]">
                          {hasValidUnit ? obs.unit : "unit unverified"}
                        </span>
                      </div>
                      {qBadge && (
                        <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${qBadge.cls}`}>
                          {qBadge.label}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                      <span className="rounded bg-[var(--hs-subtle-bg)] border border-[var(--hs-border-subtle)] px-1.5 py-0.5 text-[var(--hs-text-secondary)] font-medium">
                        Avg: {obs.averagingPeriod}
                      </span>
                      {subIndex !== undefined && subIndex !== null ? (
                        <span className="font-semibold text-[var(--hs-accent)]">Sub-Index: {subIndex}</span>
                      ) : (
                        <span className="text-[var(--hs-text-secondary)]">Sub-Index: N/A</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1 border-t border-[var(--hs-border-subtle)] pt-1.5 text-[10px] text-[var(--hs-text-secondary)]">
                      <span className="truncate font-medium">{obs.providerId === "CPCB_CAAQMS" ? "CPCB" : "OpenAQ"}</span>
                      <span className="inline-flex items-center gap-1 shrink-0">
                        <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                        {new Date(obs.observationTime).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Kolkata"
                        })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-2 text-center text-xs font-medium text-[var(--hs-text-secondary)]">
                    {providerUnavailable ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3" />
                        Provider Unavailable
                      </span>
                    ) : !stationSelected ? (
                      "No Station Selected"
                    ) : (
                      v2.notMonitoredLabel
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
