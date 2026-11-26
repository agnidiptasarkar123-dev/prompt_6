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
    <section aria-labelledby="recommendations-heading" className="hs-card mt-8 rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-5 shadow-card-subtle">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--hs-warm-border)] bg-[var(--hs-warm-bg)] text-[var(--hs-accent-amber)]">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h3 id="recommendations-heading" className="text-base font-bold text-[var(--hs-text-primary)]">
              {t.recommendationsTitle}
            </h3>
            <p className="text-xs text-[var(--hs-text-secondary)]">
              Family &amp; Community Air Action Plan · Grounded in MoEFCC CPCB guidelines
              {isAqiUnavailable ? " (Precautionary Mode)" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isAiGenerated ? (
            <span className="inline-flex items-center space-x-1 rounded-full border border-[var(--hs-learn-border)] bg-[var(--hs-learn-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--hs-accent-violet)]">
              <Sparkles className="h-3 w-3" />
              <span>Gemini AI Narrative</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 rounded-full border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--hs-text-primary)]">
              <CheckCircle2 className="h-3 w-3 text-[var(--hs-accent)]" />
              <span>Deterministic Rule Baseline</span>
            </span>
          )}
        </div>
      </div>

      {/* AI Narrative Summary if available */}
      {aiExplanation && (
        <div className="mt-4 rounded-xl border border-[var(--hs-learn-border)] bg-[var(--hs-learn-bg)] p-4">
          <div className="flex items-start space-x-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--hs-accent-violet)]" />
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--hs-accent-violet)]">
                Contextual AI Explanation {isAqiUnavailable ? "(AQI Unavailable Mode)" : ""}
              </p>
              <p className="text-sm font-medium text-[var(--hs-text-primary)]">{aiExplanation.summary}</p>
              <p className="text-xs text-[var(--hs-text-secondary)]">{aiExplanation.primaryPollutantExplanation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations List */}
      <div className="mt-5 space-y-3">
        {recommendations.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--hs-text-secondary)]">
            {isAqiUnavailable
              ? "Verified AQI is currently unavailable. General precaution guidance applies."
              : "Air quality is within normal parameters. Standard outdoor activities permitted."}
          </p>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.actionId}
              className="flex flex-col justify-between rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4 transition hover:border-[var(--hs-accent)]/50 hover:bg-[var(--hs-elevated-bg)] sm:flex-row sm:items-start"
            >
              <div className="space-y-1 sm:max-w-xl">
                <div className="flex items-center space-x-2">
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${rec.urgency === "IMMEDIATE"
                      ? "border-[var(--hs-accent-coral)]/40 bg-[var(--hs-accent-coral)]/10 text-[var(--hs-accent-coral)]"
                      : rec.urgency === "SCHEDULED"
                        ? "border-[var(--hs-warm-border)] bg-[var(--hs-warm-bg)] text-[var(--hs-accent-amber)]"
                        : "border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] text-[var(--hs-accent)]"
                      }`}
                  >
                    {rec.urgency}
                  </span>
                  <span className="text-sm font-bold text-[var(--hs-text-primary)]">{rec.actionSummary}</span>
                </div>
                <p className="text-xs leading-relaxed text-[var(--hs-text-primary)]">{rec.reasoning}</p>
                <p className="text-[11px] text-[var(--hs-text-secondary)]">{rec.implementationMethod}</p>
                <p className="text-[11px] text-[var(--hs-text-secondary)]">
                  <strong>Assumptions &amp; Uncertainty:</strong> {rec.applicableConstraintsOrLimits} (Station readings are ambient proxies, NOT personal inhaled dose or guaranteed health outcomes; CO2 figures exclude non-CO2 GHGs.)
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0 sm:flex-col sm:items-end sm:gap-1">
                <span className="flex items-center space-x-1 rounded border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--hs-text-primary)]">
                  <Users className="h-3 w-3 text-[var(--hs-text-secondary)]" />
                  <span>Category: {rec.category}</span>
                </span>
                {rec.evidenceReferences?.[0]?.evidenceId && (
                  <span className="rounded border border-[var(--hs-info-border)] bg-[var(--hs-info-bg)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--hs-accent-blue)]">
                    Ref: {rec.evidenceReferences[0].evidenceId}
                  </span>
                )}
                <span className="rounded border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--hs-accent)]">
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
                  className="inline-flex items-center gap-1 rounded border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--hs-text-primary)] hover:border-[var(--hs-accent)]"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  <span>{selectedAltByRec[rec.actionId] !== undefined ? "Swap alternative" : "Choose alternative"}</span>
                </button>
              </div>
              {selectedAltByRec[rec.actionId] !== undefined && (
                <p className="mt-2 w-full rounded-lg border border-[var(--hs-info-border)] bg-[var(--hs-info-bg)] px-3 py-1.5 text-[11px] text-[var(--hs-text-primary)]">
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
