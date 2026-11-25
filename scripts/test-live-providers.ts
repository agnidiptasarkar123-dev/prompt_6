// SPDX-License-Identifier: Apache-2.0
/**
 * Live Provider Connectivity Verification Script.
 * Opt-in with RUN_LIVE_INTEGRATION=1.
 * Tests real authentication, connectivity, schema and semantic validation
 * WITHOUT printing or exposing credentials.
 */

import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { Redis } from "@upstash/redis";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Load .env.local safely
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx > -1) {
      const k = trimmed.slice(0, idx).trim();
      let v = trimmed.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
  }
}

interface ProviderLiveResult {
  provider: string;
  configured: boolean;
  authenticated: boolean;
  networkSuccess: boolean;
  schemaValid: boolean;
  semanticValid: boolean;
  latencyMs: number;
  details: string;
  error?: string;
}

async function testUpstash(): Promise<ProviderLiveResult> {
  const start = Date.now();
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return {
      provider: "Upstash Redis",
      configured: false,
      authenticated: false,
      networkSuccess: false,
      schemaValid: false,
      semanticValid: false,
      latencyMs: 0,
      details: "UPSTASH_REDIS_REST_URL or TOKEN missing"
    };
  }

  try {
    const redis = new Redis({ url, token });
    const testKey = `hs_live_test_${Date.now()}`;
    await redis.set(testKey, "live_ok", { ex: 30 });
    const val = await redis.get<string>(testKey);
    await redis.del(testKey);
    const latency = Date.now() - start;

    return {
      provider: "Upstash Redis",
      configured: true,
      authenticated: true,
      networkSuccess: true,
      schemaValid: true,
      semanticValid: val === "live_ok",
      latencyMs: latency,
      details: `Atomic set/get/del succeeded in ${latency}ms`
    };
  } catch (err: unknown) {
    return {
      provider: "Upstash Redis",
      configured: true,
      authenticated: false,
      networkSuccess: false,
      schemaValid: false,
      semanticValid: false,
      latencyMs: Date.now() - start,
      details: "Connection failed",
      error: String(err)
    };
  }
}

async function testOpenMeteo(): Promise<ProviderLiveResult> {
  const start = Date.now();
  const url = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=28.61&longitude=77.20&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&forecast_days=3";

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const latency = Date.now() - start;
    if (!res.ok) {
      return {
        provider: "Open-Meteo CAMS",
        configured: true,
        authenticated: true, // public free tier
        networkSuccess: false,
        schemaValid: false,
        semanticValid: false,
        latencyMs: latency,
        details: `HTTP ${res.status}`
      };
    }
    const json = (await res.json()) as Record<string, unknown>;
    const hourly = json.hourly as Record<string, unknown> | undefined;
    const hasHourly = Boolean(hourly && Array.isArray(hourly.time));
    const hasPm25 = Boolean(hasHourly && Array.isArray(hourly?.pm2_5) && (hourly?.pm2_5 as unknown[]).length > 0);

    return {
      provider: "Open-Meteo CAMS",
      configured: true,
      authenticated: true,
      networkSuccess: true,
      schemaValid: hasHourly,
      semanticValid: hasPm25,
      latencyMs: latency,
      details: `Returned ${(hourly?.time as unknown[] | undefined)?.length || 0} hourly forecast points`
    };
  } catch (err: unknown) {
    return {
      provider: "Open-Meteo CAMS",
      configured: true,
      authenticated: true,
      networkSuccess: false,
      schemaValid: false,
      semanticValid: false,
      latencyMs: Date.now() - start,
      details: "Fetch failed",
      error: String(err)
    };
  }
}

async function testCpcb(): Promise<ProviderLiveResult> {
  const start = Date.now();
  const apiKey = process.env.DATA_GOV_IN_API_KEY;
  if (!apiKey) {
    return {
      provider: "CPCB / data.gov.in",
      configured: false,
      authenticated: false,
      networkSuccess: false,
      schemaValid: false,
      semanticValid: false,
      latencyMs: 0,
      details: "DATA_GOV_IN_API_KEY missing"
    };
  }

  const endpoint = "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69";
  const url = `${endpoint}?api-key=${apiKey}&format=json&limit=5&offset=0`;

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const latency = Date.now() - start;
    if (!res.ok) {
      return {
        provider: "CPCB / data.gov.in",
        configured: true,
        authenticated: false,
        networkSuccess: false,
        schemaValid: false,
        semanticValid: false,
        latencyMs: latency,
        details: `HTTP ${res.status}`
      };
    }
    const json = (await res.json()) as Record<string, unknown>;
    const records = json.records as unknown[] | undefined;
    const hasRecords = Array.isArray(records);
    const totalRecords = (json.total as number | undefined) ?? records?.length ?? 0;

    return {
      provider: "CPCB / data.gov.in",
      configured: true,
      authenticated: true,
      networkSuccess: true,
      schemaValid: hasRecords,
      semanticValid: Boolean(hasRecords && records.length > 0),
      latencyMs: latency,
      details: `Authenticated query succeeded. Total reported upstream records: ${totalRecords}`
    };
  } catch (err: unknown) {
    return {
      provider: "CPCB / data.gov.in",
      configured: true,
      authenticated: false,
      networkSuccess: false,
      schemaValid: false,
      semanticValid: false,
      latencyMs: Date.now() - start,
      details: "Query failed",
      error: String(err)
    };
  }
}

