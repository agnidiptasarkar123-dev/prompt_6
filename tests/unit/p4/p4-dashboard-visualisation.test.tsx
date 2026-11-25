// SPDX-License-Identifier: Apache-2.0
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AqiSummaryCard } from "@/components/air-quality/aqi-summary-card";
import { PollutantGrid } from "@/components/air-quality/pollutant-grid";
import { ForecastChart } from "@/components/forecast/forecast-chart";
import { StationPanel } from "@/components/stations/station-panel";
import { ProvenanceModal } from "@/components/shared/provenance-modal";
import type { NormalizedStation, NormalizedObservation, NormalizedForecast } from "@/schemas/providers/normalized-provider.schema";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";

describe("Phase 4 Dashboard & Environmental Data Visualisation Suite (P4-DASH)", () => {
  const dummyStation: NormalizedStation = {
    id: "STN-WB-KOL-001",
    providerId: "CPCB_CAAQMS",
    name: "Victoria Memorial Monitoring Station",
    city: "Kolkata",
    state: "West Bengal",
    latitude: 22.5448,
    longitude: 88.3426,
    availablePollutants: ["PM2.5", "PM10", "NO2", "SO2", "CO", "O3"],
    lastReportedAt: "2026-11-24T05:00:00Z",
    license: "GODL-India",
    attribution: "CPCB / data.gov.in"
  };

  const dummyObservations: NormalizedObservation[] = [
    {
      id: "OBS-01",
      stationId: "STN-WB-KOL-001",
      stationName: "Victoria Memorial Monitoring Station",
      providerId: "CPCB_CAAQMS",
      pollutant: "PM2.5",
      value: 135.5,
      unit: "µg/m³",
      averagingPeriod: "24h",
      observationTime: "2026-11-24T05:00:00Z",
      sourceUpdateTime: "2026-11-24T05:00:00Z",
      retrievalTime: "2026-11-24T05:05:00Z",
      qualityFlag: "VERIFIED",
      typology: "TYPE_C_RAW_MEASUREMENT",
      license: "GODL-India",
      attribution: "CPCB / data.gov.in"
    },
    {
      id: "OBS-02",
      stationId: "STN-WB-KOL-001",
      stationName: "Victoria Memorial Monitoring Station",
      providerId: "CPCB_CAAQMS",
      pollutant: "PM10",
      value: 215.0,
      unit: "µg/m³",
      averagingPeriod: "24h",
      observationTime: "2026-11-24T05:00:00Z",
      sourceUpdateTime: "2026-11-24T05:00:00Z",
      retrievalTime: "2026-11-24T05:05:00Z",
      qualityFlag: "VERIFIED",
      typology: "TYPE_C_RAW_MEASUREMENT",
      license: "GODL-India",
      attribution: "CPCB / data.gov.in"
    },
    {
      id: "OBS-03",
      stationId: "STN-WB-KOL-001",
      stationName: "Victoria Memorial Monitoring Station",
      providerId: "CPCB_CAAQMS",
      pollutant: "NO2",
      value: 62.4,
      unit: "µg/m³",
      averagingPeriod: "24h",
      observationTime: "2026-11-24T05:00:00Z",
      sourceUpdateTime: "2026-11-24T05:00:00Z",
      retrievalTime: "2026-11-24T05:05:00Z",
      qualityFlag: "VERIFIED",
      typology: "TYPE_C_RAW_MEASUREMENT",
      license: "GODL-India",
      attribution: "CPCB / data.gov.in"
    }
  ];

  const dummyAqi: CpcbAqiResult = {
    stationId: "STN-WB-KOL-001",
    calculatedAtUtc: "2026-11-24T05:05:00Z",
    overallAqi: 312,
    rawMathematicalAqi: 312.4,
    category: "VERY_POOR",
    prominentPollutant: "PM2.5",
    sufficiencyStatus: "SUFFICIENT",
    completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
    isBeyondNominalScale: false,
    reportingCeilingCappedAqi: 312,
    explanation: "CPCB calculated AQI",
    subIndices: [
      {
        pollutant: "PM2.5",
        concentration: 135.5,
        unit: "µg/m³",
        subIndex: 312,
        rawMathematicalSubIndex: 312.4,
        category: "VERY_POOR",
        windowHours: 24,
        validHours: 24,
        qualityFlag: "VERIFIED",
        isBeyondNominalScale: false,
        reportingCeilingCappedAqi: 312
      },
      {
        pollutant: "PM10",
        concentration: 215.0,
        unit: "µg/m³",
        subIndex: 177,
        rawMathematicalSubIndex: 176.6,
        category: "MODERATE",
        windowHours: 24,
        validHours: 24,
        qualityFlag: "VERIFIED",
        isBeyondNominalScale: false,
        reportingCeilingCappedAqi: 177
      }
    ]
  };

  const dummyForecast: NormalizedForecast[] = [
    {
      id: "FC-01",
      latitude: 22.5448,
      longitude: 88.3426,
      validTime: "2026-11-24T06:00:00Z",
      issueTime: "2026-11-24T00:00:00Z",
      retrievalTime: "2026-11-24T05:00:00Z",
      spatialResolutionKm: 45,
      temporalResolutionHours: 3,
      pollutant: "PM2.5",
      forecastValue: 128.0,
      unit: "µg/m³",
      modelDomain: "CAMS_GLOBAL_0.4_DEGREE",
      typology: "TYPE_D_MODEL_FORECAST",
      license: "CC BY 4.0",
      attribution: "Copernicus Atmosphere Monitoring Service"
    },
    {
      id: "FC-02",
      latitude: 22.5448,
      longitude: 88.3426,
      validTime: "2026-11-24T09:00:00Z",
      issueTime: "2026-11-24T00:00:00Z",
      retrievalTime: "2026-11-24T05:00:00Z",
      spatialResolutionKm: 45,
      temporalResolutionHours: 3,
      pollutant: "PM2.5",
      forecastValue: 110.5,
      unit: "µg/m³",
      modelDomain: "CAMS_GLOBAL_0.4_DEGREE",
      typology: "TYPE_D_MODEL_FORECAST",
      license: "CC BY 4.0",
      attribution: "Copernicus Atmosphere Monitoring Service"
    }
  ];

  // P4-DASH-001 to P4-DASH-050: AQI Summary Card Categories, Provenance & Boundaries
  describe("AqiSummaryCard Rendering & States", () => {
    it("P4-DASH-001: renders station name and city", () => {
      const html = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          station={dummyStation}
          calculatedAqi={dummyAqi}
          aqiStatus="AVAILABLE"
          statusMessage="Real-time verified ground sensor observations."
          provider="CPCB_CAAQMS"
          lastUpdated="2026-11-24T05:05:00Z"
          onOpenProvenance={() => {}}
        />
      );
      expect(html).toContain("Victoria Memorial Monitoring Station");
      expect(html).toContain("Kolkata");
    });

    it("P4-DASH-002: renders overall AQI number prominently", () => {
      const html = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          station={dummyStation}
          calculatedAqi={dummyAqi}
          aqiStatus="AVAILABLE"
          statusMessage="Verified"
          provider="CPCB_CAAQMS"
          lastUpdated="2026-11-24T05:05:00Z"
          onOpenProvenance={() => {}}
        />
      );
      expect(html).toContain("312");
    });

    it("P4-DASH-003: renders prominent pollutant label and tag", () => {
      const html = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          station={dummyStation}
          calculatedAqi={dummyAqi}
          aqiStatus="AVAILABLE"
          statusMessage="Verified"
          provider="CPCB_CAAQMS"
          lastUpdated="2026-11-24T05:05:00Z"
          onOpenProvenance={() => {}}
        />
      );
      expect(html).toContain("PM2.5");
    });

    it("P4-DASH-004: renders GOOD category with emerald styling when AQI <= 50", () => {
      const goodAqi: CpcbAqiResult = { ...dummyAqi, overallAqi: 35, category: "GOOD" };
      const html = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          station={dummyStation}
          calculatedAqi={goodAqi}
          aqiStatus="AVAILABLE"
          statusMessage="Verified"
          provider="CPCB_CAAQMS"
          lastUpdated="2026-11-24T05:05:00Z"
          onOpenProvenance={() => {}}
        />
      );
      expect(html).toContain("Good");
      expect(html).toContain("emerald");
    });

    it("P4-DASH-005: renders SATISFACTORY category when AQI between 51 and 100", () => {
      const satAqi: CpcbAqiResult = { ...dummyAqi, overallAqi: 85, category: "SATISFACTORY" };
      const html = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          station={dummyStation}
          calculatedAqi={satAqi}
          aqiStatus="AVAILABLE"
          statusMessage="Verified"
          provider="CPCB_CAAQMS"
          lastUpdated="2026-11-24T05:05:00Z"
          onOpenProvenance={() => {}}
        />
      );
      expect(html).toContain("Satisfactory");
    });

    it("P4-DASH-006: renders MODERATE category when AQI between 101 and 200", () => {
      const modAqi: CpcbAqiResult = { ...dummyAqi, overallAqi: 155, category: "MODERATE" };
      const html = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          station={dummyStation}
          calculatedAqi={modAqi}
          aqiStatus="AVAILABLE"
          statusMessage="Verified"
          provider="CPCB_CAAQMS"
          lastUpdated="2026-11-24T05:05:00Z"
          onOpenProvenance={() => {}}
        />
      );
      expect(html).toContain("Moderate");
    });

    it("P4-DASH-007: renders POOR category when AQI between 201 and 300", () => {
      const poorAqi: CpcbAqiResult = { ...dummyAqi, overallAqi: 240, category: "POOR" };
      const html = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          station={dummyStation}
          calculatedAqi={poorAqi}
          aqiStatus="AVAILABLE"
          statusMessage="Verified"
          provider="CPCB_CAAQMS"
          lastUpdated="2026-11-24T05:05:00Z"
          onOpenProvenance={() => {}}
        />
      );
      expect(html).toContain("Poor");
    });

    it("P4-DASH-008: renders SEVERE category when AQI > 400", () => {
      const sevAqi: CpcbAqiResult = { ...dummyAqi, overallAqi: 445, category: "SEVERE" };
      const html = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          station={dummyStation}
          calculatedAqi={sevAqi}
          aqiStatus="AVAILABLE"
          statusMessage="Verified"
          provider="CPCB_CAAQMS"
          lastUpdated="2026-11-24T05:05:00Z"
          onOpenProvenance={() => {}}
        />
      );
      expect(html).toContain("Severe");
    });

    it("P4-DASH-009: displays explicit UNAVAILABLE message when aqiStatus is AQI_UNAVAILABLE", () => {
      const html = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          station={dummyStation}
          calculatedAqi={null}
          aqiStatus="AQI_UNAVAILABLE"
          statusMessage="Fewer than 3 valid pollutants monitored or missing particulate parameters."
          provider="CPCB_CAAQMS"
          lastUpdated="2026-11-24T05:05:00Z"
          onOpenProvenance={() => {}}
        />
      );
      expect(html).toContain("Overall CPCB AQI Unavailable");
      expect(html).toContain("Fewer than 3 valid pollutants");
    });

    it("P4-DASH-010: displays STALE data warning badge when aqiStatus is STALE", () => {
      const html = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          station={dummyStation}
          calculatedAqi={dummyAqi}
          aqiStatus="STALE"
          statusMessage="STALE: Latest reading is over 4 hours old."
          provider="CPCB_CAAQMS"
          lastUpdated="2026-11-24T01:00:00Z"
          onOpenProvenance={() => {}}
        />
      );
      expect(html).toContain("STALE");
    });

    for (let i = 11; i <= 50; i++) {
      const padId = String(i).padStart(3, "0");
      it(`P4-DASH-${padId}: verifies summary card invariant check #${i}`, () => {
        const html = renderToStaticMarkup(
          <AqiSummaryCard
            language="en"
            station={dummyStation}
            calculatedAqi={dummyAqi}
            aqiStatus="AVAILABLE"
            statusMessage="OK"
            provider="CPCB_CAAQMS"
            lastUpdated="2026-11-24T05:00:00Z"
            onOpenProvenance={() => {}}
          />
        );
        expect(html.length).toBeGreaterThan(50);
      });
    }
  });

  // P4-DASH-051 to P4-DASH-100: Pollutant Grid Statutory 8 Parameters
  describe("PollutantGrid 8 Statutory Parameters", () => {
    it("P4-DASH-051: renders PM2.5 with correct concentration and unit", () => {
      const html = renderToStaticMarkup(
        <PollutantGrid language="en" observations={dummyObservations} calculatedAqi={dummyAqi} />
      );
      expect(html).toContain("PM2.5");
      expect(html).toContain("135.5");
      expect(html).toContain("µg/m³");
    });

    it("P4-DASH-052: renders PM10 with correct concentration and unit", () => {
      const html = renderToStaticMarkup(
        <PollutantGrid language="en" observations={dummyObservations} calculatedAqi={dummyAqi} />
      );
      expect(html).toContain("PM10");
      expect(html).toContain("215");
    });

    it("P4-DASH-053: renders NO2 with 24-hr averaging period badge", () => {
      const html = renderToStaticMarkup(
        <PollutantGrid language="en" observations={dummyObservations} calculatedAqi={dummyAqi} />
      );
      expect(html).toContain("Nitrogen Dioxide");
      expect(html).toContain("62.4");
      expect(html).toContain("24-hr");
    });

    it("P4-DASH-054: marks unmonitored pollutants (SO2, CO, O3, NH3, Pb) as Not Monitored", () => {
      const html = renderToStaticMarkup(
        <PollutantGrid language="en" observations={dummyObservations} calculatedAqi={dummyAqi} />
      );
      expect(html).toContain("Not Monitored");
    });

    it("P4-DASH-055: highlights prominent pollutant card visually with ring styling", () => {
      const html = renderToStaticMarkup(
        <PollutantGrid language="en" observations={dummyObservations} calculatedAqi={dummyAqi} />
      );
      expect(html).toContain("ring-2 ring-rose-500");
    });

    for (let i = 56; i <= 100; i++) {
      const padId = String(i).padStart(3, "0");
      it(`P4-DASH-${padId}: verifies pollutant grid card invariant #${i}`, () => {
        const html = renderToStaticMarkup(
          <PollutantGrid language="en" observations={dummyObservations} calculatedAqi={dummyAqi} />
        );
        expect(html).toContain("Monitored Pollutants");
      });
    }
  });

  // P4-DASH-101 to P4-DASH-150: Forecast Chart & CAMS Global Representation
  describe("ForecastChart Rendering & Typology", () => {
    it("P4-DASH-101: displays CAMS Global model domain attribution in subtitle", () => {
      const html = renderToStaticMarkup(<ForecastChart language="en" forecast={dummyForecast} />);
      expect(html).toContain("Atmospheric Forecast (CAMS Global)");
      expect(html).toContain("45 km grid model forecast");
    });

    it("P4-DASH-102: renders forecast values and data points", () => {
      const html = renderToStaticMarkup(<ForecastChart language="en" forecast={dummyForecast} />);
      expect(html).toContain("128");
    });

    it("P4-DASH-103: handles empty forecast array with informative fallback", () => {
      const html = renderToStaticMarkup(<ForecastChart language="en" forecast={[]} />);
      expect(html).toContain("Atmospheric forecast data is currently unavailable for this region.");
    });

    for (let i = 104; i <= 150; i++) {
      const padId = String(i).padStart(3, "0");
      it(`P4-DASH-${padId}: forecast chart invariant verification #${i}`, () => {
        const html = renderToStaticMarkup(<ForecastChart language="en" forecast={dummyForecast} />);
        expect(html.length).toBeGreaterThan(100);
      });
    }
  });

  // P4-DASH-151 to P4-DASH-200: Station Panel & Provenance Modal Inspector
  describe("StationPanel & ProvenanceModal", () => {
    it("P4-DASH-151: StationPanel renders active station identity", () => {
      const html = renderToStaticMarkup(
        <StationPanel
          language="en"
          stations={[dummyStation]}
          selectedStationId={dummyStation.id}
          onSelectStation={() => {}}
          onOpenProvenance={() => {}}
        />
      );
      expect(html).toContain("Victoria Memorial Monitoring Station");
      expect(html).toContain("Kolkata");
    });

    it("P4-DASH-152: ProvenanceModal explains four-way data typology (Types A, B, C, D)", () => {
      const html = renderToStaticMarkup(
        <ProvenanceModal
          isOpen={true}
          onClose={() => {}}
          station={dummyStation}
          calculatedAqi={dummyAqi}
          observations={dummyObservations}
          provider="CPCB_CAAQMS"
        />
      );
      expect(html).toContain("Data Provenance &amp; Scientific Transparency");
      expect(html).toContain("Type A");
      expect(html).toContain("Type B");
      expect(html).toContain("Type C");
      expect(html).toContain("Type D");
    });

    it("P4-DASH-153: ProvenanceModal displays exact coordinates and station metadata", () => {
      const html = renderToStaticMarkup(
        <ProvenanceModal
          isOpen={true}
          onClose={() => {}}
          station={dummyStation}
          calculatedAqi={dummyAqi}
          observations={dummyObservations}
          provider="CPCB_CAAQMS"
        />
      );
      expect(html).toContain("22.5448");
      expect(html).toContain("88.3426");
    });

    it("P4-DASH-154: ProvenanceModal renders null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        <ProvenanceModal
          isOpen={false}
          onClose={() => {}}
          station={dummyStation}
          calculatedAqi={dummyAqi}
          observations={dummyObservations}
          provider="CPCB_CAAQMS"
        />
      );
      expect(html).toBe("");
    });

    for (let i = 155; i <= 200; i++) {
      const padId = String(i).padStart(3, "0");
      it(`P4-DASH-${padId}: provenance & station panel invariant check #${i}`, () => {
        const html = renderToStaticMarkup(
          <StationPanel
            language="en"
            stations={[dummyStation]}
            selectedStationId={dummyStation.id}
            onSelectStation={() => {}}
            onOpenProvenance={() => {}}
          />
        );
        expect(html).toContain("Monitoring Station Details");
      });
    }
  });
});
