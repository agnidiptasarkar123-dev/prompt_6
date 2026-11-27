// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState } from "react";
import {
  Settings,
  Sun,
  Moon,
  Contrast,
  Monitor,
  Globe,
  MapPin,
  Plus,
  Trash2,
  ShieldCheck,
  Users,
  Bell
} from "lucide-react";
import type { SupportedLanguage } from "@/i18n/translations";
import { getV2UiStrings } from "@/i18n/v2-translations";
import { CANONICAL_LOCALES, LOCALE_REGISTRY, resolveLocale } from "@/i18n/locale-registry";
import type { ThemeMode } from "@/theme/tokens";
import type { SavedPlace } from "@/schemas/planner.schema";

export interface SettingsWorkspaceProps {
  readonly language: SupportedLanguage;
  readonly onLanguageChange: (lang: SupportedLanguage) => void;
  readonly themeMode: ThemeMode;
  readonly onThemeChange: (mode: ThemeMode) => void;
  readonly savedPlaces: readonly SavedPlace[];
  readonly onUpdateSavedPlaces: (places: SavedPlace[]) => void;
  readonly onSelectSavedPlace: (place: SavedPlace) => void;
  readonly currentLocation: { readonly name: string; readonly latitude: number; readonly longitude: number };
  readonly onOpenHouseholdModal: () => void;
  readonly onOpenAlertPreferences: () => void;
  readonly onOpenAuthModal: () => void;
  readonly isAuthenticated: boolean;
}

