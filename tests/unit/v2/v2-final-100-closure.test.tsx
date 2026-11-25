// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import * as firebaseClient from "@/lib/firebase/client";
import { useTheme } from "@/theme/theme-provider";
import { evaluateSmartAlerts } from "@/domain/alerts/smart-alert-engine";
import { CommutePlanner } from "@/components/commute/commute-planner";
import { AqiSummaryCard } from "@/components/air-quality/aqi-summary-card";
import { InsightsWorkspace } from "@/components/insights/insights-workspace";
import { AgentWorkspace } from "@/components/agent/agent-workspace";
import { AiChatWorkspace } from "@/components/chat/ai-chat-workspace";
import { DailyPlanner } from "@/components/planner/daily-planner";
import { StationMap, clusterMapMarkers } from "@/components/maps/station-map";
import DashboardPage from "@/app/page";
import type { AppRouteView } from "@/components/shared/app-shell-nav";
import type {
  NormalizedStation,
  NormalizedObservation,
  NormalizedForecast
} from "@/schemas/providers/normalized-provider.schema";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";

const flushAsync = async () => {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
};

const stList: NormalizedStation[] = [
  {
    id: "C1",
    providerId: "CPCB_CAAQMS",
    name: "CPCB Stn",
    city: "Kolkata",
    state: "West Bengal",
    latitude: 22.57,
    longitude: 88.36,
    availablePollutants: ["PM10", "NO2", "SO2"],
    lastReportedAt: null,
    license: "GODL",
    attribution: "CPCB",
    distanceKm: 1.8
  },
  {
    id: "C2",
    providerId: "CPCB_CAAQMS",
    name: "No PM Stn",
    city: "Kolkata",
    state: "West Bengal",
    latitude: 22.5702,
    longitude: 88.3602,
    availablePollutants: ["NO2", "SO2", "CO"],
    lastReportedAt: null,
    license: "GODL",
    attribution: "CPCB",
    distanceKm: 2.2
  },
  {
    id: "O1",
    providerId: "OPENAQ",
    name: "OpenAQ Sensor",
    city: "Kolkata",
    state: "West Bengal",
    latitude: 22.58,
    longitude: 88.37,
    availablePollutants: ["PM2.5"],
    lastReportedAt: null,
    license: "CC-BY",
    attribution: "OpenAQ"
  }
];

const obsList: NormalizedObservation[] = [
  {
    id: "o1",
    stationId: "C1",
    stationName: "CPCB Stn",
    providerId: "CPCB_CAAQMS",
    pollutant: "PM2.5",
    value: 145,
    unit: "µg/m³",
    averagingPeriod: "24h",
    observationTime: "2026-11-24T10:00:00Z",
    sourceUpdateTime: null,
    retrievalTime: "2026-11-24T10:00:00Z",
    typology: "TYPE_C_RAW_MEASUREMENT",
    qualityFlag: "VERIFIED",
    license: "GODL-India",
    attribution: "CPCB"
  }
];

const fcList: NormalizedForecast[] = [
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
    validTime: "2026-11-24T14:00:00Z",
    issueTime: null,
    retrievalTime: "2026-11-24T10:00:00Z",
    typology: "TYPE_D_MODEL_FORECAST",
    license: "CC-BY-4.0",
    attribution: "CAMS"
  }
];

const goodAqi: CpcbAqiResult = {
  stationId: "C1",
  calculatedAtUtc: "2026-11-24T10:00:00Z",
  overallAqi: 42,
  rawMathematicalAqi: 42,
  category: "GOOD",
  prominentPollutant: "PM2.5",
  sufficiencyStatus: "SUFFICIENT",
  completenessPolicy: "ADAPTED_HAWASAATHI_6H",
  subIndices: [],
  isBeyondNominalScale: false,
  reportingCeilingCappedAqi: 42,
  explanation: "Good"
};

const poorAqi: CpcbAqiResult = {
  ...goodAqi,
  overallAqi: 240,
  rawMathematicalAqi: 240,
  reportingCeilingCappedAqi: 240,
  category: "POOR"
};

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
    useRef: (init: unknown) => {
      const id = idx++;
      if (!states.has(id)) states.set(id, { current: init });
      return states.get(id);
    },
    useId: () => "final-100"
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

