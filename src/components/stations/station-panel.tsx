// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState } from "react";
import { ExternalLink } from "lucide-react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
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
  const t = TRANSLATIONS[language];
  const [filterProvider, setFilterProvider] = useState<string>("ALL");

  const filtered = stations.filter((s) => {
    if (filterProvider === "ALL") return true;
    return s.providerId === filterProvider;
  });

  return (
    <section aria-labelledby="stations-heading" className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 id="stations-heading" className="text-base font-bold text-white">
            {t.stationPanelTitle}
          </h3>
          <p className="text-xs text-slate-400">
            {stations.length} stations discovered within radius
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
          {["ALL", "CPCB_CAAQMS", "OPENAQ"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilterProvider(p)}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                filterProvider === p
                  ? "bg-teal-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {p === "ALL" ? "All Sources" : p === "CPCB_CAAQMS" ? "CPCB" : "OpenAQ"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">
            No monitoring stations found for the selected filter.
          </p>
        ) : (
          filtered.map((s) => {
            const isSelected = s.id === selectedStationId;
            return (
              <div
                key={s.id}
                className={`flex flex-col justify-between rounded-xl border p-3.5 transition sm:flex-row sm:items-center ${
                  isSelected
                    ? "border-teal-500/50 bg-teal-500/10"
                    : "border-slate-800/80 bg-slate-900/80 hover:border-slate-700"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white">{s.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        s.providerId === "CPCB_CAAQMS"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-purple-500/20 text-purple-300"
                      }`}
                    >
                      {s.providerId === "CPCB_CAAQMS" ? "CPCB Official" : "OpenAQ Sensor"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-400">
                    <span>
                      {s.city}, {s.state}
                    </span>
                    {s.distanceKm !== undefined && (
                      <span className="text-teal-400 font-medium">
                        {t.distance}: {s.distanceKm} km
                      </span>
                    )}
                    <span>Pollutants: {s.availablePollutants?.join(", ") || "N/A"}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center space-x-2 sm:mt-0">
                  <button
                    type="button"
                    onClick={() => onSelectStation(s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? "bg-teal-500 text-slate-950"
                        : "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    {isSelected ? "Active Station" : "Select"}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenProvenance(s)}
                    aria-label={`View provenance for ${s.name}`}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-slate-400 hover:text-white"
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
