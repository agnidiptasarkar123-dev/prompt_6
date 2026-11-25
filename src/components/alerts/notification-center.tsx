// SPDX-License-Identifier: Apache-2.0
"use client";

import React from "react";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import { Bell, X, CheckCheck, Trash2, AlertTriangle, ShieldAlert, Info } from "lucide-react";

export interface EnvironmentalAlert {
  readonly id: string;
  readonly severity: "MODERATE" | "POOR" | "VERY_POOR" | "SEVERE";
  readonly title: string;
  readonly message: string;
  readonly timestamp: string;
  readonly source: string;
  readonly isRead: boolean;
  readonly provenanceTag?: string;
}

interface NotificationCenterProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly language: SupportedLanguage;
  readonly alerts: readonly EnvironmentalAlert[];
  readonly onMarkAllAsRead: () => void;
  readonly onDismissAlert: (id: string) => void;
  readonly onClearAllAlerts: () => void;
  readonly onOpenPreferences: () => void;
}

export function NotificationCenter({
  isOpen,
  onClose,
  language,
  alerts,
  onMarkAllAsRead,
  onDismissAlert,
  onClearAllAlerts,
  onOpenPreferences
}: NotificationCenterProps) {
  if (!isOpen) return null;

  const t = TRANSLATIONS[language] || TRANSLATIONS["en-IN"];
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  const getSeverityBadge = (severity: EnvironmentalAlert["severity"]) => {
    switch (severity) {
      case "SEVERE":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-950/80 px-2 py-0.5 text-xs font-semibold text-rose-300 border border-rose-800">
            <ShieldAlert className="h-3 w-3" /> {t.categorySevere}
          </span>
        );
      case "VERY_POOR":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-purple-950/80 px-2 py-0.5 text-xs font-semibold text-purple-300 border border-purple-800">
            <AlertTriangle className="h-3 w-3" /> {t.categoryVeryPoor}
          </span>
        );
      case "POOR":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-orange-950/80 px-2 py-0.5 text-xs font-semibold text-orange-300 border border-orange-800">
            <AlertTriangle className="h-3 w-3" /> {t.categoryPoor}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-950/80 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-800">
            <Info className="h-3 w-3" /> {t.categoryModerate}
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-center-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--hs-border-subtle)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--hs-accent)]/15 text-[var(--hs-accent)]">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 id="notification-center-title" className="text-base font-bold text-[var(--hs-text-primary)]">
                {t.notificationsTitle}
              </h2>
              <p className="text-xs text-[var(--hs-text-secondary)]">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenPreferences}
              className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-2.5 py-1.5 text-xs font-medium text-[var(--hs-text-primary)] hover:border-[var(--hs-accent)]"
            >
              {t.alertPreferences}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Notification Center"
              className="rounded-lg p-2 text-[var(--hs-text-secondary)] hover:bg-[var(--hs-subtle-bg)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="flex items-center justify-between border-b border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-6 py-2 text-xs">
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="inline-flex items-center gap-1.5 font-medium text-[var(--hs-accent)] hover:opacity-80"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>{t.markAllRead}</span>
            </button>
            <button
              type="button"
              onClick={onClearAllAlerts}
              className="inline-flex items-center gap-1.5 font-medium text-[var(--hs-text-secondary)] hover:text-rose-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t.clearAlerts}</span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--hs-text-secondary)]">
              <Bell className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">{t.noAlerts}</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`relative rounded-xl border p-4 transition ${
                  alert.isRead
                    ? "border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] text-[var(--hs-text-secondary)]"
                    : "border-[var(--hs-accent)] bg-[var(--hs-surface-bg)] text-[var(--hs-text-primary)] shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {getSeverityBadge(alert.severity)}
                      <span className="text-[11px] text-[var(--hs-text-secondary)]">{alert.source}</span>
                      <span className="text-[11px] text-[var(--hs-text-secondary)]">•</span>
                      <span className="text-[11px] text-[var(--hs-text-secondary)]">{alert.timestamp}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--hs-text-primary)] hs-wrap-safe">{alert.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--hs-text-secondary)] hs-wrap-safe">{alert.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDismissAlert(alert.id)}
                    aria-label={`Dismiss alert ${alert.title}`}
                    className="rounded-lg p-1 text-[var(--hs-text-secondary)] hover:bg-[var(--hs-subtle-bg)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
