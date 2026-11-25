// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState } from "react";
import { BookOpen, ShieldCheck, Layers, Wind } from "lucide-react";
import type { SupportedLanguage } from "@/i18n/translations";
import { getV2UiStrings } from "@/i18n/v2-translations";

const CPCB_POLLUTANT_GUIDE: readonly { code: string; name: string; note: string }[] = [
  { code: "PM2.5", name: "PM2.5 (Fine Particulate < 2.5 µm)", note: "Reaches deep lung alveoli and bloodstream; driven by traffic exhaust, biomass burning, and dust." },
  { code: "PM10", name: "PM10 (Coarse Particulate < 10 µm)", note: "Irritates upper airways; elevated during construction, unpaved road dust resuspension, and dry winds." },
  { code: "NO2", name: "NO₂ (Nitrogen Dioxide)", note: "Traffic corridor gas from diesel/petrol combustion that worsens airway inflammation and asthma." },
  { code: "SO2", name: "SO₂ (Sulphur Dioxide)", note: "Industrial and power-plant combustion pollutant causing acute throat and bronchial irritation." },
  { code: "CO", name: "CO (Carbon Monoxide)", note: "Odourless incomplete-combustion gas common in congested intersections and unvented indoor stoves." },
  { code: "O3", name: "O₃ (Ground-Level Ozone)", note: "Photochemical oxidant peaking in sunny afternoons; triggers chest tightness during outdoor exercise." },
  { code: "NH3", name: "NH₃ (Ammonia)", note: "Agricultural and waste-decomposition gas that forms secondary fine particulate matter." },
  { code: "Pb", name: "Pb (Lead)", note: "Heavy particulate from battery recycling and industrial smelting regulated over 24-hour intervals." }
];

export interface LearningCentreProps {
  readonly language: SupportedLanguage;
}

type LearnTab = "pollutants" | "naqi" | "provenance" | "indoor";

export const LearningCentre: React.FC<LearningCentreProps> = ({ language }) => {
  const { strings: v2 } = getV2UiStrings(language);
  const [tab, setTab] = useState<LearnTab>("pollutants");

  const cpcbBands = [
    { band: "Good (0–50)", impact: "Minimal health impact. Ideal for all outdoor activities and natural ventilation.", color: "bg-emerald-600 text-white" },
    { band: "Satisfactory (51–100)", impact: "Minor breathing discomfort possible for unusually sensitive people.", color: "bg-lime-500 text-slate-900" },
    { band: "Moderate (101–200)", impact: "Discomfort for people with asthma, heart, or lung conditions; children should pace strenuous outdoor sport.", color: "bg-amber-400 text-slate-950" },
    { band: "Poor (201–300)", impact: "Breathing discomfort for most people on prolonged exposure; prefer indoor alternatives.", color: "bg-orange-500 text-white" },
    { band: "Very Poor (301–400)", impact: "Respiratory illness on prolonged exposure; wear N95/FFP2 masks outdoors and keep windows sealed.", color: "bg-red-600 text-white" },
    { band: "Severe (401–500)", impact: "Health impact even on healthy individuals; avoid outdoor exertion and run True HEPA purifiers.", color: "bg-rose-700 text-white" }
  ];

  return (
    <section
      aria-labelledby="learning-centre-heading"
      className="hs-card rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-6 shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-[var(--hs-border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--hs-accent)]/15 text-[var(--hs-accent)]">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="learning-centre-heading" className="text-base font-bold text-[var(--hs-text-primary)] hs-wrap-safe">
              {v2.learnTitle}
            </h2>
            <p className="text-xs text-[var(--hs-text-secondary)]">{v2.learnSubtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {([
            ["pollutants", "8 Pollutants"],
            ["naqi", "CPCB NAQI"],
            ["provenance", "Type A–D Data"],
            ["indoor", "CADR & Ventilation"]
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === key
                  ? "bg-[var(--hs-accent)] text-[var(--hs-accent-text)]"
                  : "border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] text-[var(--hs-text-secondary)] hover:text-[var(--hs-text-primary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "pollutants" && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CPCB_POLLUTANT_GUIDE.map((item) => (
            <div
              key={item.code}
              className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--hs-text-primary)]">{item.name}</span>
                <span className="rounded bg-[var(--hs-accent)]/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-[var(--hs-accent)]">
                  Type C
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--hs-text-secondary)]">{item.note}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "naqi" && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4 text-xs leading-relaxed text-[var(--hs-text-secondary)]">
            <h3 className="font-bold text-[var(--hs-text-primary)] flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="h-4 w-4 text-[var(--hs-accent)]" />
              When Does HawaSaathi Compute Type B CPCB NAQI?
            </h3>
            Under India&apos;s National Air Quality Index (NAQI) standard, composite AQI is computed only when{" "}
            <strong className="text-[var(--hs-text-primary)]">at least 3 monitored pollutants</strong> have sufficient
            data and{" "}
            <strong className="text-[var(--hs-text-primary)]">at least one is PM2.5 or PM10</strong>. If a station reports fewer parameters, HawaSaathi marks composite AQI as <strong className="text-[var(--hs-text-primary)]">Unavailable</strong> rather than guessing or inventing a score.
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cpcbBands.map((b) => (
              <div
                key={b.band}
                className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-3.5"
              >
                <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${b.color}`}>
                  {b.band}
                </span>
                <p className="mt-2 text-xs text-[var(--hs-text-secondary)]">{b.impact}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "provenance" && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              tag: "Type A — Official Published",
              desc: "Statutory AQI bulletins published directly by Central/State Pollution Control Boards."
            },
            {
              tag: "Type B — Calculated CPCB NAQI",
              desc: "Computed deterministically on HawaSaathi's engine using official linear breakpoints and rolling windows."
            },
            {
              tag: "Type C — Raw Ground Sensor",
              desc: "Direct physical concentration (µg/m³ or mg/m³) measured at station coordinates with timestamp & license."
            },
            {
              tag: "Type D — Modelled Forecast",
              desc: "Copernicus CAMS atmospheric grid (~45 km resolution) via Open-Meteo for 48–72h dispersion planning only."
            }
          ].map((item) => (
            <div
              key={item.tag}
              className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4"
            >
              <h3 className="text-xs font-bold text-[var(--hs-accent)] flex items-center gap-1.5">
                <Layers className="h-4 w-4" />
                <span>{item.tag}</span>
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--hs-text-secondary)]">{item.desc}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "indoor" && (
        <div className="mt-5 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4 text-xs leading-relaxed text-[var(--hs-text-secondary)] space-y-2">
          <h3 className="font-bold text-[var(--hs-text-primary)] flex items-center gap-1.5">
            <Wind className="h-4 w-4 text-[var(--hs-accent)]" />
            Indoor Protection & CADR Sizing Formula
          </h3>
          <p>
            Required <strong className="text-[var(--hs-text-primary)]">Clean Air Delivery Rate (CADR in m³/h)</strong>{" "}
            = Room Length (m) × Width (m) × Height (m) × Target Air Changes per Hour (4.5 ACH recommended in Poor+ days).
          </p>
          <p>
            <strong className="text-[var(--hs-text-primary)]">Important Scientific Boundary:</strong> Without a dedicated indoor particle sensor in your room, no app can measure your exact indoor AQI. Ventilation advice combines verified outdoor status with your declared cooking/incense/filtration setup.
          </p>
        </div>
      )}
    </section>
  );
};