export const SettingsWorkspace: React.FC<SettingsWorkspaceProps> = ({
  language,
  onLanguageChange,
  themeMode,
  onThemeChange,
  savedPlaces,
  onUpdateSavedPlaces,
  onSelectSavedPlace,
  currentLocation,
  onOpenHouseholdModal,
  onOpenAlertPreferences,
  onOpenAuthModal,
  isAuthenticated
}) => {
  const { strings: v2 } = getV2UiStrings(language);
  const resolvedLocale = resolveLocale(language);
  const localeMeta = LOCALE_REGISTRY[resolvedLocale];

  const [placeLabel, setPlaceLabel] = useState<"HOME" | "WORK" | "COLLEGE" | "CUSTOM">("HOME");
  const [placeName, setPlaceName] = useState("");

  const handleSaveCurrentPlace = (e: React.FormEvent) => {
    e.preventDefault();
    const customName = placeName.trim() || `${placeLabel} (${currentLocation.name})`;
    const next: SavedPlace = {
      id: `place-${Date.now()}`,
      label: placeLabel,
      customName: customName.slice(0, 60),
      city: currentLocation.name,
      state: "India",
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      isPrivate: true
    };
    onUpdateSavedPlaces([next, ...savedPlaces]);
    setPlaceName("");
  };

  return (
    <section
      aria-labelledby="settings-heading"
      className="hs-card rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] p-6 shadow-sm space-y-6"
    >
      <div className="flex items-center gap-3 border-b border-[var(--hs-border-subtle)] pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--hs-accent)]/15 text-[var(--hs-accent)]">
          <Settings className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 id="settings-heading" className="text-base font-bold text-[var(--hs-text-primary)] hs-wrap-safe">
            {v2.settingsTitle}
          </h2>
          <p className="text-xs text-[var(--hs-text-secondary)]">{v2.settingsSubtitle}</p>
        </div>
      </div>

      {/* Appearance Theme Selector */}
      <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--hs-text-primary)]">
          {v2.themeLabel} Mode (Light / Dark / High Contrast)
        </h3>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {([
            { id: "light", label: v2.themeLight, icon: Sun },
            { id: "dark", label: v2.themeDark, icon: Moon },
            { id: "high-contrast", label: v2.themeHighContrast, icon: Contrast },
            { id: "system", label: v2.themeSystem, icon: Monitor }
          ] as const).map((mode) => {
            const Icon = mode.icon;
            const selected = themeMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onThemeChange(mode.id)}
                aria-pressed={selected}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                  selected
                    ? "border-[var(--hs-accent)] bg-[var(--hs-accent)] text-[var(--hs-accent-text)] font-bold"
                    : "border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] text-[var(--hs-text-primary)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 23 Official Indian Languages + RTL Status */}
      <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--hs-text-primary)] flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-[var(--hs-accent)]" />
            <span>Language &amp; Script ({CANONICAL_LOCALES.length} Scheduled Indian Locales)</span>
          </h3>
          <span className="rounded-full bg-[var(--hs-surface-bg)] border border-[var(--hs-border-subtle)] px-2.5 py-0.5 text-[10px] font-mono text-[var(--hs-text-secondary)]">
            {localeMeta.script} • {localeMeta.direction.toUpperCase()}
          </span>
        </div>

        <select
          aria-label="Preferred application language"
          value={resolvedLocale}
          onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
          className="w-full rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-3 py-2.5 text-xs font-medium text-[var(--hs-text-primary)]"
        >
          {CANONICAL_LOCALES.map((code) => {
            const meta = LOCALE_REGISTRY[code];
            return (
              <option key={code} value={code}>
                {meta.nativeName} — {meta.name} [{meta.script}, {meta.direction.toUpperCase()}]
              </option>
            );
          })}
        </select>
      </div>

      {/* Saved Places (Privacy-Controlled Local Storage) */}
      <div className="rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--hs-text-primary)] flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-[var(--hs-accent)]" />
          <span>Saved Places (Private to Your Device)</span>
        </h3>

        <form onSubmit={handleSaveCurrentPlace} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <select
            value={placeLabel}
            onChange={(e) => setPlaceLabel(e.target.value as "HOME" | "WORK" | "COLLEGE" | "CUSTOM")}
            aria-label="Place category"
            className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-2.5 py-2 text-xs text-[var(--hs-text-primary)]"
          >
            <option value="HOME">Home</option>
            <option value="WORK">Work</option>
            <option value="COLLEGE">College</option>
            <option value="CUSTOM">Custom</option>
          </select>
          <input
            type="text"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder={`Label (default: ${currentLocation.name})`}
            aria-label="Saved place label"
            className="rounded-lg border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-3 py-2 text-xs text-[var(--hs-text-primary)] sm:col-span-2"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-[var(--hs-accent)] px-3 py-2 text-xs font-bold text-[var(--hs-accent-text)]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Save Current City</span>
          </button>
        </form>

        {savedPlaces.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {savedPlaces.map((pl) => (
              <div
                key={pl.id}
                className="flex items-center justify-between rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] px-3 py-2 text-xs"
              >
                <button
                  type="button"
                  onClick={() => onSelectSavedPlace(pl)}
                  className="text-left min-w-0 flex-1"
                >
                  <p className="font-bold text-[var(--hs-text-primary)] truncate">{pl.customName}</p>
                  <p className="text-[10px] text-[var(--hs-text-secondary)]">
                    {pl.label} • {pl.city}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSavedPlaces(savedPlaces.filter((x) => x.id !== pl.id))}
                  aria-label={`Remove saved place ${pl.customName}`}
                  className="rounded p-1 text-[var(--hs-accent-coral)] hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Household Profile, Alerts & DPDP Privacy */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={onOpenHouseholdModal}
          className="flex items-center justify-center gap-2 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-4 py-3 text-xs font-semibold text-[var(--hs-text-primary)] hover:border-[var(--hs-accent)]"
        >
          <Users className="h-4 w-4 text-[var(--hs-accent)]" />
          <span>Household Sensitivity</span>
        </button>
        <button
          type="button"
          onClick={onOpenAlertPreferences}
          className="flex items-center justify-center gap-2 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-4 py-3 text-xs font-semibold text-[var(--hs-text-primary)] hover:border-[var(--hs-accent)]"
        >
          <Bell className="h-4 w-4 text-[var(--hs-accent)]" />
          <span>Alert Rules &amp; Quiet Hours</span>
        </button>
        <button
          type="button"
          onClick={onOpenAuthModal}
          className="flex items-center justify-center gap-2 rounded-xl border border-[var(--hs-border-subtle)] bg-[var(--hs-subtle-bg)] px-4 py-3 text-xs font-semibold text-[var(--hs-text-primary)] hover:border-[var(--hs-accent)]"
        >
          <ShieldCheck className="h-4 w-4 text-[var(--hs-accent)]" />
          <span>{isAuthenticated ? "DPDP Export & Delete" : "Sign In / Cloud Sync"}</span>
        </button>
      </div>
    </section>
  );
};
