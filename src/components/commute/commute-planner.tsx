// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState } from "react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import type { NormalizedStation, NormalizedForecast } from "@/schemas/providers/normalized-provider.schema";
import { Navigation, ShieldAlert, CheckCircle, Clock, Bike, Car, Footprints, Bus, Info, AlertTriangle } from "lucide-react";

interface CommutePlannerProps {
  readonly language: SupportedLanguage;
  readonly stations: readonly NormalizedStation[];
  readonly currentAqi: number | null;
  readonly forecast: readonly NormalizedForecast[];
  readonly initialMode?: CommuteMode;
  readonly initialDepartureWindow?: DepartureWindow;
}

export type CommuteMode = "WALK" | "CYCLE" | "PUBLIC_TRANSIT" | "CAB_CAR";
export type DepartureWindow = "MORNING" | "MIDDAY" | "EVENING" | "NIGHT";

export function CommutePlanner({
  language,
  stations,
  currentAqi,
  forecast: _forecast,
  initialMode,
  initialDepartureWindow
}: CommutePlannerProps) {
  const t = TRANSLATIONS[language] || TRANSLATIONS["en-IN"];
  const [originId, setOriginId] = useState<string>(stations[0]?.id || "");
  const [destinationId, setDestinationId] = useState<string>(stations[1]?.id || stations[0]?.id || "");
  const [mode, setMode] = useState<CommuteMode>(initialMode ?? "PUBLIC_TRANSIT");
  const [departureWindow, setDepartureWindow] = useState<DepartureWindow>(initialDepartureWindow ?? "MORNING");

  const originStation = stations.find((s) => s.id === originId) || stations[0];
  const destinationStation = stations.find((s) => s.id === destinationId) || stations[1] || stations[0];

  let riskLevel: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH" | "UNVERIFIED" = "UNVERIFIED";

  if (currentAqi !== null) {
    if (currentAqi > 300) {
      riskLevel = "VERY_HIGH";
    } else if (currentAqi > 200) {
      riskLevel = mode === "WALK" || mode === "CYCLE" ? "VERY_HIGH" : "HIGH";
    } else if (currentAqi > 100) {
      riskLevel = mode === "WALK" || mode === "CYCLE" ? "HIGH" : "MODERATE";
    } else {
      riskLevel = "LOW";
    }
  }

  const isPeakHour = departureWindow === "MORNING" || departureWindow === "EVENING";

  return (
    <section
      aria-labelledby="commute-planner-heading"
      className="hs-card rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-6 shadow-sm"
    >
      <div className="flex items-center gap-3 border-b border-[var(--hs-border-subtle)] pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--hs-accent)]/15 text-[var(--hs-accent)]">
          <Navigation className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 id="commute-planner-heading" className="text-base font-bold text-[var(--hs-text-primary)] hs-wrap-safe">
            {t.commutePlannerTitle}
          </h2>
          <p className="text-xs text-[var(--hs-text-secondary)] hs-wrap-safe">{t.commutePlannerSubtitle}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="commute-origin" className="block text-xs font-semibold text-[var(--hs-text-primary)] mb-1.5">
            {t.originStation}
          </label>
          <select
            id="commute-origin"
            value={originId}
            onChange={(e) => setOriginId(e.target.value)}
            className="w-full rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3 py-2 text-xs text-[var(--hs-text-primary)]"
          >
            {stations.map((s) => (
              <option key={`orig-${s.id}`} value={s.id}>
                {s.name} ({s.city})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="commute-destination" className="block text-xs font-semibold text-[var(--hs-text-primary)] mb-1.5">
            {t.destinationStation}
          </label>
          <select
            id="commute-destination"
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            className="w-full rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3 py-2 text-xs text-[var(--hs-text-primary)]"
          >
            {stations.map((s) => (
              <option key={`dest-${s.id}`} value={s.id}>
                {s.name} ({s.city})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="commute-mode" className="block text-xs font-semibold text-[var(--hs-text-primary)] mb-1.5">
            {t.commuteMode}
          </label>
          <select
            id="commute-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as CommuteMode)}
            className="w-full rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3 py-2 text-xs text-[var(--hs-text-primary)]"
          >
            <option value="PUBLIC_TRANSIT">Bus / Metro Transit</option>
            <option value="CAB_CAR">Car / Taxi (Air Recirculation)</option>
            <option value="WALK">Walking Commute</option>
            <option value="CYCLE">Bicycle / Micro-mobility</option>
          </select>
        </div>

        <div>
          <label htmlFor="commute-time" className="block text-xs font-semibold text-[var(--hs-text-primary)] mb-1.5">
            {t.departureWindow}
          </label>
          <select
            id="commute-time"
            value={departureWindow}
            onChange={(e) => setDepartureWindow(e.target.value as DepartureWindow)}
            className="w-full rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3 py-2 text-xs text-[var(--hs-text-primary)]"
          >
            <option value="MORNING">Morning Peak (07:00 - 10:00)</option>
            <option value="MIDDAY">Midday Sun (11:00 - 15:00)</option>
            <option value="EVENING">Evening Peak (16:00 - 20:00)</option>
            <option value="NIGHT">Night Calm (21:00 - 06:00)</option>
          </select>
        </div>
      </div>

      {/* Advisory Result Card */}
      <div className="mt-6 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {mode === "CYCLE" ? (
              <Bike className="h-6 w-6 shrink-0 text-[var(--hs-accent)]" />
            ) : mode === "WALK" ? (
              <Footprints className="h-6 w-6 shrink-0 text-[var(--hs-accent)]" />
            ) : mode === "CAB_CAR" ? (
              <Car className="h-6 w-6 shrink-0 text-[var(--hs-accent)]" />
            ) : (
              <Bus className="h-6 w-6 shrink-0 text-[var(--hs-accent)]" />
            )}
            <div className="min-w-0">
              <span className="text-xs text-[var(--hs-text-secondary)]">Route Profile</span>
              <h4 className="text-sm font-semibold text-[var(--hs-text-primary)] hs-wrap-safe">
                {originStation?.name || "Origin"} → {destinationStation?.name || "Destination"}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[var(--hs-text-secondary)]">Exposure Index:</span>
            {riskLevel === "UNVERIFIED" ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-500 border border-amber-500/35">
                <AlertTriangle className="h-3.5 w-3.5" /> Unverified (AQI Unavailable)
              </span>
            ) : riskLevel === "VERY_HIGH" ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-500 border border-rose-500/35">
                <ShieldAlert className="h-3.5 w-3.5" /> High Inhalation Risk
              </span>
            ) : riskLevel === "HIGH" ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/15 px-2.5 py-1 text-xs font-bold text-orange-500 border border-orange-500/35">
                <ShieldAlert className="h-3.5 w-3.5" /> Elevated Exposure
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--hs-accent)]/15 px-2.5 py-1 text-xs font-bold text-[var(--hs-accent)] border border-[var(--hs-accent)]/35">
                <CheckCircle className="h-3.5 w-3.5" /> Manageable Exposure
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-[var(--hs-border-subtle)] pt-3 text-xs leading-relaxed text-[var(--hs-text-secondary)] space-y-1.5">
          {mode === "CYCLE" || mode === "WALK" ? (
            <p>
              • <strong className="text-[var(--hs-text-primary)]">Active Micro-mobility Advisory:</strong> Heavy ventilation during exercise significantly increases particulate intake.
              {currentAqi !== null && currentAqi > 200
                ? " Consider shifting commute to enclosed transit or wearing an N95 mask."
                : " Prefer green corridors away from heavy diesel traffic."}
            </p>
          ) : mode === "CAB_CAR" ? (
            <p>
              • <strong className="text-[var(--hs-text-primary)]">Cabin Air Advisory:</strong> Keep windows rolled up and cabin air recirculation enabled to minimize roadside particulate ingress.
            </p>
          ) : (
            <p>
              • <strong className="text-[var(--hs-text-primary)]">Transit Advisory:</strong> Metro corridors offer shelter from roadside exhaust plumes; maintain distance from idling vehicles at outdoor stops.
            </p>
          )}

          {isPeakHour && (
            <p className="flex items-center gap-1.5 text-amber-500 font-medium">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Peak commuter hours coincide with elevated roadside NO₂ and primary tailpipe emissions.</span>
            </p>
          )}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-[var(--hs-surface-bg)] border border-[var(--hs-border-subtle)] p-2.5 text-[11px] text-[var(--hs-text-secondary)]">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="hs-wrap-safe">{t.exposureNotice}</span>
        </div>
      </div>
    </section>
  );
}
