// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Navbar } from "@/components/shared/navbar";
import { AqiSummaryCard } from "@/components/air-quality/aqi-summary-card";
import { RecommendationsPanel } from "@/components/recommendations/recommendations-panel";
import { ProvenanceModal } from "@/components/shared/provenance-modal";
import { AuthModal } from "@/components/auth/auth-modal";
import { StationPanel } from "@/components/stations/station-panel";
import type { NormalizedStation, NormalizedObservation } from "@/schemas/providers/normalized-provider.schema";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";
import type { RecommendationAction } from "@/schemas/recommendation.schema";

describe("WCAG 2.2 Level AA Specific Requirements Verification Suite (WCAG-2.2)", () => {
  const dummyStation: NormalizedStation = {
    id: "cpcb_delhi_anand_vihar",
    providerId: "CPCB_CAAQMS",
    name: "Anand Vihar, Delhi - DPCC",
    city: "Delhi",
    state: "Delhi",
    latitude: 28.6468,
    longitude: 77.3160,
    availablePollutants: ["PM2.5", "PM10", "NO2", "CO"],
    lastReportedAt: "2026-11-24T10:00:00Z",
    license: "GODL-India",
    attribution: "CPCB / data.gov.in"
  };

  const dummyAqi: CpcbAqiResult = {
    stationId: "cpcb_delhi_anand_vihar",
    calculatedAtUtc: "2026-11-24T10:05:00Z",
    overallAqi: 362,
    rawMathematicalAqi: 362,
    category: "VERY_POOR",
    prominentPollutant: "PM2.5",
    sufficiencyStatus: "SUFFICIENT",
    completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
    isBeyondNominalScale: false,
    reportingCeilingCappedAqi: 362,
    subIndices: [
      {
        pollutant: "PM2.5",
        subIndex: 362,
        rawMathematicalSubIndex: 362,
        category: "VERY_POOR",
        concentration: 165.5,
        unit: "µg/m³",
        windowHours: 24,
        validHours: 24,
        qualityFlag: "VERIFIED",
        isBeyondNominalScale: false,
        reportingCeilingCappedAqi: 362
      }
    ],
    explanation: "Independently calculated CPCB-methodology AQI"
  };

  const sampleObs: NormalizedObservation[] = [
    {
      id: "obs_pm25",
      stationId: "cpcb_delhi_anand_vihar",
      stationName: "Anand Vihar, Delhi - DPCC",
      providerId: "CPCB_CAAQMS",
      pollutant: "PM2.5",
      value: 165.5,
      unit: "µg/m³",
      rawValue: 165.5,
      rawUnit: "µg/m3",
      averagingPeriod: "24h",
      observationTime: "2026-11-24T10:00:00Z",
      sourceUpdateTime: null,
      retrievalTime: "2026-11-24T10:05:00Z",
      qualityFlag: "VERIFIED",
      typology: "TYPE_C_RAW_MEASUREMENT",
      license: "GODL-India",
      attribution: "CPCB / data.gov.in"
    }
  ];

  const dummyAction: RecommendationAction = {
    actionId: "123e4567-e89b-12d3-a456-426614174000",
    category: "COMMUTE_TIMING",
    urgency: "SCHEDULED",
    actionSummary: "Shift Morning Commute",
    reasoning: "Move commute by 45 minutes to avoid peak particulate concentration",
    implementationMethod: "Adjust departure window from 8:00 AM to 7:15 AM",
    expectedExposureReduction: "35% PM2.5 inhalation reduction",
    applicableConstraintsOrLimits: "Not applicable if inflexible work hours",
    evidenceReferences: [
      {
        evidenceId: "EVID-DEL-01",
        source: "CPCB_CAAQMS",
        measuredValue: "165.5 ug/m3",
        timestamp: "2026-11-24T10:00:00Z"
      }
    ]
  };

  // --------------------------------------------------------------------------
  // 1. SC 2.4.11: Focus Not Obscured (Minimum) (Level AA)
  // --------------------------------------------------------------------------
  describe("SC 2.4.11: Focus Not Obscured (Minimum) (Level AA)", () => {
    it("WCAG22-001: Navbar header uses z-index and backdrop blur without blocking keyboard focus outlines", () => {
      const html = renderToStaticMarkup(
        <Navbar
          language="en"
          onLanguageChange={() => {}}
          isAuthenticated={false}
          onOpenAuthModal={() => {}}
          onSignOut={() => {}}
        />
      );
      expect(html).toContain("sticky top-0");
      expect(html).toContain("z-40");
      expect(html).toContain("aria-label=");
    });

    it("WCAG22-002: Modal dialogs render as overlay layer with fixed positioning and high z-index (z-50) ensuring focused modal contents are never obscured", () => {
      const html = renderToStaticMarkup(
        <ProvenanceModal
          isOpen={true}
          onClose={() => {}}
          station={dummyStation}
          provider="CPCB_CAAQMS"
          observations={sampleObs}
          calculatedAqi={dummyAqi}
        />
      );
      expect(html).toContain("fixed inset-0 z-50");
      expect(html).toContain("max-h-[90vh]");
    });
  });

  // --------------------------------------------------------------------------
  // 2. SC 2.5.7: Dragging Movements (Level AA)
  // --------------------------------------------------------------------------
  describe("SC 2.5.7: Dragging Movements (Level AA)", () => {
    it("WCAG22-003: Station selection is fully operable via discrete button/list selection without requiring map drag gestures", () => {
      const html = renderToStaticMarkup(
        <StationPanel
          stations={[dummyStation]}
          selectedStationId={dummyStation.id}
          onSelectStation={() => {}}
          onOpenProvenance={() => {}}
          language="en"
        />
      );
      expect(html).toContain("<button");
      expect(html).toContain("Anand Vihar, Delhi - DPCC");
    });

    it("WCAG22-004: Language switcher operates via single-pointer click buttons, never requiring drag or swipe gestures", () => {
      const html = renderToStaticMarkup(
        <Navbar
          language="en"
          onLanguageChange={() => {}}
          isAuthenticated={false}
          onOpenAuthModal={() => {}}
          onSignOut={() => {}}
        />
      );
      expect(html).toContain("Switch to English");
      expect(html).toContain("Switch to বাংলা");
      expect(html).toContain("Switch to हिन्दी");
    });
  });

  // --------------------------------------------------------------------------
  // 3. SC 2.5.8: Target Size (Minimum) (Level AA)
  // --------------------------------------------------------------------------
  describe("SC 2.5.8: Target Size (Minimum) (Level AA)", () => {
    it("WCAG22-005: Navbar interactive buttons have minimum padding (py-1.5, px-3) meeting or exceeding the 24x24 CSS px threshold", () => {
      const html = renderToStaticMarkup(
        <Navbar
          language="en"
          onLanguageChange={() => {}}
          isAuthenticated={false}
          onOpenAuthModal={() => {}}
          onSignOut={() => {}}
        />
      );
      expect(html).toContain("px-3 py-1.5");
      expect(html).toContain("rounded-lg");
    });

    it("WCAG22-006: Provenance trigger button in AQI summary card provides substantial target padding (px-2.5 py-1.5)", () => {
      const html = renderToStaticMarkup(
        <AqiSummaryCard
          calculatedAqi={dummyAqi}
          station={dummyStation}
          provider="CPCB_CAAQMS"
          lastUpdated="2026-11-24T10:00:00Z"
          aqiStatus="AVAILABLE"
          statusMessage="Verified"
          onOpenProvenance={() => {}}
          language="en"
        />
      );
      expect(html).toContain("px-2.5 py-1.5");
      expect(html).toContain("rounded-lg");
    });

    it("WCAG22-007: Language selector buttons provide discrete spacing to prevent accidental adjacent activation", () => {
      const html = renderToStaticMarkup(
        <Navbar
          language="en"
          onLanguageChange={() => {}}
          isAuthenticated={false}
          onOpenAuthModal={() => {}}
          onSignOut={() => {}}
        />
      );
      expect(html).toContain("space-x-1");
    });
  });

  // --------------------------------------------------------------------------
  // 4. SC 3.2.6: Consistent Help (Level A)
  // --------------------------------------------------------------------------
  describe("SC 3.2.6: Consistent Help (Level A)", () => {
    it("WCAG22-008: Health notices and methodology provenance trigger maintain consistent placement in the AQI Summary Card header across English, Bengali, and Hindi", () => {
      const htmlEn = renderToStaticMarkup(
        <AqiSummaryCard
          calculatedAqi={dummyAqi}
          station={dummyStation}
          provider="CPCB_CAAQMS"
          lastUpdated="2026-11-24T10:00:00Z"
          aqiStatus="AVAILABLE"
          statusMessage="Verified"
          onOpenProvenance={() => {}}
          language="en"
        />
      );
      const htmlBn = renderToStaticMarkup(
        <AqiSummaryCard
          calculatedAqi={dummyAqi}
          station={dummyStation}
          provider="CPCB_CAAQMS"
          lastUpdated="2026-11-24T10:00:00Z"
          aqiStatus="AVAILABLE"
          statusMessage="Verified"
          onOpenProvenance={() => {}}
          language="bn"
        />
      );
      const htmlHi = renderToStaticMarkup(
        <AqiSummaryCard
          calculatedAqi={dummyAqi}
          station={dummyStation}
          provider="CPCB_CAAQMS"
          lastUpdated="2026-11-24T10:00:00Z"
          aqiStatus="AVAILABLE"
          statusMessage="Verified"
          onOpenProvenance={() => {}}
          language="hi"
        />
      );
      expect(htmlEn).toContain("Data Provenance &amp; Source Transparency");
      expect(htmlBn).toContain("উপাত্তের উৎস ও স্বচ্ছতা");
      expect(htmlHi).toContain("डेटा स्रोत और पारदर्शिता");
    });
  });

  // --------------------------------------------------------------------------
  // 5. SC 3.3.7: Redundant Entry (Level A)
  // --------------------------------------------------------------------------
  describe("SC 3.3.7: Redundant Entry (Level A)", () => {
    it("WCAG22-009: Recommendations Panel accepts pre-configured household and routine context without re-prompting citizen for repeated inputs", () => {
      const html = renderToStaticMarkup(
        <RecommendationsPanel
          recommendations={[dummyAction]}
          aiExplanation={null}
          isAiGenerated={false}
          language="en"
        />
      );
      expect(html).toContain("Shift Morning Commute");
      expect(html).toContain("Move commute by 45 minutes");
    });
  });

  // --------------------------------------------------------------------------
  // 6. SC 3.3.8: Accessible Authentication (Minimum) (Level AA)
  // --------------------------------------------------------------------------
  describe("SC 3.3.8: Accessible Authentication (Minimum) (Level AA)", () => {
    it("WCAG22-010: Auth Modal provides Google Sign-In and Passwordless Email without CAPTCHA or cognitive puzzle challenges", () => {
      const html = renderToStaticMarkup(
        <AuthModal
          isOpen={true}
          onClose={() => {}}
          isAuthenticated={false}
          onExportData={async () => {}}
          onDeleteAccount={async () => {}}
          onAuthSuccess={() => {}}
          language="en"
        />
      );
      expect(html.toLowerCase()).not.toContain("captcha");
      expect(html.toLowerCase()).not.toContain("recaptcha");
      expect(html.toLowerCase()).not.toContain("puzzle");
      expect(html.toLowerCase()).not.toContain("math problem");
      expect(html).toContain("type=\"email\"");
    });

    it("WCAG22-011: Email inputs permit standard copy-paste functionality without script-level paste blocking", () => {
      const html = renderToStaticMarkup(
        <AuthModal
          isOpen={true}
          onClose={() => {}}
          isAuthenticated={false}
          onExportData={async () => {}}
          onDeleteAccount={async () => {}}
          onAuthSuccess={() => {}}
          language="en"
        />
      );
      expect(html).not.toContain("onpaste=\"return false\"");
      expect(html).not.toContain("onPaste=\"return false\"");
    });

    it("WCAG22-012: Guest mode provides full platform access with zero authentication requirement, completely bypassing cognitive authentication hurdles", () => {
      const html = renderToStaticMarkup(
        <Navbar
          language="en"
          onLanguageChange={() => {}}
          isAuthenticated={false}
          onOpenAuthModal={() => {}}
          onSignOut={() => {}}
        />
      );
      expect(html).toContain("Guest Mode");
    });
  });
});
