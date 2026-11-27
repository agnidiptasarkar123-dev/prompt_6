// SPDX-License-Identifier: Apache-2.0
"use client";

import React from "react";
import { ShieldCheck, Sparkles, CalendarClock, Globe, Contrast, X } from "lucide-react";
import { DialogFocusTrap } from "@/components/shared/dialog-focus-trap";
import { getV2UiStrings } from "@/i18n/v2-translations";
import type { SupportedLanguage } from "@/i18n/translations";

export interface OnboardingModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly language: SupportedLanguage;
  readonly onNavigate?: (view: "planner" | "agent" | "settings") => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  language,
  onNavigate
}) => {
  const { strings: v2 } = getV2UiStrings(language);
  if (!isOpen) return null;

  return (
    <div
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-heading"
    >
      <DialogFocusTrap onClose={onClose} />
      <div className="hs-card relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss welcome guide"
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--hs-text-secondary)] hover:bg-[var(--hs-subtle-bg)]"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="onboarding-modal-heading" className="text-xl font-bold text-[var(--hs-text-primary)]">{v2.onboardingWelcome}</h2>
        <p className="mt-1 text-xs text-[var(--hs-text-secondary)]">
          Evidence-first urban air quality platform built for Indian cities with deterministic CPCB math, 23 official Indian languages, and privacy-by-default.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--hs-text-primary)]">
              <ShieldCheck className="h-4 w-4 text-[var(--hs-accent)]" />
              <span>Zero-Hallucination AQI</span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--hs-text-secondary)]">
              Official CPCB Type A/B indices, Type C raw pollutant sensors, and Type D CAMS forecasts are never blurred or fabricated.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--hs-text-primary)]">
              <CalendarClock className="h-4 w-4 text-[var(--hs-accent)]" />
              <span>Daily Schedule Planner</span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--hs-text-secondary)]">
              Plan morning runs, school commutes, and home ventilation windows around verified station readings and forecast dips.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--hs-text-primary)]">
              <Sparkles className="h-4 w-4 text-[var(--hs-accent)]" />
              <span>Agent & Grounded Chat</span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--hs-text-secondary)]">
              Run CADR purifier sizing, commute advisories, and station comparisons using auditable tool traces.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--hs-text-primary)]">
              <Globe className="h-4 w-4 text-[var(--hs-accent)]" />
              <span>23 Languages & 3 Themes</span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--hs-text-secondary)]">
              Includes full RTL support for Urdu, Kashmiri & Sindhi plus Light, Dark, and WCAG AAA High Contrast modes.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--hs-border-subtle)] pt-4">
          <div className="flex flex-wrap gap-2">
            {onNavigate && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate("planner");
                    onClose();
                  }}
                  className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--hs-text-primary)] hover:border-[var(--hs-accent)]"
                >
                  Open Planner
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate("settings");
                    onClose();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--hs-text-primary)] hover:border-[var(--hs-accent)]"
                >
                  <Contrast className="h-3.5 w-3.5 text-[var(--hs-accent)]" />
                  <span>Theme & Languages</span>
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[var(--hs-accent)] px-4 py-2 text-xs font-bold text-[var(--hs-accent-text)] hover:opacity-90"
          >
            {v2.onboardingDismiss}
          </button>
        </div>
      </div>
    </div>
  );
};
