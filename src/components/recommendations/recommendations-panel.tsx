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
}

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  language,
  recommendations,
  aiExplanation,
  isAiGenerated = false
}) => {
  const t = TRANSLATIONS[language];

  return (
    <section aria-labelledby="recommendations-heading" className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h3 id="recommendations-heading" className="text-base font-bold text-white">
              {t.recommendationsTitle}
            </h3>
            <p className="text-xs text-slate-400">
              Deterministic rule engine grounded in MoEFCC CPCB guidelines
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isAiGenerated ? (
            <span className="inline-flex items-center space-x-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 ring-1 ring-indigo-500/30">
              <Sparkles className="h-3 w-3" />
              <span>Gemini AI Narrative</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
              <CheckCircle2 className="h-3 w-3 text-teal-400" />
              <span>Deterministic Rule Baseline</span>
            </span>
          )}
        </div>
      </div>

      {/* AI Narrative Summary if available */}
      {aiExplanation && (
        <div className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4">
          <div className="flex items-start space-x-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Contextual AI Explanation
              </p>
              <p className="text-sm text-slate-200">{aiExplanation.summary}</p>
              <p className="text-xs text-slate-400">{aiExplanation.primaryPollutantExplanation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations List */}
      <div className="mt-5 space-y-3">
        {recommendations.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">
            Air quality is within normal parameters. Standard outdoor activities permitted.
          </p>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.actionId}
              className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-900/90 p-4 transition hover:border-slate-700 sm:flex-row sm:items-start"
            >
              <div className="space-y-1 sm:max-w-xl">
                <div className="flex items-center space-x-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      rec.urgency === "IMMEDIATE"
                        ? "bg-rose-500/20 text-rose-300"
                        : rec.urgency === "SCHEDULED"
                          ? "bg-orange-500/20 text-orange-300"
                          : "bg-teal-500/20 text-teal-300"
                    }`}
                  >
                    {rec.urgency}
                  </span>
                  <span className="text-sm font-bold text-white">{rec.actionSummary}</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">{rec.reasoning}</p>
                <p className="text-[11px] text-slate-400">{rec.implementationMethod}</p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0 sm:flex-col sm:items-end sm:gap-1">
                <span className="flex items-center space-x-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                  <Users className="h-3 w-3 text-slate-400" />
                  <span>Category: {rec.category}</span>
                </span>
                {rec.evidenceReferences?.[0]?.evidenceId && (
                  <span className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
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
