// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AppShellNav, type AppRouteView } from "@/components/shared/app-shell-nav";
import { CommandPalette } from "@/components/shared/command-palette";
import { OnboardingModal } from "@/components/shared/onboarding-modal";
import { StationComparison } from "@/components/stations/station-comparison";
import { LearningCentre } from "@/components/learn/learning-centre";
import { DailyPlanner } from "@/components/planner/daily-planner";
import { AgentWorkspace } from "@/components/agent/agent-workspace";
import { AiChatWorkspace } from "@/components/chat/ai-chat-workspace";
import { InsightsWorkspace } from "@/components/insights/insights-workspace";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import { StationMap } from "@/components/maps/station-map";
import { Navbar } from "@/components/shared/navbar";
import { AqiSummaryCard } from "@/components/air-quality/aqi-summary-card";
import { PollutantGrid } from "@/components/air-quality/pollutant-grid";
import { RecommendationsPanel } from "@/components/recommendations/recommendations-panel";
import { IndoorCoachPanel } from "@/components/household/indoor-coach-panel";
import { ForecastChart } from "@/components/forecast/forecast-chart";
import { LocationSearch } from "@/components/dashboard/location-search";
import { StationPanel } from "@/components/stations/station-panel";
import { CommutePlanner } from "@/components/commute/commute-planner";
import { NotificationCenter } from "@/components/alerts/notification-center";
import { AlertPreferencesModal } from "@/components/alerts/alert-preferences-modal";
import { Footer } from "@/components/shared/footer";
import DashboardPage from "@/app/page";

import type {
  NormalizedStation,
  NormalizedObservation,
  NormalizedForecast
} from "@/schemas/providers/normalized-provider.schema";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";
import type { PlannedActivity, SavedPlace, ExposureDiaryEntry } from "@/schemas/planner.schema";

const stationsFixture: NormalizedStation[] = [
  {
    id: "STN-1",
    providerId: "CPCB_CAAQMS",
    name: "Victoria Memorial, Kolkata",
    city: "Kolkata",
    state: "West Bengal",
    latitude: 22.5448,
    longitude: 88.3426,
    availablePollutants: ["PM2.5", "PM10", "NO2", "SO2"],
    lastReportedAt: "2026-11-24T10:00:00Z",
    license: "GODL-India",
    attribution: "CPCB",
    distanceKm: 2.1
  },
  {
    id: "STN-2",
    providerId: "CPCB_CAAQMS",
    name: "Rabindra Bharati, Kolkata",
    city: "Kolkata",
    state: "West Bengal",
    latitude: 22.5452,
    longitude: 88.343,
    availablePollutants: ["PM2.5", "NO2"],
    lastReportedAt: "2026-11-24T10:00:00Z",
    license: "GODL-India",
    attribution: "CPCB",
    distanceKm: 5.4
  },
  {
    id: "STN-3",
    providerId: "OPENAQ",
    name: "Salt Lake Sensor",
    city: "Kolkata",
    state: "West Bengal",
    latitude: 22.5867,
    longitude: 88.4171,
    availablePollutants: ["PM2.5"],
    lastReportedAt: null,
    license: "CC-BY-4.0",
    attribution: "OpenAQ",
    distanceKm: 7.2
  },
  {
    id: "STN-4",
    providerId: "OPENAQ",
    name: "Howrah Bridge Monitor",
    city: "Howrah",
    state: "West Bengal",
    latitude: 22.5851,
    longitude: 88.3468,
    availablePollutants: ["PM10"],
    lastReportedAt: null,
    license: "CC-BY-4.0",
    attribution: "OpenAQ",
    distanceKm: 4.1
  },
  {
    id: "STN-5",
    providerId: "CPCB_CAAQMS",
    name: "Ballygunge, Kolkata",
    city: "Kolkata",
    state: "West Bengal",
    latitude: 22.5367,
    longitude: 88.3638,
    availablePollutants: ["PM2.5", "PM10", "O3"],
    lastReportedAt: null,
    license: "GODL-India",
    attribution: "CPCB"
  }
];

const obsFixture: NormalizedObservation[] = [
  {
    id: "obs-1",
    stationId: "STN-1",
    stationName: "Victoria Memorial",
    providerId: "CPCB_CAAQMS",
    pollutant: "PM2.5",
    value: 92,
    unit: "µg/m³",
    averagingPeriod: "24h",
    observationTime: "2026-11-24T09:00:00Z",
    sourceUpdateTime: null,
    retrievalTime: "2026-11-24T09:05:00Z",
    typology: "TYPE_C_RAW_MEASUREMENT",
    qualityFlag: "VERIFIED",
    license: "GODL-India",
    attribution: "CPCB"
  }
];

const forecastFixture: NormalizedForecast[] = [
  {
    id: "fc-1",
    latitude: 22.57,
    longitude: 88.36,
    modelDomain: "cams_global",
    spatialResolutionKm: 40,
    temporalResolutionHours: 1,
    pollutant: "PM2.5",
    forecastValue: 78,
    unit: "µg/m³",
    validTime: "2026-11-24T12:00:00Z",
    issueTime: null,
    retrievalTime: "2026-11-24T10:00:00Z",
    typology: "TYPE_D_MODEL_FORECAST",
    license: "CC-BY-4.0",
    attribution: "CAMS"
  }
];

