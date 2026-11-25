// SPDX-License-Identifier: Apache-2.0
"use client";

import React from "react";
import { ShieldAlert, Sparkles, CheckCircle2, Users } from "lucide-react";
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

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  language,
  recommendations,
  aiExplanation,
  isAiGenerated = false,
  isAqiUnavailable = false
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS["en-IN"];

  return (
    <section
      aria-labelledby="recommendations-heading"
      className="hs-card rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-5 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--hs-accent)]/15 text-[var(--hs-accent)]">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 id="recommendations-heading" className="text-base font-bold text-[var(--hs-text-primary)] hs-wrap-safe">
              {t.recommendationsTitle}
            </h3>
            <p className="text-xs text-[var(--hs-text-secondary)]">
              Deterministic rule engine grounded in MoEFCC CPCB guidelines (Non-diagnostic)
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center space-x-2">
          {isAiGenerated ? (
            <span className="inline-flex items-center space-x-1 rounded-full bg-[var(--hs-accent)]/15 px-2.5 py-0.5 text-xs font-semibold text-[var(--hs-accent)] ring-1 ring-[var(--hs-accent)]/30">
              <Sparkles className="h-3 w-3" />
              <span>Gemini AI Narrative</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 rounded-full bg-[var(--hs-subtle-bg)] border border-[var(--hs-border-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--hs-text-primary)]">
              <CheckCircle2 className="h-3 w-3 text-[var(--hs-accent)]" />
              <span>Deterministic Rule Baseline</span>
            </span>
          )}
        </div>
      </div>

      {/* AI Narrative Summary */}
      {aiExplanation && (
        <div className="mt-4 rounded-xl border border-[var(--hs-accent)]/35 bg-[var(--hs-accent)]/10 p-4">
          <div className="flex items-start space-x-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--hs-accent)]" />
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--hs-accent)]">
                Contextual AI Explanation {isAqiUnavailable ? "(AQI Unavailable Mode)" : ""}
              </p>
              <p className="text-sm font-medium text-[var(--hs-text-primary)] hs-wrap-safe">{aiExplanation.summary}</p>
              <p className="text-xs text-[var(--hs-text-secondary)] hs-wrap-safe">{aiExplanation.primaryPollutantExplanation}</p>
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
              className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4 transition hover:border-[var(--hs-accent)] sm:flex-row sm:items-start"
            >
              <div className="min-w-0 space-y-1.5 sm:max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      rec.urgency === "IMMEDIATE"
                        ? "bg-rose-500/15 text-rose-500 border border-rose-500/35"
                        : rec.urgency === "SCHEDULED"
                          ? "bg-orange-500/15 text-orange-500 border border-orange-500/35"
                          : "bg-[var(--hs-accent)]/15 text-[var(--hs-accent)] border border-[var(--hs-accent)]/35"
                    }`}
                  >
                    {rec.urgency}
                  </span>
                  <span className="text-sm font-bold text-[var(--hs-text-primary)] hs-wrap-safe">{rec.actionSummary}</span>
                </div>
                <p className="text-xs leading-relaxed text-[var(--hs-text-secondary)] hs-wrap-safe">{rec.reasoning}</p>
                <p className="text-[11px] text-[var(--hs-text-secondary)] opacity-90 hs-wrap-safe">{rec.implementationMethod}</p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                <span className="flex items-center space-x-1 rounded bg-[var(--hs-surface-bg)] border border-[var(--hs-border-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--hs-text-primary)]">
                  <Users className="h-3 w-3 text-[var(--hs-text-secondary)]" />
                  <span>Category: {rec.category}</span>
                </span>
                {rec.evidenceReferences?.[0]?.evidenceId && (
                  <span className="rounded border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--hs-text-secondary)]">
                    Ref: {rec.evidenceReferences[0].evidenceId}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
