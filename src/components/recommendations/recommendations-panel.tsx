// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState } from "react";
import { ShieldAlert, Sparkles, CheckCircle2, Users, RefreshCw } from "lucide-react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import type { RecommendationAction } from "@/schemas/recommendation.schema";
import type { AiExplanation } from "@/schemas/ai-explanation.schema";

export interface RecommendationsPanelProps {
  readonly language: SupportedLanguage;
  readonly recommendations: readonly RecommendationAction[];
  readonly aiExplanation: AiExplanation | null;
  readonly isAiGenerated?: boolean;
  readonly isAqiUnavailable?: boolean;
}

const FALLBACK_ALTERNATIVES = [
  "Bundle errands into one midday trip (Exposure + Emissions · Qualitative · Assumes flexible daytime scheduling)",
  "Shift to quieter side-streets or off-peak hours (Personal Exposure · Qualitative · Unmeasured street-level variance)",
  "Use intracity bus (0.015161 kg CO2/pax-km India GHG 2015) / avoid >30s idling (Emissions · Estimated/Qualitative · +/-30% variance)",
] as const;

export function formatActionImpactTag(category: RecommendationAction["category"]): string {
  if (category === "TRANSIT_MODE_SWAP" || category === "COMMUTE_TIMING") {
    return "Exposure + CO2 · Estimated/Qualitative";
  }
  if (category === "SOURCE_CONTROL_INDOOR" || category === "AIR_CLEANING") {
    return "Indoor Air · Calculated ACH (Sensor Measured only if valid)";
  }
  return "Ambient Proxy · Qualitative";
}

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  language,
  recommendations,
  aiExplanation,
  isAiGenerated = false,
  isAqiUnavailable = false,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS["en-IN"];
  const [selectedAltByRec, setSelectedAltByRec] = useState<Record<string, number>>({});

  return (
    <section aria-labelledby="recommendations-heading" className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-card-subtle">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#B8E6D2]/30 text-[#164E4A]">
            <ShieldAlert className="h-4 w-4 text-[#164E4A]" />
          </div>
          <div>
            <h3 id="recommendations-heading" className="text-base font-bold text-[#102A2A]">
              {t.recommendationsTitle}
            </h3>
            <p className="text-xs text-[#526466]">
              Family &amp; Community Air Action Plan · Grounded in MoEFCC CPCB guidelines
              {isAqiUnavailable ? " (Precautionary Mode)" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isAiGenerated ? (
            <span className="inline-flex items-center space-x-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-[#164E4A] ring-1 ring-[#1F9D78]/30">
              <Sparkles className="h-3 w-3 text-[#1F9D78]" />
              <span>Gemini AI Narrative</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 rounded-full bg-[#F6F8F4] border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              <CheckCircle2 className="h-3 w-3 text-[#1F9D78]" />
              <span>Deterministic Rule Baseline</span>
            </span>
          )}
        </div>
      </div>

      {/* AI Narrative Summary if available */}
      {aiExplanation && (
        <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/50 p-4">
          <div className="flex items-start space-x-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#1F9D78]" />
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[#164E4A]">
                Contextual AI Explanation {isAqiUnavailable ? "(AQI Unavailable Mode)" : ""}
              </p>
              <p className="text-sm font-medium text-[#102A2A]">{aiExplanation.summary}</p>
              <p className="text-xs text-[#526466]">{aiExplanation.primaryPollutantExplanation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations List */}
      <div className="mt-5 space-y-3">
        {recommendations.length === 0 ? (
          <p className="py-6 text-center text-xs text-[#526466]">
            {isAqiUnavailable
              ? "Verified AQI is currently unavailable. General precaution guidance applies."
              : "Air quality is within normal parameters. Standard outdoor activities permitted."}
          </p>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.actionId}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-[#F6F8F4] p-4 transition hover:border-[#1F9D78]/50 hover:bg-white sm:flex-row sm:items-start"
            >
              <div className="space-y-1 sm:max-w-xl">
                <div className="flex items-center space-x-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${rec.urgency === "IMMEDIATE"
                      ? "bg-rose-50 text-rose-800 border border-rose-200"
                      : rec.urgency === "SCHEDULED"
                        ? "bg-orange-50 text-orange-800 border border-orange-200"
                        : "bg-teal-50 text-[#164E4A] border border-[#B8E6D2]"
                      }`}
                  >
                    {rec.urgency}
                  </span>
                  <span className="text-sm font-bold text-[#102A2A]">{rec.actionSummary}</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-700">{rec.reasoning}</p>
                <p className="text-[11px] text-[#526466]">{rec.implementationMethod}</p>
                <p className="text-[11px] text-[#526466]">
                  <strong>Assumptions &amp; Uncertainty:</strong> {rec.applicableConstraintsOrLimits} (Station readings are ambient proxies, NOT personal inhaled dose or guaranteed health outcomes; CO2 figures exclude non-CO2 GHGs.)
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0 sm:flex-col sm:items-end sm:gap-1">
                <span className="flex items-center space-x-1 rounded bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  <Users className="h-3 w-3 text-[#526466]" />
                  <span>Category: {rec.category}</span>
                </span>
                {rec.evidenceReferences?.[0]?.evidenceId && (
                  <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                    Ref: {rec.evidenceReferences[0].evidenceId}
                  </span>
                )}
                <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#164E4A]">
                  {formatActionImpactTag(rec.category)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAltByRec((prev) => ({
                      ...prev,
                      [rec.actionId]: ((prev[rec.actionId] ?? -1) + 1) % FALLBACK_ALTERNATIVES.length,
                    }));
                  }}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium text-[#102A2A] hover:border-[#1F9D78]"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  <span>{selectedAltByRec[rec.actionId] !== undefined ? "Swap alternative" : "Choose alternative"}</span>
                </button>
              </div>
              {selectedAltByRec[rec.actionId] !== undefined && (
                <p className="mt-2 w-full rounded-lg border border-teal-200 bg-teal-50/70 px-3 py-1.5 text-[11px] text-[#102A2A]">
                  <strong>Selected alternative:</strong>{" "}
                  {FALLBACK_ALTERNATIVES[selectedAltByRec[rec.actionId]!]}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
};
