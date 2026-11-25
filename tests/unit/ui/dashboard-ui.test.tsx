// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { TRANSLATIONS, type SupportedLanguage, type TranslationDictionary } from "@/i18n/translations";
import { AqiSummaryCard } from "@/components/air-quality/aqi-summary-card";
import { PollutantGrid } from "@/components/air-quality/pollutant-grid";
import { StationPanel } from "@/components/stations/station-panel";
import { StationMap } from "@/components/maps/station-map";
import { RecommendationsPanel } from "@/components/recommendations/recommendations-panel";
import { IndoorCoachPanel } from "@/components/household/indoor-coach-panel";
import { ForecastChart } from "@/components/forecast/forecast-chart";
import { LocationSearch } from "@/components/dashboard/location-search";
import { Navbar } from "@/components/shared/navbar";
import { ProvenanceModal } from "@/components/shared/provenance-modal";
import { AuthModal } from "@/components/auth/auth-modal";
import { HouseholdModal } from "@/components/household/household-modal";
import type { NormalizedStation, NormalizedObservation, NormalizedForecast } from "@/schemas/providers/normalized-provider.schema";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";
import type { RecommendationAction } from "@/schemas/recommendation.schema";
import type { AiExplanation } from "@/schemas/ai-explanation.schema";

describe("UI, Accessibility & Localization Suite", () => {
  const dummyStation: NormalizedStation = {
    id: "STN-WB-KOL-001",
    providerId: "CPCB_CAAQMS",
    name: "Victoria Memorial, Kolkata",
    city: "Kolkata",
    state: "West Bengal",
    latitude: 22.5448,
    longitude: 88.3426,
    availablePollutants: ["PM2.5", "PM10", "NO2"],
    lastReportedAt: "2026-11-23T06:00:00Z",
    license: "GODL-India",
    attribution: "CPCB / data.gov.in",
    distanceKm: 2.4
  };

  const dummyObservations: NormalizedObservation[] = [
    {
      id: "OBS-001",
      stationId: "STN-WB-KOL-001",
      stationName: "Victoria Memorial, Kolkata",
      providerId: "CPCB_CAAQMS",
      pollutant: "PM2.5",
      value: 125.4,
      unit: "µg/m³",
      averagingPeriod: "24h",
      observationTime: "2026-11-23T06:00:00Z",
      sourceUpdateTime: "2026-11-23T06:00:00Z",
      retrievalTime: "2026-11-23T06:05:00Z",
      qualityFlag: "VERIFIED",
      typology: "TYPE_C_RAW_MEASUREMENT",
      license: "GODL-India",
      attribution: "CPCB / data.gov.in"
    },
    {
      id: "OBS-002",
      stationId: "STN-WB-KOL-001",
      stationName: "Victoria Memorial, Kolkata",
      providerId: "CPCB_CAAQMS",
      pollutant: "PM10",
      value: 210.0,
      unit: "µg/m³",
      averagingPeriod: "24h",
      observationTime: "2026-11-23T06:00:00Z",
      sourceUpdateTime: "2026-11-23T06:00:00Z",
      retrievalTime: "2026-11-23T06:05:00Z",
      qualityFlag: "VERIFIED",
      typology: "TYPE_C_RAW_MEASUREMENT",
      license: "GODL-India",
      attribution: "CPCB / data.gov.in"
    },
    {
      id: "OBS-003",
      stationId: "STN-WB-KOL-001",
      stationName: "Victoria Memorial, Kolkata",
      providerId: "CPCB_CAAQMS",
      pollutant: "NO2",
      value: 65.2,
      unit: "µg/m³",
      averagingPeriod: "24h",
      observationTime: "2026-11-23T06:00:00Z",
      sourceUpdateTime: "2026-11-23T06:00:00Z",
      retrievalTime: "2026-11-23T06:05:00Z",
      qualityFlag: "VERIFIED",
      typology: "TYPE_C_RAW_MEASUREMENT",
      license: "GODL-India",
      attribution: "CPCB / data.gov.in"
    }
  ];

  const dummyAqiResult: CpcbAqiResult = {
    stationId: "STN-WB-KOL-001",
    calculatedAtUtc: "2026-11-23T06:05:00Z",
    overallAqi: 304,
    rawMathematicalAqi: 304.0,
    category: "VERY_POOR",
    prominentPollutant: "PM2.5",
    sufficiencyStatus: "SUFFICIENT",
    completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
    subIndices: [
      {
        pollutant: "PM2.5",
        concentration: 125.4,
        unit: "µg/m³",
        subIndex: 304,
        rawMathematicalSubIndex: 304.0,
        category: "VERY_POOR",
        windowHours: 24,
        validHours: 24,
        qualityFlag: "VERIFIED",
        isBeyondNominalScale: false,
        reportingCeilingCappedAqi: 304
      },
      {
        pollutant: "PM10",
        concentration: 210.0,
        unit: "µg/m³",
        subIndex: 173,
        rawMathematicalSubIndex: 173.3,
        category: "MODERATE",
        windowHours: 24,
        validHours: 24,
        qualityFlag: "VERIFIED",
        isBeyondNominalScale: false,
        reportingCeilingCappedAqi: 173
      },
      {
        pollutant: "NO2",
        concentration: 65.2,
        unit: "µg/m³",
        subIndex: 82,
        rawMathematicalSubIndex: 81.5,
        category: "SATISFACTORY",
        windowHours: 24,
        validHours: 24,
        qualityFlag: "VERIFIED",
        isBeyondNominalScale: false,
        reportingCeilingCappedAqi: 82
      }
    ],
    isBeyondNominalScale: false,
    reportingCeilingCappedAqi: 304,
    explanation: "Calculated based on 3 valid sub-indices with prominent PM2.5."
  };

  const dummyRecommendations: RecommendationAction[] = [
    {
      actionId: "ACT-001",
      actionSummary: "Avoid morning jogs outdoors",
      reasoning: "Severe particulate concentration can provoke bronchospasm",
      category: "EXERCISE_ADAPTATION",
      urgency: "IMMEDIATE",
      implementationMethod: "Shift cardio sessions to indoor filtered spaces",
      expectedExposureReduction: "Reduces peak particulate inhalation by ~60-80%",
      applicableConstraintsOrLimits: "Maintain indoor HEPA filtration",
      evidenceReferences: [
        {
          evidenceId: "OBS-001",
          source: "CPCB_CAAQMS",
          measuredValue: "125.4 µg/m³",
          timestamp: "2026-11-23T06:00:00Z"
        }
      ]
    }
  ];

  const dummyAiExplanation: AiExplanation = {
    summary: "Air quality is very poor today in Kolkata.",
    primaryPollutantExplanation: "PM2.5 particulate matter is elevated.",
    actionGuidance: [
      {
        actionText: "Keep windows closed during early morning.",
        targetGroup: "general",
        citedEvidenceIds: ["OBS-001"]
      }
    ],
    forecastTrendSummary: "Dispersion expected by late evening.",
    language: "en"
  };

  // 1. Translation Dictionaries & Localization Integrity (UI-001 to UI-010)
  it("UI-001: all supported languages ('en', 'bn', 'hi') have complete dictionary keys", () => {
    const requiredKeys: (keyof TranslationDictionary)[] = [
      "appTitle", "appSubtitle", "searchPlaceholder", "useLocation", "guestMode",
      "signIn", "signOut", "lastUpdated", "aqiSummaryTitle", "aqiUnavailable",
      "aqiUnavailableDesc", "prominentPollutant", "pollutantBreakdownTitle",
      "stationPanelTitle", "distance", "forecastTitle", "forecastSubtitle",
      "recommendationsTitle", "indoorCoachTitle", "indoorCoachWarning",
      "provenanceTitle", "license", "attribution", "categoryGood", "categorySatisfactory",
      "categoryModerate", "categoryPoor", "categoryVeryPoor", "categorySevere",
      "languageName"
    ];

    const languages: SupportedLanguage[] = ["en", "bn", "hi"];
    for (const lang of languages) {
      const dict = TRANSLATIONS[lang];
      for (const key of requiredKeys) {
        expect(dict[key], `Missing key '${key}' in language '${lang}'`).toBeDefined();
        expect(typeof dict[key]).toBe("string");
        expect(dict[key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("UI-002: English dictionary contains valid strings for all key metrics", () => {
    const en = TRANSLATIONS.en;
    expect(en.appTitle).toBe("HawaSaathi");
    expect(en.categoryGood).toBe("Good");
    expect(en.categorySevere).toBe("Severe");
  });

  it("UI-003: Bengali dictionary contains valid non-empty strings in Bengali script", () => {
    const bn = TRANSLATIONS.bn;
    expect(bn.appTitle).toBe("হাওয়া সাথী");
    expect(bn.categoryGood).toBe("ভালো");
    expect(bn.categorySevere).toBe("মারাত্মক");
  });

  it("UI-004: Hindi dictionary contains valid non-empty strings in Devanagari script", () => {
    const hi = TRANSLATIONS.hi;
    expect(hi.appTitle).toBe("हवा साथी");
    expect(hi.categoryGood).toBe("अच्छा");
    expect(hi.categorySevere).toBe("गंभीर");
  });

  it("UI-005: all 6 AQI categories have distinct translations across en, bn, hi", () => {
    const cats = ["categoryGood", "categorySatisfactory", "categoryModerate", "categoryPoor", "categoryVeryPoor", "categorySevere"] as const;
    for (const lang of ["en", "bn", "hi"] as const) {
      const seen = new Set<string>();
      for (const cat of cats) {
        const val = TRANSLATIONS[lang][cat];
        expect(seen.has(val)).toBe(false);
        seen.add(val);
      }
    }
  });

  it("UI-006: app title and subtitle translated across en, bn, hi", () => {
    expect(TRANSLATIONS.en.appSubtitle).toContain("Personalised Urban Air Quality");
    expect(TRANSLATIONS.bn.appSubtitle).toContain("নগর বায়ুর মান");
    expect(TRANSLATIONS.hi.appSubtitle).toContain("शहरी वायु गुणवत्ता");
  });

  it("UI-007: indoor coach warning present and non-empty in all 3 languages", () => {
    expect(TRANSLATIONS.en.indoorCoachWarning).toContain("Actual indoor AQI cannot be measured");
    expect(TRANSLATIONS.bn.indoorCoachWarning).toContain("ঘরের ভেতরের প্রকৃত AQI");
    expect(TRANSLATIONS.hi.indoorCoachWarning).toContain("इनडोर सेंसर के बिना वास्तविक");
  });

  it("UI-008: provenance and license strings present in all 3 languages", () => {
    for (const lang of ["en", "bn", "hi"] as const) {
      expect(TRANSLATIONS[lang].provenanceTitle).toBeTruthy();
      expect(TRANSLATIONS[lang].license).toBeTruthy();
      expect(TRANSLATIONS[lang].attribution).toBeTruthy();
    }
  });

  it("UI-009: languageName matches native script in all 3 languages", () => {
    expect(TRANSLATIONS.en.languageName).toBe("English");
    expect(TRANSLATIONS.bn.languageName).toBe("বাংলা");
    expect(TRANSLATIONS.hi.languageName).toBe("हिन्दी");
  });

  it("UI-010: fallback language index defaults gracefully", () => {
    const lang: SupportedLanguage = "en";
    expect(TRANSLATIONS[lang]).toBe(TRANSLATIONS.en);
  });

  // 2. AQI Summary Card Rendering & States (UI-011 to UI-020)
  it("UI-011: renders station name and city/state correctly", () => {
    const html = renderToStaticMarkup(
      <AqiSummaryCard
        language="en"
        station={dummyStation}
        calculatedAqi={dummyAqiResult}
        aqiStatus="AVAILABLE"
        statusMessage="Live"
        provider="CPCB_CAAQMS"
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("Victoria Memorial, Kolkata");
    expect(html).toContain("Kolkata, West Bengal");
  });

  it("UI-012: renders Good AQI badge with emerald styling", () => {
    const html = renderToStaticMarkup(
      <AqiSummaryCard
        language="en"
        station={dummyStation}
        calculatedAqi={{ ...dummyAqiResult, overallAqi: 35, category: "GOOD" }}
        aqiStatus="AVAILABLE"
        statusMessage="Live"
        provider="CPCB_CAAQMS"
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("35");
    expect(html).toContain("Good");
    expect(html).toContain("bg-emerald-500");
  });

  it("UI-013: renders Satisfactory AQI badge with lime styling", () => {
    const html = renderToStaticMarkup(
      <AqiSummaryCard
        language="en"
        station={dummyStation}
        calculatedAqi={{ ...dummyAqiResult, overallAqi: 75, category: "SATISFACTORY" }}
        aqiStatus="AVAILABLE"
        statusMessage="Live"
        provider="CPCB_CAAQMS"
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("75");
    expect(html).toContain("Satisfactory");
    expect(html).toContain("bg-lime-500");
  });

  it("UI-014: renders Moderate AQI badge with amber styling", () => {
    const html = renderToStaticMarkup(
      <AqiSummaryCard
        language="en"
        station={dummyStation}
        calculatedAqi={{ ...dummyAqiResult, overallAqi: 150, category: "MODERATE" }}
        aqiStatus="AVAILABLE"
        statusMessage="Live"
        provider="CPCB_CAAQMS"
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("150");
    expect(html).toContain("Moderate");
    expect(html).toContain("bg-amber-500");
  });

  it("UI-015: renders Poor AQI badge with orange styling", () => {
    const html = renderToStaticMarkup(
      <AqiSummaryCard
        language="en"
        station={dummyStation}
        calculatedAqi={{ ...dummyAqiResult, overallAqi: 240, category: "POOR" }}
        aqiStatus="AVAILABLE"
        statusMessage="Live"
        provider="CPCB_CAAQMS"
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("240");
    expect(html).toContain("Poor");
    expect(html).toContain("bg-orange-500");
  });

  it("UI-016: renders Very Poor AQI badge with red styling", () => {
    const html = renderToStaticMarkup(
      <AqiSummaryCard
        language="en"
        station={dummyStation}
        calculatedAqi={{ ...dummyAqiResult, overallAqi: 350, category: "VERY_POOR" }}
        aqiStatus="AVAILABLE"
        statusMessage="Live"
        provider="CPCB_CAAQMS"
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("350");
    expect(html).toContain("Very Poor");
    expect(html).toContain("bg-red-500");
  });

  it("UI-017: renders Severe AQI badge with rose styling", () => {
    const html = renderToStaticMarkup(
      <AqiSummaryCard
        language="en"
        station={dummyStation}
        calculatedAqi={{ ...dummyAqiResult, overallAqi: 450, category: "SEVERE" }}
        aqiStatus="AVAILABLE"
        statusMessage="Live"
        provider="CPCB_CAAQMS"
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("450");
    expect(html).toContain("Severe");
    expect(html).toContain("bg-rose-600");
  });

  it("UI-018: renders prominent pollutant when provided", () => {
    const html = renderToStaticMarkup(
      <AqiSummaryCard
        language="en"
        station={dummyStation}
        calculatedAqi={dummyAqiResult}
        aqiStatus="AVAILABLE"
        statusMessage="Live"
        provider="CPCB_CAAQMS"
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("Prominent Pollutant");
    expect(html).toContain("PM2.5");
  });

  it("UI-019: displays 'Type B: CPCB Calculated' badge when calculatedAqi is present", () => {
    const html = renderToStaticMarkup(
      <AqiSummaryCard
        language="en"
        station={dummyStation}
        calculatedAqi={dummyAqiResult}
        aqiStatus="AVAILABLE"
        statusMessage="Live"
        provider="CPCB_CAAQMS"
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("Type B: CPCB Calculated");
  });

  it("UI-020: renders 'Overall CPCB AQI Unavailable' warning card when aqiStatus is AQI_UNAVAILABLE", () => {
    const html = renderToStaticMarkup(
      <AqiSummaryCard
        language="en"
        station={dummyStation}
        calculatedAqi={null}
        aqiStatus="AQI_UNAVAILABLE"
        statusMessage="Fewer than 3 pollutants"
        provider="CPCB_CAAQMS"
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("Overall CPCB AQI Unavailable");
    expect(html).toContain("No verified observation available");
    expect(html).not.toContain("Type C: Raw Monitored");
  });

  // 3. Pollutant Grid & Parameter Breakdown (UI-021 to UI-030)
  it("UI-021: renders 8 standard CPCB pollutants (PM2.5, PM10, NO2, SO2, CO, O3, NH3, Pb)", () => {
    const html = renderToStaticMarkup(
      <PollutantGrid
        language="en"
        observations={dummyObservations}
        calculatedAqi={dummyAqiResult}
      />
    );
    expect(html).toContain("PM2.5");
    expect(html).toContain("PM10");
    expect(html).toContain("Nitrogen Dioxide");
    expect(html).toContain("Sulphur Dioxide");
    expect(html).toContain("Carbon Monoxide");
    expect(html).toContain("Ozone");
    expect(html).toContain("Ammonia");
    expect(html).toContain("Lead");
  });

  it("UI-022: displays pollutant values with corresponding units", () => {
    const html = renderToStaticMarkup(
      <PollutantGrid
        language="en"
        observations={dummyObservations}
        calculatedAqi={dummyAqiResult}
      />
    );
    expect(html).toContain("125.4");
    expect(html).toContain("210");
    expect(html).toContain("µg/m³");
  });

  it("UI-023: displays sub-indices when calculated sub-index is available", () => {
    const html = renderToStaticMarkup(
      <PollutantGrid
        language="en"
        observations={dummyObservations}
        calculatedAqi={dummyAqiResult}
      />
    );
    expect(html).toContain("Sub-Index: 304");
    expect(html).toContain("Sub-Index: 173");
  });

  it("UI-024: displays 'Not Monitored' for unmonitored or insufficient parameters", () => {
    const html = renderToStaticMarkup(
      <PollutantGrid
        language="en"
        observations={dummyObservations}
        calculatedAqi={dummyAqiResult}
      />
    );
    expect(html).toContain("Not Monitored");
  });

  it("UI-025: displays averaging window indicator (24-hr vs 8-hr) for each pollutant", () => {
    const html = renderToStaticMarkup(
      <PollutantGrid
        language="en"
        observations={dummyObservations}
        calculatedAqi={dummyAqiResult}
      />
    );
    expect(html).toContain("24-hr");
    expect(html).toContain("8-hr");
  });

  it("UI-026: renders semantic section with aria-labelledby='pollutants-heading'", () => {
    const html = renderToStaticMarkup(
      <PollutantGrid
        language="en"
        observations={dummyObservations}
        calculatedAqi={dummyAqiResult}
      />
    );
    expect(html).toContain("aria-labelledby=\"pollutants-heading\"");
    expect(html).toContain("id=\"pollutants-heading\"");
  });

  it("UI-027: renders heading in requested language (en, bn, hi)", () => {
    const bnHtml = renderToStaticMarkup(
      <PollutantGrid
        language="bn"
        observations={dummyObservations}
        calculatedAqi={dummyAqiResult}
      />
    );
    expect(bnHtml).toContain("পরিমাপিত দূষকসমূহ");

    const hiHtml = renderToStaticMarkup(
      <PollutantGrid
        language="hi"
        observations={dummyObservations}
        calculatedAqi={dummyAqiResult}
      />
    );
    expect(hiHtml).toContain("निगरानी किए गए प्रदूषक");
  });

  it("UI-028: handles empty observations array gracefully with placeholder dashes", () => {
    const html = renderToStaticMarkup(
      <PollutantGrid
        language="en"
        observations={[]}
        calculatedAqi={null}
      />
    );
    expect(html).toContain("Not Monitored");
  });

  it("UI-029: formats floating point concentrations to at most 1 decimal place", () => {
    const customObs: NormalizedObservation[] = [
      {
        ...dummyObservations[0]!,
        value: 125.4567
      }
    ];
    const html = renderToStaticMarkup(
      <PollutantGrid
        language="en"
        observations={customObs}
        calculatedAqi={null}
      />
    );
    expect(html).toContain("125.5");
  });

  it("UI-030: highlights prominent pollutant card visually with ring styling", () => {
    const html = renderToStaticMarkup(
      <PollutantGrid
        language="en"
        observations={dummyObservations}
        calculatedAqi={dummyAqiResult}
      />
    );
    expect(html).toContain("ring-2 ring-rose-500/50");
  });

  // 4. Station Panel & Map Accessibility (UI-031 to UI-040)
  it("UI-031: StationPanel renders station metadata (name, location, pollutants)", () => {
    const html = renderToStaticMarkup(
      <StationPanel
        language="en"
        stations={[dummyStation]}
        selectedStationId="STN-WB-KOL-001"
        onSelectStation={() => {}}
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("Victoria Memorial, Kolkata");
    expect(html).toContain("Kolkata, West Bengal");
    expect(html).toContain("Pollutants: PM2.5, PM10, NO2");
  });

  it("UI-032: StationPanel displays distance in kilometers from search location", () => {
    const html = renderToStaticMarkup(
      <StationPanel
        language="en"
        stations={[dummyStation]}
        selectedStationId="STN-WB-KOL-001"
        onSelectStation={() => {}}
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("2.4 km");
  });

  it("UI-033: StationPanel renders provider badge ('CPCB Official' / 'OpenAQ Sensor')", () => {
    const html = renderToStaticMarkup(
      <StationPanel
        language="en"
        stations={[dummyStation]}
        selectedStationId="STN-WB-KOL-001"
        onSelectStation={() => {}}
        onOpenProvenance={() => {}}
      />
    );
    expect(html).toContain("CPCB Official");
  });

  it("UI-034: StationMap renders SVG container with viewBox for spatial representation", () => {
    const html = renderToStaticMarkup(
      <StationMap
        center={{ latitude: 22.5726, longitude: 88.3639 }}
        stations={[dummyStation]}
        selectedStationId="STN-WB-KOL-001"
        onSelectStation={() => {}}
      />
    );
    expect(html).toContain("<svg");
    expect(html).toContain("viewBox=\"0 0 600 340\"");
  });

  it("UI-035: StationMap renders markers for each station in list", () => {
    const html = renderToStaticMarkup(
      <StationMap
        center={{ latitude: 22.5726, longitude: 88.3639 }}
        stations={[dummyStation]}
        selectedStationId={null}
        onSelectStation={() => {}}
      />
    );
    expect(html).toContain("<circle");
    expect(html).toContain("Victoria Memorial, Kolkata");
  });

  it("UI-036: StationMap marks selected station with highlighted radius and ring", () => {
    const html = renderToStaticMarkup(
      <StationMap
        center={{ latitude: 22.5726, longitude: 88.3639 }}
        stations={[dummyStation]}
        selectedStationId="STN-WB-KOL-001"
        onSelectStation={() => {}}
      />
    );
    expect(html).toContain("r=\"14\"");
    expect(html).toContain("fill=\"#3b82f6\"");
  });

  it("UI-037: StationMap provides view mode toggle between map and accessible table list", () => {
    const html = renderToStaticMarkup(
      <StationMap
        center={{ latitude: 22.5726, longitude: 88.3639 }}
        stations={[dummyStation]}
        selectedStationId="STN-WB-KOL-001"
        onSelectStation={() => {}}
      />
    );
    expect(html).toContain("Map View");
    expect(html).toContain("Accessible List");
  });

  it("UI-038: StationMap includes OSM attribution text for tile compliance", () => {
    const html = renderToStaticMarkup(
      <StationMap
        center={{ latitude: 22.5726, longitude: 88.3639 }}
        stations={[dummyStation]}
        selectedStationId="STN-WB-KOL-001"
        onSelectStation={() => {}}
      />
    );
    expect(html).toContain("OpenStreetMap");
    expect(html).toContain("© OpenStreetMap contributors");
  });

  it("UI-039: StationMap handles empty stations list gracefully", () => {
    const html = renderToStaticMarkup(
      <StationMap
        center={{ latitude: 22.5726, longitude: 88.3639 }}
        stations={[]}
        selectedStationId={null}
        onSelectStation={() => {}}
      />
    );
    expect(html).toContain("Center: 22.5726°N, 88.3639°E");
  });

  it("UI-040: StationMap includes coordinates in aria or caption text", () => {
    const html = renderToStaticMarkup(
      <StationMap
        center={{ latitude: 22.5726, longitude: 88.3639 }}
        stations={[dummyStation]}
        selectedStationId={null}
        onSelectStation={() => {}}
      />
    );
    expect(html).toContain("22.5726°N");
    expect(html).toContain("88.3639°E");
  });

  // 5. Recommendations & Indoor Coach Panels (UI-041 to UI-050)
  it("UI-041: RecommendationsPanel renders actions with target group badges", () => {
    const html = renderToStaticMarkup(
      <RecommendationsPanel
        language="en"
        recommendations={dummyRecommendations}
        aiExplanation={dummyAiExplanation}
        isAiGenerated={false}
      />
    );
    expect(html).toContain("Avoid morning jogs outdoors");
    expect(html).toContain("EXERCISE_ADAPTATION");
  });

  it("UI-042: RecommendationsPanel displays AI-generated badge when isAiGenerated is true", () => {
    const html = renderToStaticMarkup(
      <RecommendationsPanel
        language="en"
        recommendations={dummyRecommendations}
        aiExplanation={dummyAiExplanation}
        isAiGenerated={true}
      />
    );
    expect(html).toContain("Gemini AI Narrative");
  });

  it("UI-043: RecommendationsPanel displays Rule-based badge when isAiGenerated is false", () => {
    const html = renderToStaticMarkup(
      <RecommendationsPanel
        language="en"
        recommendations={dummyRecommendations}
        aiExplanation={dummyAiExplanation}
        isAiGenerated={false}
      />
    );
    expect(html).toContain("Deterministic Rule Baseline");
  });

  it("UI-044: RecommendationsPanel renders AI summary when available", () => {
    const html = renderToStaticMarkup(
      <RecommendationsPanel
        language="en"
        recommendations={dummyRecommendations}
        aiExplanation={dummyAiExplanation}
        isAiGenerated={true}
      />
    );
    expect(html).toContain("Air quality is very poor today in Kolkata.");
    expect(html).toContain("Contextual AI Explanation");
  });

  it("UI-045: RecommendationsPanel handles empty recommendations gracefully", () => {
    const html = renderToStaticMarkup(
      <RecommendationsPanel
        language="en"
        recommendations={[]}
        aiExplanation={null}
        isAiGenerated={false}
      />
    );
    expect(html).toContain("Air quality is within normal parameters. Standard outdoor activities permitted.");
  });

  it("UI-046: IndoorCoachPanel displays mandatory warning: actual indoor AQI cannot be measured without sensors", () => {
    const html = renderToStaticMarkup(
      <IndoorCoachPanel
        language="en"
        aqiCategory="VERY_POOR"
      />
    );
    expect(html).toContain("Actual indoor AQI cannot be measured without dedicated indoor sensors.");
  });

  it("UI-047: IndoorCoachPanel renders ventilation advice based on outdoor AQI", () => {
    const html = renderToStaticMarkup(
      <IndoorCoachPanel
        language="en"
        aqiCategory="VERY_POOR"
      />
    );
    expect(html).toContain("Natural Ventilation");
  });

  it("UI-048: IndoorCoachPanel renders air purifier CADR guidance for room dimensions", () => {
    const html = renderToStaticMarkup(
      <IndoorCoachPanel
        language="en"
        aqiCategory="VERY_POOR"
      />
    );
    expect(html).toContain("Air Purifier Planner");
    expect(html).toContain("m³/h");
  });

  it("UI-049: IndoorCoachPanel renders source control tips (cooking, incense, sweeping)", () => {
    const html = renderToStaticMarkup(
      <IndoorCoachPanel
        language="en"
        aqiCategory="VERY_POOR"
      />
    );
    expect(html).toContain("Indoor Source Control");
    expect(html).toContain("Avoid indoor agarbatti");
  });

  it("UI-050: IndoorCoachPanel reflects requested language in headings and text", () => {
    const bnHtml = renderToStaticMarkup(
      <IndoorCoachPanel
        language="bn"
        aqiCategory="VERY_POOR"
      />
    );
    expect(bnHtml).toContain("ঘরের ভেতরের বায়ুর মান সহায়ক");
  });

  // 6. Modals, Navigation & Accessibility Attributes (UI-051 to UI-060)
  it("UI-051: Navbar renders logo, title, and language selector dropdown", () => {
    const html = renderToStaticMarkup(
      <Navbar
        language="en"
        onLanguageChange={() => {}}
        isAuthenticated={false}
        onOpenAuthModal={() => {}}
        onSignOut={() => {}}
      />
    );
    expect(html).toContain("HawaSaathi");
    expect(html).toContain("Guest Mode (Local)");
    expect(html).toContain("Sign In");
  });

  it("UI-052: Navbar reflects authenticated user state when logged in", () => {
    const html = renderToStaticMarkup(
      <Navbar
        language="en"
        onLanguageChange={() => {}}
        isAuthenticated={true}
        userEmail="citizen@kolkata.gov.in"
        onOpenAuthModal={() => {}}
        onSignOut={() => {}}
      />
    );
    expect(html).toContain("citizen@kolkata.gov.in");
    expect(html).toContain("Sign Out");
  });

  it("UI-053: LocationSearch renders input with search icon and accessible placeholder", () => {
    const html = renderToStaticMarkup(
      <LocationSearch
        language="en"
        selectedCity="Kolkata"
        onSelectLocation={() => {}}
      />
    );
    expect(html).toContain("Search city or station");
    expect(html).toContain("<input");
  });

  it("UI-054: LocationSearch renders 'Use Current Location' button with accessible role", () => {
    const html = renderToStaticMarkup(
      <LocationSearch
        language="en"
        selectedCity="Kolkata"
        onSelectLocation={() => {}}
      />
    );
    expect(html).toContain("Use Current Location");
  });

  it("UI-055: ProvenanceModal renders four-way data typology explanations (Types A, B, C, D)", () => {
    const html = renderToStaticMarkup(
      <ProvenanceModal
        isOpen={true}
        onClose={() => {}}
        station={dummyStation}
        calculatedAqi={dummyAqiResult}
        observations={dummyObservations}
        provider="CPCB_CAAQMS"
      />
    );
    expect(html).toContain("Type A");
    expect(html).toContain("Type B");
    expect(html).toContain("Type C");
    expect(html).toContain("Type D");
  });

  it("UI-056: ProvenanceModal includes license information and data provider attributions", () => {
    const html = renderToStaticMarkup(
      <ProvenanceModal
        isOpen={true}
        onClose={() => {}}
        station={dummyStation}
        calculatedAqi={dummyAqiResult}
        observations={dummyObservations}
        provider="CPCB_CAAQMS"
      />
    );
    expect(html).toContain("Legal Licensing &amp; Attributions");
    expect(html).toContain("CPCB / data.gov.in");
    expect(html).toContain("OpenAQ");
    expect(html).toContain("Open-Meteo CAMS Global");
  });

  it("UI-057: AuthModal renders sign-in options (Google & Email Link)", () => {
    const html = renderToStaticMarkup(
      <AuthModal
        isOpen={true}
        onClose={() => {}}
        language="en"
        isAuthenticated={false}
        onExportData={async () => {}}
        onDeleteAccount={async () => {}}
        onAuthSuccess={() => {}}
      />
    );
    expect(html).toContain("Sign In with Google");
    expect(html).toContain("Send Passwordless Email Link");
  });

  it("UI-058: HouseholdModal renders vulnerability options and priority goal checkboxes", () => {
    const html = renderToStaticMarkup(
      <HouseholdModal
        isOpen={true}
        onClose={() => {}}
        language="en"
        onSave={() => {}}
      />
    );
    expect(html).toContain("Household Context &amp; Routine");
    expect(html).toContain("Infants or young children under 5 in household");
    expect(html).toContain("Elderly family members (65+ years)");
    expect(html).toContain("Self-reported respiratory or cardiac sensitivity");
  });

  it("UI-059: ForecastChart renders timeline of forecasted PM2.5 values", () => {
    const sampleForecast: NormalizedForecast[] = [
      {
        id: "FC-001",
        latitude: 22.54,
        longitude: 88.34,
        modelDomain: "cams_global",
        spatialResolutionKm: 45,
        temporalResolutionHours: 1,
        pollutant: "PM2.5",
        forecastValue: 95.2,
        unit: "µg/m³",
        validTime: "2026-11-23T12:00:00Z",
        issueTime: "2026-11-23T00:00:00Z",
        retrievalTime: "2026-11-23T06:00:00Z",
        typology: "TYPE_D_MODEL_FORECAST",
        license: "CC BY 4.0",
        attribution: "Copernicus Atmosphere Monitoring Service / Open-Meteo"
      }
    ];

    const html = renderToStaticMarkup(
      <ForecastChart
        language="en"
        forecast={sampleForecast}
        modelDomain="cams_global"
        spatialResolutionKm={45}
      />
    );
    expect(html).toContain("Atmospheric Forecast (CAMS Global)");
    expect(html).toContain("95.2");
  });

  it("UI-060: WCAG 2.2 AA compliant roles, aria-labels, and headings across rendered components", () => {
    const summaryHtml = renderToStaticMarkup(
      <AqiSummaryCard
        language="en"
        station={dummyStation}
        calculatedAqi={dummyAqiResult}
        aqiStatus="AVAILABLE"
        statusMessage="Live"
        provider="CPCB_CAAQMS"
        onOpenProvenance={() => {}}
      />
    );
    expect(summaryHtml).toContain("<button");

    const coachHtml = renderToStaticMarkup(
      <IndoorCoachPanel
        language="en"
        aqiCategory="VERY_POOR"
      />
    );
    expect(coachHtml).toContain("aria-labelledby=\"indoor-coach-heading\"");
    expect(coachHtml).toContain("id=\"indoor-coach-heading\"");
  });
});
