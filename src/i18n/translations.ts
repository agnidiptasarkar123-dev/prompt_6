// SPDX-License-Identifier: Apache-2.0

import { LOCALE_CATALOGS } from "./locales/index";
export { LOCALE_CATALOGS };

import {
  type CanonicalLocale,
  type TextDirection,
  LOCALE_REGISTRY,
  CANONICAL_LOCALES,
  resolveLocale,
  getTextDirection,
  getFontFamily
} from "./locale-registry";

export {
  resolveLocale,
  getTextDirection,
  getFontFamily,
  type CanonicalLocale,
  type TextDirection,
  LOCALE_REGISTRY,
  CANONICAL_LOCALES
};

export type LegacyLanguageCode = "en" | "bn" | "hi";
export type SupportedLanguage = CanonicalLocale | LegacyLanguageCode;

export interface TranslationDictionary {
  readonly appTitle: string;
  readonly appSubtitle: string;
  readonly searchPlaceholder: string;
  readonly useLocation: string;
  readonly guestMode: string;
  readonly signIn: string;
  readonly signOut: string;
  readonly lastUpdated: string;
  readonly aqiSummaryTitle: string;
  readonly aqiUnavailable: string;
  readonly aqiUnavailableDesc: string;
  readonly prominentPollutant: string;
  readonly pollutantBreakdownTitle: string;
  readonly stationPanelTitle: string;
  readonly distance: string;
  readonly forecastTitle: string;
  readonly forecastSubtitle: string;
  readonly recommendationsTitle: string;
  readonly indoorCoachTitle: string;
  readonly indoorCoachWarning: string;
  readonly provenanceTitle: string;
  readonly license: string;
  readonly attribution: string;
  readonly categoryGood: string;
  readonly categorySatisfactory: string;
  readonly categoryModerate: string;
  readonly categoryPoor: string;
  readonly categoryVeryPoor: string;
  readonly categorySevere: string;
  readonly languageName: string;
  // Phase 4 Extensions
  readonly commutePlannerTitle: string;
  readonly commutePlannerSubtitle: string;
  readonly originStation: string;
  readonly destinationStation: string;
  readonly commuteMode: string;
  readonly departureWindow: string;
  readonly exposureNotice: string;
  readonly notificationsTitle: string;
  readonly noAlerts: string;
  readonly markAllRead: string;
  readonly clearAlerts: string;
  readonly alertPreferences: string;
  readonly quietHours: string;
  readonly thresholdSelect: string;
  readonly cadrTitle: string;
  readonly cadrSubtitle: string;
  readonly roomVolume: string;
  readonly purifierCadr: string;
  readonly calculatedAch: string;
  readonly footerDisclaimer: string;
  readonly dpdpPrivacyNotice: string;
  readonly osmAttribution: string;
}

export function formatIcu(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return key in params ? String(params[key]) : match;
  });
}

export const TRANSLATIONS: Record<SupportedLanguage, TranslationDictionary> = {
  ...LOCALE_CATALOGS,
  en: LOCALE_CATALOGS["en-IN"],
  bn: LOCALE_CATALOGS["bn-IN"],
  hi: LOCALE_CATALOGS["hi-IN"],
};

export const translations = TRANSLATIONS;

export function getTranslations(lang: SupportedLanguage = "en"): TranslationDictionary {
  const resolved = resolveLocale(lang);
  return LOCALE_CATALOGS[resolved];
}
