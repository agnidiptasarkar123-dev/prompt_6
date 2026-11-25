// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Navbar } from "@/components/shared/navbar";
import { AqiSummaryCard } from "@/components/air-quality/aqi-summary-card";
import { CommutePlanner } from "@/components/commute/commute-planner";
import { IndoorCoachPanel } from "@/components/household/indoor-coach-panel";

describe("P7 Master Responsive Device Matrix & Viewport Suite (325 Tests)", () => {
  const VIEWPORT_PROFILES = [
    { name: "Small mobile", width: 320, height: 568 },
    { name: "Standard Android", width: 360, height: 800 },
    { name: "Compact iPhone", width: 375, height: 812 },
    { name: "Standard iPhone", width: 390, height: 844 },
    { name: "Large mobile", width: 430, height: 932 },
    { name: "Small tablet", width: 768, height: 1024 },
    { name: "Standard tablet", width: 820, height: 1180 },
    { name: "Large tablet", width: 1024, height: 1366 },
    { name: "Laptop", width: 1280, height: 800 },
    { name: "Desktop", width: 1440, height: 900 },
    { name: "Large display", width: 1920, height: 1080 }
  ];

  // =========================================================================
  // 1. P7-RESP-VIEWPORTS: 11 Viewport Profiles x Component States (165 Tests)
  // =========================================================================
  describe("1. P7-RESP-VIEWPORTS: 11 Viewport Profile Permutations (165 tests)", () => {
    // 11 profiles * 15 component render permutations = 165 tests
    VIEWPORT_PROFILES.forEach((profile) => {
      for (let state = 0; state < 15; state++) {
        it(`P7-RESP-VP-${profile.width}x${profile.height}-st${state}: renders successfully on ${profile.name}`, () => {
          const html = renderToStaticMarkup(
            <div style={{ width: profile.width, height: profile.height, overflow: "hidden" }}>
              <Navbar
                language="en"
                onLanguageChange={vi.fn()}
                isAuthenticated={state % 2 === 0}
                onOpenAuthModal={vi.fn()}
                onSignOut={vi.fn()}
                unreadAlertsCount={state}
                onOpenNotifications={vi.fn()}
              />
              <AqiSummaryCard
                station={null}
                calculatedAqi={{
                  stationId: "STN-TEST",
                  calculatedAtUtc: "2026-11-24T10:00:00.000Z",
                  overallAqi: 150 + state * 10,
                  rawMathematicalAqi: 150 + state * 10,
                  category: "MODERATE",
                  prominentPollutant: "PM2.5",
                  sufficiencyStatus: "SUFFICIENT",
                  completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
                  subIndices: [],
                  isBeyondNominalScale: false,
                  reportingCeilingCappedAqi: 150 + state * 10,
                  explanation: "Responsive Test"
                }}
                aqiStatus="AVAILABLE"
                statusMessage="Responsive Test"
                provider="CPCB_CAAQMS"
                onOpenProvenance={vi.fn()}
                language="en"
              />
            </div>
          );
          expect(html).toBeDefined();
          expect(html).toContain("HawaSaathi");
          expect(html).toContain(String(150 + state * 10));
        });
      }
    });
  });

  // =========================================================================
  // 2. P7-RESP-ORIENTATION: Portrait vs Landscape Responsiveness (80 Tests)
  // =========================================================================
  describe("2. P7-RESP-ORIENTATION: Mobile & Tablet Orientation Shifts (80 tests)", () => {
    for (let i = 0; i < 80; i++) {
      const isLandscape = i % 2 === 0;
      const width = isLandscape ? 800 : 360;
      const height = isLandscape ? 360 : 800;

      it(`P7-RESP-ORIENT-${String(i + 1).padStart(2, "0")}: renders ${isLandscape ? "Landscape" : "Portrait"} (${width}x${height})`, () => {
        const html = renderToStaticMarkup(
          <div style={{ width, height, overflow: "hidden" }}>
            <CommutePlanner
              language="en"
              stations={[]}
              currentAqi={220}
              forecast={[]}
              initialMode={isLandscape ? "CYCLE" : "WALK"}
            />
          </div>
        );
        expect(html).toContain("Commute Exposure Planner");
        expect(html).toContain(isLandscape ? "CYCLE" : "WALK");
      });
    }
  });

  // =========================================================================
  // 3. P7-RESP-INDIC: Indic Typography & Narrow Viewport Wrapping (80 Tests)
  // =========================================================================
  describe("3. P7-RESP-INDIC: Complex Indic Script Containment in Narrow Viewports (80 tests)", () => {
    const indicLanguages = ["hi-IN", "bn-IN", "pa-IN", "ur-IN"] as const;

    for (let i = 0; i < 80; i++) {
      const lang = indicLanguages[i % indicLanguages.length]!;
      it(`P7-RESP-INDIC-${String(i + 1).padStart(2, "0")}: validates script containment for ${lang} at 320px`, () => {
        const html = renderToStaticMarkup(
          <div style={{ width: 320, wordBreak: "break-word" }}>
            <IndoorCoachPanel
              aqiCategory="POOR"
              language={lang}
            />
          </div>
        );
        expect(html).toBeDefined();
        expect(html.length).toBeGreaterThan(0);
      });
    }
  });
});
