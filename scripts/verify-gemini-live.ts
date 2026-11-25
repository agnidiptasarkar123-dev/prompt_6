// SPDX-License-Identifier: Apache-2.0
/**
 * scripts/verify-gemini-live.ts
 * Rigorous Gemini API Live Verification with bounded retries, exponential backoff,
 * model availability inspection, and error classification.
 * DOES NOT print or expose API keys.
 */

import fs from "node:fs";
import path from "node:path";

function loadEnv() {
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
}

loadEnv();

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listOfficialModels(apiKey: string): Promise<{ success: boolean; models?: string[]; error?: string }> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}: ${await res.text()}` };
    }
    const data = (await res.json()) as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> };
    const modelNames = (data.models || [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""));
    return { success: true, models: modelNames };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function testGeminiRestWithRetry(apiKey: string, model: string, maxRetries = 3) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const attempts: Array<{ attempt: number; delayMs: number; status: string; httpCode: number; latencyMs: number; error?: string; response?: unknown }> = [];

  for (let i = 1; i <= maxRetries; i++) {
    const delayMs = i === 1 ? 0 : Math.pow(2, i - 1) * 1000;
    if (delayMs > 0) {
      await sleep(delayMs);
    }
    const start = Date.now();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: 'Return {"status":"ok"} in JSON' }] }]
        })
      });
      const latencyMs = Date.now() - start;
      const text = await res.text();
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(text);
      } catch {}

      if (res.ok) {
        attempts.push({
          attempt: i,
          delayMs,
          status: "SUCCESS",
          httpCode: res.status,
          latencyMs,
          response: parsed
        });
        return { success: true, attempts, finalResponse: parsed };
      } else {
        attempts.push({
          attempt: i,
          delayMs,
          status: "FAILED",
          httpCode: res.status,
          latencyMs,
          error: (parsed as { error?: { message?: string } })?.error?.message || text.slice(0, 200)
        });
      }
    } catch (err: unknown) {
      attempts.push({
        attempt: i,
        delayMs,
        status: "FAILED",
        httpCode: 0,
        latencyMs: Date.now() - start,
        error: String(err)
      });
    }
  }

  return { success: false, attempts };
}

async function run() {
  console.log("================================================================================");
  console.log("             HAWASAATHI GEMINI LIVE VERIFICATION & FALLBACK AUDIT               ");
  console.log("================================================================================\n");

  const apiKey = process.env.GEMINI_API_KEY;
  const configuredModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  console.log(`[CONFIG] Configured Model: ${configuredModel}`);
  console.log(`[CONFIG] GEMINI_API_KEY present: ${Boolean(apiKey)} (Length: ${apiKey?.length || 0} chars)`);

  if (!apiKey) {
    console.log("[ERROR] GEMINI_API_KEY is not configured.");
    return;
  }

  // Step 1: List officially supported models on this API key
  console.log("\n--- STEP 1: OFFICIAL GOOGLE API MODEL AVAILABILITY CHECK ---");
  const modelsCheck = await listOfficialModels(apiKey);
  if (modelsCheck.success && modelsCheck.models) {
    console.log(`[PASS] Successfully queried Google API ListModels. Total generation models available: ${modelsCheck.models.length}`);
    const isConfiguredListed = modelsCheck.models.includes(configuredModel);
    console.log(`[CHECK] Is '${configuredModel}' in official supported models list? ${isConfiguredListed ? "YES (OFFICIALLY SUPPORTED)" : "NO"}`);
    const sampleModels = modelsCheck.models.filter((m) => m.includes("flash")).slice(0, 8);
    console.log(`[INFO] Sample officially available models: ${sampleModels.join(", ")}`);
  } else {
    console.log(`[FAIL] Could not retrieve models list: ${modelsCheck.error}`);
  }

  // Step 2: Retry with bounded exponential backoff
  console.log("\n--- STEP 2: BOUNDED RETRY GENERATION REQUEST ---");
  const genResult = await testGeminiRestWithRetry(apiKey, configuredModel, 3);
  for (const att of genResult.attempts) {
    console.log(`Attempt ${att.attempt} (backoff ${att.delayMs}ms): HTTP ${att.httpCode}, Latency ${att.latencyMs}ms, Details: ${att.error || "OK"}`);
  }

  if (genResult.success) {
    console.log(`[RESULT] Gemini live generation SUCCEEDED on attempt ${genResult.attempts.length}.`);
  } else {
    console.log(`[RESULT] Gemini live generation FAILED across all 3 bounded retry attempts.`);
    const lastError = genResult.attempts[genResult.attempts.length - 1];
    if (lastError?.httpCode === 503) {
      console.log(`[CLASSIFICATION] HTTP 503 UNAVAILABLE: Model is valid and recognized, but Google API reports high demand/capacity spike.`);
      console.log(`[STATUS] EXTERNALLY BLOCKED (Never marked as PASS).`);
    } else if (lastError?.httpCode === 429) {
      console.log(`[CLASSIFICATION] HTTP 429 RESOURCE_EXHAUSTED: API quota limit reached.`);
      console.log(`[STATUS] EXTERNALLY BLOCKED (Quota Exhaustion).`);
    } else {
      console.log(`[CLASSIFICATION] HTTP ${lastError?.httpCode}: ${lastError?.error}`);
    }
  }

  console.log("\n================================================================================");
}

run();
