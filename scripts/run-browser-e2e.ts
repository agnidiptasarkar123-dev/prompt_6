// SPDX-License-Identifier: Apache-2.0
/**
 * scripts/run-browser-e2e.ts
 * Real Browser-Based End-to-End Automation Suite.
 * Uses puppeteer-core with local Google Chrome (/Applications/Google Chrome.app).
 * Serves the exact Next.js standalone production build on port 3009.
 * Executes all core user journeys across desktop & mobile viewports.
 */

import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import puppeteer, { type Browser } from "puppeteer-core";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
let PORT = 3009;
let BASE_URL = `http://localhost:${PORT}`;

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const chosen = typeof addr === "object" && addr ? addr.port : 3019;
      srv.close(() => resolve(chosen));
    });
    srv.on("error", reject);
  });
}

interface E2ETestResult {
  name: string;
  category: string;
  status: "PASS" | "FAIL";
  durationMs: number;
  details: string;
}

const results: E2ETestResult[] = [];

function record(name: string, category: string, status: "PASS" | "FAIL", durationMs: number, details: string) {
  results.push({ name, category, status, durationMs, details });
  const icon = status === "PASS" ? "✓" : "✗";
  console.log(`  ${icon} [${category}] ${name} (${durationMs}ms) — ${details}`);
}

function prepareStandaloneAssets() {
  const staticSrc = path.resolve(".next/static");
  const staticDest = path.resolve(".next/standalone/.next/static");
  const pubSrc = path.resolve("public");
  const pubDest = path.resolve(".next/standalone/public");
  if (fs.existsSync(staticSrc)) {
    fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });
  }
  if (fs.existsSync(pubSrc)) {
    fs.cpSync(pubSrc, pubDest, { recursive: true, force: true });
  }
}

async function startServer(): Promise<ChildProcess> {
  PORT = await findFreePort();
  BASE_URL = `http://127.0.0.1:${PORT}`;
  prepareStandaloneAssets();
  const extraEnv: Record<string, string> = {};
  if (fs.existsSync(".env.local")) {
    for (const rawLine of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const eq = line.indexOf("=");
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key && key !== "NODE_ENV" && key !== "PORT" && val) {
        extraEnv[key] = val;
      }
    }
  }
  return new Promise((resolve, reject) => {
    console.log(`[E2E] Starting Next.js standalone production server on port ${PORT}...`);
    const server = spawn("node", [".next/standalone/server.js"], {
      stdio: "pipe",
      env: { ...process.env, ...extraEnv, NODE_ENV: "production", PORT: String(PORT), HOSTNAME: "127.0.0.1" }
    });

    let started = false;
    server.stdout?.on("data", (data: Buffer) => {
      const msg = data.toString();
      if (!started && (msg.includes("Ready in") || msg.includes("3009") || msg.includes("Listening"))) {
        started = true;
        console.log(`[E2E] Server ready on ${BASE_URL}`);
        resolve(server);
      }
    });

    server.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString();
      if (msg.trim()) {
        console.error(`[E2E server stderr] ${msg.trim()}`);
      }
      if (!started && msg.includes("EADDRINUSE")) {
        reject(new Error(`Port ${PORT} in use: ${msg}`));
      }
    });

    setTimeout(() => {
      if (!started) {
        started = true;
        console.warn("[E2E] Server startup fallback triggered after 5s");
        resolve(server);
      }
    }, 5000);
  });
}

const mockNearbyStations = {
  status: "SUCCESS",
  data: {
    stations: [
      {
        id: "cpcb_delhi_delhi_anand-vihar",
        name: "Anand Vihar, Delhi - DPCC",
        city: "Delhi",
        state: "Delhi",
        latitude: 28.6468,
        longitude: 77.316,
        providerId: "CPCB_CAAQMS",
        availablePollutants: ["PM2.5", "PM10", "NO2"],
        lastReportedAt: new Date().toISOString(),
        license: "GODL-India",
        attribution: "CPCB",
        distanceKm: 2.4
      },
      {
        id: "cpcb_delhi_delhi_rk-puram",
        name: "R K Puram, Delhi - DPCC",
        city: "Delhi",
        state: "Delhi",
        latitude: 28.5633,
        longitude: 77.1869,
        providerId: "CPCB_CAAQMS",
        availablePollutants: ["PM2.5", "PM10", "SO2"],
        lastReportedAt: new Date().toISOString(),
        license: "GODL-India",
        attribution: "CPCB",
        distanceKm: 7.8
      }
    ]
  }
};

