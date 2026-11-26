// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import type { NextRequest } from "next/server";

import { SafeMarkdown, isSafeMarkdownUrl } from "@/components/shared/safe-markdown";
import { ForecastChart, normalizePm25Forecast } from "@/components/forecast/forecast-chart";
import { LEARNING_LESSONS, getLessonById } from "@/domain/learn/learning-curriculum";
import {
  PRICING_POLICY_REFUSAL,
  buildDeterministicLessonAnswer,
  containsProhibitedCurrencyOrPricing,
  generateLearningAgentReply
} from "@/services/ai/learning-agent-service";
import { runIntelligentAgentTask } from "@/services/ai/agent-orchestrator";
import { generateGroundedChatReply } from "@/services/ai/chat-service";
import { AiChatWorkspace } from "@/components/chat/ai-chat-workspace";
import { LearningCentre } from "@/components/learn/learning-centre";
import { AlertCenterView } from "@/components/alerts/alert-center-view";
import { SEMANTIC_CSS_TOKENS } from "@/theme/tokens";
import { executeAgentTool } from "@/services/ai/agent-tools";
import { POST as learnAgentPost } from "@/app/api/v1/learn/agent/route";
import { checkRouteRateLimit } from "@/lib/http/api-response";
import type {
  NormalizedForecast,
  NormalizedObservation,
  NormalizedStation
} from "@/schemas/providers/normalized-provider.schema";
import type { CpcbAqiResult } from "@/schemas/cpcb.schema";

const mockedGeminiGenerate = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: mockedGeminiGenerate
    };
  }
}));

vi.mock("@/lib/http/api-response", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/http/api-response")>();
  return {
    ...actual,
    checkRouteRateLimit: vi.fn().mockResolvedValue(null)
  };
});

function setupHookDispatcher() {
  const states = new Map<number, unknown>();
  const effects: Array<() => unknown> = [];
  let idx = 0;

  const internals = (React as unknown as {
    __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: { H: unknown };
  }).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const origH = internals.H;

  internals.H = {
    useState: (initial: unknown) => {
      const id = idx++;
      if (!states.has(id)) {
        states.set(id, typeof initial === "function" ? (initial as () => unknown)() : initial);
      }
      const setter = (val: unknown) => {
        const cur = states.get(id);
        states.set(id, typeof val === "function" ? (val as (v: unknown) => unknown)(cur) : val);
      };
      return [states.get(id), setter];
    },
    useEffect: (fn: () => unknown) => {
      effects.push(fn);
    },
    useCallback: (fn: unknown) => fn,
    useMemo: (fn: () => unknown) => fn(),
    useRef: (init: unknown) => ({ current: init }),
    useId: () => "v3-test-id"
  };

  return {
    render: <P,>(comp: React.FC<P>, props: P) => {
      idx = 0;
      effects.length = 0;
      return comp(props);
    },
    reset: () => {
      states.clear();
      idx = 0;
      effects.length = 0;
    },
    runEffects: () => {
      for (const ef of effects) {
        const cleanup = ef();
        if (typeof cleanup === "function") cleanup();
      }
    },
    restore: () => {
      internals.H = origH;
    }
  };
}

function walkElements(node: unknown, fn: (el: { type: unknown; props: Record<string, unknown> }) => void) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) walkElements(child, fn);
    return;
  }
  const el = node as { type?: unknown; props?: Record<string, unknown> };
  if (el.props) {
    fn(el as { type: unknown; props: Record<string, unknown> });
    if (el.props["children"]) walkElements(el.props["children"], fn);
  }
}

async function flushPromises() {
  for (let i = 0; i < 15; i++) {
    await Promise.resolve();
  }
}

const sampleStation: NormalizedStation = {
  id: "STN-V3-1",
  providerId: "CPCB_CAAQMS",
  name: "Ballygunge CAAQMS",
  city: "Kolkata",
  state: "West Bengal",
  latitude: 22.5367,
  longitude: 88.3638,
  availablePollutants: ["PM2.5", "PM10", "NO2"],
  lastReportedAt: "2026-11-26T10:00:00Z",
  license: "GODL",
  attribution: "CPCB",
  distanceKm: 2.4
};

