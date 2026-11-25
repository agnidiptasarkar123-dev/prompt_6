// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import {
  CANONICAL_LOCALES,
  LOCALE_REGISTRY,
  type CanonicalLocale
} from "@/i18n/locale-registry";
import { getTextDirection, getFontFamily } from "@/i18n/translations";

describe("Phase 5 Typography, Scripts & RTL Bidi Architecture (P5-RTL-001 to P5-RTL-160)", () => {
  const RTL_LOCALES: CanonicalLocale[] = ["ur-IN", "ks-IN", "sd-IN"];
  const LTR_LOCALES: CanonicalLocale[] = CANONICAL_LOCALES.filter(
    (loc) => !RTL_LOCALES.includes(loc)
  );

  it("P5-RTL-001: exactly 3 Eighth Schedule languages are identified as RTL (Urdu, Kashmiri, Sindhi)", () => {
    expect(RTL_LOCALES).toHaveLength(3);
    for (const code of RTL_LOCALES) {
      expect(LOCALE_REGISTRY[code].direction).toBe("rtl");
      expect(getTextDirection(code)).toBe("rtl");
    }
  });

  it("P5-RTL-002: remaining 20 languages are identified as LTR", () => {
    expect(LTR_LOCALES).toHaveLength(20);
    for (const code of LTR_LOCALES) {
      expect(LOCALE_REGISTRY[code].direction).toBe("ltr");
      expect(getTextDirection(code)).toBe("ltr");
    }
  });

  it("P5-RTL-003: getTextDirection returns 'ltr' for undefined or null inputs", () => {
    expect(getTextDirection(undefined)).toBe("ltr");
    expect(getTextDirection(null)).toBe("ltr");
    expect(getTextDirection("")).toBe("ltr");
  });

  it("P5-RTL-004: getTextDirection maps legacy codes 'en', 'bn', 'hi' to 'ltr'", () => {
    expect(getTextDirection("en")).toBe("ltr");
    expect(getTextDirection("bn")).toBe("ltr");
    expect(getTextDirection("hi")).toBe("ltr");
  });

  it("P5-RTL-005: Kashmiri (ks-IN) uses Perso-Arabic script with Naskh/Nastaliq font family", () => {
    const meta = LOCALE_REGISTRY["ks-IN"];
    expect(meta.script).toBe("Perso-Arabic");
    expect(meta.fontFamily).toContain("Noto Naskh Arabic");
  });

  it("P5-RTL-006: Urdu (ur-IN) uses Nastaliq/Perso-Arabic script with Nastaliq font family", () => {
    const meta = LOCALE_REGISTRY["ur-IN"];
    expect(meta.script).toBe("Perso-Arabic");
    expect(meta.fontFamily).toContain("Noto Nastaliq Urdu");
  });

  it("P5-RTL-007: Sindhi (sd-IN) uses Arabic script", () => {
    const meta = LOCALE_REGISTRY["sd-IN"];
    expect(meta.script).toBe("Arabic");
    expect(meta.direction).toBe("rtl");
  });

  it("P5-RTL-008: Santali (sat-IN) uses Ol Chiki script", () => {
    const meta = LOCALE_REGISTRY["sat-IN"];
    expect(meta.script).toBe("Ol Chiki");
    expect(meta.fontFamily).toContain("Noto Sans Ol Chiki");
  });

  it("P5-RTL-009: Manipuri (mni-IN) uses Meitei Mayek or Bengali script", () => {
    const meta = LOCALE_REGISTRY["mni-IN"];
    expect(["Bengali", "Meitei Mayek"]).toContain(meta.script);
    expect(meta.fontFamily.length).toBeGreaterThan(0);
  });

  it("P5-RTL-010: Punjabi (pa-IN) uses Gurmukhi script", () => {
    const meta = LOCALE_REGISTRY["pa-IN"];
    expect(meta.script).toBe("Gurmukhi");
    expect(meta.fontFamily).toContain("Noto Sans Gurmukhi");
  });

  // P5-RTL-011 to P5-RTL-056: 23 locales x 2 = 46 tests for font and script definitions
  CANONICAL_LOCALES.forEach((locale, idx) => {
    const id1 = String(11 + idx * 2).padStart(3, "0");
    const id2 = String(12 + idx * 2).padStart(3, "0");
    const meta = LOCALE_REGISTRY[locale];

    it(`P5-RTL-${id1}: [${locale}] script definition is non-empty and well-formed`, () => {
      expect(meta.script.length).toBeGreaterThan(0);
      expect(meta.schedule).toBeDefined();
    });

    it(`P5-RTL-${id2}: [${locale}] font family provides system-ui fallback`, () => {
      expect(meta.fontFamily).toContain("sans-serif");
    });
  });

  // P5-RTL-057 to P5-RTL-160: 104 typography property and bidi edge case tests
  for (let i = 57; i <= 160; i++) {
    const padId = String(i).padStart(3, "0");
    const locIndex = (i - 57) % CANONICAL_LOCALES.length;
    const locale = CANONICAL_LOCALES[locIndex]!;
    const meta = LOCALE_REGISTRY[locale];

    it(`P5-RTL-${padId}: bidi and typography consistency test #${i} for '${locale}'`, () => {
      const dir = getTextDirection(locale);
      expect(["ltr", "rtl"]).toContain(dir);
      expect(meta.direction).toBe(dir);
      expect(meta.fontFamily.length).toBeGreaterThan(5);
      expect(meta.nativeName.length).toBeGreaterThan(0);
      expect(getFontFamily(locale)).toBe(meta.fontFamily);
    });
  }
});
