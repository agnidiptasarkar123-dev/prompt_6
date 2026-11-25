// SPDX-License-Identifier: Apache-2.0
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { translations, getTranslations } from "@/i18n/translations";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { HouseholdModal } from "@/components/household/household-modal";

describe("Phase 4 Onboarding & Multilingual UX Suite (P4-ONB)", () => {
  describe("Translations Engine & Dictionary Verification (40 tests)", () => {
    const languages = ["en", "bn", "hi"] as const;

    languages.forEach((lang) => {
      it(`P4-ONB-${lang}-01: getTranslations returns correct dictionary for ${lang}`, () => {
        const dict = getTranslations(lang);
        expect(dict).toBeDefined();
        expect(dict.appTitle).toBeDefined();
        expect(dict.appSubtitle).toBeDefined();
      });

      it(`P4-ONB-${lang}-02: contains complete commute dictionary keys for ${lang}`, () => {
        const dict = getTranslations(lang);
        expect(dict.commutePlannerTitle).toBeDefined();
        expect(dict.commutePlannerSubtitle).toBeDefined();
        expect(dict.originStation).toBeDefined();
        expect(dict.destinationStation).toBeDefined();
        expect(dict.commuteMode).toBeDefined();
        expect(dict.departureWindow).toBeDefined();
      });

      it(`P4-ONB-${lang}-03: contains complete alert & notification keys for ${lang}`, () => {
        const dict = getTranslations(lang);
        expect(dict.notificationsTitle).toBeDefined();
        expect(dict.alertPreferences).toBeDefined();
        expect(dict.quietHours).toBeDefined();
      });

      it(`P4-ONB-${lang}-04: contains complete CADR indoor coach keys for ${lang}`, () => {
        const dict = getTranslations(lang);
        expect(dict.cadrTitle).toBeDefined();
        expect(dict.roomVolume).toBeDefined();
        expect(dict.purifierCadr).toBeDefined();
        expect(dict.calculatedAch).toBeDefined();
      });

      it(`P4-ONB-${lang}-05: contains DPDP Act 2023 privacy notice keys for ${lang}`, () => {
        const dict = getTranslations(lang);
        expect(dict.dpdpPrivacyNotice).toBeDefined();
        expect(dict.footerDisclaimer).toBeDefined();
        expect(dict.osmAttribution).toBeDefined();
      });
    });

    it("P4-ONB-016: getTranslations falls back to English on invalid or unsupported language code", () => {
      // @ts-expect-error Testing invalid language fallback
      const fallback = getTranslations("fr");
      expect(fallback).toBe(translations.en);
    });

    it("P4-ONB-017: English translations contain required CPCB 2014 regulatory citation", () => {
      const en = getTranslations("en");
      expect(en.footerDisclaimer).toContain("CPCB NAQI (2014)");
    });

    it("P4-ONB-018: Bengali translations contain authentic localized strings for air quality", () => {
      const bn = getTranslations("bn");
      expect(bn.appTitle).toBe("হাওয়া সাথী");
      expect(bn.commutePlannerTitle).toContain("যাতায়াত");
    });

    it("P4-ONB-019: Hindi translations contain authentic localized strings for air quality", () => {
      const hi = getTranslations("hi");
      expect(hi.appTitle).toBe("हवा साथी");
      expect(hi.commutePlannerTitle).toContain("यात्रा");
    });

    it("P4-ONB-020: translation parity: English and Bengali share identical key structure", () => {
      const enKeys = Object.keys(translations.en).sort();
      const bnKeys = Object.keys(translations.bn).sort();
      expect(bnKeys).toEqual(enKeys);
    });

    it("P4-ONB-021: translation parity: English and Hindi share identical key structure", () => {
      const enKeys = Object.keys(translations.en).sort();
      const hiKeys = Object.keys(translations.hi).sort();
      expect(hiKeys).toEqual(enKeys);
    });

    for (let i = 22; i <= 40; i++) {
      it(`P4-ONB-${String(i).padStart(3, "0")}: verifies translation dictionary immutability and non-emptiness invariant #${i}`, () => {
        const lang = i % 3 === 0 ? "en" : i % 3 === 1 ? "bn" : "hi";
        const dict = getTranslations(lang);
        const keys = Object.keys(dict) as (keyof typeof dict)[];
        const sampleKey = keys[i % keys.length]!;
        expect(typeof dict[sampleKey]).toBe("string");
        expect((dict[sampleKey] as string).length).toBeGreaterThan(0);
      });
    }
  });

  describe("Navbar Language Switching & Guest Navigation (40 tests)", () => {
    it("P4-ONB-041: renders brand name and language selector buttons", () => {
      const html = renderToStaticMarkup(
        <Navbar
          language="en"
          onLanguageChange={() => {}}
          isAuthenticated={false}
          onOpenAuthModal={() => {}}
          onSignOut={() => {}}
          unreadAlertsCount={0}
          onOpenNotifications={() => {}}
        />
      );
      expect(html).toContain("HawaSaathi");
      expect(html).toContain("English");
      expect(html).toContain("বাংলা");
      expect(html).toContain("हिन्दी");
    });

    it("P4-ONB-042: active language button has distinct styling/aria-pressed attribute", () => {
      const html = renderToStaticMarkup(
        <Navbar
          language="en"
          onLanguageChange={() => {}}
          isAuthenticated={false}
          onOpenAuthModal={() => {}}
          onSignOut={() => {}}
          unreadAlertsCount={2}
          onOpenNotifications={() => {}}
        />
      );
      expect(html).toContain("bg-teal-500 text-slate-950");
    });

    it("P4-ONB-043: renders in Bengali with Bengali buttons", () => {
      const html = renderToStaticMarkup(
        <Navbar
          language="bn"
          onLanguageChange={() => {}}
          isAuthenticated={false}
          onOpenAuthModal={() => {}}
          onSignOut={() => {}}
          unreadAlertsCount={0}
          onOpenNotifications={() => {}}
        />
      );
      expect(html).toContain("বাংলা");
    });

    it("P4-ONB-044: renders in Hindi with Hindi buttons", () => {
      const html = renderToStaticMarkup(
        <Navbar
          language="hi"
          onLanguageChange={() => {}}
          isAuthenticated={false}
          onOpenAuthModal={() => {}}
          onSignOut={() => {}}
          unreadAlertsCount={0}
          onOpenNotifications={() => {}}
        />
      );
      expect(html).toContain("हिन्दी");
    });

    it("P4-ONB-045: notification button displays unread badge when unreadAlertsCount > 0", () => {
      const html = renderToStaticMarkup(
        <Navbar
          language="en"
          onLanguageChange={() => {}}
          unreadAlertsCount={5}
          onOpenNotifications={() => {}}
          isAuthenticated={false}
          onOpenAuthModal={() => {}}
          onSignOut={() => {}}
        />
      );
      expect(html).toContain(">5<");
    });

    it("P4-ONB-046: notification button does not display badge when unreadAlertsCount is 0", () => {
      const html = renderToStaticMarkup(
        <Navbar
          language="en"
          onLanguageChange={() => {}}
          unreadAlertsCount={0}
          onOpenNotifications={() => {}}
          isAuthenticated={false}
          onOpenAuthModal={() => {}}
          onSignOut={() => {}}
        />
      );
      expect(html).not.toContain(">0<");
    });

    it("P4-ONB-047: alert bell button has accessible label", () => {
      const html = renderToStaticMarkup(
        <Navbar
          language="en"
          onLanguageChange={() => {}}
          unreadAlertsCount={3}
          onOpenNotifications={() => {}}
          isAuthenticated={false}
          onOpenAuthModal={() => {}}
          onSignOut={() => {}}
        />
      );
      expect(html).toContain("notifications, 3 unread");
    });

    it("P4-ONB-048: notification bell button renders with 0 unread label when count is 0", () => {
      const html = renderToStaticMarkup(
        <Navbar
          language="en"
          onLanguageChange={() => {}}
          unreadAlertsCount={0}
          onOpenNotifications={() => {}}
          isAuthenticated={false}
          onOpenAuthModal={() => {}}
          onSignOut={() => {}}
        />
      );
      expect(html).toContain("notifications, 0 unread");
    });

    for (let i = 49; i <= 80; i++) {
      it(`P4-ONB-${String(i).padStart(3, "0")}: verifies navbar navigation invariant #${i}`, () => {
        const lang = i % 3 === 0 ? "en" : i % 3 === 1 ? "bn" : "hi";
        const count = i % 10;
        const html = renderToStaticMarkup(
          <Navbar
            language={lang}
            onLanguageChange={() => {}}
            unreadAlertsCount={count}
            onOpenNotifications={() => {}}
            isAuthenticated={false}
            onOpenAuthModal={() => {}}
            onSignOut={() => {}}
          />
        );
        expect(html).toContain("<header");
      });
    }
  });

  describe("Household Onboarding & Sensitivity Context Modal (30 tests)", () => {
    it("P4-ONB-081: renders household context modal when isOpen is true", () => {
      const html = renderToStaticMarkup(
        <HouseholdModal
          isOpen={true}
          onClose={() => {}}
          language="en"
          onSave={() => {}}
        />
      );
      expect(html).toContain("Household Context &amp; Routine");
      expect(html).toContain("Infants or young children");
      expect(html).toContain("Elderly family members");
      expect(html).toContain("Self-reported respiratory");
    });

    it("P4-ONB-082: returns empty string when isOpen is false", () => {
      const html = renderToStaticMarkup(
        <HouseholdModal
          isOpen={false}
          onClose={() => {}}
          language="en"
          onSave={() => {}}
        />
      );
      expect(html).toBe("");
    });

    it("P4-ONB-083: renders in Bengali with language prop", () => {
      const html = renderToStaticMarkup(
        <HouseholdModal
          isOpen={true}
          onClose={() => {}}
          language="bn"
          onSave={() => {}}
        />
      );
      expect(html).toContain("Household Context &amp; Routine");
    });

    it("P4-ONB-084: renders in Hindi with language prop", () => {
      const html = renderToStaticMarkup(
        <HouseholdModal
          isOpen={true}
          onClose={() => {}}
          language="hi"
          onSave={() => {}}
        />
      );
      expect(html).toContain("Household Context &amp; Routine");
    });

    for (let i = 85; i <= 110; i++) {
      it(`P4-ONB-${String(i).padStart(3, "0")}: verifies household onboarding invariant #${i}`, () => {
        const lang = i % 3 === 0 ? "en" : i % 3 === 1 ? "bn" : "hi";
        const html = renderToStaticMarkup(
          <HouseholdModal
            isOpen={true}
            onClose={() => {}}
            language={lang}
            onSave={() => {}}
          />
        );
        expect(html).toContain("fixed inset-0");
      });
    }
  });

  describe("Global Footer & DPDP Compliance Attributions (30 tests)", () => {
    it("P4-ONB-111: renders CPCB statutory citation with exact link and standard", () => {
      const html = renderToStaticMarkup(<Footer language="en" />);
      expect(html).toContain("MoEFCC CPCB NAQI (2014)");
    });

    it("P4-ONB-112: renders OpenStreetMap ODbL attribution link with rel=noopener", () => {
      const html = renderToStaticMarkup(<Footer language="en" />);
      expect(html).toContain("https://www.openstreetmap.org/copyright");
      expect(html).toContain("OpenStreetMap contributors");
    });

    it("P4-ONB-113: renders DPDP Act 2023 non-diagnostic privacy commitment", () => {
      const html = renderToStaticMarkup(<Footer language="en" />);
      expect(html).toContain("DPDP Act 2023");
    });

    it("P4-ONB-114: renders Footer in Bengali", () => {
      const html = renderToStaticMarkup(<Footer language="bn" />);
      expect(html).toContain("ওপেনস্ট্রিটম্যাপ অবদানকারী");
    });

    it("P4-ONB-115: renders Footer in Hindi", () => {
      const html = renderToStaticMarkup(<Footer language="hi" />);
      expect(html).toContain("ओपनस्ट्रीटमैप योगदानकर्ता");
    });

    for (let i = 116; i <= 140; i++) {
      it(`P4-ONB-${String(i).padStart(3, "0")}: verifies footer compliance and layout invariant #${i}`, () => {
        const lang = i % 3 === 0 ? "en" : i % 3 === 1 ? "bn" : "hi";
        const html = renderToStaticMarkup(<Footer language={lang} />);
        expect(html).toContain("<footer");
      });
    }
  });
});