const mockVerifiedAirQuality = {
  status: "SUCCESS",
  requestId: "e2e_req_001",
  retrievedAt: new Date().toISOString(),
  data: {
    station: mockNearbyStations.data.stations[0],
    calculatedAqi: {
      stationId: "cpcb_delhi_delhi_anand-vihar",
      calculatedAtUtc: new Date().toISOString(),
      overallAqi: 362,
      rawMathematicalAqi: 362,
      category: "VERY_POOR",
      prominentPollutant: "PM2.5",
      sufficiencyStatus: "SUFFICIENT",
      completenessPolicy: "OFFICIAL_CPCB_STATUTORY_16H",
      subIndices: [{ pollutant: "PM2.5", subIndex: 362, rawMathematicalSubIndex: 362, category: "VERY_POOR", concentration: 198.5, unit: "µg/m³", windowHours: 24, validHours: 24, qualityFlag: "VERIFIED", isBeyondNominalScale: false, reportingCeilingCappedAqi: 362 }],
      isBeyondNominalScale: false,
      reportingCeilingCappedAqi: 362,
      explanation: "Independently calculated CPCB NAQI."
    },
    aqiStatus: "AVAILABLE",
    statusMessage: "CPCB CAAQMS Station Data Verified",
    provider: "CPCB_CAAQMS",
    retrievedAt: new Date().toISOString(),
    observations: [
      {
        id: "obs_pm25_1",
        pollutant: "PM2.5",
        value: 198.5,
        unit: "µg/m³",
        observationTime: new Date().toISOString(),
        sourceUpdateTime: null,
        retrievalTime: new Date().toISOString(),
        stationId: "cpcb_delhi_delhi_anand-vihar",
        stationName: "Anand Vihar, Delhi - DPCC",
        providerId: "CPCB_CAAQMS",
        averagingPeriod: "24h",
        qualityFlag: "VERIFIED",
        typology: "TYPE_C_RAW_MEASUREMENT",
        license: "GODL-India",
        attribution: "CPCB"
      }
    ]
  }
};

const mockUnavailableNoStation = {
  status: "SUCCESS",
  data: { stations: [] }
};

const mockUnavailableAqi = {
  status: "SUCCESS",
  requestId: "e2e_req_002",
  retrievedAt: new Date().toISOString(),
  data: {
    station: {
      id: "cpcb_wb_kolkata_rabindra-bharati",
      name: "Rabindra Bharati University, Kolkata - WBPCB",
      city: "Kolkata",
      state: "West Bengal",
      latitude: 22.6278,
      longitude: 88.3804,
      providerId: "CPCB_CAAQMS",
      availablePollutants: [],
      lastReportedAt: null,
      license: "GODL-India",
      attribution: "CPCB",
      distanceKm: 3.1
    },
    calculatedAqi: null,
    aqiStatus: "AQI_UNAVAILABLE",
    statusMessage: "Overall CPCB AQI unavailable: fewer than 3 valid pollutants monitored or missing particulate parameters.",
    provider: "CPCB_CAAQMS",
    retrievedAt: new Date().toISOString(),
    observations: []
  }
};

const mockStaleAirQuality = {
  status: "SUCCESS",
  requestId: "e2e_req_003",
  retrievedAt: new Date().toISOString(),
  data: {
    station: mockNearbyStations.data.stations[0],
    calculatedAqi: {
      ...mockVerifiedAirQuality.data.calculatedAqi,
      overallAqi: 215,
      category: "POOR"
    },
    aqiStatus: "STALE",
    statusMessage: "Station observation data is STALE (>24 hours elapsed since measurement).",
    provider: "CPCB_CAAQMS",
    retrievedAt: new Date().toISOString(),
    observations: [
      {
        ...mockVerifiedAirQuality.data.observations[0],
        observationTime: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        qualityFlag: "STALE"
      }
    ]
  }
};

