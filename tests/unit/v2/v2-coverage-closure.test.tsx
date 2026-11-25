// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";

const mockGenContent = vi.fn();
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      public models = {
        generateContent: mockGenContent
      };
    }
  };
});

import { runIntelligentAgentTask } from "@/services/ai/agent-orchestrator";
import { AiExplainerService } from "@/services/ai/ai-explainer";
import { globalSourceOrchestrator } from "@/services/air-quality/source-orchestrator";
import { isWithinQuietHours, evaluateSmartAlerts } from "@/domain/alerts/smart-alert-engine";
import { CommutePlanner } from "@/components/commute/commute-planner";
import { AqiSummaryCard } from "@/components/air-quality/aqi-summary-card";
import { PollutantGrid } from "@/components/air-quality/pollutant-grid";
import { RecommendationsPanel } from "@/components/recommendations/recommendations-panel";
import { InsightsWorkspace } from "@/components/insights/insights-workspace";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import { AppShellNav } from "@/components/shared/app-shell-nav";
import { Navbar } from "@/components/shared/navbar";
import { StationComparison } from "@/components/stations/station-comparison";
import { AgentWorkspace } from "@/components/agent/agent-workspace";
import { AiChatWorkspace } from "@/components/chat/ai-chat-workspace";
import { DailyPlanner } from "@/components/planner/daily-planner";
import { StationMap } from "@/components/maps/station-map";
import DashboardPage from "@/app/page";

import type {
  NormalizedStation,
  NormalizedObservation,
  NormalizedForecast
} from "@/schemas/providers/normalized-provider.schema";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";

const stations: NormalizedStation[] = [
  {
    id: "S1",
    providerId: "CPCB_CAAQMS",
    name: "Station One",
    city: "Kolkata",
    state: "West Bengal",
    latitude: 22.57,
    longitude: 88.36,
    availablePollutants: ["PM2.5", "PM10", "NO2"],
    lastReportedAt: null,
    license: "GODL",
    attribution: "CPCB",
    distanceKm: 1.5
  },
  {
    id: "S2",
    providerId: "OPENAQ",
    name: "Station Two",
    city: "Kolkata",
    state: "West Bengal",
    latitude: 22.5705,
    longitude: 88.3605,
    availablePollutants: ["PM2.5"],
    lastReportedAt: null,
    license: "CC-BY",
    attribution: "OpenAQ"
  },
  {
    id: "S3",
    providerId: "CPCB_CAAQMS",
    name: "Station Three",
    city: "Kolkata",
    state: "West Bengal",
    latitude: 22.58,
    longitude: 88.38,
    availablePollutants: ["PM2.5", "PM10", "SO2"],
    lastReportedAt: null,
    license: "GODL",
    attribution: "CPCB"
  },
  {
    id: "S4",
    providerId: "OPENAQ",
    name: "Station Four",
    city: "Kolkata",
    state: "West Bengal",
    latitude: 22.59,
    longitude: 88.39,
    availablePollutants: ["O3"],
    lastReportedAt: null,
    license: "CC-BY",
    attribution: "OpenAQ"
  },
  {
    id: "S5",
    providerId: "CPCB_CAAQMS",
    name: "Station Five",
    city: "Kolkata",
    state: "West Bengal",
    latitude: 22.6,
    longitude: 88.4,
    availablePollutants: ["CO"],
    lastReportedAt: null,
    license: "GODL",
    attribution: "CPCB"
  }
];

