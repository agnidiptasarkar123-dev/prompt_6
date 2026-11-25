// SPDX-License-Identifier: Apache-2.0
"use client";

import React from "react";
import { HawaSaathiLogo } from "@/components/brand/logo";
import { TRANSLATIONS, type SupportedLanguage } from "@/i18n/translations";
import {
  Activity,
  MapPin,
  TrendingUp,
  Compass,
  Home,
  ShieldCheck,
  Sliders,
  Users,
  ShieldAlert
} from "lucide-react";

export interface SidebarProps {
  readonly language: SupportedLanguage;
  readonly activeSection?: string;
  readonly onSelectSection?: (sectionId: string) => void;
  readonly onOpenHouseholdModal?: () => void;
  readonly onOpenAlertPreferences?: () => void;
  readonly unreadAlertsCount?: number;
  readonly isAuthenticated?: boolean;
  readonly userEmail?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  language,
  activeSection = "aqi-overview",
  onSelectSection,
  onOpenHouseholdModal,
  onOpenAlertPreferences,
  unreadAlertsCount = 0,
  isAuthenticated = false,
  userEmail
}) => {
  const t = TRANSLATIONS[language];

  const navItems = [
    {
      id: "aqi-overview",
      label: t.aqiSummaryTitle,
      icon: Activity,
      href: "#aqi-overview"
    },
    {
      id: "stations-map",
      label: t.stationPanelTitle,
      icon: MapPin,
      href: "#stations-map"
    },
    {
      id: "forecast-section",
      label: t.forecastTitle,
      icon: TrendingUp,
      href: "#forecast-section"
    },
    {
      id: "commute-section",
      label: "Commute Exposure",
      icon: Compass,
      href: "#commute-section"
    },
    {
      id: "indoor-coach-section",
      label: t.indoorCoachTitle,
      icon: Home,
      href: "#indoor-coach-section"
    },
    {
      id: "recommendations-section",
      label: t.recommendationsTitle,
      icon: ShieldCheck,
      href: "#recommendations-section"
    }
  ] as const;

  return (
    <aside
      className="hidden lg:flex w-64 flex-col justify-between border-r border-[#102A2A]/30 bg-[#164E4A] p-5 text-white shadow-lg sticky top-0 h-screen select-none"
      aria-label="Application Sidebar Navigation"
    >
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="px-2">
          <a
            href="#aqi-overview"
            className="block focus:outline-none focus:ring-2 focus:ring-[#B8E6D2] rounded-lg"
            aria-label="HawaSaathi Home"
          >
            <HawaSaathiLogo variant="reversed" size={34} />
          </a>
          <p className="mt-2 text-[11px] font-medium tracking-wide text-[#B8E6D2]/80 uppercase">
            Pan-India Air Intelligence
          </p>
        </div>

        {/* Section Navigation Items */}
        <nav className="space-y-1" aria-label="Sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => {
                  if (onSelectSection) {
                    e.preventDefault();
                    onSelectSection(item.id);
                  }
                }}
                className={`flex items-center space-x-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[#1F9D78] text-white shadow-sm font-semibold"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? "text-white" : "text-[#B8E6D2]"
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </a>
            );
          })}
        </nav>
      </div>

      {/* Quick Settings & Auth State Card */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        {/* Quick Modal Triggers */}
        {onOpenAlertPreferences && (
          <button
            type="button"
            onClick={onOpenAlertPreferences}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 transition hover:bg-white/10 hover:text-white"
          >
            <div className="flex items-center space-x-2">
              <Sliders className="h-3.5 w-3.5 text-[#B8E6D2]" />
              <span>Alert Thresholds</span>
            </div>
            {unreadAlertsCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D94B4B] px-1 text-[10px] font-bold text-white">
                {unreadAlertsCount}
              </span>
            )}
          </button>
        )}

        {onOpenHouseholdModal && (
          <button
            type="button"
            onClick={onOpenHouseholdModal}
            className="flex w-full items-center space-x-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 transition hover:bg-white/10 hover:text-white"
          >
            <Users className="h-3.5 w-3.5 text-[#B8E6D2]" />
            <span>Household Context</span>
          </button>
        )}

        {/* Identity & Compliance Footnote */}
        <div className="rounded-xl bg-[#102A2A]/40 p-3">
          <div className="flex items-center space-x-2">
            {isAuthenticated ? (
              <ShieldCheck className="h-4 w-4 text-[#1F9D78]" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-[#F2B544]" />
            )}
            <span className="truncate text-[11px] font-semibold text-white">
              {isAuthenticated ? userEmail || "Authenticated" : t.guestMode}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-[#B8E6D2]/70 leading-tight">
            MoEFCC CPCB NAQI standard sub-index calculations.
          </p>
        </div>
      </div>
    </aside>
  );
};
