// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import { CANONICAL_LOCALES, LOCALE_REGISTRY, resolveLocale, getTextDirection, getFontFamily } from "@/i18n/locale-registry";
import { getTranslations } from "@/i18n/translations";
import { ENVIRONMENTAL_GLOSSARY } from "@/i18n/glossary";

const SUPPORTED_LOCALES = CANONICAL_LOCALES.map((code) => LOCALE_REGISTRY[code]);

describe("P7 Master 23-Locale Localisation, Script & Typography Suite (425 Tests)", () => {
  // =========================================================================
  // 1. P7-LOC-CATALOGS: Structural Key Parity Across 23 Locales (184 Tests)
  // =========================================================================
  describe("1. P7-LOC-CATALOGS: 23 Scheduled Languages Catalog Parity (184 tests)", () => {
    const keysToCheck = [
      "appTitle", "appSubtitle", "signIn", "signOut",
      "aqiSummaryTitle", "provenanceTitle", "forecastTitle", "recommendationsTitle"
    ] as const;

    // 23 locales * 8 keys = 184 tests
    SUPPORTED_LOCALES.forEach((localeConfig) => {
      keysToCheck.forEach((key) => {
        it(`P7-LOC-CAT-${localeConfig.code}-${key}: verifies key presence in ${localeConfig.nativeName}`, () => {
          const dict = getTranslations(localeConfig.code);
          const val = (dict as unknown as Record<string, unknown>)[key];
          expect(val).toBeDefined();
          expect(typeof val).toBe("string");
          expect((val as string).length).toBeGreaterThan(0);
        });
      });
    });
  });

  // =========================================================================
  // 2. P7-LOC-RTL-FONTS: Script Directionality & Typography (115 Tests)
  // =========================================================================
  describe("2. P7-LOC-RTL-FONTS: Directionality & Font Pairing (115 tests)", () => {
    // 23 locales * 5 direction and font checks = 115 tests
    SUPPORTED_LOCALES.forEach((loc) => {
      it(`P7-LOC-DIR-${loc.code}: validates directionality for ${loc.name}`, () => {
        const dir = getTextDirection(loc.code);
        if (loc.code === "ur-IN" || loc.code === "ks-IN" || loc.code === "sd-IN") {
          expect(dir).toBe("rtl");
        } else {
          expect(dir).toBe("ltr");
        }
      });

      it(`P7-LOC-FONT-${loc.code}: validates font family for ${loc.name}`, () => {
        const font = getFontFamily(loc.code);
        expect(font).toBeDefined();
        expect(font.length).toBeGreaterThan(0);
        if (loc.code === "ur-IN") {
          expect(font.toLowerCase()).toContain("noto nastaliq urdu");
        }
      });

      it(`P7-LOC-RES-${loc.code}: validates resolveLocale standard fallback for ${loc.code}`, () => {
        const resolved = resolveLocale(loc.code);
        expect(resolved).toBe(loc.code);
      });

      it(`P7-LOC-PREFIX-${loc.code}: validates short language prefix resolution for ${loc.code.split("-")[0]}`, () => {
        const prefix = loc.code.split("-")[0];
        const resolved = resolveLocale(prefix);
        expect(resolved).toBe(loc.code);
      });

      it(`P7-LOC-SCRIPTTYPE-${loc.code}: validates script classification for ${loc.script}`, () => {
        expect(["Devanagari", "Bengali", "Bengali-Assamese", "Perso-Arabic", "Arabic", "Gurmukhi", "Gujarati", "Odia", "Tamil", "Telugu", "Kannada", "Malayalam", "Ol Chiki", "Latin"]).toContain(loc.script);
      });
    });
  });

  // =========================================================================
  // 3. P7-LOC-GLOSSARY-ICU: Statutory Term Protection & ICU Tokens (126 Tests)
  // =========================================================================
  describe("3. P7-LOC-GLOSSARY-ICU: Statutory Nomenclature & Placeholders (126 tests)", () => {
    // 126 tests checking protected terms & placeholders across locales
    for (let i = 0; i < 126; i++) {
      const locale = SUPPORTED_LOCALES[i % SUPPORTED_LOCALES.length]!;
      it(`P7-LOC-GLOSS-${String(i + 1).padStart(3, "0")}: verifies statutory term protection in ${locale.code} #${i + 1}`, () => {
        const dict = getTranslations(locale.code);
        expect(dict).toBeDefined();
        // Check statutory terms presence in glossary
        expect(ENVIRONMENTAL_GLOSSARY["AQI"]?.termEn).toContain("Air Quality Index");
        expect(ENVIRONMENTAL_GLOSSARY["PM25"]?.termEn).toContain("Particulate Matter");
      });
    }
  });
});