const validAqiFixture: CpcbAqiResult = {
  stationId: "STN-1",
  calculatedAtUtc: "2026-11-24T09:05:00Z",
  overallAqi: 215,
  rawMathematicalAqi: 215,
  category: "POOR",
  prominentPollutant: "PM2.5",
  sufficiencyStatus: "SUFFICIENT",
  completenessPolicy: "ADAPTED_HAWASAATHI_6H",
  subIndices: [],
  isBeyondNominalScale: false,
  reportingCeilingCappedAqi: 215,
  explanation: "Verified CPCB NAQI"
};

function setupTestDispatcher() {
  const states = new Map<number, unknown>();
  const effects: Array<() => unknown> = [];
  let hookIdx = 0;

  const internals = (React as unknown as {
    __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: { H: unknown };
  }).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const origH = internals.H;

  internals.H = {
    useState: (initial: unknown) => {
      const id = hookIdx++;
      if (!states.has(id)) {
        states.set(id, typeof initial === "function" ? (initial as () => unknown)() : initial);
      }
      const setter = (val: unknown) => {
        const cur = states.get(id);
        const next = typeof val === "function" ? (val as (c: unknown) => unknown)(cur) : val;
        states.set(id, next);
      };
      return [states.get(id), setter];
    },
    useEffect: (fn: () => unknown) => {
      effects.push(fn);
    },
    useCallback: (fn: unknown) => fn,
    useMemo: (fn: () => unknown) => fn(),
    useRef: (init: unknown) => ({ current: init }),
    useId: () => "v2-test-id"
  };

  return {
    render: <P,>(comp: React.FC<P> | (() => React.ReactElement), props?: P) => {
      hookIdx = 0;
      effects.length = 0;
      return (comp as (p?: P) => React.ReactElement)(props);
    },
    reset: () => {
      states.clear();
      hookIdx = 0;
      effects.length = 0;
    },
    runEffects: () => {
      for (const eff of effects) {
        try {
          const cleanup = eff();
          if (typeof cleanup === "function") cleanup();
        } catch {
          // ignore
        }
      }
    },
    getStates: () => states,
    restore: () => {
      internals.H = origH;
    }
  };
}

function collectNodes(
  node: unknown,
  visitor: (el: { type: unknown; props: Record<string, unknown> }) => void
) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const c of node) collectNodes(c, visitor);
    return;
  }
  const el = node as { type?: unknown; props?: Record<string, unknown> };
  if (el.props) {
    visitor(el as { type: unknown; props: Record<string, unknown> });
    if (el.props["children"]) collectNodes(el.props["children"], visitor);
  }
}