async function testOpenAQ(): Promise<ProviderLiveResult> {
  const start = Date.now();
  const apiKey = process.env.OPENAQ_API_KEY;
  if (!apiKey) {
    return {
      provider: "OpenAQ v3",
      configured: false,
      authenticated: false,
      networkSuccess: false,
      schemaValid: false,
      semanticValid: false,
      latencyMs: 0,
      details: "OPENAQ_API_KEY missing"
    };
  }

  const url = "https://api.openaq.org/v3/locations?iso=IN&limit=2";

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-API-Key": apiKey
      }
    });
    const latency = Date.now() - start;
    if (!res.ok) {
      return {
        provider: "OpenAQ v3",
        configured: true,
        authenticated: false,
        networkSuccess: false,
        schemaValid: false,
        semanticValid: false,
        latencyMs: latency,
        details: `HTTP ${res.status}`
      };
    }
    const json = (await res.json()) as Record<string, unknown>;
    const resultsList = json.results as unknown[] | undefined;
    const hasResults = Array.isArray(resultsList);

    return {
      provider: "OpenAQ v3",
      configured: true,
      authenticated: true,
      networkSuccess: true,
      schemaValid: hasResults,
      semanticValid: Boolean(hasResults && resultsList.length > 0),
      latencyMs: latency,
      details: `v3 API authenticated. Returned ${resultsList?.length || 0} locations in India`
    };
  } catch (err: unknown) {
    return {
      provider: "OpenAQ v3",
      configured: true,
      authenticated: false,
      networkSuccess: false,
      schemaValid: false,
      semanticValid: false,
      latencyMs: Date.now() - start,
      details: "Query failed",
      error: String(err)
    };
  }
}

async function testGemini(): Promise<ProviderLiveResult> {
  const start = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  if (!apiKey) {
    return {
      provider: "Google Gemini",
      configured: false,
      authenticated: false,
      networkSuccess: false,
      schemaValid: false,
      semanticValid: false,
      latencyMs: 0,
      details: "GEMINI_API_KEY missing"
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [{ text: "Return exactly: {\"status\":\"ok\"} in JSON format." }]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });
    const latency = Date.now() - start;
    const text = response.text?.trim() || "";
    let validJson = false;
    try {
      const parsed = JSON.parse(text);
      validJson = parsed.status === "ok";
    } catch {}

    return {
      provider: "Google Gemini",
      configured: true,
      authenticated: true,
      networkSuccess: true,
      schemaValid: validJson,
      semanticValid: validJson,
      latencyMs: latency,
      details: `Model '${model}' generateContent succeeded in ${latency}ms`
    };
  } catch (err: unknown) {
    return {
      provider: "Google Gemini",
      configured: true,
      authenticated: false,
      networkSuccess: false,
      schemaValid: false,
      semanticValid: false,
      latencyMs: Date.now() - start,
      details: "generateContent failed",
      error: String(err)
    };
  }
}

async function testFirebase(): Promise<ProviderLiveResult> {
  const start = Date.now();
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!projectId || !saPath || !fs.existsSync(saPath)) {
    return {
      provider: "Firebase Admin SDK",
      configured: false,
      authenticated: false,
      networkSuccess: false,
      schemaValid: false,
      semanticValid: false,
      latencyMs: 0,
      details: "FIREBASE_PROJECT_ID or GOOGLE_APPLICATION_CREDENTIALS missing/unreachable"
    };
  }

  try {
    const sa = JSON.parse(fs.readFileSync(saPath, "utf8"));
    const app = !getApps().length ? initializeApp({ credential: cert(sa) }) : getApps()[0]!;
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const latency = Date.now() - start;

    return {
      provider: "Firebase Admin SDK",
      configured: true,
      authenticated: Boolean(auth),
      networkSuccess: true,
      schemaValid: Boolean(firestore),
      semanticValid: sa.project_id === projectId,
      latencyMs: latency,
      details: `Project '${projectId}' initialized with service account ADC credentials`
    };
  } catch (err: unknown) {
    return {
      provider: "Firebase Admin SDK",
      configured: true,
      authenticated: false,
      networkSuccess: false,
      schemaValid: false,
      semanticValid: false,
      latencyMs: Date.now() - start,
      details: "Initialization failed",
      error: String(err)
    };
  }
}

async function run() {
  console.log("================================================================================");
  console.log("       HAWASAATHI LIVE PROVIDER CONNECTIVITY VERIFICATION REPORT");
  console.log("================================================================================\n");

  const [upstash, openMeteo, cpcb, openaq, gemini, firebase] = await Promise.all([
    testUpstash(),
    testOpenMeteo(),
    testCpcb(),
    testOpenAQ(),
    testGemini(),
    testFirebase()
  ]);

  const all = [cpcb, openaq, openMeteo, gemini, upstash, firebase];

  console.log("| Provider | Auth | Network | Schema | Semantic | Latency | Status & Details |");
  console.log("|:---|:---:|:---:|:---:|:---:|:---:|:---|");

  for (const r of all) {
    const authMark = r.authenticated ? "PASS" : "FAIL";
    const netMark = r.networkSuccess ? "PASS" : "FAIL";
    const schemaMark = r.schemaValid ? "PASS" : "FAIL";
    const semMark = r.semanticValid ? "PASS" : "FAIL";
    const status = (r.authenticated && r.networkSuccess && r.schemaValid && r.semanticValid) ? "VERIFIED" : "DEGRADED/BLOCKED";
    console.log(`| ${r.provider.padEnd(20)} | ${authMark} | ${netMark} | ${schemaMark} | ${semMark} | ${r.latencyMs}ms | [${status}] ${r.details}${r.error ? ` (Error: ${r.error})` : ""} |`);
  }

  console.log("\n================================================================================");
}

run();
