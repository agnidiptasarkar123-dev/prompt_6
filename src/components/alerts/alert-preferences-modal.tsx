// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState } from "react";
import { DialogFocusTrap } from "@/components/shared/dialog-focus-trap";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import { X, Sliders, Moon, Shield } from "lucide-react";

export interface AlertPreferencesState {
  severityThreshold: "MODERATE" | "POOR" | "VERY_POOR" | "SEVERE";
  hysteresisEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  pm25ThresholdUgM3?: number;
  notifyOnForecastExceedance?: boolean;
  notifyOnStaleData?: boolean;
}

interface AlertPreferencesModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly language: SupportedLanguage;
  readonly initialPreferences: AlertPreferencesState;
  readonly onSavePreferences: (prefs: AlertPreferencesState) => void;
}

export function AlertPreferencesModal({
  isOpen,
  onClose,
  language,
  initialPreferences,
  onSavePreferences
}: AlertPreferencesModalProps) {
  const [prefs, setPrefs] = useState<AlertPreferencesState>(initialPreferences);
  const t = TRANSLATIONS[language] || TRANSLATIONS["en-IN"];

  if (!isOpen) return null;

  const handleSave = () => {
    onSavePreferences(prefs);
    onClose();
  };

  return (
    <div
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-preferences-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
    >
      <DialogFocusTrap onClose={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--hs-border-subtle)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--hs-accent)]/15 text-[var(--hs-accent)]">
              <Sliders className="h-4 w-4" aria-hidden="true" />
            </div>
            <h2 id="alert-preferences-title" className="text-base font-bold text-[var(--hs-text-primary)]">
              {t.alertPreferences}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Alert Preferences"
            className="rounded-lg p-1.5 text-[var(--hs-text-secondary)] hover:bg-[var(--hs-subtle-bg)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm text-[var(--hs-text-primary)]">
          <div>
            <label htmlFor="pref-threshold" className="block text-xs font-semibold mb-1.5">
              {t.thresholdSelect}
            </label>
            <select
              id="pref-threshold"
              value={prefs.severityThreshold}
              onChange={(e) =>
                setPrefs({
                  ...prefs,
                  severityThreshold: e.target.value as AlertPreferencesState["severityThreshold"]
                })
              }
              className="w-full rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3 py-2 text-xs text-[var(--hs-text-primary)]"
            >
              <option value="MODERATE">{t.categoryModerate} (AQI &gt; 100)</option>
              <option value="POOR">{t.categoryPoor} (AQI &gt; 200)</option>
              <option value="VERY_POOR">{t.categoryVeryPoor} (AQI &gt; 300)</option>
              <option value="SEVERE">{t.categorySevere} (AQI &gt; 400)</option>
            </select>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-3">
            <div className="flex items-start gap-2.5">
              <Shield className="h-4 w-4 text-[var(--hs-accent)] mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <label htmlFor="hysteresis-checkbox" className="text-xs font-semibold block cursor-pointer">
                  Notification Hysteresis
                </label>
                <span className="text-[11px] text-[var(--hs-text-secondary)] leading-relaxed block">
                  Prevents notification flapping when air quality oscillates near boundary values.
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              id="hysteresis-checkbox"
              checked={prefs.hysteresisEnabled}
              onChange={(e) => setPrefs({ ...prefs, hysteresisEnabled: e.target.checked })}
              className="mt-1 h-4 w-4 rounded"
            />
          </div>

          <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-[var(--hs-accent)]" aria-hidden="true" />
                <label htmlFor="quiet-hours-checkbox" className="text-xs font-semibold cursor-pointer">
                  {t.quietHours}
                </label>
              </div>
              <input
                type="checkbox"
                id="quiet-hours-checkbox"
                checked={prefs.quietHoursEnabled}
                onChange={(e) => setPrefs({ ...prefs, quietHoursEnabled: e.target.checked })}
                className="h-4 w-4 rounded"
              />
            </div>
            {prefs.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label htmlFor="quiet-start" className="block text-[11px] text-[var(--hs-text-secondary)] mb-1">
                    Start (Night)
                  </label>
                  <input
                    id="quiet-start"
                    type="time"
                    value={prefs.quietHoursStart}
                    onChange={(e) => setPrefs({ ...prefs, quietHoursStart: e.target.value })}
                    className="w-full rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1.5 text-xs text-[var(--hs-text-primary)]"
                  />
                </div>
                <div>
                  <label htmlFor="quiet-end" className="block text-[11px] text-[var(--hs-text-secondary)] mb-1">
                    End (Morning)
                  </label>
                  <input
                    id="quiet-end"
                    type="time"
                    value={prefs.quietHoursEnd}
                    onChange={(e) => setPrefs({ ...prefs, quietHoursEnd: e.target.value })}
                    className="w-full rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-1.5 text-xs text-[var(--hs-text-primary)]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[var(--hs-border-subtle)] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-4 py-2 text-xs font-semibold text-[var(--hs-text-primary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-[var(--hs-accent)] px-4 py-2 text-xs font-bold text-[var(--hs-accent-text)] hover:opacity-90 transition"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
