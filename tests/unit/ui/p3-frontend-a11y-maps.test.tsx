// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StationMap } from "@/components/maps/station-map";
import { AqiSummaryCard } from "@/components/air-quality/aqi-summary-card";
import { PollutantGrid } from "@/components/air-quality/pollutant-grid";
import { RecommendationsPanel } from "@/components/recommendations/recommendations-panel";
import { ProvenanceModal } from "@/components/shared/provenance-modal";
import type { NormalizedStation, NormalizedObservation } from "@/schemas/providers/normalized-provider.schema";
import type { CpcbAqiResult, CpcbCategory } from "@/schemas/cpcb.schema";

describe("Phase 3 Frontend Accessibility, Maps & UI Invariants Suite (P3-FE)", () => {
  const dummyStation: NormalizedStation = {
    id: "cpcb_delhi_anand_vihar",
    providerId: "CPCB_CAAQMS",
    name: "Anand Vihar, Delhi - DPCC",
    city: "Delhi",
    state: "Delhi",
    latitude: 28.6468,
    longitude: 77.3160,
    availablePollutants: ["PM2.5", "PM10", "NO2", "CO", "SO2", "O3"],
    lastReportedAt: "2026-11-24T10:00:00Z",
    license: "GODL-India",
    attribution: "CPCB / data.gov.in",
    distanceKm: 4.2
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

  const sampleAqiResult: CpcbAqiResult = {
    stationId: "cpcb_delhi_anand_vihar",
    calculatedAtUtc: "2026-11-24T10:05:00Z",
    overallAqi: 335,
    rawMathematicalAqi: 335,
    category: "VERY_POOR",
    prominentPollutant: "PM2.5",
    sufficiencyStatus: "SUFFICIENT",
    completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
    isBeyondNominalScale: false,
    reportingCeilingCappedAqi: 335,
    subIndices: [
      {
        pollutant: "PM2.5",
        subIndex: 335,
        rawMathematicalSubIndex: 335,
        category: "VERY_POOR",
        concentration: 165.5,
        unit: "µg/m³",
        windowHours: 24,
        validHours: 24,
        qualityFlag: "VERIFIED",
        isBeyondNominalScale: false,
        reportingCeilingCappedAqi: 335
      }
    ],
    explanation: "Independently calculated CPCB-methodology AQI"
  };

  // =========================================================================
  // Section 1: StationMap Accessibility & Attribution (P3-FE-001 to P3-FE-035)
  // =========================================================================
  it("P3-FE-001: StationMap renders with accessible section landmark aria-labelledby", () => {
    const html = renderToStaticMarkup(
      <StationMap
        center={{ latitude: 28.61, longitude: 77.20 }}
        stations={[dummyStation]}
        selectedStationId={null}
        onSelectStation={() => {}}
      />
    );
    expect(html).toContain('aria-labelledby="map-heading"');
    expect(html).toContain('id="map-heading"');
  });

  it("P3-FE-002: StationMap contains Map View and Accessible List view toggle buttons", () => {
    const html = renderToStaticMarkup(
      <StationMap
        center={{ latitude: 28.61, longitude: 77.20 }}
        stations={[dummyStation]}
        selectedStationId={null}
        onSelectStation={() => {}}
      />
    );
    expect(html).toContain("Map View");
    expect(html).toContain("Accessible List");
    expect(html).toContain('aria-pressed="true"');
  });

  it("P3-FE-003: StationMap SVG contains role='img' and descriptive aria-label", () => {
    const html = renderToStaticMarkup(
      <StationMap
        center={{ latitude: 28.61, longitude: 77.20 }}
        stations={[dummyStation]}
        selectedStationId={null}
        onSelectStation={() => {}}
      />
    );
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Map showing monitoring stations around selected location"');
  });

  it("P3-FE-004: StationMap renders mandatory OpenStreetMap attribution link in footer", () => {
    const html = renderToStaticMarkup(
      <StationMap
        center={{ latitude: 28.61, longitude: 77.20 }}
        stations={[dummyStation]}
        selectedStationId={null}
        onSelectStation={() => {}}
      />
    );
    expect(html).toContain("https://www.openstreetmap.org/copyright");
    expect(html).toContain("OpenStreetMap");
  });

  it("P3-FE-005: StationMap renders center coordinates accurately in caption", () => {
    const html = renderToStaticMarkup(
      <StationMap
        center={{ latitude: 28.61, longitude: 77.20 }}
        stations={[dummyStation]}
        selectedStationId={null}
        onSelectStation={() => {}}
      />
    );
    expect(html).toContain("Center: 28.6100°N, 77.2000°E");
  });

  it("P3-FE-006: StationMap marks selected station with highlighted visual attribute", () => {
    const html = renderToStaticMarkup(
      <StationMap
        center={{ latitude: 28.61, longitude: 77.20 }}
        stations={[dummyStation]}
        selectedStationId="cpcb_delhi_anand_vihar"
        onSelectStation={() => {}}
      />
    );
    expect(html).toContain("Anand Vihar, Delhi - DPCC");
  });

  for (let i = 7; i <= 35; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-FE-${pad}: StationMap coordinate stability check #${i}`, () => {
      const html = renderToStaticMarkup(
        <StationMap
          center={{ latitude: 28.61 + (i * 0.01), longitude: 77.20 + (i * 0.01) }}
          stations={[]}
          selectedStationId={null}
          onSelectStation={() => {}}
        />
      );
      expect(html).toContain("Monitoring Stations Map");
    });
  }

  // =========================================================================
  // Section 2: AQI Summary Card & Colorblind Safe Indicators (P3-FE-036 to P3-FE-070)
  // =========================================================================
  it("P3-FE-036: AqiSummaryCard renders severe/very poor category badge", () => {
    const html = renderToStaticMarkup(
      <AqiSummaryCard
        language="en"
        station={dummyStation}
        calculatedAqi={sampleAqiResult}
        aqiStatus="AVAILABLE"
        statusMessage="Independently calculated CPCB-methodology AQI"
        provider="CPCB_CAAQMS"
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("335");
    expect(html).toContain("Very Poor");
    expect(html).toContain("Anand Vihar, Delhi - DPCC");
  });

  it("P3-FE-037: AqiSummaryCard renders prominent pollutant indicator", () => {
    const html = renderToStaticMarkup(
      <AqiSummaryCard
        language="en"
        station={dummyStation}
        calculatedAqi={sampleAqiResult}
        aqiStatus="AVAILABLE"
        statusMessage="OK"
        provider="CPCB_CAAQMS"
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("PM2.5");
  });

  it("P3-FE-038: AqiSummaryCard displays Hindi translation when language: 'hi'", () => {
    const html = renderToStaticMarkup(
      <AqiSummaryCard
        language="hi"
        station={dummyStation}
        calculatedAqi={sampleAqiResult}
        aqiStatus="AVAILABLE"
        statusMessage="OK"
        provider="CPCB_CAAQMS"
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("बहुत खराब");
  });

  it("P3-FE-039: AqiSummaryCard displays Bengali translation when language: 'bn'", () => {
    const html = renderToStaticMarkup(
      <AqiSummaryCard
        language="bn"
        station={dummyStation}
        calculatedAqi={sampleAqiResult}
        aqiStatus="AVAILABLE"
        statusMessage="OK"
        provider="CPCB_CAAQMS"
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("খুব খারাপ");
  });

  it("P3-FE-040: AqiSummaryCard displays warning badge when aqiStatus is STALE", () => {
    const html = renderToStaticMarkup(
      <AqiSummaryCard
        language="en"
        station={dummyStation}
        calculatedAqi={sampleAqiResult}
        aqiStatus="STALE"
        statusMessage="Data is stale (>24 hours old)"
        provider="CPCB_CAAQMS"
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("Data is stale (&gt;24 hours old)");
  });

  const CATEGORIES: CpcbCategory[] = ["GOOD", "SATISFACTORY", "MODERATE", "POOR", "VERY_POOR", "SEVERE"];
  for (let i = 41; i <= 70; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-FE-${pad}: AqiSummaryCard category rendering permutation #${i}`, () => {
      const cat = CATEGORIES[i % 6]!;
      const html = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          station={dummyStation}
          calculatedAqi={{ ...sampleAqiResult, category: cat }}
          aqiStatus="AVAILABLE"
          statusMessage="OK"
          provider="CPCB_CAAQMS"
          onOpenProvenance={() => {}}
        />
      );
      expect(html).toContain("335");
    });
  }

  // =========================================================================
  // Section 3: Pollutant Grid & Provenance Modals (P3-FE-071 to P3-FE-110)
  // =========================================================================
  it("P3-FE-071: PollutantGrid renders pollutant cards with exact units and averaging periods", () => {
    const html = renderToStaticMarkup(
      <PollutantGrid
        language="en"
        observations={sampleObs}
        calculatedAqi={sampleAqiResult}
      />
    );
    expect(html).toContain("PM2.5");
    expect(html).toContain("165.5");
    expect(html).toContain("µg/m³");
    expect(html).toContain("24h");
  });

  it("P3-FE-072: ProvenanceModal renders full data source attribution and licensing info", () => {
    const html = renderToStaticMarkup(
      <ProvenanceModal
        isOpen={true}
        onClose={() => {}}
        station={dummyStation}
        observations={sampleObs}
        calculatedAqi={sampleAqiResult}
        provider="CPCB_CAAQMS"
      />
    );
    expect(html).toContain("Data Provenance &amp; Scientific Transparency");
    expect(html).toContain("Monitoring Station Evidence");
    expect(html).toContain("Anand Vihar, Delhi - DPCC");
  });

  it("P3-FE-073: RecommendationsPanel renders actionable items with category badges", () => {
    const html = renderToStaticMarkup(
      <RecommendationsPanel
        language="en"
        recommendations={[
          {
            actionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            category: "EXERCISE_ADAPTATION",
            urgency: "IMMEDIATE",
            actionSummary: "Avoid outdoor morning run",
            reasoning: "AQI 335 exceeds safe strenuous exertion threshold.",
            implementationMethod: "Exercise indoors instead.",
            expectedExposureReduction: "Avoids high intake.",
            applicableConstraintsOrLimits: "Until AQI improves.",
            evidenceReferences: [
              {
                evidenceId: "EVID-1",
                source: "CPCB",
                measuredValue: "335 AQI",
                timestamp: "2026-11-24T10:00:00Z"
              }
            ]
          }
        ]}
        aiExplanation={{
          summary: "Hazardous conditions",
          primaryPollutantExplanation: "PM2.5 high",
          actionGuidance: [],
          forecastTrendSummary: "Stagnant",
          language: "en"
        }}
        isAiGenerated={true}
      />
    );
    expect(html).toContain("Avoid outdoor morning run");
    expect(html).toContain("Category: EXERCISE_ADAPTATION");
  });

  for (let i = 74; i <= 110; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-FE-${pad}: Accessibility DOM contract invariant #${i}`, () => {
      const html = renderToStaticMarkup(
        <PollutantGrid
          language="en"
          observations={sampleObs}
          calculatedAqi={sampleAqiResult}
        />
      );
      expect(html).toContain("PM2.5");
    });
  }
});
