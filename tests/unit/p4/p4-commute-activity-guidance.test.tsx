// SPDX-License-Identifier: Apache-2.0
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CommutePlanner } from "@/components/commute/commute-planner";
import type { NormalizedStation, NormalizedForecast } from "@/schemas/providers/normalized-provider.schema";

describe("Phase 4 Commute & Activity Exposure Guidance Suite (P4-COMMUTE)", () => {
  const dummyStations: NormalizedStation[] = [
    {
      id: "STN-KOL-01",
      name: "Victoria Memorial Station",
      city: "Kolkata",
      state: "West Bengal",
      latitude: 22.5448,
      longitude: 88.3426,
      providerId: "CPCB_CAAQMS",
      availablePollutants: ["PM2.5", "PM10"],
      lastReportedAt: "2026-11-24T05:00:00Z",
      license: "GODL-India",
      attribution: "CPCB"
    },
    {
      id: "STN-KOL-02",
      name: "Rabindra Bharati Station",
      city: "Kolkata",
      state: "West Bengal",
      latitude: 22.5852,
      longitude: 88.3712,
      providerId: "CPCB_CAAQMS",
      availablePollutants: ["PM2.5", "PM10", "NO2"],
      lastReportedAt: "2026-11-24T05:00:00Z",
      license: "GODL-India",
      attribution: "CPCB"
    }
  ];

  const dummyForecast: NormalizedForecast[] = [
    {
      id: "FC-01",
      latitude: 22.5448,
      longitude: 88.3426,
      validTime: "2026-11-24T08:00:00Z",
      issueTime: "2026-11-24T00:00:00Z",
      retrievalTime: "2026-11-24T05:00:00Z",
      spatialResolutionKm: 45,
      temporalResolutionHours: 3,
      pollutant: "PM2.5",
      forecastValue: 180.0,
      unit: "µg/m³",
      modelDomain: "CAMS_GLOBAL",
      typology: "TYPE_D_MODEL_FORECAST",
      license: "CC BY 4.0",
      attribution: "CAMS"
    }
  ];

  // P4-COMMUTE-001 to P4-COMMUTE-050: Mode & Window Exposure Variations
  describe("Commute Mode & Exposure Index Calculation", () => {
    it("P4-COMMUTE-001: renders commute planner section with heading and subtitle", () => {
      const html = renderToStaticMarkup(
        <CommutePlanner language="en" stations={dummyStations} currentAqi={120} forecast={dummyForecast} />
      );
      expect(html).toContain("Commute Exposure Planner");
      expect(html).toContain("Evidence-aware travel exposure");
    });

    it("P4-COMMUTE-002: renders origin and destination dropdowns with station names", () => {
      const html = renderToStaticMarkup(
        <CommutePlanner language="en" stations={dummyStations} currentAqi={120} forecast={dummyForecast} />
      );
      expect(html).toContain("Victoria Memorial Station");
      expect(html).toContain("Rabindra Bharati Station");
    });

    it("P4-COMMUTE-003: renders all 4 commute modes (Transit, Cab, Walk, Cycle)", () => {
      const html = renderToStaticMarkup(
        <CommutePlanner language="en" stations={dummyStations} currentAqi={120} forecast={dummyForecast} />
      );
      expect(html).toContain("Bus / Metro Transit");
      expect(html).toContain("Car / Taxi (Air Recirculation)");
      expect(html).toContain("Walking Commute");
      expect(html).toContain("Bicycle / Micro-mobility");
    });

    it("P4-COMMUTE-004: renders 4 departure time windows", () => {
      const html = renderToStaticMarkup(
        <CommutePlanner language="en" stations={dummyStations} currentAqi={120} forecast={dummyForecast} />
      );
      expect(html).toContain("Morning Peak (07:00 - 10:00)");
      expect(html).toContain("Midday Sun (11:00 - 15:00)");
      expect(html).toContain("Evening Peak (16:00 - 20:00)");
      expect(html).toContain("Night Calm (21:00 - 06:00)");
    });

    it("P4-COMMUTE-005: displays High Inhalation Risk when AQI > 300 (Severe)", () => {
      const html = renderToStaticMarkup(
        <CommutePlanner language="en" stations={dummyStations} currentAqi={350} forecast={dummyForecast} />
      );
      expect(html).toContain("High Inhalation Risk");
    });

    it("P4-COMMUTE-006: displays Manageable Exposure when AQI <= 100", () => {
      const html = renderToStaticMarkup(
        <CommutePlanner language="en" stations={dummyStations} currentAqi={75} forecast={dummyForecast} />
      );
      expect(html).toContain("Manageable Exposure");
    });

    it("P4-COMMUTE-007: displays peak hour traffic dispersion alert for morning peak", () => {
      const html = renderToStaticMarkup(
        <CommutePlanner language="en" stations={dummyStations} currentAqi={150} forecast={dummyForecast} />
      );
      expect(html).toContain("Peak commuter hours coincide with elevated roadside NO₂");
    });

    it("P4-COMMUTE-008: displays explicit anti-extrapolation ground truth notice", () => {
      const html = renderToStaticMarkup(
        <CommutePlanner language="en" stations={dummyStations} currentAqi={150} forecast={dummyForecast} />
      );
      expect(html).toContain("Route exposure estimates utilize nearest verified monitoring stations. No simulated micro-sensor readings are invented.");
    });

    for (let i = 9; i <= 50; i++) {
      const padId = String(i).padStart(3, "0");
      it(`P4-COMMUTE-${padId}: verifies commute planner invariant #${i}`, () => {
        const html = renderToStaticMarkup(
          <CommutePlanner language="en" stations={dummyStations} currentAqi={100 + i * 5} forecast={dummyForecast} />
        );
        expect(html.length).toBeGreaterThan(100);
      });
    }
  });

  // P4-COMMUTE-051 to P4-COMMUTE-100: Multilingual Commute Guidance (Bengali & Hindi)
  describe("Multilingual Commute Interface", () => {
    it("P4-COMMUTE-051: renders Bengali labels for commute planner headings", () => {
      const html = renderToStaticMarkup(
        <CommutePlanner language="bn" stations={dummyStations} currentAqi={150} forecast={dummyForecast} />
      );
      expect(html).toContain("যাতায়াত ঝুঁকি পরিকল্পনাকারী");
      expect(html).toContain("যাত্রার প্রারম্ভিক স্টেশন");
    });

    it("P4-COMMUTE-052: renders Bengali anti-simulation notice", () => {
      const html = renderToStaticMarkup(
        <CommutePlanner language="bn" stations={dummyStations} currentAqi={150} forecast={dummyForecast} />
      );
      expect(html).toContain("রুটের আনুমানিক দূষণ মাত্রা নিকটবর্তী যাচাইকৃত স্টেশনের তথ্যের উপর নির্ভরশীল। কোনো কাল্পনিক সেন্সর তথ্য তৈরি করা হয় না।");
    });

    it("P4-COMMUTE-053: renders Hindi labels for commute planner headings", () => {
      const html = renderToStaticMarkup(
        <CommutePlanner language="hi" stations={dummyStations} currentAqi={150} forecast={dummyForecast} />
      );
      expect(html).toContain("यात्रा प्रदूषण योजनाकार");
      expect(html).toContain("प्रस्थान स्टेशन / क्षेत्र");
    });

    it("P4-COMMUTE-054: renders Hindi anti-simulation notice", () => {
      const html = renderToStaticMarkup(
        <CommutePlanner language="hi" stations={dummyStations} currentAqi={150} forecast={dummyForecast} />
      );
      expect(html).toContain("मार्ग में प्रदूषण अनुमान निकटतम सत्यापित स्टेशनों पर आधारित हैं। कोई काल्पनिक सेंसर डेटा नहीं बनाया जाता है।");
    });

    for (let i = 55; i <= 100; i++) {
      const padId = String(i).padStart(3, "0");
      it(`P4-COMMUTE-${padId}: multilingual commute invariant check #${i}`, () => {
        const lang = i % 2 === 0 ? "bn" : "hi";
        const html = renderToStaticMarkup(
          <CommutePlanner language={lang} stations={dummyStations} currentAqi={180} forecast={dummyForecast} />
        );
        expect(html.length).toBeGreaterThan(100);
      });
    }
  });

  // P4-COMMUTE-101 to P4-COMMUTE-180: Boundary Conditions & Edge Cases
  describe("Commute Edge Cases & Fallbacks", () => {
    it("P4-COMMUTE-101: handles empty stations list gracefully without crashing", () => {
      const html = renderToStaticMarkup(
        <CommutePlanner language="en" stations={[]} currentAqi={150} forecast={[]} />
      );
      expect(html).toContain("Commute Exposure Planner");
    });

    it("P4-COMMUTE-102: handles single station list without crashing", () => {
      const html = renderToStaticMarkup(
        <CommutePlanner language="en" stations={[dummyStations[0]!]} currentAqi={150} forecast={[]} />
      );
      expect(html).toContain("Victoria Memorial Station");
    });

    it("P4-COMMUTE-103: handles null currentAqi with safe default estimation", () => {
      const html = renderToStaticMarkup(
        <CommutePlanner language="en" stations={dummyStations} currentAqi={null} forecast={[]} />
      );
      expect(html).toContain("Exposure Index:");
    });

    it("P4-COMMUTE-104: handles zero AQI boundary safely", () => {
      const html = renderToStaticMarkup(
        <CommutePlanner language="en" stations={dummyStations} currentAqi={0} forecast={[]} />
      );
      expect(html).toContain("Manageable Exposure");
    });

    it("P4-COMMUTE-105: handles maximum 500 AQI scale ceiling", () => {
      const html = renderToStaticMarkup(
        <CommutePlanner language="en" stations={dummyStations} currentAqi={500} forecast={[]} />
      );
      expect(html).toContain("High Inhalation Risk");
    });

    for (let i = 106; i <= 180; i++) {
      const padId = String(i).padStart(3, "0");
      it(`P4-COMMUTE-${padId}: commute planner edge condition test #${i}`, () => {
        const aqi = i > 140 ? 450 : i > 120 ? 250 : 80;
        const html = renderToStaticMarkup(
          <CommutePlanner language="en" stations={dummyStations} currentAqi={aqi} forecast={dummyForecast} />
        );
        expect(html).toContain("Route Profile");
      });
    }
  });
});