const sampleAqi: CpcbAqiResult = {
  stationId: "STN-V3-1",
  calculatedAtUtc: "2026-11-26T10:00:00Z",
  overallAqi: 185,
  rawMathematicalAqi: 185,
  category: "MODERATE",
  prominentPollutant: "PM2.5",
  sufficiencyStatus: "SUFFICIENT",
  completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
  isBeyondNominalScale: false,
  reportingCeilingCappedAqi: 185,
  explanation: "Verified 24h CPCB PM2.5 moderate.",
  subIndices: [
    { pollutant: "PM2.5", concentration: 85.5, unit: "µg/m³", subIndex: 185, rawMathematicalSubIndex: 185, category: "MODERATE", windowHours: 24, validHours: 22, qualityFlag: "VERIFIED", isBeyondNominalScale: false, reportingCeilingCappedAqi: 185 },
    { pollutant: "PM10", concentration: 140, unit: "µg/m³", subIndex: 127, rawMathematicalSubIndex: 127, category: "MODERATE", windowHours: 24, validHours: 22, qualityFlag: "VERIFIED", isBeyondNominalScale: false, reportingCeilingCappedAqi: 127 },
    { pollutant: "NO2", concentration: 48, unit: "µg/m³", subIndex: 60, rawMathematicalSubIndex: 60, category: "SATISFACTORY", windowHours: 24, validHours: 22, qualityFlag: "VERIFIED", isBeyondNominalScale: false, reportingCeilingCappedAqi: 60 }
  ]
};

const sampleObs: NormalizedObservation[] = [
  {
    id: "obs-1",
    stationId: "STN-V3-1",
    stationName: "Ballygunge CAAQMS",
    providerId: "CPCB_CAAQMS",
    pollutant: "PM2.5",
    value: 85.5,
    unit: "µg/m³",
    averagingPeriod: "24h",
    typology: "TYPE_C_RAW_MEASUREMENT",
    observationTime: "2026-11-26T10:00:00Z",
    sourceUpdateTime: "2026-11-26T10:00:00Z",
    retrievalTime: "2026-11-26T10:05:00Z",
    qualityFlag: "VERIFIED",
    license: "GODL",
    attribution: "CPCB"
  }
];

const sampleForecast14: NormalizedForecast[] = Array.from({ length: 14 }, (_, i) => ({
  id: `fc-${i}`,
  latitude: 22.57,
  longitude: 88.36,
  pollutant: "PM2.5",
  forecastValue: i === 0 ? 0 : 40 + i * 5,
  unit: "µg/m³",
  validTime: new Date(Date.UTC(2026, 10, 26, 6 + i, 0, 0)).toISOString(),
  issueTime: "2026-11-26T00:00:00Z",
  retrievalTime: "2026-11-26T06:00:00Z",
  modelDomain: "cams_global",
  spatialResolutionKm: 45,
  temporalResolutionHours: 1,
  typology: "TYPE_D_MODEL_FORECAST",
  license: "CC BY 4.0",
  attribution: "Copernicus CAMS"
}));

