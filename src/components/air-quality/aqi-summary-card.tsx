// SPDX-License-Identifier: Apache-2.0
"use client";

import React from "react";
import { AlertTriangle, Info } from "lucide-react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";
import type { NormalizedStation } from "@/schemas/providers/normalized-provider.schema";

export interface AqiSummaryCardProps {
  readonly language: SupportedLanguage;
  readonly station: NormalizedStation | null;
  readonly calculatedAqi: CpcbAqiResult | null;
  readonly aqiStatus: "AVAILABLE" | "AQI_UNAVAILABLE" | "STALE";
  readonly statusMessage: string;
  readonly provider: string;
  readonly lastUpdated?: string;
  readonly onOpenProvenance: () => void;
}

export const AqiSummaryCard: React.FC<AqiSummaryCardProps> = ({
  language,
  station,
  calculatedAqi,
  aqiStatus,
  statusMessage,
  provider,
  lastUpdated,
  onOpenProvenance
}) => {
  const t = TRANSLATIONS[language];

  const getCategoryTheme = (category?: string | null) => {
    switch (category) {
      case "GOOD":
      case "Good":
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          text: "text-emerald-400",
          badgeBg: "bg-emerald-500 text-slate-950",
          label: t.categoryGood
        };
      case "SATISFACTORY":
      case "Satisfactory":
        return {
          bg: "bg-lime-500/10",
          border: "border-lime-500/30",
          text: "text-lime-400",
          badgeBg: "bg-lime-500 text-slate-950",
          label: t.categorySatisfactory
        };
      case "MODERATE":
      case "Moderate":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          text: "text-amber-400",
          badgeBg: "bg-amber-500 text-slate-950",
          label: t.categoryModerate
        };
      case "POOR":
      case "Poor":
        return {
          bg: "bg-orange-500/10",
          border: "border-orange-500/30",
          text: "text-orange-400",
          badgeBg: "bg-orange-500 text-slate-950",
          label: t.categoryPoor
        };
      case "VERY_POOR":
      case "Very Poor":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          text: "text-red-400",
          badgeBg: "bg-red-500 text-slate-950",
          label: t.categoryVeryPoor
        };
      case "SEVERE":
      case "Severe":
        return {
          bg: "bg-rose-950/40",
          border: "border-rose-600/50",
          text: "text-rose-400",
          badgeBg: "bg-rose-600 text-white",
          label: t.categorySevere
        };
      default:
        return {
          bg: "bg-slate-900/50",
          border: "border-slate-800",
          text: "text-slate-400",
          badgeBg: "bg-slate-700 text-slate-200",
          label: "Unavailable"
        };
    }
  };

  const theme = getCategoryTheme(calculatedAqi?.category);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-6 transition shadow-lg ${theme.bg} ${theme.border}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.aqiSummaryTitle}
            </span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
              {provider}
            </span>
            {calculatedAqi ? (
              <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-semibold text-teal-300 ring-1 ring-teal-500/30">
                Type B: CPCB Calculated
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
                Type C: Raw Monitored
              </span>
            )}
          </div>

          <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            {station?.name || "Selected Location"}
          </h2>
          <p className="text-xs text-slate-400">
            {station ? `${station.city}, ${station.state}` : "Discovering nearby stations..."}
          </p>
        </div>

        {/* Provenance Button */}
        <button
          type="button"
          onClick={onOpenProvenance}
          className="inline-flex items-center space-x-1 self-start rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
        >
          <Info className="h-3.5 w-3.5 text-teal-400" />
          <span>{t.provenanceTitle}</span>
        </button>
      </div>

      {/* Main AQI Display */}
      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        {calculatedAqi && aqiStatus === "AVAILABLE" ? (
          <div>
            <div className="flex items-baseline space-x-3">
              <span className="text-6xl font-extrabold tracking-tight text-white">
                {calculatedAqi.overallAqi}
              </span>
              <span className={`rounded-xl px-3 py-1 text-sm font-bold shadow-sm ${theme.badgeBg}`}>
                {theme.label}
              </span>
            </div>
            {calculatedAqi.prominentPollutant && (
              <p className="mt-2 text-xs font-medium text-slate-300">
                {t.prominentPollutant}:{" "}
                <span className="font-bold text-white">{calculatedAqi.prominentPollutant}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-start space-x-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-300">{t.aqiUnavailable}</p>
              <p className="mt-1 text-xs text-slate-300">{t.aqiUnavailableDesc}</p>
            </div>
          </div>
        )}

        <div className="text-right sm:self-end">
          <p className="text-xs text-slate-400">{statusMessage}</p>
          {lastUpdated && (
            <p className="mt-1 text-[11px] text-slate-500">
              {t.lastUpdated}: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
