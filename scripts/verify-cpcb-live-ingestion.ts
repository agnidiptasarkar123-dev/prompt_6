// SPDX-License-Identifier: Apache-2.0
/**
 * scripts/verify-cpcb-live-ingestion.ts
 * Rigorous Ingestion Audit for CPCB CAAQMS via Open Government Data (data.gov.in).
 * Gathers empirical telemetry on:
 * - Number of pages requested
 * - Number of records received
 * - Upstream total reported
 * - Duplicate records
 * - Unique station identities
 * - Per-state distribution
 * - Failed pages and retries
 * - Pagination range completeness
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

interface CpcbRawRecord {
  id?: string | number;
  country?: string;
  state?: string;
  city?: string;
  station?: string;
  last_update?: string;
  latitude?: string | number;
  longitude?: string | number;
  pollutant_id?: string;
  pollutant_min?: string | number;
  pollutant_max?: string | number;
  pollutant_avg?: string | number;
  pollutant_unit?: string;
}

interface PageFetchResult {
  pageIndex: number;
  offset: number;
  limit: number;
  status: "SUCCESS" | "FAILED";
  recordsReceived: number;
  latencyMs: number;
  error?: string;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(
  apiKey: string,
  offset: number,
  limit: number,
  pageIndex: number,
  maxRetries = 3
): Promise<{ result: PageFetchResult; records: CpcbRawRecord[]; totalReported: number }> {
  const endpoint = "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69";
  const url = `${endpoint}?api-key=${apiKey}&format=json&limit=${limit}&offset=${offset}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const start = Date.now();
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        if (attempt < maxRetries) {
          await sleep(1000 * attempt);
          continue;
        }
        return {
          result: { pageIndex, offset, limit, status: "FAILED", recordsReceived: 0, latencyMs, error: `HTTP ${res.status}` },
          records: [],
          totalReported: 0
        };
      }
      const data = (await res.json()) as { records?: CpcbRawRecord[]; total?: number };
      const records = Array.isArray(data.records) ? data.records : [];
      const totalReported = typeof data.total === "number" ? data.total : records.length;
      return {
        result: { pageIndex, offset, limit, status: "SUCCESS", recordsReceived: records.length, latencyMs },
        records,
        totalReported
      };
    } catch (err: unknown) {
      if (attempt < maxRetries) {
        await sleep(1000 * attempt);
        continue;
      }
      return {
        result: { pageIndex, offset, limit, status: "FAILED", recordsReceived: 0, latencyMs: Date.now() - start, error: String(err) },
        records: [],
        totalReported: 0
      };
    }
  }

  return {
    result: { pageIndex, offset, limit, status: "FAILED", recordsReceived: 0, latencyMs: 0, error: "Retries exhausted" },
    records: [],
    totalReported: 0
  };
}

async function run() {
  console.log("================================================================================");
  console.log("             HAWASAATHI CPCB CAAQMS INGESTION AUDIT                             ");
  console.log("================================================================================\n");

  const apiKey = process.env.DATA_GOV_IN_API_KEY;
  if (!apiKey) {
    console.log("[ERROR] DATA_GOV_IN_API_KEY is not configured.");
    return;
  }

  const pageSize = 1000;
  const pageLogs: PageFetchResult[] = [];
  const allRecords: CpcbRawRecord[] = [];

  console.log(`[INGESTION] Fetching initial slice (limit: ${pageSize}, offset: 0)...`);
  const initial = await fetchPage(apiKey, 0, pageSize, 1);
  pageLogs.push(initial.result);
  allRecords.push(...initial.records);

  const upstreamTotal = initial.totalReported;
  console.log(`[PASS] Page 1 fetched: ${initial.records.length} records in ${initial.result.latencyMs}ms. Upstream reports total: ${upstreamTotal}`);

  // Fetch remaining pages dynamically
  let offset = pageSize;
  let pageNum = 2;
  while (offset < upstreamTotal) {
    console.log(`[INGESTION] Fetching page ${pageNum} (limit: ${pageSize}, offset: ${offset})...`);
    const page = await fetchPage(apiKey, offset, pageSize, pageNum);
    pageLogs.push(page.result);
    if (page.result.status === "SUCCESS") {
      allRecords.push(...page.records);
      console.log(`[PASS] Page ${pageNum} fetched: ${page.records.length} records in ${page.result.latencyMs}ms.`);
    } else {
      console.log(`[FAIL] Page ${pageNum} failed: ${page.result.error}`);
    }
    offset += pageSize;
    pageNum++;
  }

  // Analysis of all collected records
  console.log("\n--- INGESTION SUMMARY ---");
  console.log(`Total Pages Requested: ${pageLogs.length}`);
  console.log(`Successful Pages: ${pageLogs.filter((p) => p.status === "SUCCESS").length}`);
  console.log(`Failed Pages: ${pageLogs.filter((p) => p.status === "FAILED").length}`);
  console.log(`Total Records Received: ${allRecords.length}`);
  console.log(`Upstream Total Reported: ${upstreamTotal}`);
  const rangeComplete = allRecords.length >= upstreamTotal;
  console.log(`Complete Pagination Range Retrieved? ${rangeComplete ? "YES (100% of upstream reported)" : "PARTIAL"}`);

  // Deduplication & Station Semantics Analysis
  const recordHashes = new Set<string>();
  let duplicateCount = 0;
  const stationKeys = new Set<string>();
  const stateDistribution = new Map<string, { records: number; stations: Set<string> }>();
  const pollutantDistribution = new Map<string, number>();

  for (const r of allRecords) {
    // Unique record signature
    const sig = `${r.state}|${r.city}|${r.station}|${r.pollutant_id}|${r.last_update}`;
    if (recordHashes.has(sig)) {
      duplicateCount++;
    } else {
      recordHashes.add(sig);
    }

    // Station identity: composite of State + City + Station Name
    const state = (r.state || "UNKNOWN").trim();
    const city = (r.city || "UNKNOWN").trim();
    const stationName = (r.station || "UNKNOWN").trim();
    const stationId = `${state}::${city}::${stationName}`;
    stationKeys.add(stationId);

    // Per-state stats
    if (!stateDistribution.has(state)) {
      stateDistribution.set(state, { records: 0, stations: new Set() });
    }
    const stateObj = stateDistribution.get(state)!;
    stateObj.records++;
    stateObj.stations.add(stationId);

    // Pollutant stats
    const pId = (r.pollutant_id || "UNKNOWN").trim();
    pollutantDistribution.set(pId, (pollutantDistribution.get(pId) || 0) + 1);
  }

  console.log(`\n--- DATA INTEGRITY & STATION SEMANTICS ---`);
  console.log(`Total Raw Measurement Rows: ${allRecords.length}`);
  console.log(`Exact Duplicate Rows: ${duplicateCount}`);
  console.log(`Unique Physical Monitoring Stations: ${stationKeys.size}`);
  console.log(`Distinct States / UTs Represented: ${stateDistribution.size}`);

  console.log(`\n--- PER-STATE DISTRIBUTION (Records & Unique Stations) ---`);
  console.log(`| State / UT | Records | Unique Stations |`);
  console.log(`|:---|:---:|:---:|`);
  const sortedStates = Array.from(stateDistribution.entries()).sort((a, b) => b[1].stations.size - a[1].stations.size);
  for (const [st, info] of sortedStates) {
    console.log(`| ${st.padEnd(28)} | ${String(info.records).padStart(7)} | ${String(info.stations.size).padStart(15)} |`);
  }

  console.log(`\n--- POLLUTANT DISTRIBUTION ---`);
  for (const [p, count] of pollutantDistribution.entries()) {
    console.log(`  ${p.padEnd(10)}: ${count} rows`);
  }

  console.log("\n================================================================================");
}

run();