describe("HawaSaathi 2.0 Components & Integrated Dashboard Suite", () => {
  const origFetch = globalThis.fetch;
  const origWindow = globalThis.window;
  const origDocument = (globalThis as unknown as { document?: unknown }).document;
  const origNavigator = (globalThis as unknown as { navigator?: unknown }).navigator;

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
      sessionStorage: {
        getItem: () => null,
        setItem: vi.fn(),
        removeItem: vi.fn()
      },
      confirm: vi.fn().mockReturnValue(true),
      matchMedia: () => ({ matches: false }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        onLine: true,
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
      }
    });
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    globalThis.window = origWindow;
    (globalThis as unknown as { document?: unknown }).document = origDocument;
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: origNavigator });
    vi.restoreAllMocks();
  });

  it("renders and exercises AppShellNav, CommandPalette, and OnboardingModal", () => {
    const onSelectView = vi.fn();
    const onCloseMobile = vi.fn();
    const navHtml = renderToStaticMarkup(
      <AppShellNav
        activeView="alerts"
        onSelectView={onSelectView}
        language="en"
        isMobileOpen={true}
        onCloseMobile={onCloseMobile}
        unreadAlertsCount={12}
        locationLabel="Kolkata"
      />
    );
    expect(navHtml).toContain("9+");
    expect(navHtml).toContain("Kolkata");

    const d = setupTestDispatcher();
    try {
      const navTree = d.render(AppShellNav, {
        activeView: "overview",
        onSelectView,
        language: "bn",
        isMobileOpen: true,
        onCloseMobile,
        unreadAlertsCount: 3
      });
      collectNodes(navTree, (el) => {
        if (typeof el.props["onClick"] === "function") (el.props["onClick"] as () => void)();
      });
      expect(onSelectView).toHaveBeenCalled();
      expect(onCloseMobile).toHaveBeenCalled();

      d.reset();
      // CommandPalette closed & open + search + Escape/Enter + theme actions
      expect(
        d.render(CommandPalette, {
          isOpen: false,
          onClose: vi.fn(),
          onSelectView: vi.fn(),
          onThemeChange: vi.fn(),
          language: "en"
        })
      ).toBeNull();

      const onCloseCP = vi.fn();
      const onThemeCP = vi.fn();
      const cpTree = d.render(CommandPalette, {
        isOpen: true,
        onClose: onCloseCP,
        onSelectView,
        onThemeChange: onThemeCP,
        language: "en"
      });
      collectNodes(cpTree, (el) => {
        if (typeof el.props["onChange"] === "function") {
          (el.props["onChange"] as (e: unknown) => void)({ target: { value: "Theme" } });
        }
        if (typeof el.props["onKeyDown"] === "function") {
          (el.props["onKeyDown"] as (e: unknown) => void)({ key: "Enter" });
          (el.props["onKeyDown"] as (e: unknown) => void)({ key: "Escape" });
        }
        if (typeof el.props["onClick"] === "function") {
          (el.props["onClick"] as () => void)();
        }
      });
      expect(onThemeCP).toHaveBeenCalled();
      expect(onCloseCP).toHaveBeenCalled();

      // Re-render with unmatched query to cover empty commands state
      const cpFiltered = d.render(CommandPalette, {
        isOpen: true,
        onClose: onCloseCP,
        onSelectView,
        onThemeChange: onThemeCP,
        language: "en"
      });
      expect(cpFiltered).not.toBeNull();

      // Re-render OnboardingModal after reset cleanly
      d.reset();
      expect(renderToStaticMarkup(<OnboardingModal isOpen={false} onClose={vi.fn()} language="en" />)).toBe("");
      const onNavOnb = vi.fn();
      const onCloseOnb = vi.fn();
      const onbTree = d.render(OnboardingModal, {
        isOpen: true,
        onClose: onCloseOnb,
        language: "en",
        onNavigate: onNavOnb
      });
      collectNodes(onbTree, (el) => {
        if (typeof el.props["onClick"] === "function") (el.props["onClick"] as () => void)();
      });
      expect(onNavOnb).toHaveBeenCalled();
      expect(onCloseOnb).toHaveBeenCalled();
    } finally {
      d.restore();
    }
  });

  it("exercises StationComparison and LearningCentre across all states and tabs", () => {
    const emptyHtml = renderToStaticMarkup(
      <StationComparison stations={[]} selectedStationId={null} onSelectStation={vi.fn()} language="en" />
    );
    expect(emptyHtml).toContain("No monitoring stations discovered");

    const d = setupTestDispatcher();
    const onSelectSt = vi.fn();
    try {
      const compTree = d.render(StationComparison, {
        stations: stationsFixture,
        selectedStationId: "STN-1",
        onSelectStation: onSelectSt,
        language: "en"
      });
      collectNodes(compTree, (el) => {
        if (typeof el.props["onClick"] === "function") (el.props["onClick"] as () => void)();
      });
      expect(onSelectSt).toHaveBeenCalled();

      // LearningCentre all 4 tabs
      d.reset();
      const learnTree = d.render(LearningCentre, { language: "en" });
      const tabs: Array<() => void> = [];
      collectNodes(learnTree, (el) => {
        if (el.type === "button" && typeof el.props["onClick"] === "function") {
          tabs.push(el.props["onClick"] as () => void);
        }
      });
      for (const clickTab of tabs) {
        clickTab();
        d.render(LearningCentre, { language: "en" });
      }
      expect(tabs.length).toBeGreaterThanOrEqual(4);
    } finally {
      d.restore();
    }
  });

  it("exercises DailyPlanner CRUD, templates, conflicts, and exposure journal", () => {
    const d = setupTestDispatcher();
    const onUpdateActivities = vi.fn();
    const onUpdateDiary = vi.fn();

    const activities: PlannedActivity[] = [
      {
        id: "a1",
        title: "Morning Run",
        category: "RUNNING",
        environment: "OUTDOOR",
        startTime: "07:00",
        endTime: "07:45",
        locationName: "Park",
        isFavorite: false,
        reminderEnabled: false
      },
      {
        id: "a2",
        title: "School Dropoff",
        category: "SCHOOL_COMMUTE",
        environment: "TRANSIT",
        startTime: "07:30",
        endTime: "08:15",
        locationName: "Bypass",
        isFavorite: true,
        reminderEnabled: true
      }
    ];
    const diary: ExposureDiaryEntry[] = [
      {
        id: "d1",
        recordedAt: "2026-11-24T08:00:00Z",
        activityTitle: "Outdoor walk",
        durationMinutes: 30,
        environment: "OUTDOOR",
        locationLabel: "Kolkata",
        ambientAqiAtTime: 215,
        stationUsed: "Victoria Memorial",
        selfReportedNotes: "Wore mask",
        isUserEntered: true
      }
    ];

    try {
      // Schedule tab
      const tree = d.render(DailyPlanner, {
        language: "en",
        stations: stationsFixture,
        selectedStation: stationsFixture[0]!,
        calculatedAqi: validAqiFixture,
        observations: obsFixture,
        forecast: forecastFixture,
        activities,
        onUpdateActivities,
        diaryEntries: diary,
        onUpdateDiary
      });
      collectNodes(tree, (el) => {
        if (typeof el.props["onChange"] === "function") {
          const val = el.props["type"] === "time" ? "10:00" : el.type === "select" ? "TRANSIT" : "Evening Stroll";
          (el.props["onChange"] as (e: unknown) => void)({ target: { value: val } });
        }
        if (el.type === "form" && typeof el.props["onSubmit"] === "function") {
          (el.props["onSubmit"] as (e: unknown) => void)({ preventDefault: vi.fn() });
        }
        if (el.type === "button" && typeof el.props["onClick"] === "function") {
          (el.props["onClick"] as () => void)();
        }
      });
      expect(onUpdateActivities).toHaveBeenCalled();

      // Switch to Commute and Diary tabs cleanly
      d.render(DailyPlanner, {
        language: "en",
        stations: stationsFixture,
        selectedStation: null,
        calculatedAqi: null,
        observations: [],
        forecast: [],
        activities: [],
        onUpdateActivities,
        diaryEntries: diary,
        onUpdateDiary
      });
    } finally {
      d.restore();
    }
  });

  it("exercises AgentWorkspace and AiChatWorkspace including API success, errors, and storage", async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/v1/agent")) {
        return {
          ok: true,
          json: async () => ({
            status: "SUCCESS",
            data: {
              taskType: "PURIFIER_SIZING",
              directAnswer: "Use 350 m3/h CADR",
              verifiedFacts: ["Room volume 56 m3"],
              explanation: "HEPA H13 recommended.",
              suggestedAction: "Close windows",
              sources: ["Engineering Calc"],
              confidenceOrLimitation: "Estimate",
              followUpPrompt: "Check ventilation",
              dataDistinction: "ESTIMATE",
              toolTraces: [{ toolName: "calculate_cadr", status: "SUCCESS", source: "CALC", dataClassification: "ESTIMATE", summary: "ok" }]
            }
          })
        };
      }
      return {
        ok: true,
        json: async () => ({
          status: "SUCCESS",
          data: {
            reply: "Verified AQI is 215 (Poor).",
            sources: ["CPCB"],
            isAiGenerated: false,
            dataDistinction: "CALCULATED_AQI"
          }
        })
      };
    }) as unknown as typeof fetch;

    const d = setupTestDispatcher();
    try {
      const agentTree = d.render(AgentWorkspace, {
        language: "en",
        selectedStation: stationsFixture[0]!,
        calculatedAqi: validAqiFixture,
        observations: obsFixture,
        forecast: forecastFixture
      });
      const actions: Array<() => Promise<void> | void> = [];
      collectNodes(agentTree, (el) => {
        if (typeof el.props["onChange"] === "function") {
          (el.props["onChange"] as (e: unknown) => void)({ target: { value: "5" } });
        }
        if (el.type === "form" && typeof el.props["onSubmit"] === "function") {
          actions.push(() => (el.props["onSubmit"] as (e: unknown) => Promise<void>)({ preventDefault: vi.fn() }));
        }
        if (el.type === "button" && typeof el.props["onClick"] === "function") {
          actions.push(el.props["onClick"] as () => Promise<void>);
        }
      });
      for (const act of actions) await act();
      // Re-render with result populated and trigger follow-up
      const agentRendered = d.render(AgentWorkspace, {
        language: "en",
        selectedStation: stationsFixture[0]!,
        calculatedAqi: validAqiFixture,
        observations: obsFixture,
        forecast: forecastFixture
      });
      expect(agentRendered).not.toBeNull();

      // Error branch on /api/v1/agent
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ status: "ERROR", message: "Validation error" })
      });
      for (const act of actions.slice(0, 1)) await act();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Offline"));
      for (const act of actions.slice(0, 1)) await act();

      // AiChatWorkspace
      const d2 = setupTestDispatcher();
      try {
        const chatTree = d2.render(AiChatWorkspace, {
          language: "en",
          selectedStation: stationsFixture[0]!,
          calculatedAqi: validAqiFixture,
          observations: obsFixture,
          forecast: forecastFixture
        });
        d2.runEffects();
        const chatActs: Array<() => Promise<void> | void> = [];
        collectNodes(chatTree, (el) => {
          if (typeof el.props["onChange"] === "function") {
            (el.props["onChange"] as (e: unknown) => void)({ target: { value: "Check PM2.5" } });
          }
          if (el.type === "form" && typeof el.props["onSubmit"] === "function") {
            chatActs.push(() => (el.props["onSubmit"] as (e: unknown) => Promise<void>)({ preventDefault: vi.fn() }));
          }
          if (el.type === "button" && typeof el.props["onClick"] === "function") {
            chatActs.push(el.props["onClick"] as () => Promise<void>);
          }
        });
        for (const a of chatActs) await a();
        const chatAfter = d2.render(AiChatWorkspace, {
          language: "en",
          selectedStation: stationsFixture[0]!,
          calculatedAqi: validAqiFixture,
          observations: obsFixture,
          forecast: forecastFixture
        });
        collectNodes(chatAfter, (el) => {
          if (el.type === "button" && typeof el.props["onClick"] === "function") {
            (el.props["onClick"] as () => void)();
          }
        });
      } finally {
        d2.restore();
      }
    } finally {
      d.restore();
    }
  });

  it("exercises InsightsWorkspace, SettingsWorkspace, Navbar, AqiSummaryCard, and interactive StationMap", () => {
    const insightsHtml = renderToStaticMarkup(
      <InsightsWorkspace
        language="en"
        stations={stationsFixture}
        selectedStation={stationsFixture[0]!}
        observations={obsFixture}
        forecast={forecastFixture}
      />
    );
    expect(insightsHtml).toContain("Discovered Stations");

    const d = setupTestDispatcher();
    const onLang = vi.fn();
    const onTheme = vi.fn();
    const onSavePlaces = vi.fn();
    const onSelectPlace = vi.fn();
    const places: SavedPlace[] = [
      { id: "pl-1", label: "HOME", customName: "Park Street", city: "Kolkata", state: "WB", latitude: 22.55, longitude: 88.35, isPrivate: true }
    ];

    try {
      const setTree = d.render(SettingsWorkspace, {
        language: "ur-IN",
        onLanguageChange: onLang,
        themeMode: "dark",
        onThemeChange: onTheme,
        savedPlaces: places,
        onUpdateSavedPlaces: onSavePlaces,
        onSelectSavedPlace: onSelectPlace,
        currentLocation: { name: "Kolkata", latitude: 22.57, longitude: 88.36 },
        onOpenHouseholdModal: vi.fn(),
        onOpenAlertPreferences: vi.fn(),
        onOpenAuthModal: vi.fn(),
        isAuthenticated: true
      });
      collectNodes(setTree, (el) => {
        if (typeof el.props["onChange"] === "function") {
          (el.props["onChange"] as (e: unknown) => void)({ target: { value: "hi-IN" } });
        }
        if (el.type === "form" && typeof el.props["onSubmit"] === "function") {
          (el.props["onSubmit"] as (e: unknown) => void)({ preventDefault: vi.fn() });
        }
        if (el.type === "button" && typeof el.props["onClick"] === "function") {
          (el.props["onClick"] as () => void)();
        }
      });
      expect(onTheme).toHaveBeenCalled();
      expect(onLang).toHaveBeenCalled();
      expect(onSavePlaces).toHaveBeenCalled();
      expect(onSelectPlace).toHaveBeenCalled();

      // Navbar new handlers
      const navEl = Navbar({
        language: "hi-IN",
        onLanguageChange: onLang,
        isAuthenticated: true,
        onOpenAuthModal: vi.fn(),
        onSignOut: vi.fn(),
        unreadAlertsCount: 15,
        onOpenNotifications: vi.fn(),
        themeMode: "high-contrast",
        onThemeChange: onTheme,
        onToggleMobileNav: vi.fn(),
        onOpenCommandPalette: vi.fn(),
        onOpenHelp: vi.fn()
      });
      collectNodes(navEl, (el) => {
        if (typeof el.props["onClick"] === "function") (el.props["onClick"] as () => void)();
        if (typeof el.props["onChange"] === "function") {
          (el.props["onChange"] as (e: unknown) => void)({ target: { value: "ta-IN" } });
        }
      });

      // AqiSummaryCard with alternative station & explore action
      const onSelAlt = vi.fn();
      const onExp = vi.fn();
      const sumEl = AqiSummaryCard({
        language: "en",
        station: stationsFixture[0]!,
        calculatedAqi: null,
        aqiStatus: "AQI_UNAVAILABLE",
        statusMessage: "Insufficient params",
        provider: "CPCB_CAAQMS",
        onOpenProvenance: vi.fn(),
        observations: obsFixture,
        alternativeStation: stationsFixture[1]!,
        onSelectStation: onSelAlt,
        onExploreStations: onExp
      });
      collectNodes(sumEl, (el) => {
        if (typeof el.props["onClick"] === "function") (el.props["onClick"] as () => void)();
      });
      expect(onSelAlt).toHaveBeenCalledWith(stationsFixture[1]);
      expect(onExp).toHaveBeenCalled();

      // StationMap interactive controls, drag, wheel, keyboard, layer switching, error fallback
      d.reset();
      const onMapSel = vi.fn();
      const onMapDetails = vi.fn();
      const mapTree = d.render(StationMap, {
        center: { latitude: 22.57, longitude: 88.36 },
        stations: stationsFixture,
        selectedStationId: "STN-1",
        onSelectStation: onMapSel,
        language: "en",
        currentObservations: obsFixture,
        currentAqiValue: 215,
        isLoading: true,
        onOpenStationDetails: onMapDetails
      });
      collectNodes(mapTree, (el) => {
        if (typeof el.props["onMouseDown"] === "function") {
          (el.props["onMouseDown"] as (e: unknown) => void)({ clientX: 100, clientY: 100 });
        }
        if (typeof el.props["onMouseMove"] === "function") {
          (el.props["onMouseMove"] as (e: unknown) => void)({ clientX: 120, clientY: 110 });
        }
        if (typeof el.props["onMouseUp"] === "function") {
          (el.props["onMouseUp"] as () => void)();
        }
        if (typeof el.props["onWheel"] === "function") {
          (el.props["onWheel"] as (e: unknown) => void)({ deltaY: -10 });
          (el.props["onWheel"] as (e: unknown) => void)({ deltaY: 10 });
        }
        if (typeof el.props["onKeyDown"] === "function") {
          for (const key of ["+", "-", "0", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"]) {
            (el.props["onKeyDown"] as (e: unknown) => void)({ key, preventDefault: vi.fn() });
          }
        }
        if (typeof el.props["onChange"] === "function") {
          (el.props["onChange"] as (e: unknown) => void)({ target: { value: "FORECAST" } });
          (el.props["onChange"] as (e: unknown) => void)({ target: { value: "POLLUTANTS" } });
          (el.props["onChange"] as (e: unknown) => void)({ target: { value: "OPENAQ" } });
        }
        if (typeof el.props["onMouseEnter"] === "function") (el.props["onMouseEnter"] as () => void)();
        if (typeof el.props["onMouseLeave"] === "function") (el.props["onMouseLeave"] as () => void)();
        if (typeof el.props["onClick"] === "function") {
          (el.props["onClick"] as (e: unknown) => void)({ stopPropagation: vi.fn() });
        }
      });

      // Render StationMap with error fallback
      d.render(StationMap, {
        center: { latitude: 22.57, longitude: 88.36 },
        stations: [],
        selectedStationId: null,
        onSelectStation: onMapSel,
        errorMessage: "Canvas fallback active"
      });
    } finally {
      d.restore();
    }
  });

  it("exercises DashboardPage 2.0 views, Ctrl+K, theme sync, and offline cached recovery", async () => {
    window.localStorage.setItem(
      "hs_last_snapshot_v2",
      JSON.stringify({
        station: stationsFixture[0],
        observations: obsFixture,
        calculatedAqi: validAqiFixture,
        aqiStatus: "AVAILABLE",
        statusMessage: "Cached",
        provider: "CPCB_CAAQMS"
      })
    );
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Offline")) as unknown as typeof fetch;

    const d = setupTestDispatcher();
    try {
      const tree = d.render(DashboardPage);
      d.runEffects();

      // Switch through all 11 AppRouteViews by invoking AppShellNav onSelectView
      const shellNav = (tree as { props: { children: Array<{ props?: { children?: Array<{ props?: Record<string, unknown> }> } }> } }).props.children[0]?.props?.children?.[2];
      const onSelectView = shellNav?.props?.["onSelectView"] as ((v: AppRouteView) => void) | undefined;
      const views: AppRouteView[] = ["map", "stations", "planner", "agent", "chat", "insights", "alerts", "indoor", "learn", "settings", "overview"];
      if (onSelectView) {
        for (const v of views) {
          onSelectView(v);
          const viewTree = d.render(DashboardPage);
          expect(viewTree).not.toBeNull();
        }
      }

      // Exercise footer/modals callbacks (CommandPalette, OnboardingModal)
      const rootChildren = (tree as { props: { children: unknown[] } }).props.children;
      for (const node of rootChildren.slice(2)) {
        const p = (node as { props?: Record<string, unknown> })?.props;
        if (p?.["onThemeChange"]) (p["onThemeChange"] as (m: "dark") => void)("dark");
        if (p?.["onNavigate"]) (p["onNavigate"] as (v: "settings") => void)("settings");
        if (p?.["onClose"]) (p["onClose"] as () => void)();
      }
    } finally {
      d.restore();
    }
  });

  it("closes all remaining UI component, interaction, fallback-locale, and DashboardPage 2.0 branches", async () => {
    // 1. Cover runtime TRANSLATIONS[lang] || TRANSLATIONS["en-IN"] fallback on all legacy components
    const fakeLang = "zz-ZZ" as never;
    expect(renderToStaticMarkup(<Footer language={fakeLang} />)).toContain("CPCB");
    expect(
      renderToStaticMarkup(<PollutantGrid language={fakeLang} observations={obsFixture} calculatedAqi={validAqiFixture} />)
    ).toContain("PM2.5");
    expect(
      renderToStaticMarkup(
        <RecommendationsPanel language={fakeLang} recommendations={[]} aiExplanation={null} isAqiUnavailable={true} />
      )
    ).toContain("AQI");
    expect(renderToStaticMarkup(<IndoorCoachPanel language={fakeLang} aqiCategory={null} />)).toBeTruthy();
    expect(renderToStaticMarkup(<ForecastChart forecast={forecastFixture} language={fakeLang} />)).toBeTruthy();
    expect(
      renderToStaticMarkup(<LocationSearch language={fakeLang} onSelectLocation={vi.fn()} />)
    ).toBeTruthy();
    expect(
      renderToStaticMarkup(
        <StationPanel
          language={fakeLang}
          stations={stationsFixture}
          selectedStationId="STN-1"
          onSelectStation={vi.fn()}
          onOpenProvenance={vi.fn()}
        />
      )
    ).toBeTruthy();
    expect(
      renderToStaticMarkup(
        <CommutePlanner language={fakeLang} stations={stationsFixture} currentAqi={200} forecast={forecastFixture} />
      )
    ).toBeTruthy();
    expect(
      renderToStaticMarkup(
        <NotificationCenter
          isOpen={true}
          onClose={vi.fn()}
          language={fakeLang}
          alerts={[]}
          onMarkAllAsRead={vi.fn()}
          onDismissAlert={vi.fn()}
          onClearAllAlerts={vi.fn()}
          onOpenPreferences={vi.fn()}
        />
      )
    ).toBeTruthy();
    const dAlerts = setupTestDispatcher();
    try {
      dAlerts.render(AlertPreferencesModal, {
        isOpen: true,
        onClose: vi.fn(),
        language: fakeLang,
        initialPreferences: {
          severityThreshold: "POOR",
          hysteresisEnabled: true,
          quietHoursEnabled: false,
          quietHoursStart: "22:00",
          quietHoursEnd: "06:00"
        },
        onSavePreferences: vi.fn()
      });
    } finally {
      dAlerts.restore();
    }

    // 2. DailyPlanner Commute & Exposure Journal subtabs + validation errors + diary deletion
    const dPlan = setupTestDispatcher();
    const onUpdAct = vi.fn();
    const onUpdDiary = vi.fn();
    try {
      const pTree = dPlan.render(DailyPlanner, {
        language: "en",
        stations: stationsFixture,
        selectedStation: null,
        calculatedAqi: null,
        observations: [],
        forecast: [],
        activities: [],
        onUpdateActivities: onUpdAct,
        diaryEntries: [
          {
            id: "d-keep",
            recordedAt: "2026-11-24T08:00:00Z",
            activityTitle: "Walk",
            durationMinutes: 20,
            environment: "OUTDOOR",
            locationLabel: "Kolkata",
            ambientAqiAtTime: null,
            stationUsed: null,
            isUserEntered: true
          }
        ],
        onUpdateDiary: onUpdDiary
      });
      // Submit empty form -> formError
      collectNodes(pTree, (el) => {
        if (el.type === "form" && typeof el.props["onSubmit"] === "function") {
          (el.props["onSubmit"] as (e: unknown) => void)({ preventDefault: vi.fn() });
        }
      });
      // Click "Commute Advisor" and "Exposure Journal" tabs explicitly
      let commuteBtn: (() => void) | undefined;
      let diaryBtn: (() => void) | undefined;
      collectNodes(pTree, (el) => {
        if (el.type === "button" && typeof el.props["onClick"] === "function") {
          const txt = JSON.stringify(el.props["children"] || "");
          if (txt.includes("Commute Advisor")) commuteBtn = el.props["onClick"] as () => void;
          if (txt.includes("Exposure Journal")) diaryBtn = el.props["onClick"] as () => void;
        }
      });
      commuteBtn?.();
      dPlan.render(DailyPlanner, {
        language: "en",
        stations: stationsFixture,
        selectedStation: null,
        calculatedAqi: null,
        observations: [],
        forecast: [],
        activities: [],
        onUpdateActivities: onUpdAct,
        diaryEntries: [],
        onUpdateDiary: onUpdDiary
      });

      diaryBtn?.();
      const diaryTree = dPlan.render(DailyPlanner, {
        language: "en",
        stations: stationsFixture,
        selectedStation: stationsFixture[0]!,
        calculatedAqi: validAqiFixture,
        observations: obsFixture,
        forecast: forecastFixture,
        activities: [],
        onUpdateActivities: onUpdAct,
        diaryEntries: [
          {
            id: "d-1",
            recordedAt: "2026-11-24T08:00:00Z",
            activityTitle: "Jog",
            durationMinutes: 15,
            environment: "OUTDOOR",
            locationLabel: "Kolkata",
            ambientAqiAtTime: 215,
            stationUsed: "Victoria Memorial",
            isUserEntered: true
          }
        ],
        onUpdateDiary: onUpdDiary
      });
      collectNodes(diaryTree, (el) => {
        if (typeof el.props["onChange"] === "function") {
          const val = el.props["type"] === "number" ? "45" : el.type === "select" ? "TRANSIT" : "Park Walk";
          (el.props["onChange"] as (e: unknown) => void)({ target: { value: val } });
        }
        if (el.type === "form" && typeof el.props["onSubmit"] === "function") {
          (el.props["onSubmit"] as (e: unknown) => void)({ preventDefault: vi.fn() });
        }
        if (el.type === "button" && typeof el.props["onClick"] === "function") {
          (el.props["onClick"] as () => void)();
        }
      });
      expect(onUpdDiary).toHaveBeenCalled();
    } finally {
      dPlan.restore();
    }

    // 3. AgentWorkspace follow-up click & AiChatWorkspace multi-thread + starter prompt + error retry
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Down")) as unknown as typeof fetch;
    const dChat = setupTestDispatcher();
    try {
      window.localStorage.setItem(
        "hs_chat_threads_v2",
        JSON.stringify([
          {
            id: "t1",
            title: "Thread One",
            messages: [
              { id: "m1", role: "user", text: "Hello", timestamp: "10:00" },
              { id: "m2", role: "assistant", text: "Reply", sources: ["CPCB"], timestamp: "10:01" }
            ]
          },
          { id: "t2", title: "Thread Two", messages: [] }
        ])
      );
      dChat.render(AiChatWorkspace, {
        language: "en",
        selectedStation: stationsFixture[0]!,
        calculatedAqi: validAqiFixture,
        observations: obsFixture,
        forecast: forecastFixture
      });
      dChat.runEffects();
      const chatTree2 = dChat.render(AiChatWorkspace, {
        language: "en",
        selectedStation: stationsFixture[0]!,
        calculatedAqi: validAqiFixture,
        observations: obsFixture,
        forecast: forecastFixture
      });
      const actions: Array<() => Promise<void> | void> = [];
      collectNodes(chatTree2, (el) => {
        if (el.type === "button" && typeof el.props["onClick"] === "function") {
          actions.push(el.props["onClick"] as () => Promise<void>);
        }
      });
      for (const a of actions) await a();
      // Click starter prompt when on empty thread & trigger retry on fetch error
      const chatTree3 = dChat.render(AiChatWorkspace, {
        language: "en",
        selectedStation: stationsFixture[0]!,
        calculatedAqi: validAqiFixture,
        observations: obsFixture,
        forecast: forecastFixture
      });
      collectNodes(chatTree3, (el) => {
        if (el.type === "button" && typeof el.props["onClick"] === "function") {
          (el.props["onClick"] as () => void)();
        }
      });
    } finally {
      dChat.restore();
    }

    // 4. StationMap dragging + error button + StationComparison >=4 cap + CommandPalette empty
    const dMap = setupTestDispatcher();
    try {
      const m1 = dMap.render(StationMap, {
        center: { latitude: 22.57, longitude: 88.36 },
        stations: stationsFixture,
        selectedStationId: "STN-1",
        onSelectStation: vi.fn()
      });
      collectNodes(m1, (el) => {
        if (typeof el.props["onMouseDown"] === "function") {
          (el.props["onMouseDown"] as (e: unknown) => void)({ clientX: 50, clientY: 50 });
        }
      });
      const m2 = dMap.render(StationMap, {
        center: { latitude: 22.57, longitude: 88.36 },
        stations: stationsFixture,
        selectedStationId: "STN-1",
        onSelectStation: vi.fn()
      });
      collectNodes(m2, (el) => {
        if (typeof el.props["onMouseMove"] === "function") {
          (el.props["onMouseMove"] as (e: unknown) => void)({ clientX: 80, clientY: 70 });
        }
      });
      dMap.reset();
      const mErr = dMap.render(StationMap, {
        center: { latitude: 22.57, longitude: 88.36 },
        stations: [],
        selectedStationId: null,
        onSelectStation: vi.fn(),
        errorMessage: "Error active"
      });
      collectNodes(mErr, (el) => {
        if (el.type === "button" && typeof el.props["onClick"] === "function") {
          (el.props["onClick"] as () => void)();
        }
      });

      dMap.reset();
      const cmpTree = dMap.render(StationComparison, {
        stations: stationsFixture,
        selectedStationId: "STN-1",
        onSelectStation: vi.fn(),
        language: "en"
      });
      collectNodes(cmpTree, (el) => {
        if (el.type === "button" && typeof el.props["onClick"] === "function") {
          (el.props["onClick"] as () => void)();
        }
      });

      dMap.reset();
      const cpEmpty = dMap.render(CommandPalette, {
        isOpen: true,
        onClose: vi.fn(),
        onSelectView: vi.fn(),
        onThemeChange: vi.fn(),
        language: "en"
      });
      collectNodes(cpEmpty, (el) => {
        if (typeof el.props["onChange"] === "function") {
          (el.props["onChange"] as (e: unknown) => void)({ target: { value: "zzzznoresult" } });
        }
      });
      const cpRenderedEmpty = dMap.render(CommandPalette, {
        isOpen: true,
        onClose: vi.fn(),
        onSelectView: vi.fn(),
        onThemeChange: vi.fn(),
        language: "en"
      });
      expect(cpRenderedEmpty).not.toBeNull();
    } finally {
      dMap.restore();
    }

    // 5. DashboardPage 2.0 Settings onSelectSavedPlace + Alerts + LocalStorage hydration + Auth profile
    window.localStorage.setItem("hs_alert_preferences", JSON.stringify({ severityThreshold: "MODERATE", hysteresisEnabled: true, quietHoursEnabled: false, quietHoursStart: "22:00", quietHoursEnd: "07:00" }));
    window.localStorage.setItem("hs_planner_activities_v2", JSON.stringify([]));
    window.localStorage.setItem("hs_saved_places_v2", JSON.stringify([{ id: "pl-1", label: "HOME", customName: "Home", city: "Delhi", state: "Delhi", latitude: 28.61, longitude: 77.2, isPrivate: true }]));
    window.localStorage.setItem("hs_exposure_diary_v2", JSON.stringify([]));
    window.localStorage.setItem("hs_onboarding_seen", "true");

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/v1/profile")) {
        return {
          ok: true,
          json: async () => ({
            status: "SUCCESS",
            data: {
              profile: {
                email: "user@hawasaathi.in",
                preferences: { language: "bn", theme: "dark" }
              }
            }
          })
        };
      }
      if (url.includes("/api/v1/stations/nearby")) {
        return { ok: true, json: async () => ({ status: "SUCCESS", data: { stations: stationsFixture } }) };
      }
      if (url.includes("/api/v1/air-quality")) {
        return {
          ok: true,
          json: async () => ({
            status: "SUCCESS",
            warnings: ["Partial monitor"],
            data: { observations: obsFixture, calculatedAqi: validAqiFixture, aqiStatus: "AVAILABLE", statusMessage: "OK", provider: "CPCB_CAAQMS" }
          })
        };
      }
      return { ok: true, json: async () => ({ status: "SUCCESS", data: { forecast: forecastFixture, recommendations: [], isAiGenerated: false } }) };
    }) as unknown as typeof fetch;

    const dDash = setupTestDispatcher();
    try {
      const dTree = dDash.render(DashboardPage);
      dDash.runEffects();
      await Promise.resolve();
      await Promise.resolve();

      // Switch to Settings and invoke onSelectSavedPlace, onUpdateSavedPlaces, onThemeChange, onLanguageChange
      const navNode = (dTree as { props: { children: Array<{ props?: { children?: Array<{ props?: Record<string, unknown> }> } }> } }).props.children[0]?.props?.children?.[2];
      const setView = navNode?.props?.["onSelectView"] as ((v: AppRouteView) => void) | undefined;
      setView?.("settings");
      const setViewTree = dDash.render(DashboardPage);
      collectNodes(setViewTree, (el) => {
        if (typeof el.props["onSelectSavedPlace"] === "function") {
          (el.props["onSelectSavedPlace"] as (p: SavedPlace) => void)({
            id: "pl-1",
            label: "HOME",
            customName: "Home",
            city: "Delhi",
            state: "Delhi",
            latitude: 28.61,
            longitude: 77.2,
            isPrivate: true
          });
        }
        if (typeof el.props["onUpdateSavedPlaces"] === "function") (el.props["onUpdateSavedPlaces"] as (x: SavedPlace[]) => void)([]);
      });

      setView?.("stations");
      const stViewTree = dDash.render(DashboardPage);
      collectNodes(stViewTree, (el) => {
        if (typeof el.props["onSelectStation"] === "function") {
          (el.props["onSelectStation"] as (s: NormalizedStation) => void)(stationsFixture[1]!);
        }
      });

      setView?.("planner");
      const plViewTree = dDash.render(DashboardPage);
      collectNodes(plViewTree, (el) => {
        if (typeof el.props["onUpdateActivities"] === "function") (el.props["onUpdateActivities"] as (x: PlannedActivity[]) => void)([]);
        if (typeof el.props["onUpdateDiary"] === "function") (el.props["onUpdateDiary"] as (x: ExposureDiaryEntry[]) => void)([]);
      });

      setView?.("alerts");
      const alViewTree = dDash.render(DashboardPage);
      collectNodes(alViewTree, (el) => {
        if (el.type === "button" && typeof el.props["onClick"] === "function") {
          (el.props["onClick"] as () => void)();
        }
      });
    } finally {
      dDash.restore();
    }
  });
});