const obsNoUnit: NormalizedObservation[] = [
  {
    id: "o1",
    stationId: "S1",
    stationName: "Station One",
    providerId: "CPCB_CAAQMS",
    pollutant: "PM2.5",
    value: 95,
    unit: "" as unknown as string,
    averagingPeriod: "24h",
    observationTime: "2026-11-24T10:00:00Z",
    sourceUpdateTime: null,
    retrievalTime: "2026-11-24T10:00:00Z",
    typology: "TYPE_C_RAW_MEASUREMENT",
    qualityFlag: "VERIFIED",
    license: "GODL-India",
    attribution: "CPCB"
  },
  {
    id: "o2",
    stationId: "S1",
    stationName: "Station One",
    providerId: "CPCB_CAAQMS",
    pollutant: "NO2",
    value: 45,
    unit: "µg/m³",
    averagingPeriod: "24h",
    observationTime: "2026-11-24T10:00:00Z",
    sourceUpdateTime: null,
    retrievalTime: "2026-11-24T10:00:00Z",
    typology: "TYPE_C_RAW_MEASUREMENT",
    qualityFlag: "VERIFIED",
    license: "GODL-India",
    attribution: "CPCB"
  },
  {
    id: "o3",
    stationId: "S1",
    stationName: "Station One",
    providerId: "CPCB_CAAQMS",
    pollutant: "SO2",
    value: 20,
    unit: "µg/m³",
    averagingPeriod: "24h",
    observationTime: "2026-11-24T10:00:00Z",
    sourceUpdateTime: null,
    retrievalTime: "2026-11-24T10:00:00Z",
    typology: "TYPE_C_RAW_MEASUREMENT",
    qualityFlag: "VERIFIED",
    license: "GODL-India",
    attribution: "CPCB"
  },
  {
    id: "o4",
    stationId: "S1",
    stationName: "Station One",
    providerId: "CPCB_CAAQMS",
    pollutant: "CO",
    value: 1.2,
    unit: "mg/m³",
    averagingPeriod: "8h",
    observationTime: "2026-11-24T10:00:00Z",
    sourceUpdateTime: null,
    retrievalTime: "2026-11-24T10:00:00Z",
    typology: "TYPE_C_RAW_MEASUREMENT",
    qualityFlag: "VERIFIED",
    license: "GODL-India",
    attribution: "CPCB"
  }
];

const forecastFixture: NormalizedForecast[] = [
  {
    id: "f1",
    latitude: 22.57,
    longitude: 88.36,
    modelDomain: "cams_global",
    spatialResolutionKm: 40,
    temporalResolutionHours: 1,
    pollutant: "PM2.5",
    forecastValue: 135,
    unit: "µg/m³",
    validTime: "2026-11-24T12:00:00Z",
    issueTime: null,
    retrievalTime: "2026-11-24T10:00:00Z",
    typology: "TYPE_D_MODEL_FORECAST",
    license: "CC-BY-4.0",
    attribution: "CAMS"
  }
];

function makeAqi(overallAqi: number | null, category: CpcbAqiResult["category"]): CpcbAqiResult {
  return {
    stationId: "S1",
    calculatedAtUtc: "2026-11-24T10:00:00Z",
    overallAqi,
    rawMathematicalAqi: overallAqi,
    category,
    prominentPollutant: "PM2.5",
    sufficiencyStatus: overallAqi !== null ? "SUFFICIENT" : "INSUFFICIENT_DATA",
    completenessPolicy: "ADAPTED_HAWASAATHI_6H",
    subIndices: [],
    isBeyondNominalScale: false,
    reportingCeilingCappedAqi: overallAqi !== null ? Math.min(500, overallAqi) : null,
    explanation: "msg"
  };
}

function makeDispatcher() {
  const states = new Map<number, unknown>();
  const effects: Array<() => unknown> = [];
  let idx = 0;

  const internals = (React as unknown as {
    __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: { H: unknown };
  }).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const origH = internals.H;

  internals.H = {
    useState: (init: unknown) => {
      const id = idx++;
      if (!states.has(id)) states.set(id, typeof init === "function" ? (init as () => unknown)() : init);
      return [
        states.get(id),
        (v: unknown) => states.set(id, typeof v === "function" ? (v as (p: unknown) => unknown)(states.get(id)) : v)
      ];
    },
    useEffect: (fn: () => unknown) => effects.push(fn),
    useCallback: (fn: unknown) => fn,
    useMemo: (fn: () => unknown) => fn(),
    useRef: (init: unknown) => ({ current: init }),
    useId: () => "cov-closure-id"
  };

  return {
    render: <P,>(c: React.FC<P> | (() => React.ReactElement), p?: P) => {
      idx = 0;
      effects.length = 0;
      return (c as (props?: P) => React.ReactElement)(p);
    },
    reset: () => {
      states.clear();
      idx = 0;
      effects.length = 0;
    },
    runEffects: () => {
      for (const ef of effects) {
        try {
          const clean = ef();
          if (typeof clean === "function") clean();
        } catch {
          // ignore
        }
      }
    },
    restore: () => {
      internals.H = origH;
    }
  };
}

