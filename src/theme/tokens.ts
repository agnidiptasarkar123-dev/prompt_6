// SPDX-License-Identifier: Apache-2.0

/**
 * HawaSaathi Centralised Design System Tokens
 *
 * Supports Light, Dark, and High Contrast appearance modes anchored in the
 * HawaSaathi brand palette and CPCB NAQI (2014) environmental semantics.
 */

export const BRAND_COLORS = {
  midnightTeal: "#102A2A",
  deepTeal: "#164E4A",
  saathiGreen: "#1F9D78",
  mint: "#B8E6D2",
  warmCanvas: "#F6F8F4",
  white: "#FFFFFF",
  slate: "#526466",
  amber: "#F2B544",
  orange: "#E98245",
  aqiRed: "#D94B4B"
} as const;

export type BrandColorKey = keyof typeof BRAND_COLORS;

export type ThemeMode = "light" | "dark" | "high-contrast" | "system";
export type ResolvedTheme = "light" | "dark" | "high-contrast";

export const THEME_STORAGE_KEY = "hs_theme_mode";

export interface ThemeTokenSet {
  readonly id: ResolvedTheme;
  readonly canvasBg: string;
  readonly surfaceBg: string;
  readonly elevatedBg: string;
  readonly subtleBg: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly borderSubtle: string;
  readonly borderStrong: string;
  readonly headerBg: string;
  readonly headerText: string;
  readonly sidebarBg: string;
  readonly sidebarText: string;
  readonly accentPrimary: string;
  readonly focusRing: string;
}

export const THEME_PALETTES: Record<ResolvedTheme, ThemeTokenSet> = {
  light: {
    id: "light",
    canvasBg: "#F6F8F4",
    surfaceBg: "#FFFFFF",
    elevatedBg: "#FFFFFF",
    subtleBg: "#EDF2EC",
    textPrimary: "#102A2A",
    textSecondary: "#526466",
    borderSubtle: "#D7E2DD",
    borderStrong: "#9FB7AE",
    headerBg: "#164E4A",
    headerText: "#FFFFFF",
    sidebarBg: "#164E4A",
    sidebarText: "#FFFFFF",
    accentPrimary: "#1F9D78",
    focusRing: "#1F9D78"
  },
  dark: {
    id: "dark",
    canvasBg: "#0B1414",
    surfaceBg: "#122121",
    elevatedBg: "#172B2B",
    subtleBg: "#0E1A1A",
    textPrimary: "#ECF4F1",
    textSecondary: "#A3BEB6",
    borderSubtle: "#223D3B",
    borderStrong: "#35615E",
    headerBg: "#0E2927",
    headerText: "#ECF4F1",
    sidebarBg: "#0C2120",
    sidebarText: "#ECF4F1",
    accentPrimary: "#27C497",
    focusRing: "#5CE1BA"
  },
  "high-contrast": {
    id: "high-contrast",
    canvasBg: "#000000",
    surfaceBg: "#0A0A0A",
    elevatedBg: "#121212",
    subtleBg: "#181818",
    textPrimary: "#FFFFFF",
    textSecondary: "#FACC15",
    borderSubtle: "#FFFFFF",
    borderStrong: "#FACC15",
    headerBg: "#000000",
    headerText: "#FFFFFF",
    sidebarBg: "#000000",
    sidebarText: "#FFFFFF",
    accentPrimary: "#00E5A3",
    focusRing: "#FACC15"
  }
};

export const AQI_CATEGORY_COLORS = {
  GOOD: {
    text: "#1F9D78",
    bg: "rgba(31, 157, 120, 0.10)",
    border: "rgba(31, 157, 120, 0.30)",
    badgeBg: "#1F9D78",
    badgeText: "#FFFFFF",
    label: "Good"
  },
  SATISFACTORY: {
    text: "#65A30D",
    bg: "rgba(101, 163, 13, 0.10)",
    border: "rgba(101, 163, 13, 0.30)",
    badgeBg: "#84CC16",
    badgeText: "#102A2A",
    label: "Satisfactory"
  },
  MODERATE: {
    text: "#D97706",
    bg: "rgba(242, 181, 68, 0.12)",
    border: "rgba(242, 181, 68, 0.35)",
    badgeBg: "#F2B544",
    badgeText: "#102A2A",
    label: "Moderate"
  },
  POOR: {
    text: "#EA580C",
    bg: "rgba(233, 130, 69, 0.12)",
    border: "rgba(233, 130, 69, 0.35)",
    badgeBg: "#E98245",
    badgeText: "#FFFFFF",
    label: "Poor"
  },
  VERY_POOR: {
    text: "#DC2626",
    bg: "rgba(217, 75, 75, 0.12)",
    border: "rgba(217, 75, 75, 0.35)",
    badgeBg: "#D94B4B",
    badgeText: "#FFFFFF",
    label: "Very Poor"
  },
  SEVERE: {
    text: "#991B1B",
    bg: "rgba(153, 27, 27, 0.15)",
    border: "rgba(153, 27, 27, 0.45)",
    badgeBg: "#991B1B",
    badgeText: "#FFFFFF",
    label: "Severe"
  }
} as const;

export const TYPOGRAPHY = {
  fontSans: "Inter, system-ui, -apple-system, sans-serif",
  fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  heading1: "text-2xl sm:text-3xl font-bold tracking-tight text-[var(--hs-text-primary)]",
  heading2: "text-xl sm:text-2xl font-bold tracking-tight text-[var(--hs-text-primary)]",
  heading3: "text-base sm:text-lg font-semibold text-[var(--hs-text-primary)]",
  body: "text-sm text-[var(--hs-text-secondary)] leading-relaxed",
  bodyStrong: "text-sm font-semibold text-[var(--hs-text-primary)]",
  caption: "text-xs text-[var(--hs-text-secondary)]"
} as const;

export const SHADOWS = {
  cardSubtle: "0 1px 3px 0 rgba(16, 42, 42, 0.05), 0 1px 2px -1px rgba(16, 42, 42, 0.05)",
  cardHover: "0 4px 6px -1px rgba(16, 42, 42, 0.07), 0 2px 4px -2px rgba(16, 42, 42, 0.05)",
  modal: "0 10px 25px -5px rgba(16, 42, 42, 0.12), 0 8px 10px -6px rgba(16, 42, 42, 0.10)"
} as const;

export const RADIUS = {
  card: "rounded-2xl",
  input: "rounded-xl",
  button: "rounded-xl",
  badge: "rounded-full"
} as const;
