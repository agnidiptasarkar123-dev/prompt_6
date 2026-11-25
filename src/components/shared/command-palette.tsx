// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { useState, useMemo } from "react";
import { Search, X, Sun, Moon, Contrast, Compass } from "lucide-react";
import { APP_NAV_ITEMS, type AppRouteView } from "./app-shell-nav";
import { getV2UiStrings } from "@/i18n/v2-translations";
import type { SupportedLanguage } from "@/i18n/translations";
import type { ThemeMode } from "@/theme/tokens";

export interface CommandPaletteProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSelectView: (view: AppRouteView) => void;
  readonly onThemeChange: (mode: ThemeMode) => void;
  readonly language: SupportedLanguage;
}

interface PaletteItem {
  readonly id: string;
  readonly label: string;
  readonly category: string;
  readonly action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectView,
  onThemeChange,
  language
}) => {
  const [query, setQuery] = useState("");
  const { strings: v2 } = getV2UiStrings(language);

  const items: PaletteItem[] = useMemo(() => {
    const viewItems: PaletteItem[] = APP_NAV_ITEMS.map((item) => ({
      id: `nav-${item.id}`,
      label: v2[item.labelKey],
      category: "Navigate",
      action: () => {
        onSelectView(item.id);
        onClose();
      }
    }));

    const themeItems: PaletteItem[] = [
      {
        id: "theme-light",
        label: `${v2.themeLabel}: ${v2.themeLight}`,
        category: "Theme",
        action: () => {
          onThemeChange("light");
          onClose();
        }
      },
      {
        id: "theme-dark",
        label: `${v2.themeLabel}: ${v2.themeDark}`,
        category: "Theme",
        action: () => {
          onThemeChange("dark");
          onClose();
        }
      },
      {
        id: "theme-hc",
        label: `${v2.themeLabel}: ${v2.themeHighContrast}`,
        category: "Theme",
        action: () => {
          onThemeChange("high-contrast");
          onClose();
        }
      }
    ];

    return [...viewItems, ...themeItems];
  }, [v2, onSelectView, onThemeChange, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/65 p-4 pt-20 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Quick Actions Command Palette"
    >
      <div className="hs-card w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--hs-border-subtle)] bg-[var(--hs-surface-bg)] shadow-2xl">
        <div className="flex items-center border-b border-[var(--hs-border-subtle)] px-4 py-3">
          <Search className="mr-2.5 h-4 w-4 text-[var(--hs-accent)]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && filtered[0]) {
                filtered[0].action();
              }
            }}
            placeholder={v2.commandPalettePlaceholder}
            className="w-full bg-transparent text-sm text-[var(--hs-text-primary)] placeholder-[var(--hs-text-secondary)] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="rounded-lg p-1 text-[var(--hs-text-secondary)] hover:bg-[var(--hs-subtle-bg)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-xs text-[var(--hs-text-secondary)]">
              No matching commands found.
            </p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition hover:bg-[var(--hs-subtle-bg)]"
              >
                <span className="flex items-center gap-2 font-semibold text-[var(--hs-text-primary)]">
                  {item.category === "Theme" ? (
                    item.id.includes("dark") ? (
                      <Moon className="h-3.5 w-3.5 text-[var(--hs-accent)]" />
                    ) : item.id.includes("hc") ? (
                      <Contrast className="h-3.5 w-3.5 text-[var(--hs-accent)]" />
                    ) : (
                      <Sun className="h-3.5 w-3.5 text-[var(--hs-accent)]" />
                    )
                  ) : (
                    <Compass className="h-3.5 w-3.5 text-[var(--hs-accent)]" />
                  )}
                  <span>{item.label}</span>
                </span>
                <span className="rounded bg-[var(--hs-subtle-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--hs-text-secondary)]">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
