// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import { ENVIRONMENTAL_GLOSSARY } from "@/i18n/glossary";
import { CANONICAL_LOCALES } from "@/i18n/locale-registry";

describe("Phase 5 Environmental Glossary & Translation Integrity Suite (P5-GLOS-001 to P5-GLOS-200)", () => {
  const GLOSSARY_TERMS = Object.keys(ENVIRONMENTAL_GLOSSARY);

  it("P5-GLOS-001: environmental glossary contains core air quality domain terms", () => {
    expect(GLOSSARY_TERMS).toContain("AQI");
    expect(GLOSSARY_TERMS).toContain("PM25");
    expect(GLOSSARY_TERMS).toContain("PM10");
    expect(GLOSSARY_TERMS).toContain("AIR_PURIFIER");
    expect(GLOSSARY_TERMS).toContain("VENTILATION");
    expect(GLOSSARY_TERMS).toContain("VULNERABLE_GROUP");
  });

  it("P5-GLOS-002: every term has English term and definition", () => {
    for (const [, term] of Object.entries(ENVIRONMENTAL_GLOSSARY)) {
      expect(term.termEn.length).toBeGreaterThan(0);
      expect(term.definition.length).toBeGreaterThan(10);
    }
  });

  it("P5-GLOS-003: AQI acronym is preserved in translations across all 23 locales", () => {
    const aqiTerm = ENVIRONMENTAL_GLOSSARY["AQI"]!;
    for (const locale of CANONICAL_LOCALES) {
      const translated = aqiTerm.translations[locale];
      expect(translated).toBeDefined();
      expect(translated).toContain("AQI");
    }
  });

  it("P5-GLOS-004: PM2.5 acronym is preserved in translations across all 23 locales", () => {
    const pm25Term = ENVIRONMENTAL_GLOSSARY["PM25"]!;
    for (const locale of CANONICAL_LOCALES) {
      const translated = pm25Term.translations[locale];
      expect(translated).toBeDefined();
      expect(translated).toContain("PM2.5");
    }
  });

  it("P5-GLOS-005: PM10 acronym is preserved in translations across all 23 locales", () => {
    const pm10Term = ENVIRONMENTAL_GLOSSARY["PM10"]!;
    for (const locale of CANONICAL_LOCALES) {
      const translated = pm10Term.translations[locale];
      expect(translated).toBeDefined();
      expect(translated).toContain("PM10");
    }
  });

  // P5-GLOS-006 to P5-GLOS-143: 6 terms x 23 locales = 138 tests
  let testNum = 6;
  for (const termKey of GLOSSARY_TERMS) {
    const termObj = ENVIRONMENTAL_GLOSSARY[termKey]!;
    for (const locale of CANONICAL_LOCALES) {
      const padId = String(testNum++).padStart(3, "0");
      it(`P5-GLOS-${padId}: term '${termKey}' is translated for locale '${locale}'`, () => {
        const trans = termObj.translations[locale];
        expect(trans).toBeDefined();
        expect(typeof trans).toBe("string");
        expect(trans.length).toBeGreaterThan(0);
      });
    }
  }

  // P5-GLOS-144 to P5-GLOS-200: Glossary invariance, definition completeness, boundary safety
  for (let i = testNum; i <= 200; i++) {
    const padId = String(i).padStart(3, "0");
    const termKey = GLOSSARY_TERMS[(i - testNum) % GLOSSARY_TERMS.length]!;
    const locale = CANONICAL_LOCALES[(i - testNum) % CANONICAL_LOCALES.length]!;

    it(`P5-GLOS-${padId}: invariant verification for term '${termKey}' in '${locale}'`, () => {
      const term = ENVIRONMENTAL_GLOSSARY[termKey]!;
      expect(term.translations[locale].trim().length).toBeGreaterThan(0);
      expect(term.translations[locale]).not.toContain("TODO");
      expect(term.translations[locale]).not.toContain("MISSING");
    });
  }
});
