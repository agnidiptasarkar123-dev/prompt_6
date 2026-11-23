// SPDX-License-Identifier: Apache-2.0
"use client";

import React from "react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import type { NormalizedObservation, PollutantType } from "@/schemas/providers/normalized-provider.schema";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";

export interface PollutantGridProps {
  readonly language: SupportedLanguage;
  readonly observations: readonly NormalizedObservation[];
  readonly calculatedAqi: CpcbAqiResult | null;
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

export const PollutantGrid: React.FC<PollutantGridProps> = ({
  language,
  observations,
  calculatedAqi
}) => {
  const t = TRANSLATIONS[language];

  const obsMap = new Map<PollutantType, NormalizedObservation>();
  for (const obs of observations) {
    if (!obsMap.has(obs.pollutant)) {
      obsMap.set(obs.pollutant, obs);
    }
  }

  return (
    <section aria-labelledby="pollutants-heading" className="mt-8">
      <div className="flex items-center justify-between">
        <h3 id="pollutants-heading" className="text-lg font-bold text-white">
          {t.pollutantBreakdownTitle}
        </h3>
        <span className="text-xs text-slate-400">CPCB NAQI (2014) Parameters</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        {ALL_POLLUTANTS.map((item) => {
          const obs = obsMap.get(item.id);
          const subIndexObj = calculatedAqi?.subIndices.find((s) => s.pollutant === item.id);
          const subIndex = subIndexObj?.subIndex;
          const isProminent = calculatedAqi?.prominentPollutant === item.id;

          return (
            <div
              key={item.id}
              className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                isProminent ? "ring-2 ring-rose-500/50 " : ""
              }${
                obs
                  ? "border-slate-800 bg-slate-900/90 hover:border-slate-700"
                  : "border-slate-900/60 bg-slate-950/40 opacity-50"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{item.name}</span>
                  <span className="text-[10px] font-semibold text-slate-400">{item.formula}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500">CPCB Window: {item.standardWindow}</p>
              </div>

              <div className="mt-4">
                {obs ? (
                  <div>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-2xl font-extrabold text-white">
                        {typeof obs.value === "number"
                          ? Number.isInteger(obs.value)
                            ? obs.value
                            : obs.value.toFixed(1)
                          : obs.value}
                      </span>
                      <span className="text-xs text-slate-400">{obs.unit}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
                        Avg: {obs.averagingPeriod}
                      </span>
                      {subIndex !== undefined && subIndex !== null ? (
                        <span className="font-semibold text-teal-400">Sub-Index: {subIndex}</span>
                      ) : (
                        <span className="text-slate-500">Sub-Index: N/A</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-2 text-center text-xs text-slate-500">Not Monitored</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
