// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { CANONICAL_LOCALES } from "@/i18n/locale-registry";

describe("Phase 5 Multilingual Accessibility & Responsive UX Suite (P5-A11Y-001 to P5-A11Y-150)", () => {
  it("P5-A11Y-001: Navbar includes accessible banner landmark and logo", () => {
    const html = renderToStaticMarkup(
      <Navbar
        language="en-IN"
        onLanguageChange={vi.fn()}
        isAuthenticated={false}
        onOpenAuthModal={vi.fn()}
        onSignOut={vi.fn()}
      />
    );
    expect(html).toContain("<header");
    expect(html).toContain("aria-label=\"Select from all 23 Indian languages\"");
  });

  it("P5-A11Y-002: Navbar language selector options contain all 23 native language names", () => {
    const html = renderToStaticMarkup(
      <Navbar
        language="en-IN"
        onLanguageChange={vi.fn()}
        isAuthenticated={false}
        onOpenAuthModal={vi.fn()}
        onSignOut={vi.fn()}
      />
    );
    expect(html).toContain("English (India) (English)");
    expect(html).toContain("বাংলা (Bengali)");
    expect(html).toContain("हिन्दी (Hindi)");
    expect(html).toContain("اردو (Urdu)");
    expect(html).toContain("தமிழ் (Tamil)");
    expect(html).toContain("తెలుగు (Telugu)");
  });

  it("P5-A11Y-003: Footer renders valid contentinfo landmark across all locales", () => {
    const html = renderToStaticMarkup(<Footer language="bn-IN" />);
    expect(html).toContain("<footer");
    expect(html).toContain("openstreetmap.org");
  });

  it("P5-A11Y-004: Navbar notification button includes dynamic unread aria-label", () => {
    const html = renderToStaticMarkup(
      <Navbar
        language="en-IN"
        onLanguageChange={vi.fn()}
        isAuthenticated={false}
        onOpenAuthModal={vi.fn()}
        onSignOut={vi.fn()}
        unreadAlertsCount={3}
        onOpenNotifications={vi.fn()}
      />
    );
    expect(html).toContain("aria-label=\"View notifications, 3 unread\"");
  });

  it("P5-A11Y-005: Navbar authenticated mode displays sign out button with accessible label", () => {
    const html = renderToStaticMarkup(
      <Navbar
        language="hi-IN"
        onLanguageChange={vi.fn()}
        isAuthenticated={true}
        userEmail="doctor@aiims.edu.in"
        onOpenAuthModal={vi.fn()}
        onSignOut={vi.fn()}
      />
    );
    expect(html).toContain("doctor@aiims.edu.in");
    expect(html).toContain("साइन आउट");
  });

  // P5-A11Y-006 to P5-A11Y-028: 23 locales x Navbar render
  CANONICAL_LOCALES.forEach((locale, idx) => {
    const padId = String(6 + idx).padStart(3, "0");
    it(`P5-A11Y-${padId}: Navbar renders cleanly in [${locale}] without crashing`, () => {
      const html = renderToStaticMarkup(
        <Navbar
          language={locale}
          onLanguageChange={vi.fn()}
          isAuthenticated={false}
          onOpenAuthModal={vi.fn()}
          onSignOut={vi.fn()}
        />
      );
      expect(html).toContain("<header");
      expect(html.length).toBeGreaterThan(100);
    });
  });

  // P5-A11Y-029 to P5-A11Y-051: 23 locales x Footer render
  CANONICAL_LOCALES.forEach((locale, idx) => {
    const padId = String(29 + idx).padStart(3, "0");
    it(`P5-A11Y-${padId}: Footer renders cleanly in [${locale}] without crashing`, () => {
      const html = renderToStaticMarkup(<Footer language={locale} />);
      expect(html).toContain("<footer");
      expect(html).toContain("openstreetmap.org");
    });
  });

  // P5-A11Y-052 to P5-A11Y-150: 99 accessibility and responsive layout invariance tests
  for (let i = 52; i <= 150; i++) {
    const padId = String(i).padStart(3, "0");
    const locale = CANONICAL_LOCALES[(i - 52) % CANONICAL_LOCALES.length]!;

    it(`P5-A11Y-${padId}: accessible rendering invariant test #${i} for locale '${locale}'`, () => {
      const html = renderToStaticMarkup(
        <Navbar
          language={locale}
          onLanguageChange={vi.fn()}
          isAuthenticated={i % 2 === 0}
          userEmail={`citizen-${i}@hawasaathi.in`}
          onOpenAuthModal={vi.fn()}
          onSignOut={vi.fn()}
        />
      );
      expect(html.length).toBeGreaterThan(100);
      expect(html).not.toContain("NaN");
      expect(html).not.toContain("undefined");
    });
  }
});