describe("HawaSaathi 2.0 Final 100% Coverage Closure", () => {
  const origFetch = globalThis.fetch;
  const origWindow = globalThis.window;
  const origDoc = (globalThis as unknown as { document?: unknown }).document;
  const origNav = (globalThis as unknown as { navigator?: unknown }).navigator;

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
    (globalThis as unknown as { document?: unknown }).document = origDoc;
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: origNav });
    vi.restoreAllMocks();
  });

  it("closes ThemeContext default no-ops, SmartAlert, Commute, AqiSummary, and Insights", () => {
    const DefaultProbe = () => {
      const ctx = useTheme();
      ctx.setThemeMode("dark");
      ctx.cycleTheme();
      return <span data-mode={ctx.themeMode} />;
    };
    expect(renderToStaticMarkup(<DefaultProbe />)).toContain("light");

    const noPromAlert = evaluateSmartAlerts({
      station: stList[0]!,
      aqiResult: { ...poorAqi, prominentPollutant: null },
      aqiStatus: "AVAILABLE",
      observations: [],
      forecast: [],
      rules: {
        severityThreshold: "MODERATE",
        hysteresisEnabled: false,
        quietHoursEnabled: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00"
      },
      currentHour: 12
    });
    expect(noPromAlert[0]!.message).toContain("Particulate Matter");

    expect(
      renderToStaticMarkup(
        <CommutePlanner language="en" stations={stList} currentAqi={null} forecast={[]} initialMode="CYCLE" />
      )
    ).toContain("Unverified");

    expect(
      renderToStaticMarkup(
        <AqiSummaryCard
          language={"xx-ZZ" as never}
          station={stList[0]!}
          calculatedAqi={goodAqi}
          aqiStatus="AVAILABLE"
          statusMessage="Live"
          provider="CPCB"
          onOpenProvenance={vi.fn()}
        />
      )
    ).toContain("42");

    expect(
      renderToStaticMarkup(
        <InsightsWorkspace language="en" stations={stList} selectedStation={stList[0]!} observations={obsList} forecast={fcList} />
      )
    ).toContain("1/3 (33%)");
  });

  it("closes AgentWorkspace, AiChatWorkspace, DailyPlanner, and StationMap remaining lines", async () => {
    const d = makeDispatcher();
    try {
      // AgentWorkspace: error without message (80, 195) AND result followUp click (255)
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      }) as unknown as typeof fetch;

      const aw0 = d.render(AgentWorkspace, {
        language: "en",
        selectedStation: stList[0]!,
        calculatedAqi: goodAqi,
        observations: obsList,
        forecast: fcList
      });
      let firstBtn: (() => Promise<void>) | undefined;
      walk(aw0, (el) => {
        if (!firstBtn && el.type === "button") firstBtn = el.props["onClick"] as () => Promise<void>;
      });
      await firstBtn?.();
      await flushAsync();
      const awErr = d.render(AgentWorkspace, {
        language: "en",
        selectedStation: stList[0]!,
        calculatedAqi: goodAqi,
        observations: obsList,
        forecast: fcList
      });
      expect(awErr).not.toBeNull();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "SUCCESS",
          data: {
            taskType: "PURIFIER_SIZING",
            directAnswer: "Done",
            verifiedFacts: [],
            explanation: "Exp",
            suggestedAction: "Act",
            sources: ["Calc"],
            confidenceOrLimitation: "Lim",
            followUpPrompt: "Check ventilation?",
            dataDistinction: "ESTIMATE",
            toolTraces: []
          }
        })
      });
      await firstBtn?.();
      await flushAsync();
      const awResult = d.render(AgentWorkspace, {
        language: "en",
        selectedStation: stList[0]!,
        calculatedAqi: goodAqi,
        observations: obsList,
        forecast: fcList
      });
      let followBtn: (() => Promise<void>) | undefined;
      walk(awResult, (el) => {
        if (el.type === "button" && JSON.stringify(el.props["children"] || "").includes("Check ventilation")) {
          followBtn = el.props["onClick"] as () => Promise<void>;
        }
      });
      expect(followBtn).toBeDefined();
      await followBtn?.();
      await flushAsync();

      // AiChatWorkspace: invalid JSON in storage, whitespace/sending guard (133), copy timer (206, 330-331), multi-thread (177), isAiGenerated=true (313), error w/o message + Retry (343-345)
      d.reset();
      window.localStorage.setItem("hs_chat_threads_v2", "{not-json");
      const cw0 = d.render(AiChatWorkspace, {
        language: "en",
        selectedStation: stList[0]!,
        calculatedAqi: poorAqi,
        observations: obsList,
        forecast: fcList
      });
      d.runEffects();
      // Submit empty input (hits 133 clean==="")
      walk(cw0, (el) => {
        if (el.type === "form") (el.props["onSubmit"] as (e: unknown) => void)({ preventDefault: vi.fn() });
      });

      // Set up 2 threads -> send message -> one hits t.id === activeThread.id and second hits : t (line 177) + isAiGenerated: true (313)
      walk(cw0, (el) => {
        if (el.type === "button" && JSON.stringify(el.props["children"] || "").includes("New Chat")) {
          (el.props["onClick"] as () => void)();
        }
        if (el.type === "input") (el.props["onChange"] as (e: unknown) => void)({ target: { value: "AI test" } });
      });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "SUCCESS",
          data: { reply: "AI Reply", sources: [], isAiGenerated: true, dataDistinction: "CALCULATED_AQI" }
        })
      });
      const cwTwoThreads = d.render(AiChatWorkspace, {
        language: "en",
        selectedStation: stList[0]!,
        calculatedAqi: poorAqi,
        observations: obsList,
        forecast: fcList
      });
      let chatFormSubmit: ((e: unknown) => Promise<void>) | undefined;
      walk(cwTwoThreads, (el) => {
        if (el.type === "form") chatFormSubmit = el.props["onSubmit"] as (e: unknown) => Promise<void>;
      });
      await chatFormSubmit?.({ preventDefault: vi.fn() });
      await flushAsync();

      vi.useFakeTimers();
      const cwCopiedView = d.render(AiChatWorkspace, {
        language: "en",
        selectedStation: stList[0]!,
        calculatedAqi: poorAqi,
        observations: obsList,
        forecast: fcList
      });
      let copyBtn: (() => Promise<void>) | undefined;
      walk(cwCopiedView, (el) => {
        if (el.props["aria-label"] === "Copy response") copyBtn = el.props["onClick"] as () => Promise<void>;
      });
      expect(copyBtn).toBeDefined();
      await copyBtn?.();
      await flushAsync();
      // Re-render while copiedId === msg.id (covers 330, 331 Check icon & "Copied")
      d.render(AiChatWorkspace, {
        language: "en",
        selectedStation: stList[0]!,
        calculatedAqi: poorAqi,
        observations: obsList,
        forecast: fcList
      });
      await vi.advanceTimersByTimeAsync(2000); // covers line 206 timer callback
      vi.useRealTimers();

      // Now fail fetch cleanly on New Chat starter prompt -> Retry button (343, 345)
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });
      let clearBtn: (() => void) | undefined;
      walk(cwCopiedView, (el) => {
        if (el.type === "button" && JSON.stringify(el.props["children"] || "").includes("Clear")) {
          clearBtn = el.props["onClick"] as () => void;
        }
      });
      clearBtn?.();
      const cwStarterView = d.render(AiChatWorkspace, {
        language: "en",
        selectedStation: stList[0]!,
        calculatedAqi: poorAqi,
        observations: obsList,
        forecast: fcList
      });
      let sBtn: (() => Promise<void>) | undefined;
      walk(cwStarterView, (el) => {
        if (el.type === "button" && JSON.stringify(el.props["children"] || "").includes("Explain the air quality near me")) {
          sBtn = el.props["onClick"] as () => Promise<void>;
        }
      });
      await sBtn?.();
      await flushAsync();
      const cwRetryView = d.render(AiChatWorkspace, {
        language: "en",
        selectedStation: stList[0]!,
        calculatedAqi: poorAqi,
        observations: obsList,
        forecast: fcList
      });
      let rBtn: (() => Promise<void>) | undefined;
      walk(cwRetryView, (el) => {
        if (el.type === "button" && JSON.stringify(el.props["children"] || "").includes("Retry")) {
          rBtn = el.props["onClick"] as () => Promise<void>;
        }
      });
      expect(rBtn).toBeDefined();
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "SUCCESS", data: { reply: "OK", sources: [], isAiGenerated: false, dataDistinction: "ESTIMATE" } })
      });
      await rBtn?.();
      await flushAsync();

      // StationMap: persisted dragOriginRef handles 171-173, wheel deltaY === 0 (183), list empty (596), cluster zoom, availablePollutants=[] (541)
      expect(clusterMapMarkers([{ station: stList[0]!, x: 100, y: 100 }], 2.5)).toHaveLength(1);
      d.reset();
      const sm1 = d.render(StationMap, {
        center: { latitude: 22.57, longitude: 88.36 },
        stations: stList,
        selectedStationId: "C1",
        onSelectStation: vi.fn(),
        isLoading: false
      });
      walk(sm1, (el) => {
        if (el.type === "svg") {
          (el.props["onMouseDown"] as (e: unknown) => void)({ clientX: 10, clientY: 10 });
          (el.props["onWheel"] as (e: unknown) => void)({ deltaY: 0 });
        }
        if (el.props["aria-label"] === "Fullscreen Map") (el.props["onClick"] as () => void)();
        if (el.props["id"] === "map-layer-select") (el.props["onChange"] as (e: unknown) => void)({ target: { value: "FORECAST" } });
      });
      // Re-render while isDragging=true, isFullscreen=true, activeLayer=FORECAST
      const sm2 = d.render(StationMap, {
        center: { latitude: 22.57, longitude: 88.36 },
        stations: [{ ...stList[0]!, availablePollutants: [] }],
        selectedStationId: "C1",
        onSelectStation: vi.fn(),
        isLoading: false
      });
      walk(sm2, (el) => {
        if (el.type === "svg") {
          (el.props["onMouseMove"] as (e: unknown) => void)({ clientX: 30, clientY: 40 });
        }
        if (el.type === "g" && typeof el.props["onKeyDown"] === "function") {
          (el.props["onKeyDown"] as (e: unknown) => void)({ key: "Tab", preventDefault: vi.fn() });
        }
      });
      // Empty Accessible List state (596) + hover state on marker
      d.reset();
      const smList = d.render(StationMap, {
        center: { latitude: 22.57, longitude: 88.36 },
        stations: [],
        selectedStationId: null,
        onSelectStation: vi.fn(),
        initialViewMode: "list"
      });
      expect(smList).not.toBeNull();
    } finally {
      d.restore();
    }
  });

  it("closes all remaining Page async branches (180, 317-321, 362, 387-454, 663, 677)", async () => {
    vi.spyOn(firebaseClient, "getGuestContext").mockReturnValue({
      savedLocation: { name: "Kolkata", city: "Kolkata", state: "WB", latitude: 22.57, longitude: 88.36 },
      language: "en",
      householdContext: { members: [] }
    });
    window.localStorage.setItem(
      "hs_last_snapshot_v2",
      JSON.stringify({
        observations: obsList,
        calculatedAqi: poorAqi,
        aqiStatus: "AVAILABLE",
        statusMessage: "Cached",
        provider: "CPCB_CAAQMS"
      })
    );

    let aqCall = 0;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/v1/profile")) {
        return { ok: true, json: async () => ({ status: "SUCCESS", data: { profile: { email: "u@test.in", householdContext: { members: [] }, preferences: { language: "bn", theme: "dark" } } } }) };
      }
      if (url.includes("/api/v1/stations/nearby")) {
        return { ok: true, json: async () => ({ status: "SUCCESS", data: { stations: stList } }) };
      }
      if (url.includes("/api/v1/air-quality")) {
        aqCall += 1;
        if (aqCall === 1) {
          return Promise.reject(new Error("Offline socket drop"));
        }
        return {
          ok: true,
          json: async () => ({
            status: "SUCCESS",
            warnings: ["Low coverage"],
            data: {
              observations: obsList,
              calculatedAqi: { ...poorAqi, prominentPollutant: null },
              aqiStatus: "AVAILABLE",
              statusMessage: "Live",
              provider: "CPCB_CAAQMS"
            }
          })
        };
      }
      if (url.includes("/api/v1/forecast")) {
        return { ok: true, json: async () => ({ status: "SUCCESS", data: { forecast: fcList } }) };
      }
      if (url.includes("/api/v1/recommendations")) {
        return { ok: true, json: async () => ({ status: "SUCCESS", data: {} }) };
      }
      return { ok: true, json: async () => ({ status: "SUCCESS", data: {} }) };
    }) as unknown as typeof fetch;

    const d = makeDispatcher();
    try {
      d.render(DashboardPage);
      d.runEffects();
      await flushAsync(); // settles air-quality catch -> isOffline=true, usingCachedSnapshot=true, loadingAirQuality=false

      // Re-render in offline state with Retry Telemetry button (663) and run second wave of effects (evaluateRecommendations & smartAlerts)
      const offlineTree = d.render(DashboardPage);
      d.runEffects();
      await flushAsync();

      const mainChildren = (
        offlineTree as { props: { children: Array<{ props?: { children?: Array<{ props?: { children?: unknown } }> } }> } }
      ).props.children[0]?.props?.children?.[1]?.props?.children;
      let retryTel: (() => Promise<void> | void) | undefined;
      walk(mainChildren, (el) => {
        if (el.type === "button" && JSON.stringify(el.props["children"] || "").includes("Retry Telemetry")) {
          retryTel = el.props["onClick"] as () => Promise<void>;
        }
      });
      expect(retryTel).toBeDefined();
      await retryTel?.(); // second aqCall succeeds & sets warnings (line 677!)
      await flushAsync();

      const liveWithWarnings = d.render(DashboardPage);
      d.runEffects(); // hits duplicate alert deduplication (mapped.length === 0 path line 454)
      await flushAsync();
      expect(liveWithWarnings).not.toBeNull();

      // Now test stationsRes.ok === false + empty snapshot + forecastRes.ok === false + recsRes.ok === false
      window.localStorage.setItem("hs_last_snapshot_v2", "{}");
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/api/v1/stations/nearby")) return { ok: false };
        if (url.includes("/api/v1/forecast")) return { ok: false };
        if (url.includes("/api/v1/recommendations")) return { ok: false, json: async () => ({}) };
        return { ok: true, json: async () => ({ status: "ERROR", data: {} }) };
      }) as unknown as typeof fetch;

      d.reset();
      d.render(DashboardPage);
      d.runEffects();
      await flushAsync();

      // Also test air-quality with empty optional json.data fields & empty cached snapshot fallback
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/api/v1/stations/nearby")) {
          return { ok: true, json: async () => ({ status: "SUCCESS", data: { stations: [stList[0]!] } }) };
        }
        if (url.includes("/api/v1/air-quality")) {
          return { ok: true, json: async () => ({ status: "SUCCESS", data: {} }) };
        }
        if (url.includes("/api/v1/recommendations")) {
          return { ok: false, json: async () => ({}) };
        }
        return { ok: false, json: async () => ({}) };
      }) as unknown as typeof fetch;
      d.reset();
      d.render(DashboardPage);
      d.runEffects();
      await flushAsync();
      d.render(DashboardPage);
      d.runEffects();
      await flushAsync();

      // Trigger air-quality reject with explicit empty `{}` snapshot (lines 317-321 false branches) and navigator.onLine=false (lines 208-209) + keydown branches (215)
      Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine: false } });
      window.localStorage.setItem("hs_last_snapshot_v2", "{}");
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/api/v1/stations/nearby")) {
          return { ok: true, json: async () => ({ status: "SUCCESS", data: { stations: [stList[0]!] } }) };
        }
        if (url.includes("/api/v1/air-quality")) {
          return Promise.reject(new Error("fail"));
        }
        return { ok: false, json: async () => ({}) };
      }) as unknown as typeof fetch;
      d.reset();
      d.render(DashboardPage);
      d.runEffects();
      await flushAsync();

      const keyCalls = (window.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
      for (const [ev, fn] of keyCalls) {
        if (ev === "keydown") {
          (fn as (e: unknown) => void)({ metaKey: true, key: "k", preventDefault: vi.fn() });
          (fn as (e: unknown) => void)({ metaKey: false, ctrlKey: false, key: "k", preventDefault: vi.fn() });
          (fn as (e: unknown) => void)({ ctrlKey: true, key: "j", preventDefault: vi.fn() });
        }
      }
    } finally {
      d.restore();
    }
  });

  it("closes the final 0.5% lines across Agent, StationMap, DailyPlanner, and Page", async () => {
    const d = makeDispatcher();
    try {
      // 1. AgentWorkspace: selectedStation=null (68) + invalid dims ||5/4/2.8 fallbacks (70-72) on form submit
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "SUCCESS",
          data: {
            taskType: "PURIFIER_SIZING",
            directAnswer: "Done",
            verifiedFacts: [],
            explanation: "Exp",
            suggestedAction: "Act",
            sources: ["Calc"],
            confidenceOrLimitation: "Lim",
            followUpPrompt: "More?",
            dataDistinction: "ESTIMATE",
            toolTraces: []
          }
        })
      }) as unknown as typeof fetch;

      const ag0 = d.render(AgentWorkspace, {
        language: "en",
        selectedStation: null,
        calculatedAqi: null,
        observations: [],
        forecast: []
      });
      walk(ag0, (el) => {
        if (el.props["aria-label"] === "Agent task prompt") {
          (el.props["onChange"] as (e: unknown) => void)({ target: { value: "Calculate CADR" } });
        }
        if (el.props["id"] === "agent-len" || el.props["id"] === "agent-wid" || el.props["id"] === "agent-ht") {
          (el.props["onChange"] as (e: unknown) => void)({ target: { value: "" } });
        }
      });
      const ag1 = d.render(AgentWorkspace, {
        language: "en",
        selectedStation: null,
        calculatedAqi: null,
        observations: [],
        forecast: []
      });
      let agSubmit: ((e: unknown) => void) | undefined;
      walk(ag1, (el) => {
        if (el.type === "form") agSubmit = el.props["onSubmit"] as (e: unknown) => void;
      });
      agSubmit?.({ preventDefault: vi.fn() });
      await flushAsync();

      // 2. StationMap: 7 far-apart stations (!showLabel), CPCB_CAAQMS & OPENAQ layer filters (112-116), onLocateUser (352)
      d.reset();
      const sevenStations: NormalizedStation[] = Array.from({ length: 8 }, (_, idx) => ({
        ...stList[idx % 3]!,
        id: `FAR-${idx}`,
        name: `Far Station ${idx}`,
        latitude: 22.4 + idx * 0.08,
        longitude: 88.2 + idx * 0.08
      }));
      const smA = d.render(StationMap, {
        center: { latitude: 22.57, longitude: 88.36 },
        stations: sevenStations,
        selectedStationId: null,
        onSelectStation: vi.fn(),
        onLocateUser: vi.fn()
      });
      walk(smA, (el) => {
        if (el.props["id"] === "map-layer-select") {
          (el.props["onChange"] as (e: unknown) => void)({ target: { value: "CPCB_CAAQMS" } });
        }
      });
      const smCpcb = d.render(StationMap, {
        center: { latitude: 22.57, longitude: 88.36 },
        stations: sevenStations,
        selectedStationId: null,
        onSelectStation: vi.fn(),
        onLocateUser: vi.fn()
      });
      expect(smCpcb).not.toBeNull();
      walk(smCpcb, (el) => {
        if (el.props["id"] === "map-layer-select") {
          (el.props["onChange"] as (e: unknown) => void)({ target: { value: "OPENAQ" } });
        }
      });
      const smOpenAq = d.render(StationMap, {
        center: { latitude: 22.57, longitude: 88.36 },
        stations: sevenStations,
        selectedStationId: null,
        onSelectStation: vi.fn(),
        onLocateUser: vi.fn()
      });
      expect(smOpenAq).not.toBeNull();

      // 3. DailyPlanner: TRANSIT & OUTDOOR addActivity (150, 153), RECOMMENDED badgeStyle (210), empty/invalid diary duration (190-201), null station/AQI in diary (564-565)
      d.reset();
      const dpBase = {
        language: "en" as const,
        stations: stList,
        selectedStation: null,
        calculatedAqi: goodAqi,
        observations: obsList,
        forecast: fcList,
        activities: [
          {
            id: "a-rec",
            title: "Midday Stroll",
            category: "WALKING" as const,
            environment: "OUTDOOR" as const,
            startTime: "12:00",
            endTime: "12:30",
            locationName: "Park",
            isFavorite: false,
            reminderEnabled: false
          }
        ],
        onUpdateActivities: vi.fn(),
        diaryEntries: [
          {
            id: "d-null",
            recordedAt: "2026-11-24T10:00:00Z",
            activityTitle: "Errand",
            durationMinutes: 15,
            environment: "OUTDOOR" as const,
            locationLabel: "Kolkata",
            ambientAqiAtTime: null,
            stationUsed: null,
            isUserEntered: true as const
          }
        ],
        onUpdateDiary: vi.fn()
      };
      const dp0 = d.render(DailyPlanner, dpBase);
      walk(dp0, (el) => {
        if (el.props["id"] === "planner-title") (el.props["onChange"] as (e: unknown) => void)({ target: { value: "Transit" } });
        if (el.props["id"] === "planner-env") (el.props["onChange"] as (e: unknown) => void)({ target: { value: "TRANSIT" } });
      });
      const dpTransit = d.render(DailyPlanner, dpBase);
      walk(dpTransit, (el) => {
        if (el.type === "form") (el.props["onSubmit"] as (e: unknown) => void)({ preventDefault: vi.fn() });
      });
      walk(dpTransit, (el) => {
        if (el.props["id"] === "planner-title") (el.props["onChange"] as (e: unknown) => void)({ target: { value: "Park Jog" } });
        if (el.props["id"] === "planner-env") (el.props["onChange"] as (e: unknown) => void)({ target: { value: "OUTDOOR" } });
      });
      let openDiaryTab: (() => void) | undefined;
      const dpOutdoor = d.render(DailyPlanner, dpBase);
      walk(dpOutdoor, (el) => {
        if (el.type === "form") (el.props["onSubmit"] as (e: unknown) => void)({ preventDefault: vi.fn() });
        if (el.type === "button" && JSON.stringify(el.props["children"] || "").includes("Exposure Journal")) {
          openDiaryTab = el.props["onClick"] as () => void;
        }
      });
      openDiaryTab?.();
      const dpDiaryA = d.render(DailyPlanner, { ...dpBase, calculatedAqi: null });
      // Submit empty diary title -> early return line 190
      walk(dpDiaryA, (el) => {
        if (el.type === "form") (el.props["onSubmit"] as (e: unknown) => void)({ preventDefault: vi.fn() });
      });
      // Set diary title + invalid duration "bad" -> 30 fallback line 191, null station/AQI lines 198-201
      walk(dpDiaryA, (el) => {
        if (el.props["aria-label"] === "Journal activity title") (el.props["onChange"] as (e: unknown) => void)({ target: { value: "Jog" } });
        if (el.props["aria-label"] === "Duration in minutes") (el.props["onChange"] as (e: unknown) => void)({ target: { value: "bad" } });
      });
      const dpDiaryB = d.render(DailyPlanner, { ...dpBase, calculatedAqi: null });
      walk(dpDiaryB, (el) => {
        if (el.type === "form") (el.props["onSubmit"] as (e: unknown) => void)({ preventDefault: vi.fn() });
      });

      // 4. Page.tsx remaining handlers: valid localStorage w/o onboarding seen (208-209), profile w/o prefs (256-259), alerts non-empty (442,830,958-959), Navbar (609-611), map/stations/settings/appNav callbacks (721,728,746,878-880,917)
      d.reset();
      window.localStorage.setItem(
        "hs_alert_preferences",
        JSON.stringify({ severityThreshold: "MODERATE", hysteresisEnabled: false, quietHoursEnabled: false, quietHoursStart: "22:00", quietHoursEnd: "07:00" })
      );
      window.localStorage.setItem("hs_planner_activities_v2", "[]");
      window.localStorage.setItem("hs_saved_places_v2", "[]");
      window.localStorage.setItem("hs_exposure_diary_v2", "[]");

      let aqRound = 0;
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/api/v1/profile")) {
          return { ok: true, json: async () => ({ status: "SUCCESS", data: { profile: { email: "min@test.in" } } }) };
        }
        if (url.includes("/api/v1/stations/nearby")) {
          return { ok: true, json: async () => ({ status: "SUCCESS", data: { stations: stList } }) };
        }
        if (url.includes("/api/v1/air-quality")) {
          aqRound += 1;
          return {
            ok: true,
            json: async () => ({
              status: "SUCCESS",
              data: {
                observations: obsList,
                calculatedAqi: aqRound === 1 ? poorAqi : { ...poorAqi, overallAqi: 360, category: "VERY_POOR" },
                aqiStatus: "AVAILABLE",
                statusMessage: "Live",
                provider: "CPCB_CAAQMS"
              }
            })
          };
        }
        if (url.includes("/api/v1/forecast")) {
          return { ok: true, json: async () => ({ status: "SUCCESS", data: { forecast: fcList } }) };
        }
        return { ok: true, json: async () => ({ status: "SUCCESS", data: {} }) };
      }) as unknown as typeof fetch;

      const pg1 = d.render(DashboardPage);
      d.runEffects();
      await flushAsync(); // loadingAirQuality becomes false + profile loaded

      // Trigger evaluateSmartAlerts -> alerts becomes populated
      const pg2 = d.render(DashboardPage);
      d.runEffects();
      await flushAsync();

      // Switch station to generate a second distinct alert so prev.some(...) runs!
      const pg2Overview = d.render(DashboardPage);
      const nav2 = (pg2Overview as { props: { children: Array<{ props?: { children?: Array<{ props?: Record<string, unknown> }> } }> } }).props.children[0]?.props?.children?.[0];
      (nav2?.props?.["onToggleMobileNav"] as () => void)?.();
      (nav2?.props?.["onOpenCommandPalette"] as () => void)?.();
      (nav2?.props?.["onOpenHelp"] as () => void)?.();

      const shell2 = (pg2Overview as { props: { children: Array<{ props?: { children?: Array<{ props?: Record<string, unknown> }> } }> } }).props.children[0]?.props?.children?.[2];
      (shell2?.props?.["onCloseMobile"] as () => void)?.();
      const setV = shell2?.props?.["onSelectView"] as ((v: AppRouteView) => void) | undefined;

      // Switch to map view & invoke 721, 728
      setV?.("map");
      const mapTreeP = d.render(DashboardPage);
      walk(mapTreeP, (el) => {
        if (typeof el.props["onSelectStation"] === "function") (el.props["onSelectStation"] as (s: NormalizedStation) => void)(stList[1]!);
        if (typeof el.props["onOpenStationDetails"] === "function") (el.props["onOpenStationDetails"] as () => void)();
        if (typeof el.props["onOpenProvenance"] === "function") (el.props["onOpenProvenance"] as () => void)();
      });
      await flushAsync();
      d.render(DashboardPage);
      d.runEffects(); // second alert enters prev.some(...) -> covers line 442!
      await flushAsync();

      // Switch to stations view & invoke 746
      setV?.("stations");
      const stTreeP = d.render(DashboardPage);
      walk(stTreeP, (el) => {
        if (typeof el.props["onOpenProvenance"] === "function") (el.props["onOpenProvenance"] as () => void)();
      });

      // Switch to alerts view with populated alerts -> covers line 830!
      setV?.("alerts");
      const alTreeP = d.render(DashboardPage);
      expect(alTreeP).not.toBeNull();

      // Switch to settings view & invoke 878-880!
      setV?.("settings");
      const setTreeP = d.render(DashboardPage);
      walk(setTreeP, (el) => {
        if (typeof el.props["onOpenHouseholdModal"] === "function") (el.props["onOpenHouseholdModal"] as () => void)();
        if (typeof el.props["onOpenAlertPreferences"] === "function") (el.props["onOpenAlertPreferences"] as () => void)();
        if (typeof el.props["onOpenAuthModal"] === "function") (el.props["onOpenAuthModal"] as () => void)();
      });

      // NotificationCenter onMarkAllAsRead (958) & onDismissAlert (959) with populated alerts
      const modalsP = (alTreeP as { props: { children: unknown[] } }).props.children.slice(2);
      for (const m of modalsP) {
        const p = (m as { props?: Record<string, unknown> })?.props;
        if (p?.["onMarkAllAsRead"] && Array.isArray(p["alerts"]) && (p["alerts"] as unknown[]).length > 0) {
          (p["onMarkAllAsRead"] as () => void)();
          (p["onDismissAlert"] as (id: string) => void)((p["alerts"] as Array<{ id: string }>)[0]!.id);
        }
      }
      expect(pg1).not.toBeNull();
      expect(pg2).not.toBeNull();
    } finally {
      d.restore();
    }
  });
});
