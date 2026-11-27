// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState } from "react";
import { Home, AlertCircle, Fan, Wind, Flame, Calculator, Wrench } from "lucide-react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import { calculateRoomFiltrationRequirements } from "@/domain/indoor/filtration-calculator";
import { determineVentilationStrategy, type VentilationWindowDecision } from "@/domain/indoor/ventilation-decision";
import type { IndoorHazardAssessment } from "@/domain/indoor/source-control";
import type { CpcbCategory } from "@/schemas/cpcb.schema";

export interface IndoorCoachPanelProps {
  readonly language: SupportedLanguage;
  readonly aqiCategory: CpcbCategory | null;
  readonly hazardAssessment?: IndoorHazardAssessment | null;
  readonly ventilationGuidance?: VentilationWindowDecision | null;
  readonly initialDimensions?: {
    length?: number;
    width?: number;
    height?: number;
    purifierCadr?: number;
  };
}

export const IndoorCoachPanel: React.FC<IndoorCoachPanelProps> = ({
  language,
  aqiCategory,
  hazardAssessment,
  ventilationGuidance,
  initialDimensions
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS["en-IN"];
  const [roomLength, setRoomLength] = useState<number>(initialDimensions?.length ?? 5);
  const [roomWidth, setRoomWidth] = useState<number>(initialDimensions?.width ?? 4);
  const [roomHeight, setRoomHeight] = useState<number>(initialDimensions?.height ?? 2.8);
  const [purifierCadr, setPurifierCadr] = useState<number>(initialDimensions?.purifierCadr ?? 250);
  const [targetAch, setTargetAch] = useState<number>(4.5);

  const calculatedPurifier = calculateRoomFiltrationRequirements({
    roomLengthMeters: Math.max(1, roomLength),
    roomWidthMeters: Math.max(1, roomWidth),
    roomHeightMeters: Math.max(1, roomHeight),
    targetAirChangesPerHour: Math.max(1, targetAch)
  });

  const roomVolumeM3 = Math.round(roomLength * roomWidth * roomHeight * 10) / 10;
  const estimatedAch = roomVolumeM3 > 0 ? Math.round((purifierCadr / roomVolumeM3) * 10) / 10 : 0;

  // Determine honest ventilation strategy using nullable aqiCategory (never defaults to MODERATE when null)
  const resolvedVentilation =
    ventilationGuidance ||
    determineVentilationStrategy(aqiCategory, {
      dwellingType: "APARTMENT_LOW_RISE",
      floorLevel: 2,
      proximityToMajorRoadMeters: 100,
      cooking: {
        primaryFuel: "LPG",
        kitchenVentilation: "KITCHEN_HOOD_CHIMNEY",
        averageDailyCookingHours: 2
      },
      indoorSources: {
        incenseOrDhoopDaily: false,
        mosquitoCoilUsage: false,
        indoorSmoking: false,
        unventedGasHeater: false
      },
      filtration: {
        hasAirPurifier: true,
        purifierLocations: ["LIVING_ROOM"],
        filterType: "TRUE_HEPA_H13",
        cleanAirDeliveryRateCadrM3H: purifierCadr
      },
      windowSealingQuality: "STANDARD_WINDOWS"
    });

  const isOutdoorUnsafe = aqiCategory === "POOR" || aqiCategory === "VERY_POOR" || aqiCategory === "SEVERE";

  return (
    <section
      aria-labelledby="indoor-coach-heading"
      className="hs-card rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--hs-accent)]/15 text-[var(--hs-accent)]">
            <Home className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="indoor-coach-heading" className="text-lg font-bold text-[var(--hs-text-primary)] hs-wrap-safe">
              {t.indoorCoachTitle}
            </h2>
            <p className="text-xs text-[var(--hs-text-secondary)]">
              Source control, natural ventilation windows, and mechanical air filtration
            </p>
          </div>
        </div>
        <span className="rounded-full border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3 py-1 text-[11px] font-semibold text-[var(--hs-text-primary)]">
          Outdoor AQI Context: {aqiCategory ? aqiCategory.replace("_", " ") : "UNAVAILABLE"}
        </span>
      </div>

      {/* Sensor Disclaimer Alert */}
      <div className="mt-4 flex items-start space-x-2.5 rounded-xl border border-[var(--hs-warm-border)] bg-[var(--hs-warm-bg)] p-3.5 text-xs text-[var(--hs-text-primary)]">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--hs-accent-amber)]" />
        <p className="leading-relaxed hs-wrap-safe">{t.indoorCoachWarning}</p>
      </div>

      {/* 3-Column Grid */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {/* Ventilation Guidance */}
        <div className="min-w-0 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-5">
          <div className="flex items-center space-x-2 text-[var(--hs-accent)]">
            <Wind className="h-4 w-4 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--hs-text-primary)]">Natural Ventilation</h3>
          </div>
          <div className="mt-3 space-y-2.5">
            <span
              className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${
                isOutdoorUnsafe || resolvedVentilation.windowAction === "KEEP_SEALED"
                  ? "bg-rose-500/15 text-[var(--hs-accent-coral)] border border-rose-500/35"
                  : resolvedVentilation.windowAction === "OPEN_CROSS_VENTILATION"
                    ? "bg-emerald-500/15 text-[var(--hs-accent)] border border-emerald-500/35"
                    : "bg-amber-500/15 text-[var(--hs-accent-amber)] border border-amber-500/35"
              }`}
            >
              {resolvedVentilation.windowAction}
            </span>
            <p className="text-xs font-medium text-[var(--hs-text-primary)]">
              Window: {resolvedVentilation.optimalTimeWindow}
            </p>
            <p className="text-xs leading-relaxed text-[var(--hs-text-secondary)] hs-wrap-safe">
              {resolvedVentilation.practicalMethod}
            </p>
            {aqiCategory === null && resolvedVentilation.cautions[0] && (
              <p className="text-[11px] font-medium text-[var(--hs-accent-amber)] hs-wrap-safe">
                {resolvedVentilation.cautions[0]}
              </p>
            )}
          </div>
        </div>

        {/* Source Control */}
        <div className="min-w-0 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-5">
          <div className="flex items-center space-x-2 text-[var(--hs-accent-coral)]">
            <Flame className="h-4 w-4 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--hs-text-primary)]">Indoor Source Control</h3>
          </div>
          <div className="mt-3 space-y-2 text-xs text-[var(--hs-text-secondary)] leading-relaxed hs-wrap-safe">
            {hazardAssessment && hazardAssessment.mitigationRecommendations.length > 0 ? (
              hazardAssessment.mitigationRecommendations.slice(0, 3).map((m, idx) => (
                <p key={idx}>• {m}</p>
              ))
            ) : (
              <>
                <p>• Avoid indoor agarbatti (incense), mosquito coils, or unvented biomass cooking during elevated pollution.</p>
                <p>• Turn on kitchen chimney or mechanical exhaust before high-heat frying or tadka to evacuate VOCs and UFPs.</p>
              </>
            )}
          </div>
        </div>

        {/* Air Purifier CADR Planner Summary */}
        <div className="min-w-0 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-5 md:col-span-2 xl:col-span-1">
          <div className="flex items-center space-x-2 text-[var(--hs-accent)]">
            <Fan className="h-4 w-4 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--hs-text-primary)]">Air Purifier Planner</h3>
          </div>
          <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--hs-text-secondary)]">Room Volume: {roomVolumeM3} m³</span>
              <span className="font-bold text-[var(--hs-accent)]">{calculatedPurifier.requiredCadrM3H} m³/h</span>
            </div>

            <div className="rounded-lg bg-[var(--hs-surface-bg)] border border-[var(--hs-border-subtle)] p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[var(--hs-text-secondary)]">Target ({targetAch} ACH):</span>
                <span className="font-bold text-[var(--hs-accent)]">{calculatedPurifier.requiredCadrM3H} m³/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--hs-text-secondary)]">Required CFM:</span>
                <span className="font-semibold text-[var(--hs-text-primary)]">{calculatedPurifier.requiredCadrCfm} CFM</span>
              </div>
              <p className="text-[11px] text-[var(--hs-text-secondary)] leading-relaxed hs-wrap-safe">
                {calculatedPurifier.filterTypeGuidance}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive CADR & ACH Calculator Tool */}
      <div className="mt-6 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-[var(--hs-accent)]" />
            <h3 className="text-xs font-bold text-[var(--hs-text-primary)] uppercase tracking-wider">
              {t.cadrTitle}
            </h3>
          </div>
          <span className="text-[11px] text-[var(--hs-text-secondary)]">
            Formula: Required CADR (m³/h) = Length × Width × Height × Target ACH
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div>
            <label htmlFor="room-length" className="block text-[11px] font-medium text-[var(--hs-text-secondary)] mb-1">Length (m)</label>
            <input
              id="room-length"
              type="number"
              min={1}
              max={20}
              step={0.5}
              value={roomLength}
              onChange={(e) => setRoomLength(parseFloat(e.target.value) || 1)}
              className="w-full rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1.5 text-xs text-[var(--hs-text-primary)]"
            />
          </div>
          <div>
            <label htmlFor="room-width" className="block text-[11px] font-medium text-[var(--hs-text-secondary)] mb-1">Width (m)</label>
            <input
              id="room-width"
              type="number"
              min={1}
              max={20}
              step={0.5}
              value={roomWidth}
              onChange={(e) => setRoomWidth(parseFloat(e.target.value) || 1)}
              className="w-full rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1.5 text-xs text-[var(--hs-text-primary)]"
            />
          </div>
          <div>
            <label htmlFor="room-height" className="block text-[11px] font-medium text-[var(--hs-text-secondary)] mb-1">Height (m)</label>
            <input
              id="room-height"
              type="number"
              min={1}
              max={10}
              step={0.1}
              value={roomHeight}
              onChange={(e) => setRoomHeight(parseFloat(e.target.value) || 1)}
              className="w-full rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1.5 text-xs text-[var(--hs-text-primary)]"
            />
          </div>
          <div>
            <label htmlFor="purifier-cadr" className="block text-[11px] font-medium text-[var(--hs-text-secondary)] mb-1">Device CADR (m³/h)</label>
            <input
              id="purifier-cadr"
              type="number"
              min={50}
              max={1200}
              step={10}
              value={purifierCadr}
              onChange={(e) => setPurifierCadr(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1.5 text-xs text-[var(--hs-text-primary)]"
            />
          </div>
          <div>
            <label htmlFor="target-ach" className="block text-[11px] font-medium text-[var(--hs-text-secondary)] mb-1">Target ACH (Guidance)</label>
            <input
              id="target-ach"
              type="number"
              min={2}
              max={8}
              step={0.5}
              value={targetAch}
              onChange={(e) => setTargetAch(parseFloat(e.target.value) || 4)}
              className="w-full rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1.5 text-xs text-[var(--hs-text-primary)]"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--hs-surface-bg)] border border-[var(--hs-border-subtle)] px-4 py-2.5 text-xs">
          <span className="text-[var(--hs-text-primary)] font-medium">{t.calculatedAch}:</span>
          <span
            className={`font-bold ${
              estimatedAch >= 4.0
                ? "text-[var(--hs-accent)]"
                : estimatedAch >= 2.5
                  ? "text-[var(--hs-accent-amber)]"
                  : "text-[var(--hs-accent-coral)]"
            }`}
          >
            {estimatedAch} ACH{" "}
            {estimatedAch >= 4.0
              ? "(Optimal Clean Air)"
              : estimatedAch >= 2.5
                ? "(Moderate Sizing)"
                : "(Undersized)"}
          </span>
        </div>

        <div className="mt-3 flex items-start gap-2 text-[11px] text-[var(--hs-text-secondary)]">
          <Wrench className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--hs-accent)]" />
          <p>
            <strong>Assumption &amp; Maintenance Note:</strong> Target 4.5 ACH is an engineering sizing recommendation based
            on Harvard Healthy Buildings / ASHRAE 62.2 guidance for indoor particulate reduction, not a statutory CPCB
            requirement. Check HEPA pre-filters every 2–4 weeks during winter smog episodes and replace main True HEPA
            cartridges per manufacturer airflow pressure-drop guidance.
          </p>
        </div>
      </div>
    </section>
  );
};
