// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AqiSummaryCard } from "@/components/air-quality/aqi-summary-card";
import { PollutantGrid } from "@/components/air-quality/pollutant-grid";
import { ProvenanceModal } from "@/components/shared/provenance-modal";
import { DailyPlanner, parseSuggestedWindow } from "@/components/planner/daily-planner";
import { AiChatWorkspace } from "@/components/chat/ai-chat-workspace";
import { StationMap } from "@/components/maps/station-map";
import { StationPanel } from "@/components/stations/station-panel";
import { RecommendationsPanel } from "@/components/recommendations/recommendations-panel";
import { IndoorCoachPanel } from "@/components/household/indoor-coach-panel";
import DashboardPage from "@/app/page";

import { executeAgentTool } from "@/services/ai/agent-tools";
import { runIntelligentAgentTask } from "@/services/ai/agent-orchestrator";
import { generateGroundedChatReply } from "@/services/ai/chat-service";
import { getV2UiStrings } from "@/i18n/v2-translations";
import { CANONICAL_LOCALES, LOCALE_REGISTRY } from "@/i18n/locale-registry";
import { SourceOrchestrator, globalSourceOrchestrator } from "@/services/air-quality/source-orchestrator";
import { CpcbAdapter } from "@/services/providers/cpcb/cpcb-adapter";
import { OpenAQClient } from "@/services/providers/openaq/openaq-client";
import { OpenAQAdapter } from "@/services/providers/openaq/openaq-adapter";
import { GET as getAirQualityRoute } from "@/app/api/v1/air-quality/route";
import { CacheService } from "@/services/cache/cache-service";
import type { AirQualityProvider } from "@/services/providers/types";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";
import type { NormalizedStation, NormalizedObservation, NormalizedForecast } from "@/schemas/providers/normalized-provider.schema";
import type { PlannedActivity } from "@/schemas/planner.schema";

const mockGenerateContent = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    public models = { generateContent: mockGenerateContent };
  }
}));

function setupTestDispatcher() {
  const states = new Map<number, unknown>();
  const effects: Array<() => void> = [];
  let idx = 0;

  const internals = (React as unknown as {
    __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: { H: unknown };
  }).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const origH = internals.H;

  internals.H = {
    useState: (init: unknown) => {
      const id = idx++;
      if (!states.has(id)) {
        states.set(id, typeof init === "function" ? (init as () => unknown)() : init);
      }
      const set = (updater: unknown) => {
        const cur = states.get(id);
        states.set(id, typeof updater === "function" ? (updater as (v: unknown) => unknown)(cur) : updater);
      };
      return [states.get(id), set];
    },
    useEffect: (fn: () => void) => effects.push(fn),
    useCallback: (fn: unknown) => fn,
    useMemo: (fn: () => unknown) => fn(),
    useRef: (init: unknown) => {
      const id = idx++;
      if (!states.has(id)) {
        states.set(id, { current: init });
      }
      return states.get(id) as { current: unknown };
    },
    useId: () => "v2-reg-id"
  };

  return {
    render: <P,>(Comp: (props: P) => React.ReactNode | Promise<React.ReactNode>, props?: P) => {
      idx = 0;
      effects.length = 0;
      return Comp(props as P);
    },
    reset: () => {
      states.clear();
      idx = 0;
      effects.length = 0;
    },
    runEffects: () => {
      for (const ef of effects) {
        try {
          ef();
        } catch {
          // ignore cleanup in unit dispatcher
        }
      }
    },
    restore: () => {
      internals.H = origH;
    }
  };
}

function walkTree(node: unknown, cb: (el: { type: unknown; props: Record<string, unknown> }) => void) {
  if (!node || typeof node !== "object") return;
  const n = node as { type?: unknown; props?: Record<string, unknown> };
  if (n.props) {
    cb({ type: n.type, props: n.props });
    const children = n.props["children"];
    if (Array.isArray(children)) {
      children.forEach((c) => walkTree(c, cb));
    } else if (children) {
      walkTree(children, cb);
    }
  }
}

const sampleStation: NormalizedStation = {
  id: "cpcb_west-bengal_kolkata_belur-math",
  providerId: "CPCB_CAAQMS",
  name: "Belur Math, Howrah - WBPCB",
  city: "Howrah",
  state: "West Bengal",
  latitude: 22.6295,
  longitude: 88.3532,
  availablePollutants: ["PM2.5", "PM10", "NO2", "SO2"],
  lastReportedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  license: "GODL-India",
  attribution: "CPCB / WBPCB",
  distanceKm: 6.4
};

const sampleStationPartial: NormalizedStation = {
  id: "cpcb_west-bengal_kolkata_rabindra-bharati",
  providerId: "CPCB_CAAQMS",
  name: "Rabindra Bharati University, Kolkata - WBPCB",
  city: "Kolkata",
  state: "West Bengal",
  latitude: 22.6278,
  longitude: 88.3804,
  availablePollutants: ["NO2"],
  lastReportedAt: null,
  license: "GODL-India",
  attribution: "CPCB / WBPCB",
  distanceKm: 3.1
};

const sampleObs: NormalizedObservation[] = [
  {
    id: "obs-1",
    stationId: sampleStation.id,
    stationName: sampleStation.name,
    providerId: "CPCB_CAAQMS",
    pollutant: "PM2.5",
    value: 92,
    unit: "µg/m³",
    averagingPeriod: "24h",
    observationTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    sourceUpdateTime: null,
    retrievalTime: new Date().toISOString(),
    typology: "TYPE_C_RAW_MEASUREMENT",
    qualityFlag: "VERIFIED",
    license: "GODL-India",
    attribution: "CPCB"
  },
  {
    id: "obs-2",
    stationId: sampleStation.id,
    stationName: sampleStation.name,
    providerId: "OPENAQ",
    pollutant: "NO2",
    value: 44,
    unit: null,
    averagingPeriod: "1h",
    observationTime: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    sourceUpdateTime: null,
    retrievalTime: new Date().toISOString(),
    typology: "TYPE_C_RAW_MEASUREMENT",
    qualityFlag: "PROVISIONAL",
    license: "CC-BY-4.0",
    attribution: "OpenAQ"
  },
  {
    id: "obs-3",
    stationId: sampleStation.id,
    stationName: sampleStation.name,
    providerId: "CPCB_CAAQMS",
    pollutant: "SO2",
    value: 18,
    unit: "µg/m³",
    averagingPeriod: "24h",
    observationTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    sourceUpdateTime: null,
    retrievalTime: new Date().toISOString(),
    typology: "TYPE_C_RAW_MEASUREMENT",
    qualityFlag: "STALE",
    license: "GODL-India",
    attribution: "CPCB"
  },
  {
    id: "obs-4",
    stationId: sampleStation.id,
    stationName: sampleStation.name,
    providerId: "CPCB_CAAQMS",
    pollutant: "CO",
    value: 1.4,
    unit: "mg/m³",
    averagingPeriod: "8h",
    observationTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    sourceUpdateTime: null,
    retrievalTime: new Date().toISOString(),
    typology: "TYPE_C_RAW_MEASUREMENT",
    qualityFlag: "SUSPICIOUS",
    license: "GODL-India",
    attribution: "CPCB"
  }
];

const poorAqi: CpcbAqiResult = {
  stationId: sampleStation.id,
  calculatedAtUtc: new Date().toISOString(),
  overallAqi: 245,
  rawMathematicalAqi: 245,
  category: "POOR",
  prominentPollutant: "PM2.5",
  sufficiencyStatus: "SUFFICIENT",
  completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
  subIndices: [],
  isBeyondNominalScale: false,
  reportingCeilingCappedAqi: 245,
  explanation: "Calculated Poor AQI"
};

const sampleForecast: NormalizedForecast[] = [
  {
    id: "fc-1",
    latitude: 22.57,
    longitude: 88.36,
    modelDomain: "cams_global",
    spatialResolutionKm: 45,
    temporalResolutionHours: 1,
    pollutant: "PM2.5",
    forecastValue: 58,
    unit: "µg/m³",
    validTime: "2026-11-25T13:00:00Z",
    issueTime: null,
    retrievalTime: new Date().toISOString(),
    typology: "TYPE_D_MODEL_FORECAST",
    license: "CC-BY-4.0",
    attribution: "CAMS"
  }
];

