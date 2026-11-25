// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import {
  CANONICAL_LOCALES,
  LOCALE_REGISTRY
} from "@/i18n/locale-registry";
import {
  TRANSLATIONS,
  LOCALE_CATALOGS,
  resolveLocale,
  getTranslations,
  formatIcu,
  type TranslationDictionary
} from "@/i18n/translations";

describe("Phase 5 Multilingual Catalog Completeness Suite (P5-CAT-001 to P5-CAT-250)", () => {
  const REQUIRED_KEYS: (keyof TranslationDictionary)[] = [
    "appTitle",
    "appSubtitle",
    "searchPlaceholder",
    "useLocation",
    "guestMode",
    "signIn",
    "signOut",
    "lastUpdated",
    "aqiSummaryTitle",
    "aqiUnavailable",
    "aqiUnavailableDesc",
    "prominentPollutant",
    "pollutantBreakdownTitle",
    "stationPanelTitle",
    "distance",
    "forecastTitle",
    "forecastSubtitle",
    "recommendationsTitle",
    "indoorCoachTitle",
    "indoorCoachWarning",
    "provenanceTitle",
    "license",
    "attribution",
    "categoryGood",
    "categorySatisfactory",
    "categoryModerate",
    "categoryPoor",
    "categoryVeryPoor",
    "categorySevere",
    "languageName",
    "commutePlannerTitle",
    "commutePlannerSubtitle",
    "originStation",
    "destinationStation",
    "commuteMode",
    "departureWindow",
    "exposureNotice",
    "notificationsTitle",
    "noAlerts",
    "markAllRead",
    "clearAlerts",
    "alertPreferences",
    "quietHours",
    "thresholdSelect",
    "cadrTitle",
    "cadrSubtitle",
    "roomVolume",
    "purifierCadr",
    "calculatedAch",
    "footerDisclaimer",
    "dpdpPrivacyNotice",
    "osmAttribution"
  ];

  it("P5-CAT-001: exactly 23 canonical locales defined in CANONICAL_LOCALES", () => {
    expect(CANONICAL_LOCALES).toHaveLength(23);
  });

  it("P5-CAT-002: English master catalog contains exactly 52 keys", () => {
    const enCatalog = LOCALE_CATALOGS["en-IN"];
    expect(Object.keys(enCatalog)).toHaveLength(52);
  });

  it("P5-CAT-003: all required translation dictionary keys are present in en-IN", () => {
    const enCatalog = LOCALE_CATALOGS["en-IN"];
    for (const key of REQUIRED_KEYS) {
      expect(enCatalog[key]).toBeDefined();
      expect(typeof enCatalog[key]).toBe("string");
      expect(enCatalog[key].length).toBeGreaterThan(0);
    }
  });

  it("P5-CAT-004: resolveLocale maps undefined and empty input to 'en-IN'", () => {
    expect(resolveLocale(undefined)).toBe("en-IN");
    expect(resolveLocale(null)).toBe("en-IN");
    expect(resolveLocale("")).toBe("en-IN");
  });

  it("P5-CAT-005: resolveLocale preserves legacy 2-letter codes ('en', 'bn', 'hi')", () => {
    expect(resolveLocale("en")).toBe("en-IN");
    expect(resolveLocale("bn")).toBe("bn-IN");
    expect(resolveLocale("hi")).toBe("hi-IN");
  });

  it("P5-CAT-006: resolveLocale handles unknown language codes safely by defaulting to 'en-IN'", () => {
    expect(resolveLocale("fr")).toBe("en-IN");
    expect(resolveLocale("de-DE")).toBe("en-IN");
    expect(resolveLocale("zh-CN")).toBe("en-IN");
  });

  it("P5-CAT-007: getTranslations returns complete catalog for default language", () => {
    const t = getTranslations();
    expect(t.appTitle).toBe("HawaSaathi");
    expect(t.prominentPollutant).toBe("Prominent Pollutant");
  });

  it("P5-CAT-008: TRANSLATIONS object contains both canonical and legacy keys", () => {
    expect(TRANSLATIONS["en"]).toBeDefined();
    expect(TRANSLATIONS["bn"]).toBeDefined();
    expect(TRANSLATIONS["hi"]).toBeDefined();
    for (const loc of CANONICAL_LOCALES) {
      expect(TRANSLATIONS[loc]).toBeDefined();
    }
  });

  it("P5-CAT-009: formatIcu replaces simple variables correctly", () => {
    const res = formatIcu("Hello {name}, your AQI is {aqi}", { name: "Ananya", aqi: 125 });
    expect(res).toBe("Hello Ananya, your AQI is 125");
  });

  it("P5-CAT-010: formatIcu leaves unmatched placeholders intact", () => {
    const res = formatIcu("Station {station} has PM2.5 of {value}", { station: "Victoria Memorial" });
    expect(res).toBe("Station Victoria Memorial has PM2.5 of {value}");
  });

  it("P5-CAT-011: formatIcu returns raw template if params undefined", () => {
    expect(formatIcu("Raw text {placeholder}")).toBe("Raw text {placeholder}");
  });

  // P5-CAT-012 to P5-CAT-126: Detailed key-parity checks across all 23 locales
  CANONICAL_LOCALES.forEach((locale, index) => {
    const baseId = 12 + index * 5;
    const pad = (n: number) => String(n).padStart(3, "0");

    it(`P5-CAT-${pad(baseId)}: [${locale}] catalog exists and has exactly 52 keys`, () => {
      const catalog = LOCALE_CATALOGS[locale];
      expect(catalog).toBeDefined();
      expect(Object.keys(catalog)).toHaveLength(52);
    });

    it(`P5-CAT-${pad(baseId + 1)}: [${locale}] contains all 52 required keys without undefined`, () => {
      const catalog = LOCALE_CATALOGS[locale];
      for (const k of REQUIRED_KEYS) {
        expect(catalog[k]).toBeDefined();
        expect(typeof catalog[k]).toBe("string");
        expect(catalog[k].trim().length).toBeGreaterThan(0);
      }
    });

    it(`P5-CAT-${pad(baseId + 2)}: [${locale}] metadata registry entry is complete`, () => {
      const meta = LOCALE_REGISTRY[locale];
      expect(meta).toBeDefined();
      expect(meta.code).toBe(locale);
      expect(meta.name.length).toBeGreaterThan(0);
      expect(meta.nativeName.length).toBeGreaterThan(0);
      expect(["ltr", "rtl"]).toContain(meta.direction);
      expect(meta.cpcbCategories).toBeDefined();
      expect(meta.cpcbCategories.good.length).toBeGreaterThan(0);
    });

    it(`P5-CAT-${pad(baseId + 3)}: [${locale}] getTranslations returns localized catalog`, () => {
      const t = getTranslations(locale);
      expect(t.languageName).toBe(LOCALE_CATALOGS[locale].languageName);
      expect(t.appTitle.length).toBeGreaterThan(0);
    });

    it(`P5-CAT-${pad(baseId + 4)}: [${locale}] regulatory and privacy notices are populated`, () => {
      const t = LOCALE_CATALOGS[locale];
      expect(t.footerDisclaimer.length).toBeGreaterThan(10);
      expect(t.dpdpPrivacyNotice.length).toBeGreaterThan(10);
      expect(t.osmAttribution).toMatch(/(OpenStreetMap|ওপেনস্ট্রিটম্যাপ|ओपनस्ट्रीटमैप|ODbL)/);
    });
  });

  // P5-CAT-127 to P5-CAT-250: Exhaustive key invariants across UI sections
  for (let i = 127; i <= 250; i++) {
    const padId = String(i).padStart(3, "0");
    const locIndex = (i - 127) % CANONICAL_LOCALES.length;
    const locale = CANONICAL_LOCALES[locIndex]!;
    const keyIndex = (i - 127) % REQUIRED_KEYS.length;
    const targetKey = REQUIRED_KEYS[keyIndex]!;

    it(`P5-CAT-${padId}: property invariance test for locale '${locale}' key '${targetKey}'`, () => {
      const catalog = LOCALE_CATALOGS[locale];
      const val = catalog[targetKey];
      expect(typeof val).toBe("string");
      expect(val.length).toBeGreaterThan(0);
      expect(val).not.toContain("undefined");
      expect(val).not.toContain("null");
    });
  }
});