function walk(node: unknown, fn: (el: { type: unknown; props: Record<string, unknown> }) => void) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => walk(n, fn));
    return;
  }
  const el = node as { type?: unknown; props?: Record<string, unknown> };
  if (el.props) {
    fn(el as { type: unknown; props: Record<string, unknown> });
    if (el.props["children"]) walk(el.props["children"], fn);
  }
}

describe("HawaSaathi 2.0 100% Full-Source Branch Closure Suite", () => {
  const origFetch = globalThis.fetch;
  const origWindow = globalThis.window;
  const origDoc = (globalThis as unknown as { document?: unknown }).document;

  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as unknown as { document: unknown }).document = {
      documentElement: { setAttribute: vi.fn(), classList: { remove: vi.fn(), add: vi.fn() } },
      createElement: () => ({ href: "", download: "", click: vi.fn() })
    };
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k)
      },
      sessionStorage: { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() },
      confirm: vi.fn().mockReturnValue(true),
      matchMedia: () => ({ matches: false }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    globalThis.window = origWindow;
    (globalThis as unknown as { document?: unknown }).document = origDoc;
    vi.restoreAllMocks();
    mockGenContent.mockReset();
  });

  it("closes agent/route non-Error catch, agent-orchestrator missing payload fields, and ai-explainer empty unit", async () => {
    // /api/v1/agent string throw branch line 97
    vi.resetModules();
    vi.doMock("@/services/ai/agent-orchestrator", () => ({
      runIntelligentAgentTask: vi.fn().mockRejectedValueOnce("string-fatal")
    }));
    const { POST: postAgentStr } = await import("@/app/api/v1/agent/route");
    const strRes = await postAgentStr(
      new NextRequest("http://localhost:3000/api/v1/agent", {
        method: "POST",
        body: JSON.stringify({ prompt: "Check" })
      })
    );
    expect(strRes.status).toBe(500);
    vi.doUnmock("@/services/ai/agent-orchestrator");
    vi.resetModules();

    // agent-orchestrator lines 119, 135, 151
    vi.spyOn(globalSourceOrchestrator, "searchNearbyStations").mockResolvedValueOnce({} as never);
    const rCmpEmpty = await runIntelligentAgentTask({
      prompt: "Compare stations",
      context: { isAuthenticated: false, hasCloudConsent: false }
    });
    expect(rCmpEmpty.verifiedFacts).toHaveLength(0);

    vi.spyOn(globalSourceOrchestrator, "searchNearbyStations").mockResolvedValueOnce({
      stations: [{ ...stations[1]!, availablePollutants: [] }],
      warnings: []
    });
    vi.spyOn(globalSourceOrchestrator, "getStationAirQuality").mockResolvedValueOnce({
      station: stations[1]!,
      observations: [],
      calculatedAqi: null,
      aqiStatus: "AQI_UNAVAILABLE",
      statusMessage: "Unavailable",
      provider: "OPENAQ",
      retrievedAt: "2026-11-24T10:00:00Z",
      warnings: []
    });
    const rCmpNoPol = await runIntelligentAgentTask({
      prompt: "Compare stations",
      context: { isAuthenticated: false, hasCloudConsent: false }
    });
    expect(rCmpNoPol.verifiedFacts[0]).toContain("None");

    vi.spyOn(globalSourceOrchestrator, "getForecast").mockResolvedValueOnce({
      modelDomain: "CAMS",
      typology: "TYPE_D_MODEL_FORECAST",
      warnings: []
    } as never);
    const rFcNoList = await runIntelligentAgentTask({
      prompt: "Forecast walk timing",
      context: { isAuthenticated: false, hasCloudConsent: false }
    });
    expect(rFcNoList.verifiedFacts[1]).toContain("0");

    // ai-explainer line 249 empty unit branch
    const fb = new AiExplainerService().generateDeterministicFallback({
      overallAqi: null,
      aqiCategory: "UNAVAILABLE",
      prominentPollutant: null,
      evidenceList: [
        {
          evidenceId: "e-no-unit",
          source: "CPCB",
          pollutant: "PM2.5",
          value: 80,
          unit: "",
          timestamp: "2026-11-24T10:00:00Z",
          description: "raw"
        }
      ],
      deterministicRecommendations: [],
      language: "en"
    });
    expect(fb.summary).toContain("PM2.5 80");
  });

  it("closes smart-alert-engine and legacy UI micro-branches", () => {
    expect(isWithinQuietHours("", "", 12)).toBe(false);

    // Trigger GOOD/SATISFACTORY ternary at line 78 & dedupe already-seen station-unavailable at line 137
    const alerts1 = evaluateSmartAlerts({
      station: null,
      aqiResult: makeAqi(110, "SATISFACTORY"),
      aqiStatus: "AVAILABLE",
      observations: [],
      forecast: forecastFixture,
      rules: {
        severityThreshold: "MODERATE",
        hysteresisEnabled: false,
        quietHoursEnabled: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
        notifyOnStationUnavailable: true
      },
      existingDedupeKeys: new Set(["station-unavailable"]),
      currentHour: 12
    });
    expect(alerts1.some((a) => a.kind === "MEASURED_AQI")).toBe(true);
    expect(alerts1.some((a) => a.kind === "STATION_UNAVAILABLE")).toBe(false);

    // CommutePlanner CYCLE high AQI > 200 (line 191)
    expect(
      renderToStaticMarkup(
        <CommutePlanner
          language="en"
          stations={stations}
          currentAqi={280}
          forecast={forecastFixture}
          initialMode="CYCLE"
        />
      )
    ).toContain("N95");

    // AqiSummaryCard with missingParameters & no PM2.5/PM10 observations & empty statusMessage (lines 102, 194-211)
    expect(
      renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          station={stations[0]!}
          calculatedAqi={null}
          aqiStatus="AQI_UNAVAILABLE"
          statusMessage=""
          provider="CPCB"
          onOpenProvenance={vi.fn()}
          observations={obsNoUnit}
        />
      )
    ).toContain("PM2.5: 95");

    // PollutantGrid empty unit (line 82)
    expect(
      renderToStaticMarkup(
        <PollutantGrid language="en" observations={obsNoUnit} calculatedAqi={null} />
      )
    ).toContain("unverified");

    // RecommendationsPanel isAqiUnavailable=true (line 69)
    expect(
      renderToStaticMarkup(
        <RecommendationsPanel
          language="en"
          recommendations={[]}
          aiExplanation={{
            summary: "Unavailable",
            primaryPollutantExplanation: "Limited",
            actionGuidance: [],
            language: "en"
          }}
          isAqiUnavailable={true}
        />
      )
    ).toContain("AQI Unavailable Mode");

    // InsightsWorkspace with empty arrays (lines 37-95)
    expect(
      renderToStaticMarkup(
        <InsightsWorkspace language="en" stations={[]} selectedStation={null} observations={[]} forecast={[]} />
      )
    ).toContain("None");

    // SettingsWorkspace isAuthenticated=false (line 249)
    const dSet = makeDispatcher();
    try {
      const sTree = dSet.render(SettingsWorkspace, {
        language: "en",
        onLanguageChange: vi.fn(),
        themeMode: "light",
        onThemeChange: vi.fn(),
        savedPlaces: [],
        onUpdateSavedPlaces: vi.fn(),
        onSelectSavedPlace: vi.fn(),
        currentLocation: { name: "Kolkata", latitude: 22.57, longitude: 88.36 },
        onOpenHouseholdModal: vi.fn(),
        onOpenAlertPreferences: vi.fn(),
        onOpenAuthModal: vi.fn(),
        isAuthenticated: false
      });
      expect(sTree).not.toBeNull();

      // AppShellNav with isMobileOpen=false (line 80)
      dSet.reset();
      const navSel = vi.fn();
      const navNode = dSet.render(AppShellNav, {
        activeView: "overview",
        onSelectView: navSel,
        language: "en",
        isMobileOpen: false,
        onCloseMobile: vi.fn(),
        unreadAlertsCount: 0
      });
      walk(navNode, (el) => {
        if (el.type === "button" && typeof el.props["onClick"] === "function") {
          (el.props["onClick"] as () => void)();
        }
      });

      // Navbar in light, dark, en-IN, bn-IN, hi-IN states (lines 157-181)
      Navbar({
        language: "en-IN",
        onLanguageChange: vi.fn(),
        isAuthenticated: false,
        onOpenAuthModal: vi.fn(),
        onSignOut: vi.fn(),
        themeMode: "light",
        onThemeChange: vi.fn()
      });
      Navbar({
        language: "bn-IN",
        onLanguageChange: vi.fn(),
        isAuthenticated: false,
        onOpenAuthModal: vi.fn(),
        onSignOut: vi.fn(),
        themeMode: "dark",
        onThemeChange: vi.fn()
      });
    } finally {
      dSet.restore();
    }
  });

  it("closes StationComparison >4 cap, AgentWorkspace followup, AiChatWorkspace retry, DailyPlanner guards, StationMap edges, and DashboardPage handlers", async () => {
    const d = makeDispatcher();
    try {
      // StationComparison: start with 4? Initially picks 3, click S4 (4th), then S5 (>4 triggers slice line 34!)
      const sc1 = d.render(StationComparison, {
        stations,
        selectedStationId: "S1",
        onSelectStation: vi.fn(),
        language: "en"
      });
      const toggleButtons: Array<() => void> = [];
      walk(sc1, (el) => {
        if (el.type === "button" && typeof el.props["onClick"] === "function") {
          const txt = JSON.stringify(el.props["children"] || "");
          if (txt.includes("Station Four") || txt.includes("Station Five")) {
            toggleButtons.push(el.props["onClick"] as () => void);
          }
        }
      });
      toggleButtons[0]?.(); // adds S4 -> 4 items
      d.render(StationComparison, { stations, selectedStationId: "S1", onSelectStation: vi.fn(), language: "en" });
      toggleButtons[1]?.(); // adds S5 while length === 4 -> hits line 34!

      // AgentWorkspace follow-up click (line 255)
      d.reset();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "SUCCESS",
          data: {
            taskType: "PURIFIER_SIZING",
            directAnswer: "Ans",
            verifiedFacts: [],
            explanation: "Exp",
            suggestedAction: "Act",
            sources: ["Calc"],
            confidenceOrLimitation: "Lim",
            followUpPrompt: "Check ventilation now?",
            dataDistinction: "ESTIMATE",
            toolTraces: []
          }
        })
      }) as unknown as typeof fetch;
      const aw1 = d.render(AgentWorkspace, {
        language: "en",
        selectedStation: stations[0]!,
        calculatedAqi: makeAqi(150, "MODERATE"),
        observations: obsNoUnit,
        forecast: forecastFixture
      });
      let firstBtn: (() => Promise<void>) | undefined;
      walk(aw1, (el) => {
        if (!firstBtn && el.type === "button" && typeof el.props["onClick"] === "function") {
          firstBtn = el.props["onClick"] as () => Promise<void>;
        }
      });
      await firstBtn?.();
      const aw2 = d.render(AgentWorkspace, {
        language: "en",
        selectedStation: stations[0]!,
        calculatedAqi: makeAqi(150, "MODERATE"),
        observations: obsNoUnit,
        forecast: forecastFixture
      });
      walk(aw2, (el) => {
        if (el.type === "button" && JSON.stringify(el.props["children"] || "").includes("Follow-up")) {
          (el.props["onClick"] as () => Promise<void>)();
        }
      });

      // AiChatWorkspace: empty localStorage + fetch error + retry button + HTTP 400 error (lines 157-158, 345)
      d.reset();
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ status: "ERROR", message: "Bad request" })
      });
      const cw1 = d.render(AiChatWorkspace, {
        language: "en",
        selectedStation: stations[0]!,
        calculatedAqi: makeAqi(150, "MODERATE"),
        observations: obsNoUnit,
        forecast: forecastFixture
      });
      let starterClick: (() => Promise<void>) | undefined;
      walk(cw1, (el) => {
        if (el.type === "button" && JSON.stringify(el.props["children"] || "").includes("What does our current")) {
          starterClick = el.props["onClick"] as () => Promise<void>;
        }
      });
      await starterClick?.();
      const cw2 = d.render(AiChatWorkspace, {
        language: "en",
        selectedStation: stations[0]!,
        calculatedAqi: makeAqi(150, "MODERATE"),
        observations: obsNoUnit,
        forecast: forecastFixture
      });
      walk(cw2, (el) => {
        if (el.type === "button" && JSON.stringify(el.props["children"] || "").includes("Retry")) {
          (el.props["onClick"] as () => Promise<void>)();
        }
      });

      // DailyPlanner: startTime >= endTime (lines 143-145), INDOOR/TRANSIT category derivation (lines 148-153), empty diary submit (line 191), and all badgeStyles (line 213)
      d.reset();
      const dp1 = d.render(DailyPlanner, {
        language: "en",
        stations,
        selectedStation: stations[0]!,
        calculatedAqi: null,
        observations: [],
        forecast: [],
        activities: [
          {
            id: "act-unv",
            title: "Walk",
            category: "WALKING",
            environment: "OUTDOOR",
            startTime: "12:00",
            endTime: "12:30",
            locationName: "Park",
            isFavorite: false,
            reminderEnabled: false
          }
        ],
        onUpdateActivities: vi.fn(),
        diaryEntries: [],
        onUpdateDiary: vi.fn()
      });
      // Test start >= end validation
      walk(dp1, (el) => {
        if (el.props["id"] === "planner-title") (el.props["onChange"] as (e: unknown) => void)({ target: { value: "Yoga" } });
        if (el.props["id"] === "planner-start") (el.props["onChange"] as (e: unknown) => void)({ target: { value: "15:00" } });
        if (el.props["id"] === "planner-end") (el.props["onChange"] as (e: unknown) => void)({ target: { value: "14:00" } });
        if (el.props["id"] === "planner-env") (el.props["onChange"] as (e: unknown) => void)({ target: { value: "INDOOR" } });
      });
      const dpInvalid = d.render(DailyPlanner, {
        language: "en",
        stations,
        selectedStation: stations[0]!,
        calculatedAqi: null,
        observations: [],
        forecast: [],
        activities: [],
        onUpdateActivities: vi.fn(),
        diaryEntries: [],
        onUpdateDiary: vi.fn()
      });
      walk(dpInvalid, (el) => {
        if (el.type === "form" && typeof el.props["onSubmit"] === "function") {
          (el.props["onSubmit"] as (e: unknown) => void)({ preventDefault: vi.fn() });
        }
      });
      // Fix endTime -> submit INDOOR successfully, then diary empty submit
      walk(dpInvalid, (el) => {
        if (el.props["id"] === "planner-end") (el.props["onChange"] as (e: unknown) => void)({ target: { value: "16:00" } });
      });
      const dpValid = d.render(DailyPlanner, {
        language: "en",
        stations,
        selectedStation: stations[0]!,
        calculatedAqi: null,
        observations: [],
        forecast: [],
        activities: [],
        onUpdateActivities: vi.fn(),
        diaryEntries: [],
        onUpdateDiary: vi.fn()
      });
      let switchDiary: (() => void) | undefined;
      walk(dpValid, (el) => {
        if (el.type === "form" && typeof el.props["onSubmit"] === "function") {
          (el.props["onSubmit"] as (e: unknown) => void)({ preventDefault: vi.fn() });
        }
        if (el.type === "button" && JSON.stringify(el.props["children"] || "").includes("Exposure Journal")) {
          switchDiary = el.props["onClick"] as () => void;
        }
      });
      switchDiary?.();
      const dpDiaryEmpty = d.render(DailyPlanner, {
        language: "en",
        stations,
        selectedStation: stations[0]!,
        calculatedAqi: null,
        observations: [],
        forecast: [],
        activities: [],
        onUpdateActivities: vi.fn(),
        diaryEntries: [],
        onUpdateDiary: vi.fn()
      });
      walk(dpDiaryEmpty, (el) => {
        if (el.type === "form" && typeof el.props["onSubmit"] === "function") {
          (el.props["onSubmit"] as (e: unknown) => void)({ preventDefault: vi.fn() });
        }
      });

      // StationMap: fit empty stations (line 146), POLLUTANTS layer + obsNoUnit (line 540), handleMouseMove during drag
      d.reset();
      const sm1 = d.render(StationMap, {
        center: { latitude: 22.57, longitude: 88.36 },
        stations: [],
        selectedStationId: null,
        onSelectStation: vi.fn()
      });
      walk(sm1, (el) => {
        if (el.props["aria-label"] === "Fit Stations") (el.props["onClick"] as () => void)();
        if (el.props["id"] === "map-layer-select") {
          (el.props["onChange"] as (e: unknown) => void)({ target: { value: "POLLUTANTS" } });
        }
      });
      d.render(StationMap, {
        center: { latitude: 22.57, longitude: 88.36 },
        stations: [{ ...stations[0]!, availablePollutants: [] }],
        selectedStationId: "S1",
        onSelectStation: vi.fn(),
        currentObservations: obsNoUnit
      });

      // DashboardPage: cover household confirm=false delete, storage throwing on localStorage.setItem, and non-ok air-quality response
      d.reset();
      (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
      (window.localStorage.setItem as ReturnType<typeof vi.fn>) = vi.fn().mockImplementation(() => {
        throw new Error("Quota exceeded");
      });
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/api/v1/profile/export")) return { ok: true, json: async () => ({ status: "SUCCESS", data: {} }) };
        if (url.includes("/api/v1/profile")) {
          return {
            ok: true,
            json: async () => ({
              status: "SUCCESS",
              data: { profile: { email: "u@test.in", householdContext: { members: [] }, preferences: { language: "hi", theme: "light" } } }
            })
          };
        }
        if (url.includes("/api/v1/stations/nearby")) {
          return { ok: true, json: async () => ({ status: "SUCCESS", data: { stations } }) };
        }
        if (url.includes("/api/v1/air-quality")) {
          return { ok: false, json: async () => ({ status: "ERROR", message: "Upstream fail" }) };
        }
        return { ok: true, json: async () => ({ status: "SUCCESS", data: {} }) };
      }) as unknown as typeof fetch;

      const dashTree = d.render(DashboardPage);
      d.runEffects();
      await Promise.resolve();
      await Promise.resolve();

      // Trigger offline Retry Telemetry button + Household button + StationMap onOpenStationDetails
      const mainChildren = (
        dashTree as { props: { children: Array<{ props?: { children?: Array<{ props?: { children?: unknown } }> } }> } }
      ).props.children[0]?.props?.children?.[1]?.props?.children;
      walk(mainChildren, (el) => {
        if (el.type === "button" && typeof el.props["onClick"] === "function") {
          (el.props["onClick"] as () => void)();
        }
        if (typeof el.props["onOpenStationDetails"] === "function") {
          (el.props["onOpenStationDetails"] as () => void)();
        }
        if (typeof el.props["onExploreStations"] === "function") {
          (el.props["onExploreStations"] as () => void)();
        }
      });

      // Trigger ALL modal callbacks cleanly (confirm=false delete + savePrefs storage throw + onboarding dismiss storage throw)
      const rootModals = (dashTree as { props: { children: unknown[] } }).props.children.slice(2);
      for (const m of rootModals) {
        const p = (m as { props?: Record<string, unknown> })?.props;
        if (p?.["onDeleteAccount"]) await (p["onDeleteAccount"] as () => Promise<void>)();
        if (p?.["onSavePreferences"]) {
          (p["onSavePreferences"] as (x: unknown) => void)({
            severityThreshold: "POOR",
            hysteresisEnabled: true,
            quietHoursEnabled: false,
            quietHoursStart: "22:00",
            quietHoursEnd: "07:00"
          });
        }
        if (p?.["onClose"]) (p["onClose"] as () => void)();
      }

      // Exercise window Ctrl+K keyboard shortcut and online/offline callbacks
      const addCalls = (window.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
      for (const [evtName, cb] of addCalls) {
        if (evtName === "keydown") {
          (cb as (e: unknown) => void)({ ctrlKey: true, key: "k", preventDefault: vi.fn() });
        } else if (evtName === "online" || evtName === "offline") {
          (cb as () => void)();
        }
      }
    } finally {
      d.restore();
    }
  });
});