describe("HawaSaathi 2.0 Functional Regression & Closure Suite (V2-REG)", () => {
  const origWindow = globalThis.window;
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear()
      },
      sessionStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k)
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      matchMedia: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    };
  });

  afterEach(() => {
    globalThis.window = origWindow;
    globalThis.fetch = origFetch;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    mockGenerateContent.mockReset();
  });

  describe("Stage 1: Location vs Station Separation, Provenance Typology & Pollutant Quality", () => {
    it("separates searched geographic location from monitoring station identity and avoids Type C contradiction", () => {
      const noStationHtml = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          searchLocation={{ name: "Kolkata", city: "Kolkata", state: "West Bengal" }}
          station={null}
          calculatedAqi={null}
          aqiStatus="AQI_UNAVAILABLE"
          statusMessage="No monitoring stations found within 35 km radius."
          provider="NONE"
          discoveredStationsCount={0}
          forecastPointsCount={10}
          onOpenProvenance={() => {}}
        />
      );
      expect(noStationHtml).toContain("Search Location: Kolkata, West Bengal");
      expect(noStationHtml).toContain("Location: Kolkata, Kolkata");
      expect(noStationHtml).toContain("Type D: Model Forecast Context");
      expect(noStationHtml).not.toContain("Type C: Raw Monitored");

      const noObsStationHtml = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          searchLocation={{ name: "Kolkata", city: "Kolkata", state: "West Bengal" }}
          station={sampleStationPartial}
          calculatedAqi={null}
          aqiStatus="AQI_UNAVAILABLE"
          statusMessage="Overall CPCB AQI unavailable."
          provider="CPCB_CAAQMS"
          observations={[]}
          alternativeStation={sampleStation}
          discoveredStationsCount={2}
          forecastPointsCount={10}
          retrievalTime={new Date().toISOString()}
          onSelectStation={() => {}}
          onOpenProvenance={() => {}}
        />
      );
      expect(noObsStationHtml).toContain("Rabindra Bharati University, Kolkata - WBPCB");
      expect(noObsStationHtml).toContain("No verified observation available");
      expect(noObsStationHtml).not.toContain("Type C: Raw Monitored");
      expect(noObsStationHtml).toContain("Try Nearby: Belur Math, Howrah - WBPCB (6.4 km)");
      expect(noObsStationHtml).toContain("4 pollutant(s)");

      // Ensure Type A renders when provider is CPCB_OFFICIAL
      const typeAHtml = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          station={sampleStation}
          calculatedAqi={poorAqi}
          aqiStatus="AVAILABLE"
          statusMessage="Official bulletin"
          provider="CPCB_OFFICIAL"
          observations={sampleObs}
          onOpenProvenance={() => {}}
        />
      );
      expect(typeAHtml).toContain("Type A: Official CPCB AQI");

      // Loading state + no alt distance/lastReportedAt branches + OPENAQ alt + Salt Lake sub-location & blank city
      const loadingHtml = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          searchLocation={{ name: "Salt Lake", city: "Kolkata", state: "West Bengal" }}
          station={null}
          calculatedAqi={null}
          aqiStatus="STALE"
          statusMessage="Stale reading"
          provider="OPENAQ"
          isLoading={true}
          observations={sampleObs.slice(0, 1)}
          alternativeStation={{ ...sampleStationPartial, providerId: "OPENAQ", distanceKm: undefined, lastReportedAt: null }}
          onSelectStation={() => {}}
          onOpenProvenance={() => {}}
        />
      );
      expect(loadingHtml).toContain("Search Location: Salt Lake, Kolkata, West Bengal");
      expect(loadingHtml).toContain("Discovering nearby air quality monitoring stations...");
      expect(loadingHtml).toContain("Verified AQI Stale");
      expect(loadingHtml).toContain("Type C: Raw Monitored");
      expect(loadingHtml).toContain("OpenAQ •");

      const blankCityHtml = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          searchLocation={{ name: "Durgapur", city: "", state: "West Bengal" }}
          station={null}
          calculatedAqi={null}
          aqiStatus="AQI_UNAVAILABLE"
          statusMessage=""
          provider="NONE"
          observations={[]}
          onOpenProvenance={() => {}}
        />
      );
      expect(blankCityHtml).toContain("Location: Durgapur, West Bengal");
    });

    it("renders PollutantGrid across VERIFIED, PROVISIONAL, STALE, SUSPICIOUS, Provider Unavailable, and No Station states", () => {
      const htmlAllFlags = renderToStaticMarkup(
        <PollutantGrid language="en" observations={sampleObs} calculatedAqi={poorAqi} />
      );
      expect(htmlAllFlags).toContain("VERIFIED");
      expect(htmlAllFlags).toContain("PROVISIONAL");
      expect(htmlAllFlags).toContain("STALE (&gt;24h)");
      expect(htmlAllFlags).toContain("SUSPICIOUS");
      expect(htmlAllFlags).toContain("unit unverified");
      expect(htmlAllFlags).toContain("Not Monitored (Not Zero)");

      const htmlProviderDown = renderToStaticMarkup(
        <PollutantGrid language="en" observations={[]} calculatedAqi={null} providerUnavailable={true} />
      );
      expect(htmlProviderDown).toContain("Provider Unavailable");

      const htmlNoStation = renderToStaticMarkup(
        <PollutantGrid language="en" observations={[]} calculatedAqi={null} stationSelected={false} />
      );
      expect(htmlNoStation).toContain("No Station Selected");
    });

    it("renders ProvenanceModal timestamps across unsorted observations and empty fallback", () => {
      const htmlWithObs = renderToStaticMarkup(
        <ProvenanceModal
          isOpen={true}
          onClose={() => {}}
          station={sampleStation}
          calculatedAqi={poorAqi}
          observations={sampleObs}
          provider="CPCB_CAAQMS"
        />
      );
      expect(htmlWithObs).toContain("Latest Observation Time:");
      expect(htmlWithObs).toContain("Server Retrieval Time:");

      const htmlNoObs = renderToStaticMarkup(
        <ProvenanceModal
          isOpen={true}
          onClose={() => {}}
          station={null}
          calculatedAqi={null}
          observations={[]}
          provider=""
        />
      );
      expect(htmlNoObs).toContain("Upstream Provider:");
      expect(htmlNoObs).toContain("Unavailable");
    });
  });

  describe("Stage 2A: Daily Schedule Planner CRUD, Day Navigation, Editing & Server Verify", () => {
    it("exercises day navigation, category auto-env, activity edit, 1-click reschedule, reminders, and /api/v1/planner verification", async () => {
      const d = setupTestDispatcher();
      const onUpdateActivities = vi.fn();
      const act1: PlannedActivity = {
        id: "act-edit-1",
        title: "Morning Run",
        category: "RUNNING",
        environment: "OUTDOOR",
        startTime: "07:00",
        endTime: "07:45",
        locationName: "Maidan",
        isFavorite: false,
        reminderEnabled: false
      };

      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "SUCCESS",
          data: {
            evaluatedAt: new Date().toISOString(),
            evaluations: [],
            conflicts: [],
            bestOutdoorWindow: "12:00 - 15:00",
            bestVentilationWindow: "Keep sealed",
            overallConfidence: "HIGH",
            summaryNote: "Server verified schedule."
          }
        })
      }) as unknown as typeof fetch;

      expect(parseSuggestedWindow("Morning")).toBeNull();
      expect(parseSuggestedWindow("15:00-14:00")).toBeNull();

      try {
        // First render empty activities -> Verify Plan early return
        const treeEmpty = d.render(DailyPlanner, {
          language: "en",
          stations: [],
          selectedStation: null,
          calculatedAqi: null,
          observations: [],
          forecast: sampleForecast,
          activities: [],
          onUpdateActivities,
          diaryEntries: [],
          onUpdateDiary: vi.fn()
        });
        let emptyVerifyBtn: (() => Promise<void>) | undefined;
        let createTitleInput: ((e: unknown) => void) | undefined;
        let createLocInput: ((e: unknown) => void) | undefined;
        let createForm: ((e: unknown) => void) | undefined;
        walkTree(treeEmpty, (el) => {
          if (el.type === "button" && JSON.stringify(el.props["children"] || "").includes("Verify Plan")) {
            emptyVerifyBtn = el.props["onClick"] as () => Promise<void>;
          }
          if (el.props["id"] === "planner-title") createTitleInput = el.props["onChange"] as (e: unknown) => void;
          if (el.props["id"] === "planner-location") createLocInput = el.props["onChange"] as (e: unknown) => void;
          if (el.type === "form" && el.props["onSubmit"]) createForm = el.props["onSubmit"] as (e: unknown) => void;
        });
        await emptyVerifyBtn?.();
        // Create activity with empty location & null selectedStation -> falls back to "Local Area"
        createTitleInput?.({ target: { value: "Indoor Stretch" } });
        createLocInput?.({ target: { value: "  " } });
        d.render(DailyPlanner, {
          language: "en",
          stations: [],
          selectedStation: null,
          calculatedAqi: null,
          observations: [],
          forecast: sampleForecast,
          activities: [],
          onUpdateActivities,
          diaryEntries: [],
          onUpdateDiary: vi.fn()
        });
        walkTree(
          d.render(DailyPlanner, {
            language: "en",
            stations: [],
            selectedStation: null,
            calculatedAqi: null,
            observations: [],
            forecast: sampleForecast,
            activities: [],
            onUpdateActivities,
            diaryEntries: [],
            onUpdateDiary: vi.fn()
          }),
          (el) => {
            if (el.type === "form" && el.props["onSubmit"]) createForm = el.props["onSubmit"] as (e: unknown) => void;
          }
        );
        createForm?.({ preventDefault: vi.fn() });

        d.reset();
        const act2: PlannedActivity = {
          ...act1,
          id: "act-2",
          title: "Evening Study",
          dateKey: new Date().toISOString().slice(0, 10)
        };
        const tree1 = d.render(DailyPlanner, {
          language: "en",
          stations: [sampleStation],
          selectedStation: null,
          calculatedAqi: poorAqi,
          observations: sampleObs,
          forecast: sampleForecast,
          activities: [act1, act2],
          onUpdateActivities,
          diaryEntries: [],
          onUpdateDiary: vi.fn()
        });

        // Switch day to Tomorrow then back to Today
        let tomorrowBtn: (() => void) | undefined;
        let todayBtn: (() => void) | undefined;
        let editBtn: (() => void) | undefined;
        let reminderBtn: (() => void) | undefined;
        let rescheduleBtn: (() => void) | undefined;
        let verifyBtn: (() => Promise<void>) | undefined;
        let catSelect: ((e: unknown) => void) | undefined;
        let locInput: ((e: unknown) => void) | undefined;
        let remCheckbox: ((e: unknown) => void) | undefined;
        let deleteBtn: (() => void) | undefined;

        walkTree(tree1, (el) => {
          if (el.type === "button" && typeof el.props["onClick"] === "function") {
            const label = String(el.props["aria-label"] || "");
            const txt = JSON.stringify(el.props["children"] || "");
            if (txt.includes("Tomorrow")) tomorrowBtn = el.props["onClick"] as () => void;
            if (txt.includes("Today")) todayBtn = el.props["onClick"] as () => void;
            if (label === `Edit ${act1.title}`) editBtn = el.props["onClick"] as () => void;
            if (label.includes("reminder")) reminderBtn = el.props["onClick"] as () => void;
            if (txt.includes("Apply Suggested Window")) rescheduleBtn = el.props["onClick"] as () => void;
            if (txt.includes("Verify Plan")) verifyBtn = el.props["onClick"] as () => Promise<void>;
            if (label.startsWith("Delete ")) deleteBtn = el.props["onClick"] as () => void;
          }
          if (el.props["id"] === "planner-category") catSelect = el.props["onChange"] as (e: unknown) => void;
          if (el.props["id"] === "planner-location") locInput = el.props["onChange"] as (e: unknown) => void;
          if (el.props["id"] === "planner-reminder") remCheckbox = el.props["onChange"] as (e: unknown) => void;
        });

        tomorrowBtn?.();
        todayBtn?.();
        catSelect?.({ target: { value: "COLLEGE_COMMUTE" } });
        locInput?.({ target: { value: "Salt Lake Sector V" } });
        remCheckbox?.({ target: { checked: true } });
        reminderBtn?.();
        rescheduleBtn?.();
        deleteBtn?.();
        await verifyBtn?.();

        // Trigger Edit mode with empty location & null selectedStation -> submit changes
        editBtn?.();
        locInput?.({ target: { value: "   " } });
        const treeEdit = d.render(DailyPlanner, {
          language: "en",
          stations: [sampleStation],
          selectedStation: null,
          calculatedAqi: poorAqi,
          observations: sampleObs,
          forecast: sampleForecast,
          activities: [act1, act2],
          onUpdateActivities,
          diaryEntries: [],
          onUpdateDiary: vi.fn()
        });
        walkTree(treeEdit, (el) => {
          if (el.type === "form" && typeof el.props["onSubmit"] === "function") {
            (el.props["onSubmit"] as (e: unknown) => void)({ preventDefault: vi.fn() });
          }
        });
        expect(onUpdateActivities).toHaveBeenCalled();

        // Exercise edit + delete while editingId matches act1.id (hits resetForm on delete)
        editBtn?.();
        const treeEditDel = d.render(DailyPlanner, {
          language: "en",
          stations: [sampleStation],
          selectedStation: sampleStation,
          calculatedAqi: poorAqi,
          observations: sampleObs,
          forecast: sampleForecast,
          activities: [act1, act2],
          onUpdateActivities,
          diaryEntries: [],
          onUpdateDiary: vi.fn()
        });
        let editDeleteBtn: (() => void) | undefined;
        walkTree(treeEditDel, (el) => {
          if (el.type === "button" && String(el.props["aria-label"] || "") === `Delete ${act1.title}`) {
            editDeleteBtn = el.props["onClick"] as () => void;
          }
        });
        editDeleteBtn?.();

        // Exercise error (with message + without message) & network catch on /api/v1/planner
        (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: false,
          json: async () => ({ status: "ERROR", message: "Validation rejected" })
        });
        await verifyBtn?.();
        (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: false,
          json: async () => ({ status: "ERROR" })
        });
        await verifyBtn?.();
        (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Offline"));
        await verifyBtn?.();

        // Also cover Cancel Edit button + location fallback empty string
        editBtn?.();
        const treeCancel = d.render(DailyPlanner, {
          language: "en",
          stations: [sampleStation],
          selectedStation: sampleStation,
          calculatedAqi: poorAqi,
          observations: sampleObs,
          forecast: sampleForecast,
          activities: [act1],
          onUpdateActivities,
          diaryEntries: [],
          onUpdateDiary: vi.fn()
        });
        let cancelBtn: (() => void) | undefined;
        walkTree(treeCancel, (el) => {
          if (el.type === "button" && JSON.stringify(el.props["children"] || "") === '"Cancel"') {
            cancelBtn = el.props["onClick"] as () => void;
          }
        });
        cancelBtn?.();
      } finally {
        d.restore();
      }
    });
  });

  describe("Stage 2B: Intelligent Agent Tools, Permissions & Orchestration", () => {
    const guestCtx = { isAuthenticated: false, hasCloudConsent: false };
    const authCtx = { isAuthenticated: true, hasCloudConsent: true };

    it("executes get_station_details, calculate_ach, create_daily_plan, update_daily_plan, get_alert_rules, update_alert_rules cleanly", async () => {
      vi.spyOn(globalSourceOrchestrator, "getStationAirQuality").mockResolvedValue({
        station: sampleStation,
        observations: sampleObs,
        calculatedAqi: poorAqi,
        aqiStatus: "AVAILABLE",
        statusMessage: "Verified",
        provider: "CPCB_CAAQMS",
        retrievedAt: new Date().toISOString(),
        warnings: []
      });

      const details = await executeAgentTool("get_station_details", { stationId: sampleStation.id }, guestCtx);
      expect(details.ok).toBe(true);

      // calculate_ach OPTIMAL, MODERATE, UNDERSIZED + error
      expect((await executeAgentTool("calculate_ach", { roomLengthMeters: 4, roomWidthMeters: 3, roomHeightMeters: 2.5, deviceCadrM3H: 200 }, guestCtx)).ok).toBe(true);
      expect((await executeAgentTool("calculate_ach", { roomLengthMeters: 5, roomWidthMeters: 4, roomHeightMeters: 3, deviceCadrM3H: 200 }, guestCtx)).ok).toBe(true);
      expect((await executeAgentTool("calculate_ach", { roomLengthMeters: 10, roomWidthMeters: 10, roomHeightMeters: 4, deviceCadrM3H: 150 }, guestCtx)).ok).toBe(true);
      expect((await executeAgentTool("calculate_ach", { roomLengthMeters: -2 }, guestCtx)).trace.status).toBe("VALIDATION_ERROR");

      // Daily plan permission boundary
      const sampleAct: PlannedActivity = {
        id: "p1",
        title: "Walk",
        category: "WALKING",
        environment: "OUTDOOR",
        startTime: "12:00",
        endTime: "12:30",
        locationName: "Park",
        isFavorite: false,
        reminderEnabled: false
      };
      expect((await executeAgentTool("create_daily_plan", { activities: [] }, guestCtx)).trace.status).toBe("VALIDATION_ERROR");
      expect((await executeAgentTool("create_daily_plan", { activities: [sampleAct], persistToCloud: true }, guestCtx)).trace.status).toBe("PERMISSION_DENIED");
      expect((await executeAgentTool("update_daily_plan", { activities: [sampleAct], persistToCloud: true }, authCtx)).ok).toBe(true);
      expect((await executeAgentTool("create_daily_plan", { activities: [sampleAct], persistToCloud: false }, guestCtx)).ok).toBe(true);

      // Alert rules & permission boundary
      expect((await executeAgentTool("get_alert_rules", {}, guestCtx)).ok).toBe(true);
      expect((await executeAgentTool("update_alert_rules", { severityThreshold: "BAD" }, guestCtx)).trace.status).toBe("VALIDATION_ERROR");
      expect((await executeAgentTool("update_alert_rules", { severityThreshold: "POOR", persistToCloud: true }, guestCtx)).trace.status).toBe("PERMISSION_DENIED");
      expect((await executeAgentTool("update_alert_rules", { severityThreshold: "VERY_POOR", persistToCloud: true }, authCtx)).ok).toBe(true);

      // Orchestrator alert rules intent
      const alertTask = await runIntelligentAgentTask({
        prompt: "Explain alert thresholds and quiet hours",
        context: guestCtx
      });
      expect(alertTask.taskType).toBe("ALERT_RULES_ADVISORY");
    });
  });

  describe("Stage 2C: AI Chat Thread Rename, Delete Thread, Consent & Educational Guardrail", () => {
    it("exercises rename, cancel rename, delete single/multi threads, share station consent, and educational category definition", async () => {
      const d = setupTestDispatcher();
      try {
        window.localStorage.setItem(
          "hs_chat_threads_v2",
          JSON.stringify([
            { id: "th-1", title: "Alpha Chat", messages: [] },
            { id: "th-2", title: "Beta Chat", messages: [] }
          ])
        );
        d.render(AiChatWorkspace, {
          language: "en",
          selectedStation: sampleStation,
          calculatedAqi: null,
          observations: [],
          forecast: sampleForecast
        });
        d.runEffects();
        const chatTree = d.render(AiChatWorkspace, {
          language: "en",
          selectedStation: sampleStation,
          calculatedAqi: null,
          observations: [],
          forecast: sampleForecast
        });

        let renameOpenBtn: (() => void) | undefined;
        let delBtn1: (() => void) | undefined;
        let delBtn2: (() => void) | undefined;
        let consentCheckbox: ((e: unknown) => void) | undefined;
        walkTree(chatTree, (el) => {
          if (el.type === "button" && typeof el.props["onClick"] === "function") {
            const label = String(el.props["aria-label"] || "");
            const txt = JSON.stringify(el.props["children"] || "");
            if (txt.includes("Rename")) renameOpenBtn = el.props["onClick"] as () => void;
            if (label === "Delete conversation Alpha Chat") delBtn1 = el.props["onClick"] as () => void;
            if (label === "Delete conversation Beta Chat") delBtn2 = el.props["onClick"] as () => void;
          }
          if (el.props["type"] === "checkbox") {
            consentCheckbox = el.props["onChange"] as (e: unknown) => void;
          }
        });

        consentCheckbox?.({ target: { checked: true } });
        renameOpenBtn?.();
        const chatRenameView = d.render(AiChatWorkspace, {
          language: "en",
          selectedStation: sampleStation,
          calculatedAqi: null,
          observations: [],
          forecast: sampleForecast
        });
        walkTree(chatRenameView, (el) => {
          if (el.props["aria-label"] === "Conversation title") {
            (el.props["onChange"] as (e: unknown) => void)({ target: { value: "Kolkata Air Plan" } });
          }
        });
        const chatRenameCommit = d.render(AiChatWorkspace, {
          language: "en",
          selectedStation: sampleStation,
          calculatedAqi: null,
          observations: [],
          forecast: sampleForecast
        });
        walkTree(chatRenameCommit, (el) => {
          if (el.type === "form" && typeof el.props["onSubmit"] === "function") {
            (el.props["onSubmit"] as (e: unknown) => void)({ preventDefault: vi.fn() });
          }
        });

        // Empty rename commit branch (clean === "")
        renameOpenBtn?.();
        const chatEmptyRename = d.render(AiChatWorkspace, {
          language: "en",
          selectedStation: sampleStation,
          calculatedAqi: null,
          observations: [],
          forecast: sampleForecast
        });
        walkTree(chatEmptyRename, (el) => {
          if (el.props["aria-label"] === "Conversation title") {
            (el.props["onChange"] as (e: unknown) => void)({ target: { value: "   " } });
          }
        });
        const chatEmptyCommit = d.render(AiChatWorkspace, {
          language: "en",
          selectedStation: sampleStation,
          calculatedAqi: null,
          observations: [],
          forecast: sampleForecast
        });
        walkTree(chatEmptyCommit, (el) => {
          if (el.type === "form" && typeof el.props["onSubmit"] === "function") {
            (el.props["onSubmit"] as (e: unknown) => void)({ preventDefault: vi.fn() });
          }
        });

        // Disable station consent + send message while fetch rejects (covers catch + shareStationConsent=false)
        consentCheckbox?.({ target: { checked: false } });
        globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("Network offline")) as unknown as typeof fetch;
        const chatSendPre = d.render(AiChatWorkspace, {
          language: "en",
          selectedStation: sampleStation,
          calculatedAqi: null,
          observations: [],
          forecast: sampleForecast
        });
        walkTree(chatSendPre, (el) => {
          if (el.type === "input" && el.props["aria-label"] !== "Conversation title" && el.props["type"] !== "checkbox") {
            (el.props["onChange"] as (e: unknown) => void)({ target: { value: "What does PM2.5 mean?" } });
          }
        });
        const chatSendReady = d.render(AiChatWorkspace, {
          language: "en",
          selectedStation: sampleStation,
          calculatedAqi: null,
          observations: [],
          forecast: sampleForecast
        });
        let chatSubmitFn: ((e: unknown) => Promise<void>) | undefined;
        walkTree(chatSendReady, (el) => {
          if (el.type === "form") chatSubmitFn = el.props["onSubmit"] as (e: unknown) => Promise<void>;
        });
        await chatSubmitFn?.({ preventDefault: vi.fn() });

        // Re-enable station consent + send successfully (hits line 154 shareStationConsent=true)
        consentCheckbox?.({ target: { checked: true } });
        globalThis.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: "SUCCESS",
            data: { reply: "Station grounded advice.", sources: ["CPCB"], isAiGenerated: false, dataDistinction: "TYPE_A" }
          })
        }) as unknown as typeof fetch;
        const chatConsentOn = d.render(AiChatWorkspace, {
          language: "en",
          selectedStation: sampleStation,
          calculatedAqi: null,
          observations: [],
          forecast: sampleForecast
        });
        walkTree(chatConsentOn, (el) => {
          if (el.type === "input" && el.props["aria-label"] !== "Conversation title" && el.props["type"] !== "checkbox") {
            (el.props["onChange"] as (e: unknown) => void)({ target: { value: "Station summary please" } });
          }
        });
        const chatConsentSubmit = d.render(AiChatWorkspace, {
          language: "en",
          selectedStation: sampleStation,
          calculatedAqi: null,
          observations: [],
          forecast: sampleForecast
        });
        let submitWithConsent: ((e: unknown) => Promise<void>) | undefined;
        walkTree(chatConsentSubmit, (el) => {
          if (el.type === "form") submitWithConsent = el.props["onSubmit"] as (e: unknown) => Promise<void>;
        });
        await submitWithConsent?.({ preventDefault: vi.fn() });

        delBtn1?.();
        delBtn2?.();

        // Verify general educational CPCB definition passes while local AQI claim fails
        mockGenerateContent.mockResolvedValueOnce({
          text: "On the CPCB NAQI scale, Moderate category covers 101-200 while Good category covers 0-50. Overall AQI here is currently unavailable."
        });
        const eduReply = await generateGroundedChatReply(
          { message: "Explain Moderate category", calculatedAqi: null },
          "fake-key"
        );
        expect(eduReply.isAiGenerated).toBe(true);
      } finally {
        d.restore();
      }
    });
  });

  describe("Stage 2D: Interactive Map Touch, Pinch Zoom, OSM Tiles, Collision Avoidance & 23 Locales", () => {
    it("exercises touch drag, two-finger pinch zoom, OSM tile toggle/fallback, AQI_CATEGORY filter, and label de-overlap", () => {
      const denseStations: NormalizedStation[] = [
        sampleStation,
        { ...sampleStation, id: "S2", name: "Howrah Maidan", latitude: 22.6296, longitude: 88.3533, availablePollutants: ["PM10", "NO2", "SO2"] },
        { ...sampleStation, id: "S3", name: "Gas Only Station", latitude: 22.6297, longitude: 88.3534, availablePollutants: ["NO2", "SO2", "CO"] }
      ];

      const d = setupTestDispatcher();
      try {
        const tree1 = d.render(StationMap, {
          center: { latitude: 22.6295, longitude: 88.3532 },
          stations: denseStations,
          selectedStationId: null,
          onSelectStation: vi.fn()
        });

        let svgEl: Record<string, unknown> | undefined;
        let osmCheckbox: ((e: unknown) => void) | undefined;
        let layerSelect: ((e: unknown) => void) | undefined;
        walkTree(tree1, (el) => {
          if (el.type === "svg") svgEl = el.props;
          if (el.props["type"] === "checkbox") osmCheckbox = el.props["onChange"] as (e: unknown) => void;
          if (el.props["id"] === "map-layer-select") layerSelect = el.props["onChange"] as (e: unknown) => void;
        });

        // Switch layer to AQI_CATEGORY to cover PM2.5/PM10 filter true & false paths
        layerSelect?.({ target: { value: "AQI_CATEGORY" } });

        // 0-touch start/move no-op + Single-finger touch pan
        (svgEl?.["onTouchStart"] as (e: unknown) => void)({ touches: [] });
        (svgEl?.["onTouchMove"] as (e: unknown) => void)({ touches: [] });
        (svgEl?.["onTouchStart"] as (e: unknown) => void)({ touches: [{ clientX: 100, clientY: 100 }] });
        const treeDrag = d.render(StationMap, {
          center: { latitude: 22.6295, longitude: 88.3532 },
          stations: denseStations,
          selectedStationId: null,
          onSelectStation: vi.fn()
        });
        walkTree(treeDrag, (el) => {
          if (el.type === "svg") {
            (el.props["onTouchMove"] as (e: unknown) => void)({ touches: [{ clientX: 140, clientY: 120 }] });
            (el.props["onTouchEnd"] as () => void)();
          }
        });

        // Two-finger pinch zoom (small delta <= 0.08 ignored, then large delta > 0.08 applied)
        (svgEl?.["onTouchStart"] as (e: unknown) => void)({
          touches: [
            { clientX: 100, clientY: 100 },
            { clientX: 200, clientY: 100 }
          ]
        });
        const treePinch = d.render(StationMap, {
          center: { latitude: 22.6295, longitude: 88.3532 },
          stations: denseStations,
          selectedStationId: null,
          onSelectStation: vi.fn()
        });
        walkTree(treePinch, (el) => {
          if (el.type === "svg") {
            (el.props["onTouchMove"] as (e: unknown) => void)({
              touches: [
                { clientX: 100, clientY: 100 },
                { clientX: 202, clientY: 100 }
              ]
            });
            (el.props["onTouchMove"] as (e: unknown) => void)({
              touches: [
                { clientX: 50, clientY: 100 },
                { clientX: 250, clientY: 100 }
              ]
            });
          }
        });

        // Enable OSM tiles + trigger image onError fallback + high zoom label collision check
        osmCheckbox?.({ target: { checked: true } });
        const treeOsm = d.render(StationMap, {
          center: { latitude: 22.6295, longitude: 88.3532 },
          stations: denseStations,
          selectedStationId: null,
          onSelectStation: vi.fn()
        });
        walkTree(treeOsm, (el) => {
          if (el.type === "image" && typeof el.props["onError"] === "function") {
            (el.props["onError"] as () => void)();
          }
        });
      } finally {
        d.restore();
      }
    });

    it("verifies zero missing V2 UI translation keys across all 23 Indian locales and closes DashboardPage async/race/fallback branches", async () => {
      for (const locale of CANONICAL_LOCALES) {
        const resolved = getV2UiStrings(locale);
        expect(resolved.fallbackKeys).toHaveLength(0);
        expect(resolved.strings.navDailyPlanner.length).toBeGreaterThan(0);
        expect(resolved.strings.navIntelligentAgent.length).toBeGreaterThan(0);
        expect(resolved.strings.navAiChat.length).toBeGreaterThan(0);
        expect(resolved.strings.themeHighContrast.length).toBeGreaterThan(0);
        if (locale === "ur-IN" || locale === "ks-IN" || locale === "sd-IN") {
          expect(LOCALE_REGISTRY[locale].direction).toBe("rtl");
        }
      }

      const flush = async () => {
        for (let i = 0; i < 20; i++) await Promise.resolve();
      };

      // 1. Geolocation present + missing geolocation fallback + ineligible alternativeStation fallback
      vi.stubGlobal("navigator", {
        onLine: true,
        geolocation: {
          getCurrentPosition: (ok: (p: { coords: { latitude: number; longitude: number } }) => void, err: () => void) => {
            ok({ coords: { latitude: 22.57, longitude: 88.36 } });
            err();
          }
        }
      });

      const d = setupTestDispatcher();
      try {
        // Without AbortController (covers 279[1], 293[1], 365[1], 377[1]) + empty unit observation (442[1], 444[1]) + AbortError
        vi.stubGlobal("AbortController", undefined);
        const obsNoUnit: NormalizedObservation[] = [
          { ...sampleObs[0]!, unit: "" }
        ];
        const partialSt2: NormalizedStation = { ...sampleStationPartial, id: "STN-PART-2", availablePollutants: ["CO"] };
        globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
          if (url.includes("/api/v1/stations/nearby")) {
            return { ok: true, json: async () => ({ status: "SUCCESS", data: { stations: [sampleStationPartial, partialSt2] } }) };
          }
          if (url.includes("/api/v1/air-quality")) {
            return {
              ok: true,
              json: async () => ({
                status: "SUCCESS",
                data: { observations: obsNoUnit, calculatedAqi: null, aqiStatus: "AQI_UNAVAILABLE", statusMessage: "Partial", provider: "CPCB_CAAQMS" }
              })
            };
          }
          if (url.includes("/api/v1/forecast")) {
            return { ok: true, json: async () => ({ status: "SUCCESS", data: { forecast: sampleForecast } }) };
          }
          return { ok: true, json: async () => ({ status: "SUCCESS", data: {} }) };
        }) as unknown as typeof fetch;

        const t1 = d.render(DashboardPage);
        d.runEffects();
        await flush();
        d.render(DashboardPage);
        d.runEffects();
        await flush();

        // Invoke onLocateUser both with & without navigator.geolocation
        walkTree(t1, (el) => {
          if (typeof el.props["onLocateUser"] === "function") {
            (el.props["onLocateUser"] as () => void)();
          }
        });
        vi.stubGlobal("navigator", { onLine: true });
        walkTree(t1, (el) => {
          if (typeof el.props["onLocateUser"] === "function") {
            (el.props["onLocateUser"] as () => void)();
          }
        });

        // 2. AbortError + cached retrievedAt + seq mismatch races + empty stations provider="NONE" (786)
        vi.unstubAllGlobals();
        vi.stubGlobal("navigator", { onLine: true });
        window.localStorage.setItem(
          "hs_last_snapshot_v2",
          JSON.stringify({
            station: sampleStation,
            observations: sampleObs,
            calculatedAqi: null,
            aqiStatus: "AQI_UNAVAILABLE",
            statusMessage: "Cached",
            provider: "CPCB_CAAQMS",
            retrievedAt: new Date().toISOString()
          })
        );

        let rejectSlowAq: ((e: unknown) => void) | undefined;
        let resolveOuterStations2: ((v: unknown) => void) | undefined;
        let resolveSlowStationsJson: ((v: unknown) => void) | undefined;
        let resolveSlowForecastJson: ((v: unknown) => void) | undefined;
        let rejectStationsCall1: ((e: unknown) => void) | undefined;
        let rejectStationsCall4: ((e: unknown) => void) | undefined;
        let stationCall = 0;
        let aqCount = 0;
        globalThis.fetch = vi.fn().mockImplementation((url: string) => {
          if (url.includes("/api/v1/stations/nearby")) {
            stationCall += 1;
            const callIdx = stationCall;
            if (callIdx === 1) {
              return new Promise((_res, rej) => {
                rejectStationsCall1 = rej;
              });
            }
            if (callIdx === 2) {
              return new Promise((res) => {
                resolveOuterStations2 = res;
              });
            }
            if (callIdx === 3) {
              return Promise.resolve({
                ok: true,
                json: () =>
                  new Promise((res) => {
                    resolveSlowStationsJson = res;
                  })
              });
            }
            if (callIdx === 6) {
              return new Promise((_res, rej) => {
                rejectStationsCall4 = rej;
              });
            }
            return Promise.resolve({
              ok: true,
              json: async () => ({ status: "SUCCESS", data: { stations: [] } })
            });
          }
          if (url.includes("/api/v1/forecast")) {
            if (stationCall === 5) {
              return Promise.resolve({
                ok: true,
                json: () =>
                  new Promise((res) => {
                    resolveSlowForecastJson = res;
                  })
              });
            }
            return Promise.resolve({
              ok: true,
              json: async () => ({ status: "SUCCESS", data: { forecast: [] } })
            });
          }
          if (url.includes("/api/v1/air-quality")) {
            aqCount += 1;
            if (aqCount === 1) {
              return Promise.reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
            }
            if (aqCount === 2) {
              return new Promise((_res, rej) => {
                rejectSlowAq = rej;
              });
            }
            return Promise.reject(new Error("Offline network"));
          }
          return Promise.resolve({ ok: true, json: async () => ({ status: "SUCCESS", data: {} }) });
        }) as unknown as typeof fetch;

        d.reset();
        const tRace0 = d.render(DashboardPage);
        d.runEffects();

        let onSelLoc: ((loc: { name: string; city: string; state: string; latitude: number; longitude: number }) => void) | undefined;
        let onSelStn: ((s: NormalizedStation) => void) | undefined;
        walkTree(tRace0, (el) => {
          if (typeof el.props["onSelectLocation"] === "function") onSelLoc = el.props["onSelectLocation"] as typeof onSelLoc;
          if (typeof el.props["onSelectStation"] === "function") onSelStn = el.props["onSelectStation"] as typeof onSelStn;
        });

        // Switch to loc 2 while call 1 pending; reject call 1 w/ AbortError (419[0])
        onSelLoc?.({ name: "Pune", city: "Pune", state: "Maharashtra", latitude: 18.52, longitude: 73.85 });
        const tRace2 = d.render(DashboardPage);
        d.runEffects(); // starts call 2 (outer stations pending)
        rejectStationsCall1?.(Object.assign(new Error("aborted"), { name: "AbortError" }));
        await flush();

        // Switch to loc 3 while call 2 outer fetch still pending, then resolve call 2 outer -> hits 388[0]!
        onSelLoc?.({ name: "Nagpur", city: "Nagpur", state: "Maharashtra", latitude: 21.14, longitude: 79.08 });
        d.render(DashboardPage);
        d.runEffects(); // starts call 3 (json pending)
        resolveOuterStations2?.({ ok: true, json: async () => ({ status: "SUCCESS", data: { stations: [] } }) });
        await flush();

        // Switch to loc 4 while call 3 stations.json() pending, then resolve call 3 stations.json() -> hits 392[0]!
        onSelLoc?.({ name: "Delhi", city: "Delhi", state: "Delhi", latitude: 28.61, longitude: 77.20 });
        d.render(DashboardPage);
        d.runEffects(); // starts call 4 (empty stations -> provider="NONE", loadingStations=false)
        await flush();
        resolveSlowStationsJson?.({ status: "SUCCESS", data: { stations: [sampleStation] } }); // stale 392[0]
        await flush();

        // Render with provider="NONE" && loadingStations=false (786 true!)
        d.render(DashboardPage);

        // Start call 5 (stations settles empty, forecast.json() stays pending while loadingStations=true -> 786[1] false!)
        onSelLoc?.({ name: "Chennai", city: "Chennai", state: "Tamil Nadu", latitude: 13.08, longitude: 80.27 });
        const tLoadingNone = d.render(DashboardPage);
        d.runEffects(); // starts call 5
        await flush();

        // Start call 6 while call 5's forecast.json() pending, then resolve stale forecast.json() -> hits 414[1]!
        onSelLoc?.({ name: "Jaipur", city: "Jaipur", state: "Rajasthan", latitude: 26.91, longitude: 75.78 });
        d.render(DashboardPage);
        d.runEffects(); // starts call 6
        resolveSlowForecastJson?.({ status: "SUCCESS", data: { forecast: sampleForecast } }); // stale 414[1]
        await flush();

        // Start call 7 then reject call 6 non-AbortError (420[1])
        onSelLoc?.({ name: "Kochi", city: "Kochi", state: "Kerala", latitude: 9.93, longitude: 76.26 });
        d.render(DashboardPage);
        d.runEffects(); // starts call 6
        rejectStationsCall4?.(new Error("late failure")); // stale non-AbortError catch (420[1])
        await flush();

        // Test stale fetchAirQuality AbortError + superseded catch (328[0]) + cached snapshot retrievedAt (349)
        onSelStn?.(sampleStation); // aqCount=1 -> AbortError
        await flush();
        onSelStn?.(sampleStationPartial); // aqCount=2 -> pending slow promise
        onSelStn?.(sampleStation); // aqCount=3 -> network error using cached snapshot w/ retrievedAt
        rejectSlowAq?.(new Error("late aq fail")); // hits catch reqSeq !== aqReqSeqRef (328[0])
        await flush();
        d.render(DashboardPage);
        expect(tRace2).not.toBeNull();
        expect(tLoadingNone).not.toBeNull();
      } finally {
        d.restore();
      }
    });
  });

  describe("Stage 3: Live data.gov.in avg_value Schema, Multi-Page Merge, OpenAQ CO µg/m³ & Null-AQI Safety", () => {
    it("parses live data.gov.in avg_value/min_value/max_value records, skips NA, and paginates stations & observations cleanly", async () => {
      const adapter = new CpcbAdapter({ apiKey: "test-key" });
      const recentDate = new Date(Date.now() - 30 * 60 * 1000);
      const ist = new Date(recentDate.getTime() + 5.5 * 3600 * 1000);
      const lastUpdate = `${String(ist.getUTCDate()).padStart(2, "0")}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}-${ist.getUTCFullYear()} ${String(ist.getUTCHours()).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")}:${String(ist.getUTCSeconds()).padStart(2, "0")}`;

      // 1. Direct processRecords using actual live data.gov.in avg_value + numeric value + NA row
      const proc = adapter.processRecords(
        [
          {
            country: "India",
            state: "West Bengal",
            city: "Kolkata",
            station: "Rabindra Bharati University, Kolkata - WBPCB",
            last_update: lastUpdate,
            latitude: "22.627847",
            longitude: "88.380669",
            pollutant_id: "PM2.5",
            min_value: "59",
            max_value: "94",
            avg_value: "77"
          },
          {
            country: "India",
            state: "West Bengal",
            city: "Kolkata",
            station: "Rabindra Bharati University, Kolkata - WBPCB",
            last_update: lastUpdate,
            latitude: "22.627847",
            longitude: "88.380669",
            pollutant_id: "PM10",
            min_value: 74,
            max_value: 105,
            avg_value: 91
          },
          {
            country: "India",
            state: "West Bengal",
            city: "Kolkata",
            station: "Rabindra Bharati University, Kolkata - WBPCB",
            last_update: lastUpdate,
            latitude: "22.627847",
            longitude: "88.380669",
            pollutant_id: "NO2",
            min_value: "NA",
            max_value: "NA",
            avg_value: "NA"
          },
          {
            country: "India",
            state: "West Bengal",
            city: "Kolkata",
            station: "Rabindra Bharati University, Kolkata - WBPCB",
            last_update: lastUpdate,
            latitude: "22.627847",
            longitude: "88.380669",
            pollutant_id: "SO2",
            avg_value: null
          }
        ],
        new Date().toISOString()
      );
      expect(proc.observations).toHaveLength(2);
      expect(proc.observations[0]?.value).toBe(77);
      expect(proc.observations[0]?.unit).toBeNull();
      expect(proc.stations[0]?.availablePollutants).toEqual(["PM2.5", "PM10"]);

      // 2. Direct filters[station] fast-path hit + fallback miss->multi-page merge
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            total: 2,
            records: [
              {
                country: "India",
                state: "West Bengal",
                city: "Kolkata",
                station: "Rabindra Bharati University, Kolkata - WBPCB",
                last_update: lastUpdate,
                latitude: "22.6278",
                longitude: "88.3806",
                pollutant_id: "PM2.5",
                avg_value: "77"
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            total: 2,
            records: [] // direct filter returns 0 -> falls back to paginated scan
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            total: 2000,
            records: [
              {
                country: "India",
                state: "West Bengal",
                city: "Kolkata",
                station: "Rabindra Bharati University, Kolkata - WBPCB",
                last_update: lastUpdate,
                latitude: "22.6278",
                longitude: "88.3806",
                pollutant_id: "PM2.5",
                avg_value: "77"
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            total: 2000,
            records: [
              {
                country: "India",
                state: "West Bengal",
                city: "Kolkata",
                station: "Rabindra Bharati University, Kolkata - WBPCB",
                last_update: lastUpdate,
                latitude: "22.6278",
                longitude: "88.3806",
                pollutant_id: "PM10",
                avg_value: "91"
              }
            ]
          })
        }) as unknown as typeof fetch;

      const directFast = await adapter.getObservations({
        stationId: "cpcb_west-bengal_kolkata_rabindra-bharati-university-kolkata-wbpcb",
        stationName: "Rabindra Bharati University, Kolkata - WBPCB"
      });
      expect(directFast.observations).toHaveLength(1);

      const fallbackMerged = await adapter.getObservations({
        stationId: "cpcb_west-bengal_kolkata_rabindra-bharati-university-kolkata-wbpcb",
        stationName: "Rabindra Bharati University, Kolkata - WBPCB"
      });
      expect(fallbackMerged.observations).toHaveLength(2);

      // 3. No stationId query + default searchStations multi-page pagination
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            total: 1,
            records: [
              {
                country: "India",
                state: "West Bengal",
                city: "Kolkata",
                station: "Rabindra Bharati University, Kolkata - WBPCB",
                last_update: lastUpdate,
                latitude: "22.6278",
                longitude: "88.3806",
                pollutant_id: "PM2.5",
                avg_value: "77"
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            total: 1200,
            records: Array.from({ length: 1000 }, (_, i) => ({
              country: "India",
              state: "West Bengal",
              city: "Kolkata",
              station: `Stn-${i}`,
              last_update: lastUpdate,
              latitude: "22.6278",
              longitude: "88.3806",
              pollutant_id: "PM2.5",
              avg_value: "77"
            }))
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            total: 1200,
            records: [
              {
                country: "India",
                state: "West Bengal",
                city: "Kolkata",
                station: "SVSPA Campus, Barrackpore - WBPCB",
                last_update: lastUpdate,
                latitude: "22.7605",
                longitude: "88.3617",
                pollutant_id: "PM10",
                avg_value: "88"
              }
            ]
          })
        }) as unknown as typeof fetch;

      const allObsRes = await adapter.getObservations({});
      expect(allObsRes.observations).toHaveLength(1);
      const searchAllRes = await adapter.searchStations({ latitude: 22.63, longitude: 88.38, radiusKm: 35 });
      expect(searchAllRes.stations.some((s) => s.name.includes("SVSPA Campus"))).toBe(true);
    });

    it("handles OpenAQ CO µg/m³->mg/m³ hourly deduplication, CPCB unit-missing scientific statusMessage, StationPanel coverage, and null AQI safety", async () => {
      const nowIso = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const hourBucket = nowIso.slice(0, 13);
      const pm25Hours: NormalizedObservation[] = Array.from({ length: 18 }, (_, i) => ({
        id: `oq-pm25-${i}`,
        stationId: "openaq_5614",
        stationName: "Padmapukur, Howrah - WBPCB",
        providerId: "OPENAQ",
        pollutant: "PM2.5",
        value: 60,
        unit: "µg/m³",
        averagingPeriod: "1h",
        typology: "TYPE_C_RAW_MEASUREMENT",
        observationTime: new Date(Date.now() - i * 3600 * 1000).toISOString(),
        sourceUpdateTime: null,
        retrievalTime: nowIso,
        qualityFlag: "VERIFIED",
        license: "CC",
        attribution: "OpenAQ"
      }));
      const o3Hours: NormalizedObservation[] = Array.from({ length: 18 }, (_, i) => ({
        ...pm25Hours[0]!,
        id: `oq-o3-${i}`,
        pollutant: "O3",
        value: 50,
        observationTime: new Date(Date.now() - i * 3600 * 1000).toISOString()
      }));
      const coHours: NormalizedObservation[] = [
        ...Array.from({ length: 18 }, (_, i) => ({
          ...pm25Hours[0]!,
          id: `oq-co-${i}`,
          pollutant: "CO" as const,
          value: 1500, // 1500 µg/m³ -> 1.5 mg/m³
          unit: "µg/m³" as const,
          observationTime: new Date(Date.now() - i * 3600 * 1000).toISOString()
        })),
        // Duplicate same hour bucket -> deduplicated by hourBucket
        {
          ...pm25Hours[0]!,
          id: "oq-co-dup",
          pollutant: "CO",
          value: 2000,
          unit: "µg/m³",
          observationTime: `${hourBucket}:10:00.000Z`
        }
      ];

      const mockOpenaq: AirQualityProvider = {
        providerId: "OPENAQ",
        getCapabilities: async () => ({
          providerId: "OPENAQ",
          displayName: "OpenAQ",
          providesGroundObservations: true,
          providesAtmosphericForecast: false,
          providesStationSearch: true,
          rateLimitPerMinute: 60,
          defaultCacheTtlSeconds: 600,
          legalLicense: "CC",
          mandatoryAttribution: "OpenAQ"
        }),
        searchStations: async () => ({ providerId: "OPENAQ", stations: [], retrievedAt: nowIso, status: "CONFIGURED", warnings: [] }),
        getObservations: async () => ({
          providerId: "OPENAQ",
          observations: [...pm25Hours, ...o3Hours, ...coHours],
          retrievedAt: nowIso,
          status: "CONFIGURED",
          warnings: []
        }),
        getForecast: async () => ({ providerId: "OPENAQ", forecast: [], modelDomain: "NONE", spatialResolutionKm: 0, temporalResolutionHours: 0, retrievedAt: nowIso, status: "CONFIGURED", warnings: [] })
      };

      const mockCpcb: AirQualityProvider = {
        providerId: "CPCB_CAAQMS",
        getCapabilities: async () => ({
          providerId: "CPCB_CAAQMS",
          displayName: "CPCB",
          providesGroundObservations: true,
          providesAtmosphericForecast: false,
          providesStationSearch: true,
          rateLimitPerMinute: 60,
          defaultCacheTtlSeconds: 600,
          legalLicense: "GODL",
          mandatoryAttribution: "CPCB"
        }),
        searchStations: async () => ({ providerId: "CPCB_CAAQMS", stations: [], retrievedAt: nowIso, status: "CONFIGURED", warnings: [] }),
        getObservations: async () => ({
          providerId: "CPCB_CAAQMS",
          observations: [
            { ...pm25Hours[0]!, stationId: "cpcb_rbu", providerId: "CPCB_CAAQMS", pollutant: "PM2.5", unit: null, averagingPeriod: "UNKNOWN", observationTime: nowIso },
            { ...pm25Hours[0]!, stationId: "cpcb_rbu", providerId: "CPCB_CAAQMS", pollutant: "PM10", unit: null, averagingPeriod: "UNKNOWN", observationTime: nowIso },
            { ...pm25Hours[0]!, stationId: "cpcb_rbu", providerId: "CPCB_CAAQMS", pollutant: "NO2", unit: null, averagingPeriod: "UNKNOWN", observationTime: nowIso }
          ],
          retrievedAt: nowIso,
          status: "CONFIGURED",
          warnings: []
        }),
        getForecast: async () => ({ providerId: "CPCB_CAAQMS", forecast: [], modelDomain: "NONE", spatialResolutionKm: 0, temporalResolutionHours: 0, retrievedAt: nowIso, status: "CONFIGURED", warnings: [] })
      };

      const orch = new SourceOrchestrator({
        cpcbProvider: mockCpcb,
        openaqProvider: mockOpenaq,
        cacheService: new CacheService()
      });

      const staleEarlyHours: NormalizedObservation[] = [
        { ...pm25Hours[0]!, stationId: "openaq_window_fresh", qualityFlag: "STALE", observationTime: new Date(Date.now() - 25 * 3600 * 1000).toISOString() },
        ...pm25Hours.map((o) => ({ ...o, stationId: "openaq_window_fresh" })),
        ...o3Hours.map((o) => ({ ...o, stationId: "openaq_window_fresh" })),
        ...coHours.map((o) => ({ ...o, stationId: "openaq_window_fresh" }))
      ];
      const orchFreshWindow = new SourceOrchestrator({
        openaqProvider: {
          ...mockOpenaq,
          getObservations: async () => ({
            providerId: "OPENAQ",
            observations: staleEarlyHours,
            retrievedAt: nowIso,
            status: "CONFIGURED",
            warnings: []
          })
        },
        cacheService: new CacheService()
      });
      const freshWinRes = await orchFreshWindow.getStationAirQuality("openaq_window_fresh");
      expect(freshWinRes.aqiStatus).toBe("AVAILABLE");

      const oqRes = await orch.getStationAirQuality("openaq_5614");
      expect(oqRes.aqiStatus).toBe("AVAILABLE");
      expect(oqRes.calculatedAqi?.overallAqi).not.toBeNull();

      const cpcbRes = await orch.getStationAirQuality("cpcb_rbu", { ...sampleStation, id: "cpcb_rbu" });
      expect(cpcbRes.aqiStatus).toBe("AQI_UNAVAILABLE");
      expect(cpcbRes.statusMessage).toContain("omits physical units");

      // Partial eligible sub-indices (<3 pollutants) preserve calculatedAqi=null and expose partialSubIndices
      const mockPartialOpenaq: AirQualityProvider = {
        ...mockOpenaq,
        getObservations: async () => ({
          providerId: "OPENAQ",
          observations: pm25Hours.map((o) => ({ ...o, stationId: "openaq_partial_only" })),
          retrievedAt: nowIso,
          status: "CONFIGURED",
          warnings: []
        })
      };
      const orchPartial = new SourceOrchestrator({
        openaqProvider: mockPartialOpenaq,
        cacheService: new CacheService()
      });
      const partialRes = await orchPartial.getStationAirQuality("openaq_partial_only");
      expect(partialRes.aqiStatus).toBe("AQI_UNAVAILABLE");
      expect(partialRes.calculatedAqi).toBeNull();
      expect(partialRes.partialSubIndices?.[0]?.subIndex).not.toBeNull();

      // OpenAQ insufficient hours (<16h) + SUSPICIOUS/future exclusion (all readings suspicious -> line 217 + dup hour -> line 262)
      const futureIso = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
      const mockInsuffOpenaq: AirQualityProvider = {
        ...mockOpenaq,
        getObservations: async () => ({
          providerId: "OPENAQ",
          observations: [
            ...pm25Hours.slice(0, 6).map((o) => ({ ...o, stationId: "openaq_insuff_only" })),
            { ...pm25Hours[0]!, stationId: "openaq_insuff_only", id: "oq-dup-hr", observationTime: pm25Hours[1]!.observationTime },
            ...o3Hours.slice(0, 6).map((o) => ({ ...o, stationId: "openaq_insuff_only" })),
            ...coHours.slice(0, 6).map((o) => ({ ...o, stationId: "openaq_insuff_only" })),
            { ...pm25Hours[0]!, stationId: "openaq_insuff_only", id: "oq-so2-future", pollutant: "SO2", observationTime: futureIso, qualityFlag: "VERIFIED" },
            { ...pm25Hours[0]!, stationId: "openaq_insuff_only", id: "oq-susp", qualityFlag: "SUSPICIOUS" }
          ],
          retrievedAt: nowIso,
          status: "CONFIGURED",
          warnings: []
        })
      };
      const orchInsuff = new SourceOrchestrator({
        openaqProvider: mockInsuffOpenaq,
        cacheService: new CacheService()
      });
      const insuffRes = await orchInsuff.getStationAirQuality("openaq_insuff_only");
      expect(insuffRes.aqiStatus).toBe("AQI_UNAVAILABLE");
      expect(insuffRes.statusMessage).toContain("statutory 16-hour");
      expect(insuffRes.warnings.some((w) => w.includes("insufficient hourly completeness"))).toBe(true);

      // PollutantGrid honest headers with 0 vs >0 observations
      const emptyGrid = renderToStaticMarkup(<PollutantGrid language="en" observations={[]} calculatedAqi={null} />);
      expect(emptyGrid).toContain("No Raw Observations Available");
      expect(emptyGrid).not.toContain("Type C Raw Observations");

      // StationPanel multi-pollutant PM10-only vs non-PM gas-only vs inactive coverage breakdown
      const covHtml = renderToStaticMarkup(
        <StationPanel
          language="en"
          stations={[
            { ...sampleStation, id: "S-PM10", availablePollutants: ["PM10", "NO2", "SO2"], lastReportedAt: nowIso },
            { ...sampleStation, id: "S-GAS", availablePollutants: ["NO2", "SO2", "CO"], lastReportedAt: null },
            { ...sampleStation, id: "S-NONE", availablePollutants: [], lastReportedAt: null }
          ]}
          selectedStationId="S-PM10"
          onSelectStation={() => {}}
          onOpenProvenance={() => {}}
        />
      );
      expect(covHtml).toContain("1 multi-pollutant PM");
      expect(covHtml).toContain("1 partial raw");
      expect(covHtml).toContain("1 inactive");

      // Priority 0 null AQI contracts in RecommendationsPanel + IndoorCoachPanel
      const recHtml = renderToStaticMarkup(
        <RecommendationsPanel language="en" recommendations={[]} aiExplanation={null} isAqiUnavailable={true} />
      );
      expect(recHtml).toContain("Verified AQI is currently unavailable");

      const indoorNullHtml = renderToStaticMarkup(<IndoorCoachPanel language="en" aqiCategory={null} />);
      expect(indoorNullHtml).toContain("Outdoor AQI Context: UNAVAILABLE");
      expect(indoorNullHtml).toContain("Overall CPCB AQI is currently UNAVAILABLE");
      expect(indoorNullHtml).not.toContain("Outdoor AQI Context: MODERATE");

      // OpenAQClient explicit iso with coordinates + /api/v1/air-quality?stationName=...
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [] })
      }) as unknown as typeof fetch;
      const oqClient = new OpenAQClient({ apiKey: "key" });
      await oqClient.getLocations({ iso: "IN", coordinates: { latitude: 22.6, longitude: 88.3 } });
      expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toContain("iso=IN");

      // Null sensors & licenses arrays returned by live OpenAQ v3 /v3/locations parse cleanly
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              id: 5614,
              name: "Padmapukur, Howrah - WBPCB",
              coordinates: { latitude: 22.56, longitude: 88.27 },
              sensors: null,
              licenses: null
            }
          ]
        })
      }) as unknown as typeof fetch;
      const oqNullRes = await oqClient.getLocations({ coordinates: { latitude: 22.56, longitude: 88.27 } });
      expect(oqNullRes.results[0]?.licenses).toEqual([]);
      expect(oqNullRes.results[0]?.sensors).toEqual([]);

      vi.spyOn(globalSourceOrchestrator, "getStationAirQuality").mockResolvedValueOnce({
        station: sampleStation,
        observations: sampleObs,
        calculatedAqi: null,
        aqiStatus: "AQI_UNAVAILABLE",
        statusMessage: "Test",
        provider: "CPCB_CAAQMS",
        retrievedAt: nowIso,
        warnings: []
      });
      const { NextRequest } = await import("next/server");
      const aqReq = new NextRequest(
        "http://localhost:3000/api/v1/air-quality?stationId=cpcb_rbu&stationName=Rabindra%20Bharati"
      );
      const aqResp = await getAirQualityRoute(aqReq);
      expect(aqResp.status).toBe(200);
    });

    it("covers Stage 4 hourly /hours primary+fallback, clock-skew SUSPICIOUS guards, IST formatting, and same-site deduplication", async () => {
      const unconfClient = new OpenAQClient();
      await expect(unconfClient.getSensorHours(1)).rejects.toThrow("NOT_CONFIGURED");

      const nowIso = new Date().toISOString();
      const futureIso = new Date(Date.now() + 45 * 60 * 1000).toISOString();
      const pastHour1 = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
      const pastHour2 = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // OpenAQAdapter calls /hours primary and falls back to /measurements when /hours is empty
      const oqAdapter = new OpenAQAdapter({ apiKey: "test-key" });
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/locations/3409320")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: [
                {
                  id: 3409320,
                  name: "Rabindra Bharati University, Kolkata - WBPCB",
                  coordinates: { latitude: 22.6278, longitude: 88.3804 },
                  sensors: [
                    { id: 10, name: "pm25", parameter: { name: "pm25", units: "µg/m³" } },
                    { id: 11, name: "pm10", parameter: { name: "pm10", units: "µg/m³" } }
                  ]
                }
              ]
            })
          };
        }
        if (url.includes("/sensors/10/hours")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: [
                { value: 52, period: { datetimeTo: { utc: pastHour1 } } },
                { value: 60, period: { datetimeTo: { utc: futureIso } } }
              ]
            })
          };
        }
        if (url.includes("/sensors/11/hours")) {
          return { ok: true, status: 200, json: async () => ({ results: [] }) };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{ value: 110, period: { datetimeFrom: { utc: pastHour2 }, datetimeTo: { utc: pastHour2 } } }]
          })
        };
      }) as unknown as typeof fetch;

      const oqObsRes = await oqAdapter.getObservations({ stationId: "openaq_3409320" });
      expect(oqObsRes.observations.some((o: NormalizedObservation) => o.qualityFlag === "SUSPICIOUS")).toBe(true);
      expect(oqObsRes.observations.some((o: NormalizedObservation) => o.pollutant === "PM10" && o.value === 110)).toBe(true);

      const oqClient = new OpenAQClient({ apiKey: "k" });
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [] })
      }) as unknown as typeof fetch;
      await oqClient.getSensorHours(99);
      expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toContain("/sensors/99/hours?limit=48");

      // CpcbAdapter future-skewed timestamp guard
      const futureIst = new Date(Date.now() + (5.5 + 2) * 3600 * 1000);
      const futureStr = `${String(futureIst.getUTCDate()).padStart(2, "0")}-${String(futureIst.getUTCMonth() + 1).padStart(2, "0")}-${futureIst.getUTCFullYear()} ${String(futureIst.getUTCHours()).padStart(2, "0")}:${String(futureIst.getUTCMinutes()).padStart(2, "0")}:00`;
      const cpcbAdapter = new CpcbAdapter({ apiKey: "k" });
      const futureProc = cpcbAdapter.processRecords(
        [
          {
            country: "India",
            state: "West Bengal",
            city: "Kolkata",
            station: "Future Skew Test",
            last_update: futureStr,
            latitude: "22.6",
            longitude: "88.3",
            pollutant_id: "PM2.5",
            avg_value: "80"
          }
        ],
        nowIso
      );
      expect(futureProc.observations[0]?.qualityFlag).toBe("SUSPICIOUS");

      // PollutantGrid newest non-future selection + AqiSummaryCard IST/Future/SubIndices + StationPanel future exclusion
      const gridHtml = renderToStaticMarkup(
        <PollutantGrid
          language="en"
          observations={[
            { ...sampleObs[0]!, pollutant: "PM2.5", value: 41, observationTime: pastHour1, qualityFlag: "VERIFIED" },
            { ...sampleObs[0]!, pollutant: "PM2.5", value: 99, observationTime: futureIso, qualityFlag: "SUSPICIOUS" },
            { ...sampleObs[0]!, pollutant: "PM2.5", value: 55, observationTime: pastHour2, qualityFlag: "VERIFIED" },
            { ...sampleObs[0]!, pollutant: "PM10", value: 120, observationTime: futureIso, qualityFlag: "SUSPICIOUS" },
            { ...sampleObs[0]!, pollutant: "PM10", value: 98, observationTime: pastHour2, qualityFlag: "VERIFIED" }
          ]}
          calculatedAqi={null}
        />
      );
      expect(gridHtml).toContain("55");
      expect(gridHtml).toContain("98");

      const summaryHtml = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          station={sampleStation}
          calculatedAqi={null}
          partialSubIndices={[
            {
              pollutant: "PM2.5",
              concentration: 55,
              unit: "µg/m³",
              subIndex: 92,
              rawMathematicalSubIndex: 92,
              category: "SATISFACTORY",
              windowHours: 24,
              validHours: 20,
              qualityFlag: "VERIFIED",
              isBeyondNominalScale: false,
              reportingCeilingCappedAqi: 92
            }
          ]}
          aqiStatus="AQI_UNAVAILABLE"
          statusMessage="Partial sub-index only"
          provider="OPENAQ"
          observations={[{ ...sampleObs[0]!, observationTime: futureIso, qualityFlag: "SUSPICIOUS" }]}
          lastUpdated="invalid-date-str"
          retrievalTime={futureIso}
          alternativeStation={{ ...sampleStation, id: "ALT-1", lastReportedAt: futureIso }}
          onOpenProvenance={() => {}}
          onSelectStation={() => {}}
        />
      );
      const summaryFutureObsHtml = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          station={{ ...sampleStation, lastReportedAt: null }}
          calculatedAqi={null}
          aqiStatus="AQI_UNAVAILABLE"
          statusMessage="Future check"
          provider="OPENAQ"
          observations={[
            { ...sampleObs[0]!, observationTime: futureIso, qualityFlag: "SUSPICIOUS" },
            { ...sampleObs[0]!, observationTime: pastHour2, qualityFlag: "VERIFIED" }
          ]}
          retrievalTime={nowIso}
          onOpenProvenance={() => {}}
        />
      );
      const summaryLastUpdFuture = renderToStaticMarkup(
        <AqiSummaryCard
          language="en"
          station={sampleStation}
          calculatedAqi={null}
          aqiStatus="AQI_UNAVAILABLE"
          statusMessage="Last updated future"
          provider="OPENAQ"
          lastUpdated={futureIso}
          retrievalTime={nowIso}
          onOpenProvenance={() => {}}
        />
      );
      expect(summaryFutureObsHtml).not.toContain("Future/Skewed");
      expect(summaryLastUpdFuture).toContain("Future/Skewed");
      expect(summaryHtml).toContain("Eligible Individual Sub-Indices:");
      expect(summaryHtml).toContain("PM2.5: 92");
      expect(summaryHtml).toContain("Invalid time");
      expect(summaryHtml).toContain("Future/Skewed");

      const threeDaysAgoIso = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
      const tenDaysAgoIso = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString();
      const panelHtml = renderToStaticMarkup(
        <StationPanel
          language="en"
          stations={[
            { ...sampleStation, id: "S-FUT", lastReportedAt: futureIso },
            { ...sampleStation, id: "S-ARCH", lastReportedAt: tenDaysAgoIso, distanceKm: undefined },
            { ...sampleStation, id: "S-ARCH-2", lastReportedAt: tenDaysAgoIso, distanceKm: 1.5 },
            { ...sampleStation, id: "S-3D", lastReportedAt: threeDaysAgoIso, distanceKm: 4 },
            { ...sampleStation, id: "S-NONE2", availablePollutants: [], lastReportedAt: null },
            { ...sampleStation, id: "S-OK", lastReportedAt: pastHour2 }
          ]}
          selectedStationId="S-OK"
          onSelectStation={() => {}}
          onOpenProvenance={() => {}}
        />
      );
      expect(panelHtml).toContain("1 fresh");
      expect(panelHtml).toContain("Archived (");
      expect(panelHtml).toContain("Active ");

      // Same-site exclusion in DashboardPage alternativeStation
      const store = new Map<string, string>();
      const storageMock = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k)
      };
      vi.stubGlobal("window", { localStorage: storageMock, sessionStorage: storageMock, addEventListener: vi.fn(), removeEventListener: vi.fn() });
      vi.stubGlobal("document", { documentElement: { setAttribute: vi.fn() } });
      vi.stubGlobal("navigator", { onLine: true });
      const flushLocal = () => new Promise<void>((r) => setTimeout(r, 15));

      const d = setupTestDispatcher();
      try {
        globalThis.fetch = vi.fn().mockImplementation((url: string) => {
          if (url.includes("/api/v1/stations/nearby")) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => ({
                status: "SUCCESS",
                data: {
                  stations: [
                    {
                      ...sampleStation,
                      id: "cpcb_rbu",
                      providerId: "CPCB_CAAQMS",
                      name: "Rabindra Bharati University, Kolkata - WBPCB",
                      latitude: 22.6278,
                      longitude: 88.3806,
                      lastReportedAt: pastHour2
                    },
                    {
                      ...sampleStation,
                      id: "openaq_3409320",
                      providerId: "OPENAQ",
                      name: "Rabindra Bharati University, Kolkata - WBSPCB",
                      latitude: 22.6278,
                      longitude: 88.3804,
                      lastReportedAt: pastHour2
                    },
                    {
                      ...sampleStation,
                      id: "openaq_future",
                      providerId: "OPENAQ",
                      name: "Future Sensor",
                      latitude: 22.65,
                      longitude: 88.4,
                      lastReportedAt: futureIso
                    },
                    {
                      ...sampleStation,
                      id: "cpcb_belur",
                      providerId: "CPCB_CAAQMS",
                      name: "Belur Math, Howrah - WBPCB",
                      latitude: 22.632,
                      longitude: 88.356,
                      distanceKm: 3.0,
                      lastReportedAt: null
                    },
                    {
                      ...sampleStation,
                      id: "openaq_inactive",
                      providerId: "OPENAQ",
                      name: "Inactive Zero Station",
                      latitude: 22.64,
                      longitude: 88.39,
                      availablePollutants: [],
                      lastReportedAt: pastHour2
                    },
                    {
                      ...sampleStation,
                      id: "openaq_gas_only",
                      providerId: "OPENAQ",
                      name: "Gas Only Station",
                      latitude: 22.641,
                      longitude: 88.391,
                      availablePollutants: ["CO", "NO2", "SO2"],
                      lastReportedAt: pastHour2
                    },
                    {
                      ...sampleStation,
                      id: "openaq_bidhan",
                      providerId: "OPENAQ",
                      name: "Bidhannagar, Kolkata - WBPCB",
                      latitude: 22.58,
                      longitude: 88.41,
                      distanceKm: 6.0,
                      availablePollutants: ["PM10", "NO2", "SO2"],
                      lastReportedAt: pastHour2
                    }
                  ]
                },
                warnings: []
              })
            });
          }
          if (url.includes("/api/v1/air-quality")) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => ({
                status: "SUCCESS",
                data: {
                  station: {
                    ...sampleStation,
                    id: "cpcb_rbu",
                    providerId: "CPCB_CAAQMS",
                    name: "Rabindra Bharati University, Kolkata - WBPCB",
                    latitude: 22.6278,
                    longitude: 88.3806
                  },
                  observations: [],
                  calculatedAqi: null,
                  aqiStatus: "AQI_UNAVAILABLE",
                  statusMessage: "Units missing",
                  provider: "CPCB_CAAQMS",
                  retrievedAt: nowIso
                }
              })
            });
          }
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ status: "SUCCESS", data: {} }) });
        }) as unknown as typeof fetch;

        d.render(DashboardPage);
        d.runEffects();
        await flushLocal();
        await flushLocal();
        const altHtml = renderToStaticMarkup(d.render(DashboardPage) as React.ReactElement);
        expect(altHtml).toContain("Bidhannagar, Kolkata - WBPCB");
        expect(altHtml).not.toContain("Try Nearby: Rabindra Bharati");

        // Cover CPCB-only fresh PM10 & gas-only ranking fallbacks in fetchStationsAndForecast + alternativeStation
        globalThis.fetch = vi.fn().mockImplementation((url: string) => {
          if (url.includes("/api/v1/stations/nearby")) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => ({
                status: "SUCCESS",
                data: {
                  stations: [
                    { ...sampleStation, id: "cpcb_gas", providerId: "CPCB_CAAQMS", name: "Gas CPCB", availablePollutants: ["CO", "NO2", "SO2"], lastReportedAt: pastHour2 },
                    { ...sampleStation, id: "cpcb_pm10", providerId: "CPCB_CAAQMS", name: "PM10 CPCB", latitude: 22.7, longitude: 88.45, availablePollutants: ["PM10", "NO2", "SO2"], lastReportedAt: pastHour2 },
                    { ...sampleStation, id: "cpcb_pm25", providerId: "CPCB_CAAQMS", name: "PM25 CPCB", latitude: 22.75, longitude: 88.5, availablePollutants: ["PM2.5", "NO2", "SO2"], lastReportedAt: pastHour2 }
                  ]
                }
              })
            });
          }
          if (url.includes("/api/v1/air-quality")) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => ({
                status: "SUCCESS",
                data: { station: { ...sampleStation, id: "cpcb_pm10" }, observations: [], calculatedAqi: null, aqiStatus: "AQI_UNAVAILABLE", statusMessage: "Units missing", provider: "CPCB_CAAQMS", retrievedAt: nowIso }
              })
            });
          }
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ status: "SUCCESS", data: {} }) });
        }) as unknown as typeof fetch;

        const d2 = setupTestDispatcher();
        try {
          d2.render(DashboardPage);
          d2.runEffects();
          await flushLocal();
          await flushLocal();
          const cpcbAltHtml = renderToStaticMarkup(d2.render(DashboardPage) as React.ReactElement);
          expect(cpcbAltHtml).toContain("PM25 CPCB");
        } finally {
          d2.restore();
        }
      } finally {
        vi.unstubAllGlobals();
        d.restore();
      }
    });
  });
});
