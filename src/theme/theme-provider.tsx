// SPDX-License-Identifier: Apache-2.0
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { THEME_STORAGE_KEY, type ThemeMode, type ResolvedTheme } from "./tokens";

export interface ThemeContextValue {
  readonly themeMode: ThemeMode;
  readonly resolvedTheme: ResolvedTheme;
  readonly setThemeMode: (mode: ThemeMode) => void;
  readonly cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: "light",
  resolvedTheme: "light",
  setThemeMode: () => {},
  cycleTheme: () => {}
});

export function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  if (window.matchMedia("(prefers-contrast: more)").matches) {
    return "high-contrast";
  }
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function resolveThemeValue(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") {
    return resolveSystemTheme();
  }
  return mode;
}

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "high-contrast" || raw === "system") {
      return raw;
    }
  } catch {
    // storage disabled
  }
  return "light";
}

export const ThemeProvider: React.FC<{
  readonly children: React.ReactNode;
  readonly initialMode?: ThemeMode;
}> = ({ children, initialMode }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialMode ?? "light");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    initialMode ? resolveThemeValue(initialMode) : "light"
  );

  // Hydrate persisted preference on mount
  useEffect(() => {
    if (!initialMode) {
      const stored = getStoredThemeMode();
      setThemeModeState(stored);
      setResolvedTheme(resolveThemeValue(stored));
    }
  }, [initialMode]);

  // Apply data-theme attribute to document root & listen for system changes
  useEffect(() => {
    const apply = () => {
      const nextResolved = resolveThemeValue(themeMode);
      setResolvedTheme(nextResolved);
      if (typeof document !== "undefined") {
        const root = document.documentElement;
        root.setAttribute("data-theme", nextResolved);
        root.classList.remove("light", "dark", "high-contrast");
        root.classList.add(nextResolved);
      }
    };

    apply();

    if (themeMode === "system" && typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const darkMq = window.matchMedia("(prefers-color-scheme: dark)");
      const hcMq = window.matchMedia("(prefers-contrast: more)");
      darkMq.addEventListener("change", apply);
      hcMq.addEventListener("change", apply);
      return () => {
        darkMq.removeEventListener("change", apply);
        hcMq.removeEventListener("change", apply);
      };
    }
  }, [themeMode]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    setResolvedTheme(resolveThemeValue(mode));
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, mode);
      } catch {
        // ignore
      }
    }
  }, []);

  const cycleTheme = useCallback(() => {
    const order: readonly ThemeMode[] = ["light", "dark", "high-contrast"];
    const currentIdx = order.indexOf(resolvedTheme);
    const next = order[(currentIdx + 1) % order.length]!;
    setThemeMode(next);
  }, [resolvedTheme, setThemeMode]);

  return (
    <ThemeContext.Provider value={{ themeMode, resolvedTheme, setThemeMode, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