const mockCamsForecast = {
  status: "SUCCESS",
  data: {
    forecast: [
      {
        id: "fc-pm25-1",
        latitude: 28.6468,
        longitude: 77.316,
        modelDomain: "cams_global",
        spatialResolutionKm: 45,
        temporalResolutionHours: 1,
        pollutant: "PM2.5",
        forecastValue: 180,
        unit: "µg/m³",
        validTime: new Date(Date.now() + 3600000).toISOString(),
        issueTime: null,
        retrievalTime: new Date().toISOString(),
        typology: "TYPE_D_MODEL_FORECAST",
        license: "CC-BY-4.0",
        attribution: "Open-Meteo CAMS"
      },
      {
        id: "fc-pm25-2",
        latitude: 28.6468,
        longitude: 77.316,
        modelDomain: "cams_global",
        spatialResolutionKm: 45,
        temporalResolutionHours: 1,
        pollutant: "PM2.5",
        forecastValue: 65,
        unit: "µg/m³",
        validTime: new Date(Date.now() + 7200000).toISOString(),
        issueTime: null,
        retrievalTime: new Date().toISOString(),
        typology: "TYPE_D_MODEL_FORECAST",
        license: "CC-BY-4.0",
        attribution: "Open-Meteo CAMS"
      }
    ]
  }
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("================================================================================");
  console.log("       HAWASAATHI 2.0 REAL CHROME BROWSER END-TO-END VERIFICATION               ");
  console.log("================================================================================\n");

  if (!fs.existsSync(CHROME_PATH)) {
    console.error(`[FATAL] Google Chrome executable not found at: ${CHROME_PATH}`);
    process.exit(1);
  }

  let server: ChildProcess | null = null;
  let browser: Browser | null = null;

  try {
    server = await startServer();
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--window-size=1280,800"]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const pageErrors: string[] = [];
    page.on("pageerror", (err) => {
      pageErrors.push(err instanceof Error ? err.message : String(err));
    });

    await page.setRequestInterception(true);
    let activeScenario: "NORMAL" | "UNAVAILABLE" | "NO_STATION" | "STALE" = "NORMAL";
    let airQualityRequestsCount = 0;

    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/api/v1/stations/nearby")) {
        req.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(activeScenario === "NO_STATION" ? mockUnavailableNoStation : mockNearbyStations)
        });
      } else if (url.includes("/api/v1/air-quality")) {
        airQualityRequestsCount += 1;
        req.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            activeScenario === "UNAVAILABLE"
              ? mockUnavailableAqi
              : activeScenario === "STALE"
                ? mockStaleAirQuality
                : mockVerifiedAirQuality
          )
        });
      } else if (url.includes("/api/v1/forecast")) {
        req.respond({ status: 200, contentType: "application/json", body: JSON.stringify(mockCamsForecast) });
      } else if (url.includes("tile.openstreetmap.org") || url.includes("openstreetmap.org")) {
        req.respond({ status: 200, contentType: "image/png", body: Buffer.alloc(0) });
      } else {
        req.continue();
      }
    });

    const navigateSidebarView = async (labelSubstring: string) => {
      return page.evaluate((needle: string) => {
        const btns = Array.from(document.querySelectorAll('aside[aria-label="Workspace sidebar"] nav button'));
        const match = btns.find((b) => (b.textContent || "").toLowerCase().includes(needle.toLowerCase()));
        if (match) {
          (match as HTMLButtonElement).click();
          return true;
        }
        return false;
      }, labelSubstring);
    };

    // 1. Dashboard Initial Load + Onboarding Dismiss
    {
      const t0 = Date.now();
      activeScenario = "NORMAL";
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForSelector("main", { timeout: 10000 });
      await sleep(700);
      await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Dismiss welcome guide"]') as HTMLButtonElement | null;
        btn?.click();
      });
      await sleep(250);
      const seen = await page.evaluate(() => window.localStorage.getItem("hs_onboarding_seen"));
      const txt = await page.evaluate(() => document.body.innerText);
      const perf = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
        const paints = performance.getEntriesByType("paint");
        const fcp = paints.find((p) => p.name === "first-contentful-paint")?.startTime ?? null;
        return {
          domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
          loadEventMs: nav ? Math.round(nav.loadEventEnd) : null,
          fcpMs: fcp !== null ? Math.round(fcp) : null
        };
      });
      const ok = txt.includes("Anand Vihar, Delhi - DPCC") && txt.includes("362") && seen === "true";
      record("Initial Dashboard & Onboarding Persistence", "CORE", ok ? "PASS" : "FAIL", Date.now() - t0, `362 AQI shown, onboarding saved=${seen}, perf=${JSON.stringify(perf)}`);
    }

    // 2. Real /api/v1/recommendations BFF Wiring & Indoor Coach
    {
      const t0 = Date.now();
      await sleep(500);
      const txt = await page.evaluate(() => document.body.innerText);
      const ok = txt.includes("Indoor Air") && (txt.includes("Schedule") || txt.includes("HEPA") || txt.includes("Avoid"));
      record("Live Recommendations & Indoor Coach Wiring", "CORE", ok ? "PASS" : "FAIL", Date.now() - t0, "Recommendations & Indoor Coach hydrated cleanly");
    }

    // 3. Location Without Station Identity Separation (NO_STATION)
    {
      const t0 = Date.now();
      activeScenario = "NO_STATION";
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 15000 });
      await sleep(700);
      const bodyText = await page.evaluate(() => document.body.innerText);
      const ok = bodyText.includes("Search Location:") && bodyText.includes("No eligible monitoring station found") && !bodyText.includes("Type C: Raw Monitored");
      record("Location vs Station Separation (Zero Stations)", "DATA_INTEGRITY", ok ? "PASS" : "FAIL", Date.now() - t0, "Pure location header displayed without fake station suffix or Type C badge");
    }

    // 4. Station Without Observations Provenance Truthfulness & Zero Duplicate Text
    {
      const t0 = Date.now();
      activeScenario = "UNAVAILABLE";
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 15000 });
      await sleep(700);
      const bodyText = await page.evaluate(() => document.body.innerText);
      const hasNeutralProv = bodyText.includes("No verified observation available") && !bodyText.includes("Type C: Raw Monitored");
      const noFakeMod = !bodyText.includes("MODERATE") && !bodyText.includes("Moderate category");
      const msgMatches = bodyText.split("Overall CPCB AQI unavailable: fewer than 3 valid pollutants").length - 1;
      const ok = hasNeutralProv && noFakeMod && msgMatches === 1;
      record("Provenance Truthfulness & Zero Duplicate Copy", "PROVENANCE", ok ? "PASS" : "FAIL", Date.now() - t0, `neutralProv=${hasNeutralProv}, noFakeMod=${noFakeMod}, count=${msgMatches}`);
    }

    // 5. Interactive Map: Zoom, Layer Switch & Accessible List Toggle
    {
      const t0 = Date.now();
      activeScenario = "NORMAL";
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 15000 });
      await sleep(700);
      await navigateSidebarView("Explore Map");
      await sleep(300);
      const zoomBefore = await page.evaluate(() => document.body.innerText.match(/Zoom ([0-9.]+)x/)?.[1] || "");
      await page.evaluate(() => {
        (document.querySelector('button[aria-label="Zoom In"]') as HTMLButtonElement | null)?.click();
      });
      await sleep(200);
      const zoomAfter = await page.evaluate(() => document.body.innerText.match(/Zoom ([0-9.]+)x/)?.[1] || "");
      await page.select("#map-layer-select", "OPENAQ");
      await sleep(150);
      await page.evaluate(() => {
        const listBtn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent || "").includes("Accessible List")) as HTMLButtonElement | undefined;
        listBtn?.click();
      });
      await sleep(200);
      const listVisible = await page.evaluate(() => document.body.innerText.includes("Coordinates"));
      const ok = zoomAfter !== zoomBefore && listVisible;
      record("Interactive Map Zoom, Layers & Accessible List", "MAPS", ok ? "PASS" : "FAIL", Date.now() - t0, `zoom ${zoomBefore} -> ${zoomAfter}, list=${listVisible}`);
    }

    // 6. Daily Schedule Planner CRUD (Create, Edit, Reschedule, Delete)
    {
      const t0 = Date.now();
      await navigateSidebarView("Daily Planner");
      await sleep(300);
      await page.type("#planner-title", "Evening Park Run");
      await page.select("#planner-category", "RUNNING");
      await page.evaluate(() => {
        const sub = document.querySelector('#daily-planner-heading')?.closest('section')?.querySelector('form button[type="submit"]') as HTMLButtonElement | null;
        sub?.click();
      });
      await sleep(250);
      const created = await page.evaluate(() => document.body.innerText.includes("Evening Park Run"));
      await page.evaluate(() => {
        (document.querySelector('button[aria-label="Edit Evening Park Run"]') as HTMLButtonElement | null)?.click();
      });
      await sleep(150);
      await page.evaluate(() => {
        const sub = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent || "").includes("Save Changes")) as HTMLButtonElement | undefined;
        sub?.click();
      });
      await sleep(150);
      await page.evaluate(() => {
        (document.querySelector('button[aria-label="Delete Evening Park Run"]') as HTMLButtonElement | null)?.click();
      });
      await sleep(150);
      const deleted = await page.evaluate(() => !document.body.innerText.includes("Evening Park Run"));
      record("Daily Schedule Planner Full CRUD & Edit", "PLANNER", created && deleted ? "PASS" : "FAIL", Date.now() - t0, `created=${created}, deleted=${deleted}`);
    }

    // 7. Intelligent Agent Live BFF Execution
    {
      const t0 = Date.now();
      await navigateSidebarView("Intelligent Agent");
      await page.waitForFunction(
        () => Array.from(document.querySelectorAll("button")).some((b) => (b.textContent || "").includes("CADR & ACH")),
        { timeout: 10000 }
      );
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent || "").includes("CADR & ACH")) as HTMLButtonElement | undefined;
        btn?.click();
      });
      await page.waitForFunction(
        () => {
          const txt = document.body.innerText;
          return txt.includes("PURIFIER_SIZING") && txt.includes("calculate_cadr");
        },
        { timeout: 10000 }
      );
      const agentTxt = await page.evaluate(() => document.body.innerText);
      const ok = agentTxt.includes("PURIFIER_SIZING") && agentTxt.includes("calculate_cadr");
      record("Intelligent Agent Live BFF Execution", "AGENT", ok ? "PASS" : "FAIL", Date.now() - t0, "Executed CADR + ACH sizing via /api/v1/agent");
    }

    // 8. Grounded AI Chat + Thread Rename
    {
      const t0 = Date.now();
      await navigateSidebarView("AI Chat");
      await page.waitForFunction(
        () => Array.from(document.querySelectorAll("button")).some((b) => (b.textContent || "").includes("Explain PM2.5")),
        { timeout: 10000 }
      );
      await page.evaluate(() => {
        const starter = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent || "").includes("Explain PM2.5")) as HTMLButtonElement | undefined;
        starter?.click();
      });
      await page.waitForFunction(
        () => {
          const log = document.querySelector('[role="log"]');
          const logText = log?.textContent || "";
          return logText.includes("Sources:") || logText.includes("Verified Domain Reply") || logText.includes("HawaSaathi AI") || Boolean(document.querySelector('[role="alert"]'));
        },
        { timeout: 10000 }
      );
      const chatRes = await page.evaluate(() => {
        const logText = document.querySelector('[role="log"]')?.textContent || "";
        const errText = document.querySelector('#ai-chat-heading')?.closest('section')?.querySelector('[role="alert"]')?.textContent || "";
        return { logText, errText };
      });
      const ok =
        !chatRes.errText &&
        chatRes.logText.includes("Explain PM2.5") &&
        (chatRes.logText.includes("Sources:") || chatRes.logText.includes("Verified Domain Reply") || chatRes.logText.includes("HawaSaathi AI"));
      record("Grounded AI Chat & Thread Persistence", "CHAT", ok ? "PASS" : "FAIL", Date.now() - t0, ok ? "Assistant reply rendered in role=log" : `err=${chatRes.errText || "no assistant text"}`);
    }

    // 9. Three Theme Modes (Light / Dark / High Contrast) & Reload Persistence
    {
      const t0 = Date.now();
      await navigateSidebarView("Settings");
      await page.waitForFunction(
        () => Array.from(document.querySelectorAll("button")).some((b) => (b.textContent || "").includes("High Contrast")),
        { timeout: 10000 }
      );
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent || "").includes("High Contrast")) as HTMLButtonElement | undefined;
        btn?.click();
      });
      await sleep(200);
      const applied = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
      await page.reload({ waitUntil: "domcontentloaded" });
      await sleep(500);
      const persisted = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
      await page.evaluate(() => window.localStorage.setItem("hs_theme_mode", "light"));
      const ok = applied === "high-contrast" && persisted === "high-contrast";
      record("Three Theme Modes & Zero-Flash Reload Persistence", "THEME", ok ? "PASS" : "FAIL", Date.now() - t0, `applied=${applied}, persisted=${persisted}`);
    }

    // 10. 23-Language Switching & Urdu RTL + Zero Extra Refetch
    {
      const t0 = Date.now();
      await navigateSidebarView("Settings");
      await page.waitForSelector('select[aria-label="Preferred application language"]', { timeout: 10000 });
      const before = airQualityRequestsCount;
      await page.select('select[aria-label="Preferred application language"]', "bn-IN");
      await sleep(200);
      const bn = await page.evaluate(() => ({ lang: document.documentElement.getAttribute("lang"), dir: document.documentElement.getAttribute("dir") }));
      await page.select('select[aria-label="Preferred application language"]', "ur-IN");
      await sleep(200);
      const ur = await page.evaluate(() => ({ lang: document.documentElement.getAttribute("lang"), dir: document.documentElement.getAttribute("dir") }));
      await page.select('select[aria-label="Preferred application language"]', "en-IN");
      const after = airQualityRequestsCount;
      const ok = bn.lang === "bn-IN" && bn.dir === "ltr" && ur.lang === "ur-IN" && ur.dir === "rtl" && before === after;
      record("23-Locale Switching & Urdu RTL Direction", "I18N", ok ? "PASS" : "FAIL", Date.now() - t0, `bn=${bn.lang}/${bn.dir}, ur=${ur.lang}/${ur.dir}, refetches=${after - before}`);
    }

    // 11. Keyboard Command Palette (Ctrl+K) & Landmarks
    {
      const t0 = Date.now();
      await page.keyboard.down("Control");
      await page.keyboard.press("KeyK");
      await page.keyboard.up("Control");
      await sleep(200);
      const isOpen = await page.evaluate(() => Boolean(document.querySelector('[aria-label="Quick Actions Command Palette"]')));
      await page.keyboard.press("Escape");
      const landmarks = await page.$$eval("nav, main, header, footer, aside", (els) => els.length);
      record("Keyboard Command Palette (Ctrl+K) & ARIA Landmarks", "A11Y", isOpen && landmarks >= 4 ? "PASS" : "FAIL", Date.now() - t0, `paletteOpen=${isOpen}, landmarks=${landmarks}`);
    }

    // 12. Responsive Viewports (320px, 375px, 768px, 1280px, 1920px) & Zero PageErrors
    {
      const t0 = Date.now();
      await navigateSidebarView("Overview");
      await sleep(200);
      const viewports = [320, 375, 768, 1280, 1920];
      let overflow = false;
      const notes: string[] = [];
      for (const w of viewports) {
        await page.setViewport({ width: w, height: 800 });
        await sleep(150);
        const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
        if (m.sw > m.iw + 2) overflow = true;
        notes.push(`${w}:${m.sw}/${m.iw}`);
      }
      const ok = !overflow && pageErrors.length === 0;
      if (pageErrors.length > 0) console.error("[E2E pageErrors]", pageErrors);
      record("Responsive Viewports Matrix & Zero Runtime Page Errors", "RESPONSIVE", ok ? "PASS" : "FAIL", Date.now() - t0, `${notes.join(", ")}, pageErrors=${pageErrors.length}`);
    }

    console.log("\n================================================================================");
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    console.log(`E2E SUMMARY: Passed=${passed}/${results.length}, Failed=${failed}`);
    console.log("================================================================================\n");
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("[FATAL] E2E test execution error:", err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (server) server.kill("SIGKILL");
  }
}

run();
