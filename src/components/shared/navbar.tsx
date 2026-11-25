// SPDX-License-Identifier: Apache-2.0
"use client";

import React from "react";
import { Globe, User, ShieldCheck, Bell, Sun, Moon, Contrast, Menu, Search, HelpCircle } from "lucide-react";
import { HawaSaathiLogo } from "@/components/brand/logo";
import { TRANSLATIONS, resolveLocale, type SupportedLanguage } from "@/i18n/translations";
import { CANONICAL_LOCALES, LOCALE_REGISTRY } from "@/i18n/locale-registry";
import { getV2UiStrings } from "@/i18n/v2-translations";
import type { ThemeMode } from "@/theme/tokens";

export interface NavbarProps {
  readonly language: SupportedLanguage;
  readonly onLanguageChange: (lang: SupportedLanguage) => void;
  readonly isAuthenticated: boolean;
  readonly userEmail?: string;
  readonly onOpenAuthModal: () => void;
  readonly onSignOut: () => void;
  readonly unreadAlertsCount?: number;
  readonly onOpenNotifications?: () => void;
  readonly themeMode?: ThemeMode;
  readonly onThemeChange?: (mode: ThemeMode) => void;
  readonly onToggleMobileNav?: () => void;
  readonly onOpenCommandPalette?: () => void;
  readonly onOpenHelp?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  language,
  onLanguageChange,
  isAuthenticated,
  userEmail,
  onOpenAuthModal,
  onSignOut,
  unreadAlertsCount = 0,
  onOpenNotifications,
  themeMode = "light",
  onThemeChange,
  onToggleMobileNav,
  onOpenCommandPalette,
  onOpenHelp
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS["en-IN"];
  const { strings: v2 } = getV2UiStrings(language);
  const currentLocale = resolveLocale(language);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#102A2A]/20 bg-[#164E4A] text-white shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center space-x-2.5">
          {onToggleMobileNav && (
            <button
              type="button"
              onClick={onToggleMobileNav}
              aria-label="Toggle navigation menu"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 lg:hidden"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <div className="flex shrink-0 items-center">
            <HawaSaathiLogo variant="reversed" size={32} className="h-8" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg sm:text-xl font-bold tracking-tight text-white">{t.appTitle}</h1>
            <p className="hidden truncate text-xs text-[#B8E6D2] xl:block">{t.appSubtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 min-w-0 max-w-full">
          {/* Notification Alert Bell */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              aria-label={`View notifications, ${unreadAlertsCount} unread`}
              className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
            >
              <Bell className="h-4 w-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D94B4B] text-[10px] font-bold text-white ring-2 ring-[#164E4A]">
                  {unreadAlertsCount > 9 ? "9+" : unreadAlertsCount}
                </span>
              )}
            </button>
          )}

          {/* Language Selector */}
          <div className="flex max-w-full items-center space-x-1 rounded-lg border border-white/20 bg-black/20 p-1">
            <Globe className="ml-1 h-4 w-4 shrink-0 text-[#B8E6D2]" aria-hidden="true" />

            {/* Quick access buttons for top 3 languages */}
            {(["en", "bn", "hi"] as const).map((lang) => {
              const isSelected = language === lang || (lang === "en" && language === "en-IN") || (lang === "bn" && language === "bn-IN") || (lang === "hi" && language === "hi-IN");
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => onLanguageChange(lang)}
                  className={`hidden sm:inline-flex rounded px-2 py-1 text-xs font-medium transition ${isSelected
                    ? "bg-teal-500 text-slate-950 font-bold"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  aria-label={`Switch to ${TRANSLATIONS[lang].languageName}`}
                >
                  {TRANSLATIONS[lang].languageName}
                </button>
              );
            })}

            {/* 23-Locale Accessible Selector Dropdown */}
            <select
              aria-label="Select from all 23 Indian languages"
              value={currentLocale}
              onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
              className="max-w-[105px] sm:max-w-[140px] truncate rounded bg-black/30 px-2 py-1 text-xs font-medium text-white hover:text-white border-0 focus:ring-1 focus:ring-[#B8E6D2] cursor-pointer"
            >
              {CANONICAL_LOCALES.map((code) => {
                const meta = LOCALE_REGISTRY[code];
                return (
                  <option key={code} value={code} className="bg-[#102A2A] text-white">
                    {meta.nativeName} ({meta.name})
                  </option>
                );
              })}
            </select>
          </div>

          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              aria-label="Open command palette"
              className="hidden items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/20 sm:inline-flex"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden md:inline">⌘K</span>
            </button>
          )}

          {onOpenHelp && (
            <button
              type="button"
              onClick={onOpenHelp}
              aria-label="Open onboarding guide"
              className="hidden h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 sm:inline-flex"
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          {onThemeChange && (
            <div
              role="group"
              aria-label="Appearance mode switcher"
              className="flex items-center rounded-lg border border-white/20 bg-black/20 p-0.5"
            >
              <button
                type="button"
                onClick={() => onThemeChange("light")}
                aria-label="Switch to Light theme"
                aria-pressed={themeMode === "light"}
                className={`rounded px-2 py-1 text-xs flex items-center gap-1 transition ${themeMode === "light" ? "bg-teal-500 text-slate-950 font-bold" : "text-white/80 hover:text-white"
                  }`}
              >
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden md:inline">{v2.themeLight}</span>
              </button>
              <button
                type="button"
                onClick={() => onThemeChange("dark")}
                aria-label="Switch to Dark theme"
                aria-pressed={themeMode === "dark"}
                className={`rounded px-2 py-1 text-xs flex items-center gap-1 transition ${themeMode === "dark" ? "bg-teal-500 text-slate-950 font-bold" : "text-white/80 hover:text-white"
                  }`}
              >
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden md:inline">{v2.themeDark}</span>
              </button>
              <button
                type="button"
                onClick={() => onThemeChange("high-contrast")}
                aria-label="Switch to High Contrast theme"
                aria-pressed={themeMode === "high-contrast"}
                className={`rounded px-2 py-1 text-xs flex items-center gap-1 transition ${themeMode === "high-contrast"
                  ? "bg-amber-400 text-black font-bold"
                  : "text-white/80 hover:text-white"
                  }`}
              >
                <Contrast className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden md:inline">{v2.themeHighContrast}</span>
              </button>
            </div>
          )}

          {/* User / Guest Status */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-2">
              <span className="hidden text-xs text-white/90 font-medium md:inline-block">
                {userEmail || "Signed In"}
              </span>
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition"
              >
                {t.signOut}
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="hidden items-center text-xs text-amber-300 sm:inline-flex">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.guestMode}</span>
              </span>
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="inline-flex items-center space-x-1.5 rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-[#1F9D78] hover:text-white"
              >
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.signIn}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
