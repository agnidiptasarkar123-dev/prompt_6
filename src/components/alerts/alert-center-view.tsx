// SPDX-License-Identifier: Apache-2.0
"use client";

import React from "react";
import type { EnvironmentalAlert } from "@/components/alerts/notification-center";
import type { AlertPreferencesState } from "@/components/alerts/alert-preferences-modal";

export interface AlertCenterViewProps {
  readonly alerts: readonly EnvironmentalAlert[];
  readonly unreadCount: number;
  readonly alertPreferences: AlertPreferencesState;
  readonly onConfigureRules: () => void;
  readonly onOpenDrawer: () => void;
}

export const AlertCenterView: React.FC<AlertCenterViewProps> = ({
  alerts,
  unreadCount,
  alertPreferences,
  onConfigureRules,
  onOpenDrawer
}) => {
  return (
    <section
      aria-labelledby="alerts-center-heading"
      className="hs-card rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-6 shadow-sm space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hs-border-subtle)] pb-4">
        <div>
          <h2 id="alerts-center-heading" className="text-base font-bold text-[var(--hs-text-primary)]">
            Smart Alert Centre &amp; Rules
          </h2>
          <p className="text-xs text-[var(--hs-text-secondary)]">
            Deduplicated threshold, raw PM, CAMS exceedance &amp; data-staleness advisories with quiet hours.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onConfigureRules}
            className="min-h-[36px] rounded-lg bg-[var(--hs-accent)] px-3 py-1.5 text-xs font-bold text-[var(--hs-accent-text)]"
          >
            Configure Alert Rules
          </button>
          <button
            type="button"
            onClick={onOpenDrawer}
            className="min-h-[36px] rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--hs-text-primary)]"
          >
            Open Alert Drawer ({unreadCount})
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <p className="text-xs text-[var(--hs-text-secondary)]">
          No active alerts triggered above your current threshold ({alertPreferences.severityThreshold}).
        </p>
      ) : (
        <div className="space-y-3">
          {alerts.map((al) => (
            <div
              key={al.id}
              className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--hs-text-primary)]">{al.title}</span>
                <span className="rounded bg-[var(--hs-surface-bg)] px-2 py-0.5 text-[10px] font-mono text-[var(--hs-text-secondary)]">
                  {al.severity} • {al.source}
                </span>
              </div>
              <p className="mt-1 text-[var(--hs-text-secondary)]">{al.message}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
