// SPDX-License-Identifier: Apache-2.0
"use client";

import React from "react";
import { DialogFocusTrap } from "@/components/shared/dialog-focus-trap";
import {
  LayoutDashboard,
  MapPin,
  Radio,
  CalendarClock,
  Bot,
  MessageSquare,
  TrendingUp,
  Bell,
  Home,
  BookOpen,
  Settings,
  X,
  Compass
} from "lucide-react";
import type { SupportedLanguage } from "@/i18n/translations";
import { getV2UiStrings } from "@/i18n/v2-translations";

export type AppRouteView =
  | "overview"
  | "map"
  | "stations"
  | "planner"
  | "agent"
  | "chat"
  | "insights"
  | "alerts"
  | "indoor"
  | "learn"
  | "settings";

export interface AppNavItem {
  readonly id: AppRouteView;
  readonly labelKey: keyof ReturnType<typeof getV2UiStrings>["strings"];
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly group: "MONITOR" | "PLAN" | "AI" | "MANAGE";
}

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { id: "overview", labelKey: "navOverview", icon: LayoutDashboard, group: "MONITOR" },
  { id: "map", labelKey: "navExploreMap", icon: MapPin, group: "MONITOR" },
  { id: "stations", labelKey: "navStations", icon: Radio, group: "MONITOR" },
  { id: "insights", labelKey: "navInsights", icon: TrendingUp, group: "MONITOR" },
  { id: "planner", labelKey: "navDailyPlanner", icon: CalendarClock, group: "PLAN" },
  { id: "indoor", labelKey: "navIndoorAir", icon: Home, group: "PLAN" },
  { id: "agent", labelKey: "navIntelligentAgent", icon: Bot, group: "AI" },
  { id: "chat", labelKey: "navAiChat", icon: MessageSquare, group: "AI" },
  { id: "alerts", labelKey: "navAlerts", icon: Bell, group: "MANAGE" },
  { id: "learn", labelKey: "navLearn", icon: BookOpen, group: "MANAGE" },
  { id: "settings", labelKey: "navSettings", icon: Settings, group: "MANAGE" }
];

export interface AppShellNavProps {
  readonly activeView: AppRouteView;
  readonly onSelectView: (view: AppRouteView) => void;
  readonly language: SupportedLanguage;
  readonly isMobileOpen: boolean;
  readonly onCloseMobile: () => void;
  readonly unreadAlertsCount?: number;
  readonly locationLabel?: string;
}

export const AppShellNav: React.FC<AppShellNavProps> = ({
  activeView,
  onSelectView,
  language,
  isMobileOpen,
  onCloseMobile,
  unreadAlertsCount = 0,
  locationLabel
}) => {
  const { strings: v2 } = getV2UiStrings(language);

  const handleSelect = (view: AppRouteView) => {
    onSelectView(view);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  const renderLinks = () => (
    <nav aria-label="Primary application navigation" className="space-y-1">
      {APP_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = activeView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelect(item.id)}
            aria-current={active ? "page" : undefined}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${
              active
                ? "bg-[var(--hs-accent)] text-[var(--hs-accent-text)] shadow-sm"
                : "text-[var(--hs-text-secondary)] hover:bg-[var(--hs-subtle-bg)] hover:text-[var(--hs-text-primary)]"
            }`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{v2[item.labelKey]}</span>
            </span>
            {item.id === "alerts" && unreadAlertsCount > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  active ? "bg-[var(--hs-surface-bg)] text-[var(--hs-text-primary)]" : "bg-[#C02B2B] text-white"
                }`}
              >
                {unreadAlertsCount > 9 ? "9+" : unreadAlertsCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  const mobileQuickViews: AppRouteView[] = ["overview", "map", "planner", "chat", "settings"];

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        aria-label="Workspace sidebar"
        className="hidden lg:flex lg:fixed lg:top-[76px] lg:bottom-4 lg:left-4 rtl:lg:left-auto rtl:lg:right-4 lg:z-30 lg:w-56 lg:flex-col lg:overflow-y-auto"
      >
        <div className="hs-card rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-3.5 shadow-sm flex-1">
          {locationLabel && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-2.5 py-2 text-xs">
              <Compass className="h-3.5 w-3.5 shrink-0 text-[var(--hs-accent)]" />
              <span className="truncate font-semibold text-[var(--hs-text-primary)]">{locationLabel}</span>
            </div>
          )}
          {renderLinks()}
        </div>
      </aside>

      {/* Mobile Slide-out Navigation Drawer */}
      {isMobileOpen && (
        <div
          tabIndex={-1}
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <DialogFocusTrap onClose={onCloseMobile} />
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" aria-hidden="true" onClick={onCloseMobile} />
          <div className="relative z-10 flex w-72 max-w-[85vw] flex-col border-r border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-bold text-[var(--hs-text-primary)]">HawaSaathi 2.0</span>
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation menu"
                className="rounded-lg p-1.5 text-[var(--hs-text-secondary)] hover:bg-[var(--hs-subtle-bg)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{renderLinks()}</div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile quick navigation"
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)]/95 px-1 py-1.5 backdrop-blur lg:hidden"
      >
        {mobileQuickViews.map((viewId) => {
          const item = APP_NAV_ITEMS.find((i) => i.id === viewId)!;
          const Icon = item.icon;
          const active = activeView === viewId;
          return (
            <button
              key={viewId}
              type="button"
              onClick={() => handleSelect(viewId)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                active ? "text-[var(--hs-accent)]" : "text-[var(--hs-text-secondary)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate max-w-[64px]">{v2[item.labelKey]}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
