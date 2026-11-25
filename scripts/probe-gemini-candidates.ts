// SPDX-License-Identifier: Apache-2.0
/**
 * scripts/probe-gemini-candidates.ts
 * Probes official candidate models from ListModels with minimal structured probe.
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

interface ModelInfo {
  name: string;
  version?: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
  inputTokenLimit?: number;
  outputTokenLimit?: number;
}

async function getCandidateMetadata(apiKey: string): Promise<ModelInfo[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`ListModels failed with HTTP ${res.status}`);
  }
  const data = (await res.json()) as { models?: ModelInfo[] };
  return (data.models || []).filter(
    (m) =>
      m.supportedGenerationMethods?.includes("generateContent") &&
      !m.name.includes("embedding") &&
      !m.name.includes("imagen") &&
      !m.name.includes("tts")
  );
}

async function probeModel(apiKey: string, modelId: string): Promise<{
  model: string;
  httpStatus: number;
  latencyMs: number;
  success: boolean;
  response?: string;
  error?: string;
}> {
  const cleanId = modelId.replace(/^models\//, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanId}:generateContent?key=${apiKey}`;
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: 'Respond with valid JSON: {"status":"healthy"}' }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 30
        }
      })
    });
    const latencyMs = Date.now() - start;
    const text = await res.text();
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {}

    if (res.ok) {
      const candidates = (parsed as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates;
      const responseText = candidates?.[0]?.content?.parts?.[0]?.text;
      return {
        model: cleanId,
        httpStatus: res.status,
        latencyMs,
        success: true,
        response: responseText || text.slice(0, 100)
      };
    } else {
      const errMsg = (parsed as { error?: { message?: string } })?.error?.message || text.slice(0, 200);
      return {
        model: cleanId,
        httpStatus: res.status,
        latencyMs,
        success: false,
        error: errMsg
      };
    }
  } catch (err: unknown) {
    return {
      model: cleanId,
      httpStatus: 0,
      latencyMs: Date.now() - start,
      success: false,
      error: String(err)
    };
  }
}

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No GEMINI_API_KEY found");
    process.exit(1);
  }

  console.log("=== Querying ListModels ===");
  const allModels = await getCandidateMetadata(apiKey);
  console.log(`Discovered ${allModels.length} candidate models supporting generateContent.`);

  // Shortlist up to 3 models:
  // 1. Primary configured model: gemini-3.8-flash
  // 2. gemini-3.5-flash-lite (explicitly suggested by Google API error message)
  // 3. gemini-3.5-flash (stable 3.5 flash generation model)
  const candidatesToProbe = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.5-flash"];

  console.log("\n=== Probing Candidate Models ===");
  for (const modelId of candidatesToProbe) {
    const meta = allModels.find((m) => m.name === `models/${modelId}` || m.name === modelId);
    console.log(`\nCandidate: ${modelId}`);
    if (meta) {
      console.log(`  Display Name: ${meta.displayName}`);
      console.log(`  Input Tokens Limit: ${meta.inputTokenLimit}, Output: ${meta.outputTokenLimit}`);
    } else {
      console.log(`  Metadata: Not explicitly in filtered ListModels`);
    }

    const probeResult = await probeModel(apiKey, modelId);
    console.log(`  HTTP Status: ${probeResult.httpStatus} (${probeResult.latencyMs}ms)`);
    console.log(`  Success: ${probeResult.success}`);
    if (probeResult.success) {
      console.log(`  Response: ${probeResult.response}`);
    } else {
      console.log(`  Error: ${probeResult.error}`);
    }
  }
}

run().catch(console.error);