describe("HawaSaathi 3.1 Suite — SafeMarkdown, ForecastChart, Curriculum, Learning Agent, Chat & Interactive UI", () => {
  const origFetch = globalThis.fetch;
  const origWin = (globalThis as unknown as { window?: unknown }).window;
  const origApiKey = process.env["GEMINI_API_KEY"];

  beforeEach(() => {
    vi.clearAllMocks();
    process.env["GEMINI_API_KEY"] = "";
    const storage = new Map<string, string>();
    const session = new Map<string, string>();
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: (k: string) => storage.get(k) ?? null,
        setItem: (k: string, v: string) => storage.set(k, v),
        removeItem: (k: string) => storage.delete(k)
      },
      sessionStorage: {
        getItem: (k: string) => session.get(k) ?? null,
        setItem: (k: string, v: string) => session.set(k, v),
        removeItem: (k: string) => session.delete(k)
      }
    };
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    (globalThis as unknown as { window?: unknown }).window = origWin;
    process.env["GEMINI_API_KEY"] = origApiKey;
  });

  it("validates URL safety and renders SafeMarkdown GFM + KaTeX safely without script links", () => {
    expect(isSafeMarkdownUrl("")).toBe("");
    expect(isSafeMarkdownUrl("/stations")).toBe("/stations");
    expect(isSafeMarkdownUrl("#naqi")).toBe("#naqi");
    expect(isSafeMarkdownUrl("https://cpcb.nic.in")).toBe("https://cpcb.nic.in");
    expect(isSafeMarkdownUrl("javascript:alert(1)")).toBe("");
    expect(isSafeMarkdownUrl("not a url")).toBe("");

    const md = [
      "# Main Heading",
      "## Section Heading",
      "### Subheading",
      "Inline math $I_p = \\frac{100}{30} \\times C_p$ and inline `PM2.5`.",
      "",
      "$$AQI = \\max(I_1, I_2)$$",
      "",
      "- Bullet one",
      "1. Ordered one",
      "",
      "> Advisory blockquote",
      "",
      "---",
      "",
      "| Pollutant | Unit |",
      "| --- | --- |",
      "| PM2.5 | µg/m³ |",
      "",
      "[Safe Link](https://cpcb.nic.in) and [Unsafe Link](javascript:alert(1))",
      "",
      "```ts",
      "const aqi = 185;",
      "```"
    ].join("\n");

    const html = renderToStaticMarkup(<SafeMarkdown content={md} />);
    expect(html).toContain("<h1");
    expect(html).toContain("<h2");
    expect(html).toContain("<h3");
    expect(html).toContain("katex");
    expect(html).toContain("<table");
    expect(html).toContain("https://cpcb.nic.in");
    expect(html).not.toContain("javascript:alert");
    expect(html).toContain("<pre");
  });

  it("enforces patched KaTeX (>=0.18.2), explicit trust:false under prototype pollution, and strips unsafe LaTeX/HTML vectors", () => {
    const req = createRequire(import.meta.url);
    const rootKatexPkg = req("katex/package.json") as { version: string };
    const rehypeReq = createRequire(req.resolve("rehype-katex"));
    const remarkReq = createRequire(req.resolve("remark-math"));
    const micromarkReq = createRequire(remarkReq.resolve("micromark-extension-math"));

    const katexVersions = [
      rootKatexPkg.version,
      (rehypeReq("katex/package.json") as { version: string }).version,
      (micromarkReq("katex/package.json") as { version: string }).version
    ];
    for (const version of katexVersions) {
      const [major = 0, minor = 0, patch = 0] = version.split(".").map((n) => Number.parseInt(n, 10));
      const isPatched = major > 0 || (major === 0 && (minor > 18 || (minor === 18 && patch >= 2)));
      expect(isPatched, `Expected KaTeX >= 0.18.2, saw ${version}`).toBe(true);
    }
    expect(dirname(req.resolve("katex/package.json"))).toBe(dirname(rehypeReq.resolve("katex/package.json")));
    expect(dirname(req.resolve("katex/package.json"))).toBe(dirname(micromarkReq.resolve("katex/package.json")));

    const prevTrustDesc = Object.getOwnPropertyDescriptor(Object.prototype, "trust");
    Object.defineProperty(Object.prototype, "trust", {
      value: true,
      configurable: true,
      enumerable: false,
      writable: true
    });
    try {
      const hostileMd = [
        "Safe formula: $$I_p = \\frac{100}{30}$$",
        "",
        "Untrusted math macros: $\\url{javascript:alert(1)}$ $\\href{javascript:alert(2)}{Click}$",
        "$\\htmlData{onclick=alert(3)}{BadData}$ $\\htmlClass{x\" onclick=\"alert(4)}{BadClass}$",
        "",
        "<script>alert(5)</script>",
        "",
        "<img src=\"x\" onerror=\"alert(6)\" />",
        "",
        "[bad](data:text/html,<script>alert(7)</script>)",
        "",
        "[CPCB](https://cpcb.nic.in)"
      ].join("\n");
      const html = renderToStaticMarkup(<SafeMarkdown content={hostileMd} />);
      expect(html).toContain("katex");
      expect(html).toContain('mathcolor="#cc0000"');
      expect(html).toContain('href="https://cpcb.nic.in"');
      expect(html.toLowerCase()).not.toContain("<script");
      expect(html.toLowerCase()).not.toContain("<img");
      expect(html).not.toMatch(/href=["']\s*(javascript:|data:)/i);
      expect(html).not.toMatch(/<[^>]*\s(onerror|onclick)\s*=/i);
    } finally {
      if (prevTrustDesc) {
        Object.defineProperty(Object.prototype, "trust", prevTrustDesc);
      } else {
        delete (Object.prototype as Record<string, unknown>)["trust"];
      }
    }
  });

  it("normalizes unsorted CAMS forecast intervals cleanly, computes IST labels, and handles UI hover/click/loading", () => {
    const unsorted: NormalizedForecast[] = [
      { ...sampleForecast14[1]!, validTime: "2026-11-26T09:00:00Z", forecastValue: 75, unit: "" as never },
      { ...sampleForecast14[0]!, validTime: "2026-11-26T06:00:00Z", forecastValue: 0 },
      { ...sampleForecast14[2]!, validTime: "invalid-date", forecastValue: -5 }
    ];
    const series = normalizePm25Forecast(unsorted, "Invalid/Timezone_Fallback");
    expect(series.points).toHaveLength(2);
    expect(series.cadenceHours).toBe(3);
    expect(series.cadenceLabel).toBe("3-hourly");
    expect(series.missingCount).toBe(1);
    expect(series.points[0]!.unit).toBe("µg/m³");

    const zeroResSeries = normalizePm25Forecast([{ ...sampleForecast14[0]!, temporalResolutionHours: 0 as never }]);
    expect(zeroResSeries.cadenceHours).toBe(1);

    const loadingHtml = renderToStaticMarkup(<ForecastChart language="en" forecast={sampleForecast14} isLoading />);
    expect(loadingHtml).toContain("Loading CAMS atmospheric forecast");

    const rendered14 = renderToStaticMarkup(<ForecastChart language="en" forecast={sampleForecast14} />);
    expect(rendered14).toContain("1-hourly interpolated output from native 3-hourly CAMS Global regional assimilation model");
    expect(rendered14).toContain("View Accessible Forecast Data Table (14 intervals)");

    const d = setupHookDispatcher();
    try {
      const tree = d.render(ForecastChart, { language: "en", forecast: sampleForecast14 });
      const barButtons: Array<{ onClick?: () => void; onMouseEnter?: () => void; onFocus?: () => void }> = [];
      walkElements(tree, (el) => {
        if (el.type === "button" && typeof el.props["aria-label"] === "string" && el.props["aria-label"].includes("PM2.5 forecast")) {
          barButtons.push(el.props as { onClick?: () => void; onMouseEnter?: () => void; onFocus?: () => void });
        }
      });
      expect(barButtons.length).toBe(14);
      barButtons[2]?.onClick?.();
      barButtons[3]?.onMouseEnter?.();
      barButtons[4]?.onFocus?.();
      d.render(ForecastChart, { language: "en", forecast: sampleForecast14 });
    } finally {
      d.restore();
    }
  });

  it("verifies Learning Curriculum integrity (8 pollutants + categories + zero currency) & Learning Agent isolation", async () => {
    expect(LEARNING_LESSONS.length).toBe(11);
    expect(getLessonById("unknown-topic").id).toBe("pm25");
    for (const lesson of LEARNING_LESSONS) {
      expect(containsProhibitedCurrencyOrPricing(JSON.stringify(lesson))).toBe(false);
    }

    expect(containsProhibitedCurrencyOrPricing("Buy ₹2000 purifier")).toBe(true);
    expect(containsProhibitedCurrencyOrPricing("What is the cost?")).toBe(true);
    expect(containsProhibitedCurrencyOrPricing("Spend $200 today")).toBe(true);
    expect(containsProhibitedCurrencyOrPricing("Formula $V = L \\times W$ and $$I_p$$.")).toBe(false);

    expect(buildDeterministicLessonAnswer("pm25", "beginner", "Give me a quiz question")).toContain("Practice Check");
    expect(buildDeterministicLessonAnswer("cpcb-naqi", "beginner", "Quick recap summary")).toContain("Recap");
    expect(buildDeterministicLessonAnswer("pb", "advanced", "Explain lead")).toContain("advanced level");
    const refusal = await generateLearningAgentReply({
      topicId: "pm25",
      question: "What purifier costs ₹5000 on Amazon?",
      level: "beginner",
      language: "en"
    });
    expect(refusal.policyRefusalApplied).toBe(true);
    expect(refusal.reply).toContain(PRICING_POLICY_REFUSAL);

    const noKey = await generateLearningAgentReply({
      topicId: "o3",
      question: "Why does ozone peak in sunlight?",
      level: "intermediate",
      language: "en"
    });
    expect(noKey.isAiGenerated).toBe(false);
    expect(noKey.reply).toContain("Ozone");

    // Gemini leaks currency -> refused & replaced cleanly
    process.env["GEMINI_FALLBACK_MODELS"] = "gemini-2.5-flash-lite";
    mockedGeminiGenerate.mockResolvedValueOnce({ text: "You can buy one for ₹4500." });
    const leaked = await generateLearningAgentReply(
      {
        topicId: "co",
        question: "Explain CO sensor windows",
        level: "advanced",
        language: "en",
        recentMessages: [
          { role: "user", text: "Hi" },
          { role: "assistant", text: "Hello learner" }
        ]
      },
      "test-key"
    );
    expect(leaked.policyRefusalApplied).toBe(true);
    expect(leaked.isAiGenerated).toBe(false);

    // Gemini valid educational reply without usageMetadata
    mockedGeminiGenerate.mockResolvedValueOnce({ text: "Measured CO is reported over 8 hours." });
    const okNoUsage = await generateLearningAgentReply({ topicId: "co", question: "Window for CO?" }, "test-key");
    expect(okNoUsage.timings.outputTokens).toBeUndefined();
    delete process.env["GEMINI_FALLBACK_MODELS"];

    // Gemini empty response -> falls back across candidates & deterministic
    mockedGeminiGenerate.mockResolvedValue({ text: "   " });
    const emptyRes = await generateLearningAgentReply(
      { topicId: "no2", question: "Explain NO2", timeoutMs: 1200 },
      "test-key"
    );
    expect(emptyRes.isAiGenerated).toBe(false);
    expect(emptyRes.timings.fallbackAttempts).toBeGreaterThanOrEqual(1);

    // Timeout deadline expiry
    mockedGeminiGenerate.mockImplementationOnce(() => new Promise((r) => setTimeout(() => r({ text: "late" }), 40)));
    const timedOut = await generateLearningAgentReply(
      { topicId: "so2", question: "Explain SO2", timeoutMs: 1 },
      "test-key"
    );
    expect(timedOut.isAiGenerated).toBe(false);

    // Gemini valid educational reply with usageMetadata
    mockedGeminiGenerate.mockResolvedValueOnce({
      text: "Here is the piecewise formula $I_p = 100$.",
      usageMetadata: { candidatesTokenCount: 24 }
    });
    const okRes = await generateLearningAgentReply(
      { topicId: "nh3", question: "Explain ammonia formula" },
      "test-key"
    );
    expect(okRes.isAiGenerated).toBe(true);
    expect(okRes.timings.outputTokens).toBe(24);
  });

  it("exercises /api/v1/learn/agent POST route across rate limit, invalid JSON, Zod 400, and 200", async () => {
    vi.mocked(checkRouteRateLimit).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ERROR" }), { status: 429 }) as never
    );
    const limited = await learnAgentPost(new Request("http://localhost/api/v1/learn/agent", { method: "POST" }) as unknown as NextRequest);
    expect(limited.status).toBe(429);

    const badJson = await learnAgentPost(
      new Request("http://localhost/api/v1/learn/agent", { method: "POST", body: "{not-json" }) as unknown as NextRequest
    );
    expect(badJson.status).toBe(400);

    const badSchema = await learnAgentPost(
      new Request("http://localhost/api/v1/learn/agent", {
        method: "POST",
        body: JSON.stringify({ topicId: "", question: "" })
      }) as unknown as NextRequest
    );
    expect(badSchema.status).toBe(400);

    const ok = await learnAgentPost(
      new Request("http://localhost/api/v1/learn/agent", {
        method: "POST",
        body: JSON.stringify({ topicId: "pm25", question: "Explain PM2.5 formula", level: "intermediate" })
      }) as unknown as NextRequest
    );
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as { status: string; data: { topicId: string } };
    expect(body.status).toBe("SUCCESS");
    expect(body.data.topicId).toBe("pm25");
  });

  it("closes agent-orchestrator preloaded stations/forecast reuse & chat-service detailed/history branches", async () => {
    const compareReuse = await runIntelligentAgentTask({
      prompt: "Compare stations nearby",
      language: "en",
      station: sampleStation,
      stations: [sampleStation],
      calculatedAqi: sampleAqi,
      observations: sampleObs,
      forecast: sampleForecast14,
      context: { isAuthenticated: false, hasCloudConsent: false }
    });
    expect(compareReuse.taskType).toBe("STATION_COMPARISON");
    expect(compareReuse.verifiedFacts[0]).toContain("Ballygunge");

    const forecastReuse = await runIntelligentAgentTask({
      prompt: "Best walk commute window today",
      language: "en",
      station: sampleStation,
      stations: [sampleStation],
      calculatedAqi: sampleAqi,
      observations: sampleObs,
      forecast: sampleForecast14,
      context: { isAuthenticated: false, hasCloudConsent: false }
    });
    expect(forecastReuse.taskType).toBe("ACTIVITY_WINDOW_ADVISORY");

    mockedGeminiGenerate.mockResolvedValueOnce({
      text: "PM2.5 is 85.5 µg/m³ (AQI 185).",
      usageMetadata: { candidatesTokenCount: 45 }
    });
    const chatDetailed = await generateGroundedChatReply(
      {
        message: "Give me a detailed table comparing indoor ventilation options and stations today",
        language: "en",
        station: sampleStation,
        stations: [sampleStation],
        calculatedAqi: sampleAqi,
        observations: sampleObs,
        forecast: sampleForecast14,
        history: [
          { role: "user", text: "Hi" },
          { role: "assistant", text: "Hello" }
        ]
      },
      "test-key"
    );
    expect(chatDetailed.isAiGenerated).toBe(true);
    expect(chatDetailed.timings?.outputTokens).toBe(45);
    expect(chatDetailed.timings?.contextSource).toBe("CLIENT_CONTEXT");

    const preloadedPlan = await executeAgentTool(
      "evaluate_daily_plan",
      { activities: [], calculatedAqi: null, forecast: sampleForecast14 },
      { isAuthenticated: false, hasCloudConsent: false }
    );
    expect(preloadedPlan.ok).toBe(true);

    expect(SEMANTIC_CSS_TOKENS.surfaceAccent).toBe("var(--surface-accent)");
    const alertsHtml = renderToStaticMarkup(
      <AlertCenterView
        alerts={[
          { id: "a1", title: "Severe", message: "Msg", severity: "SEVERE", source: "CPCB_CAAQMS", isRead: false, timestamp: "2026-11-26T10:00:00Z" },
          { id: "a2", title: "Poor", message: "Msg", severity: "POOR", source: "CPCB_CAAQMS", isRead: false, timestamp: "2026-11-26T10:00:00Z" },
          { id: "a3", title: "Moderate", message: "Msg", severity: "MODERATE", source: "CAMS_GLOBAL", isRead: true, timestamp: "2026-11-26T10:00:00Z" }
        ]}
        unreadCount={2}
        alertPreferences={{ severityThreshold: "MODERATE", hysteresisEnabled: true, quietHoursEnabled: false, quietHoursStart: "22:00", quietHoursEnd: "06:00" }}
        onConfigureRules={vi.fn()}
        onOpenDrawer={vi.fn()}
      />
    );
    expect(alertsHtml).toContain("SEVERE");
  });

  it("exercises AiChatWorkspace consent, res.text parsing, error >= 500, and serverTotalMs display", async () => {
    const d = setupHookDispatcher();
    try {
      const tree0 = d.render(AiChatWorkspace, {
        language: "en",
        selectedStation: sampleStation,
        stations: [sampleStation],
        calculatedAqi: sampleAqi,
        observations: sampleObs,
        forecast: sampleForecast14
      });
      // Toggle consent + type question
      walkElements(tree0, (el) => {
        if (el.type === "input" && el.props["type"] === "checkbox") {
          (el.props["onChange"] as (e: unknown) => void)({ target: { checked: true } });
        }
        if (el.type === "input" && el.props["type"] === "text") {
          (el.props["onChange"] as (e: unknown) => void)({ target: { value: "Explain PM2.5" } });
        }
      });

      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: "SUCCESS",
            data: {
              reply: "**PM2.5** formula $I_p$",
              sources: ["CPCB"],
              isAiGenerated: true,
              modelUsed: "gemini-3.5-flash-lite",
              dataDistinction: "TYPE_B_CALCULATED_AQI",
              timings: { serverTotalMs: 320 }
            }
          })
      }) as never;

      const tree1 = d.render(AiChatWorkspace, {
        language: "en",
        selectedStation: sampleStation,
        stations: [sampleStation],
        calculatedAqi: sampleAqi,
        observations: sampleObs,
        forecast: sampleForecast14
      });
      let submit: ((e: unknown) => Promise<void>) | undefined;
      walkElements(tree1, (el) => {
        if (el.type === "form") submit = el.props["onSubmit"] as (e: unknown) => Promise<void>;
      });
      await submit?.({ preventDefault: vi.fn() });
      await flushPromises();

      // Now send follow-up (non-empty history) receiving HTTP 502 invalid text body
      const tree2 = d.render(AiChatWorkspace, {
        language: "en",
        selectedStation: sampleStation,
        stations: [sampleStation],
        calculatedAqi: sampleAqi,
        observations: sampleObs,
        forecast: sampleForecast14
      });
      walkElements(tree2, (el) => {
        if (el.type === "input" && el.props["type"] === "text") {
          (el.props["onChange"] as (e: unknown) => void)({ target: { value: "Follow up" } });
        }
      });
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => "not-json"
      }) as never;
      const tree3 = d.render(AiChatWorkspace, {
        language: "en",
        selectedStation: sampleStation,
        stations: [sampleStation],
        calculatedAqi: sampleAqi,
        observations: sampleObs,
        forecast: sampleForecast14
      });
      walkElements(tree3, (el) => {
        if (el.type === "form") submit = el.props["onSubmit"] as (e: unknown) => Promise<void>;
      });
      await submit?.({ preventDefault: vi.fn() });
      await flushPromises();
      const after502 = d.render(AiChatWorkspace, {
        language: "en",
        selectedStation: sampleStation,
        stations: [sampleStation],
        calculatedAqi: sampleAqi,
        observations: sampleObs,
        forecast: sampleForecast14
      });
      expect(JSON.stringify(after502)).toContain("HTTP 502");
    } finally {
      d.restore();
    }
  });

  it("exercises interactive LearningCentre cards, difficulty levels, flashcards, quiz, revision, CADR & Learning Agent", async () => {
    // SSR (window === undefined) + runEffects when window missing
    const prevWin = (globalThis as unknown as { window?: unknown }).window;
    (globalThis as unknown as { window: unknown }).window = undefined;
    const ssrHtml = renderToStaticMarkup(<LearningCentre language="en" />);
    expect(ssrHtml).toContain("PM2.5");
    const dSsr = setupHookDispatcher();
    dSsr.render(LearningCentre, { language: "en" });
    dSsr.runEffects();
    dSsr.restore();
    (globalThis as unknown as { window: unknown }).window = prevWin;

    window.sessionStorage.setItem(
      "hs_learn_progress_v1",
      JSON.stringify({
        masteredFlashcards: ["pm10-fc-1", "pm25-fc-1"],
        needsReviewFlashcards: ["pm25-fc-1"],
        quizScores: { pm10: { score: 1, total: 1 } }
      })
    );

    const d = setupHookDispatcher();
    try {
      const initialTree = d.render(LearningCentre, { language: "en" });
      expect(JSON.stringify(initialTree)).toContain("flashcards mastered");

      // Open PM2.5 lesson card
      let openPm25: ((e?: { currentTarget?: HTMLButtonElement | null }) => void) | undefined;
      walkElements(initialTree, (el) => {
        if (el.props["data-testid"] === "lesson-card-pm25") {
          openPm25 = el.props["onClick"] as (e?: { currentTarget?: HTMLButtonElement | null }) => void;
        }
      });
      openPm25?.({ currentTarget: { focus: vi.fn() } as unknown as HTMLButtonElement });
      d.runEffects();

      // Switch difficulty to Advanced
      let lessonTree = d.render(LearningCentre, { language: "en" });
      walkElements(lessonTree, (el) => {
        if (el.type === "button" && el.props["children"] === "Advanced") {
          (el.props["onClick"] as () => void)();
        }
      });

      // Switch to Flashcards, hit Reveal (while pm25-fc-1 is mastered), Got it, Needs review, Next Card
      lessonTree = d.render(LearningCentre, { language: "en" });
      walkElements(lessonTree, (el) => {
        if (el.type === "button" && el.props["children"] === "Flashcards") {
          (el.props["onClick"] as () => void)();
        }
      });
      let fcTree = d.render(LearningCentre, { language: "en" });
      expect(JSON.stringify(fcTree)).toContain("Marked as Got it");
      walkElements(fcTree, (el) => {
        if (el.type === "button" && el.props["children"] === "Reveal Answer") {
          (el.props["onClick"] as () => void)();
        }
      });
      // Render while revealed === true -> shows Hide Answer!
      fcTree = d.render(LearningCentre, { language: "en" });
      expect(JSON.stringify(fcTree)).toContain("Hide Answer");
      walkElements(fcTree, (el) => {
        if (el.type === "button" && ["Got it", "Needs review", "Next Card"].includes(String(el.props["children"]))) {
          (el.props["onClick"] as () => void)();
        }
      });
      d.render(LearningCentre, { language: "en" });

      // Switch to Quick Quiz, pick option 0, Check Answers
      walkElements(fcTree, (el) => {
        if (el.type === "button" && el.props["children"] === "Quick Quiz") {
          (el.props["onClick"] as () => void)();
        }
      });
      const quizTree = d.render(LearningCentre, { language: "en" });
      let pickedWrong = false;
      walkElements(quizTree, (el) => {
        if (el.type === "button" && el.props["children"] === "16 hours") {
          (el.props["onClick"] as () => void)();
        } else if (!pickedWrong && el.type === "button" && el.props["children"] === "Yes, with CO and NO2 only") {
          pickedWrong = true;
          (el.props["onClick"] as () => void)();
        }
      });
      const quizTree2 = d.render(LearningCentre, { language: "en" });
      walkElements(quizTree2, (el) => {
        if (el.type === "button" && el.props["children"] === "Check Answers") {
          (el.props["onClick"] as () => void)();
        }
      });
      d.render(LearningCentre, { language: "en" });

      // Switch to Revision (with pm25-fc-1 flagged) & then Reset progress + Revision (no flagged -> else branch!)
      walkElements(quizTree2, (el) => {
        if (el.type === "button" && el.props["children"] === "Revision") {
          (el.props["onClick"] as () => void)();
        }
      });
      const revFlagged = d.render(LearningCentre, { language: "en" });
      walkElements(revFlagged, (el) => {
        if (el.type === "button" && JSON.stringify(el.props["children"]).includes("Reset progress")) {
          (el.props["onClick"] as () => void)();
        }
      });
      const revClean = d.render(LearningCentre, { language: "en" });
      expect(JSON.stringify(revClean)).toContain("No missed cards yet");
      walkElements(revClean, (el) => {
        if (el.type === "button" && el.props["children"] === "Topic Recap") {
          (el.props["onClick"] as () => void)();
        }
      });

      // Ask Learning Agent via quick chip (1: AI+refusal, 2: deterministic isAiGenerated=false, 3: !res.ok w/o message, 4: throw)
      let resolveSlow!: (v: unknown) => void;
      globalThis.fetch = vi
        .fn()
        .mockImplementationOnce(() => new Promise((r) => { resolveSlow = r; }))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: "SUCCESS",
            data: { reply: "Deterministic recap", isAiGenerated: false, policyRefusalApplied: false }
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ status: "ERROR" })
        })
        .mockRejectedValueOnce(new Error("offline"));

      const agentTree = d.render(LearningCentre, { language: "en" });
      // Submit empty form first to cover !trimmed guard
      walkElements(agentTree, (el) => {
        if (el.type === "form") (el.props["onSubmit"] as (e: unknown) => void)({ preventDefault: vi.fn() });
      });
      let chipClick: (() => void) | undefined;
      walkElements(agentTree, (el) => {
        if (el.type === "button" && String(el.props["children"]).includes("Explain PM2.5 simply")) {
          chipClick = el.props["onClick"] as () => void;
        }
      });
      chipClick?.();
      // Render while tutorLoading === true -> covers Loader2 spinner!
      const loadingAgentTree = d.render(LearningCentre, { language: "en" });
      expect(JSON.stringify(loadingAgentTree)).toContain("animate-spin");
      resolveSlow({
        ok: true,
        json: async () => ({
          status: "SUCCESS",
          data: {
            reply: "PM2.5 stays suspended for days.",
            references: ["MoEFCC"],
            isAiGenerated: true,
            policyRefusalApplied: true,
            timings: { serverTotalMs: 210 }
          }
        })
      });
      await flushPromises();
      const afterAiReplyTree = d.render(LearningCentre, { language: "en" });
      expect(JSON.stringify(afterAiReplyTree)).toContain("Educational scope notice");

      // Call fresh chip -> hits Curriculum Baseline branch (isAiGenerated: false)
      walkElements(afterAiReplyTree, (el) => {
        if (el.type === "button" && String(el.props["children"]).includes("Explain PM2.5 simply")) {
          chipClick = el.props["onClick"] as () => void;
        }
      });
      chipClick?.();
      await flushPromises();
      d.render(LearningCentre, { language: "en" });

      // Submit form for !res.ok without message + network failure
      const agentTree2 = d.render(LearningCentre, { language: "en" });
      walkElements(agentTree2, (el) => {
        if (el.type === "input") (el.props["onChange"] as (e: unknown) => void)({ target: { value: "Why winter fog?" } });
      });
      const agentTree3 = d.render(LearningCentre, { language: "en" });
      let submitTutor: ((e: unknown) => void) | undefined;
      walkElements(agentTree3, (el) => {
        if (el.type === "form") submitTutor = el.props["onSubmit"] as (e: unknown) => void;
      });
      submitTutor?.({ preventDefault: vi.fn() });
      await flushPromises();
      submitTutor?.({ preventDefault: vi.fn() });
      await flushPromises();

      // Back to Learning Centre + inspect NAQI, Provenance, and CADR lesson triggers
      const agentTree4 = d.render(LearningCentre, { language: "en" });
      walkElements(agentTree4, (el) => {
        if (el.props["data-testid"] === "back-to-learning-centre") (el.props["onClick"] as () => void)();
      });
      const overviewTree = d.render(LearningCentre, { language: "en" });
      for (const [tabLabel, lessonBtnText] of [
        ["CPCB NAQI", "Open Interactive NAQI Lesson"],
        ["Type A–D Data", "Practice Type A–D Quiz"],
        ["CADR & Ventilation", "Open CADR Lesson"]
      ] as const) {
        walkElements(overviewTree, (el) => {
          if (el.type === "button" && el.props["children"] === tabLabel) {
            (el.props["onClick"] as () => void)();
          }
        });
        const tabTree = d.render(LearningCentre, { language: "en" });
        if (tabLabel === "CADR & Ventilation") {
          walkElements(tabTree, (el) => {
            if (el.type === "input" && el.props["type"] === "number") {
              (el.props["onChange"] as (e: unknown) => void)({ target: { value: "0" } });
            }
          });
        }
        walkElements(tabTree, (el) => {
          if (el.type === "button" && String(el.props["children"]).includes(lessonBtnText)) {
            (el.props["onClick"] as () => void)();
          }
        });
        d.render(LearningCentre, { language: "en" });
      }

      // Malformed non-array/non-object types inside valid JSON + invalid JSON fallback
      d.reset();
      window.sessionStorage.setItem(
        "hs_learn_progress_v1",
        JSON.stringify({ masteredFlashcards: "bad", needsReviewFlashcards: "bad", quizScores: "bad" })
      );
      d.render(LearningCentre, { language: "en" });

      d.reset();
      window.sessionStorage.setItem("hs_learn_progress_v1", "{bad");
      (window.sessionStorage as unknown as { setItem: () => void }).setItem = () => {
        throw new Error("blocked");
      };
      const fallbackTree = d.render(LearningCentre, { language: "en" });
      d.runEffects();
      expect(fallbackTree).toBeTruthy();
    } finally {
      d.restore();
    }
  });
});
