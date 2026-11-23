// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState } from "react";
import { Home, AlertCircle, Fan, Wind, Flame } from "lucide-react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import { calculateRoomFiltrationRequirements } from "@/domain/indoor/filtration-calculator";
import type { IndoorHazardAssessment } from "@/domain/indoor/source-control";
import type { VentilationWindowDecision } from "@/domain/indoor/ventilation-decision";
import type { CpcbCategory } from "@/schemas/cpcb.schema";

export interface IndoorCoachPanelProps {
  readonly language: SupportedLanguage;
  readonly aqiCategory: CpcbCategory;
  readonly hazardAssessment?: IndoorHazardAssessment | null;
  readonly ventilationGuidance?: VentilationWindowDecision | null;
}

export const IndoorCoachPanel: React.FC<IndoorCoachPanelProps> = ({
  language,
  aqiCategory: _aqiCategory,
  hazardAssessment,
  ventilationGuidance
}) => {
  const t = TRANSLATIONS[language];
  const [roomLength] = useState<number>(5);
  const [roomWidth] = useState<number>(4);
  const [roomHeight] = useState<number>(2.8);

  const calculatedPurifier = calculateRoomFiltrationRequirements({
    roomLengthMeters: roomLength,
    roomWidthMeters: roomWidth,
    roomHeightMeters: roomHeight,
    targetAirChangesPerHour: 4.5
  });

  return (
    <section aria-labelledby="indoor-coach-heading" className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center space-x-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
          <Home className="h-4 w-4" />
        </div>
        <div>
          <h3 id="indoor-coach-heading" className="text-base font-bold text-white">
            {t.indoorCoachTitle}
          </h3>
          <p className="text-xs text-slate-400">
            Source control, natural ventilation windows, and mechanical air filtration
          </p>
        </div>
      </div>

      {/* Sensor Disclaimer Alert */}
      <div className="mt-4 flex items-start space-x-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p className="leading-relaxed">{t.indoorCoachWarning}</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Ventilation Guidance */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center space-x-2 text-teal-400">
            <Wind className="h-4 w-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Natural Ventilation</h4>
          </div>
          <div className="mt-3">
            <span
              className={`rounded px-2 py-0.5 text-xs font-bold ${
                ventilationGuidance?.windowAction === "KEEP_SEALED"
                  ? "bg-rose-500/20 text-rose-300"
                  : ventilationGuidance?.windowAction === "OPEN_CROSS_VENTILATION"
                    ? "bg-teal-500/20 text-teal-300"
                    : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {ventilationGuidance?.windowAction || "OPEN_CROSS_VENTILATION"}
            </span>
            <p className="mt-2 text-xs text-slate-300">
              {ventilationGuidance?.practicalMethod || "Inspect outdoor visibility; open windows during midday for cross ventilation."}
            </p>
          </div>
        </div>

        {/* Source Control */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center space-x-2 text-rose-400">
            <Flame className="h-4 w-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Indoor Source Control</h4>
          </div>
          <div className="mt-3 space-y-1.5">
            {hazardAssessment && hazardAssessment.mitigationRecommendations.length > 0 ? (
              hazardAssessment.mitigationRecommendations.slice(0, 2).map((m, idx) => (
                <p key={idx} className="text-xs text-slate-300">
                  • {m}
                </p>
              ))
            ) : (
              <p className="text-xs text-slate-400">
                Avoid indoor agarbatti (incense), mosquito coils, or unvented biomass cooking during poor air quality.
              </p>
            )}
          </div>
        </div>

        {/* Air Purifier CADR Planner */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center space-x-2 text-indigo-400">
            <Fan className="h-4 w-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Air Purifier Planner</h4>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Dimensions: {roomLength}x{roomWidth}x{roomHeight} m</span>
              <span className="text-slate-400">Vol: {calculatedPurifier.roomVolumeM3} m³</span>
            </div>

            <div className="rounded-lg bg-slate-900 p-2.5 text-xs text-slate-200">
              <div className="flex justify-between">
                <span>Required CADR:</span>
                <span className="font-bold text-teal-400">{calculatedPurifier.requiredCadrM3H} m³/h</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Required CFM:</span>
                <span className="font-semibold text-white">{calculatedPurifier.requiredCadrCfm} CFM</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">{calculatedPurifier.filterTypeGuidance}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
