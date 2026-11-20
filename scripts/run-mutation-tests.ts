/**
 * HawaSaathi Domain Core Mutation Testing Harness
 * 
 * Verifies the sensitivity and kill-rate of the test suite against 16 selected
 * critical domain, statutory, arithmetic, and life-safety mutations.
 * 
 * Hardening Guarantees:
 * 1. Target-Specific Test Execution: Runs tests specifically targeting the mutated unit.
 * 2. Source-File Cryptographic Integrity: Validates SHA-256 before mutation and verifies
 *    restoration to the exact byte-for-byte state after test execution.
 * 3. Execution Timeout Protection: Terminates any test run that exceeds 10,000ms.
 * 4. Process Interruption Trapping: Handles SIGINT, SIGTERM, and unhandled exceptions
 *    to guarantee no source file remains mutated on disk.
 * 5. Explicit Classification: Explicitly labeled as Targeted Domain Mutation Verification,
 *    not a comprehensive AST-wide mutation score.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

interface MutationTarget {
  file: string;
  targetTest: string;
  description: string;
  find: string | RegExp;
  replace: string;
  mutantType: "BOUNDARY" | "ARITHMETIC" | "LOGICAL" | "CONSTANT" | "EQUALITY";
}

const MUTATIONS: MutationTarget[] = [
  // 1. running-window.ts mutations
  {
    file: "src/domain/cpcb/running-window.ts",
    targetTest: "tests/unit/cpcb/running-window.test.ts",
    description: "Mutate 24h statutory required hours from 16 to 15",
    find: "requiredHours = 16;",
    replace: "requiredHours = 15;",
    mutantType: "CONSTANT"
  },
  {
    file: "src/domain/cpcb/running-window.ts",
    targetTest: "tests/unit/cpcb/running-window.test.ts",
    description: "Mutate 24h statutory required hours from 16 to 17",
    find: "requiredHours = 16;",
    replace: "requiredHours = 17;",
    mutantType: "CONSTANT"
  },
  {
    file: "src/domain/cpcb/running-window.ts",
    targetTest: "tests/unit/cpcb/running-window.test.ts",
    description: "Mutate 8h secondary adapted required hours from 6 to 5",
    find: "requiredHours = 6;",
    replace: "requiredHours = 5;",
    mutantType: "CONSTANT"
  },
  {
    file: "src/domain/cpcb/running-window.ts",
    targetTest: "tests/unit/cpcb/running-window.test.ts",
    description: "Mutate sufficiency boundary operator from >= to >",
    find: "validHoursInWindow >= requiredHours",
    replace: "validHoursInWindow > requiredHours",
    mutantType: "BOUNDARY"
  },

  // 2. sub-index-calculator.ts mutations
  {
    file: "src/domain/cpcb/sub-index-calculator.ts",
    targetTest: "tests/unit/cpcb/sub-index.test.ts",
    description: "Mutate negative concentration rejection operator from cp < 0 to cp <= 0",
    find: "cp < 0",
    replace: "cp <= 0",
    mutantType: "BOUNDARY"
  },
  {
    file: "src/domain/cpcb/sub-index-calculator.ts",
    targetTest: "tests/unit/cpcb/sub-index.test.ts",
    description: "Mutate Ozone 1h acute spike threshold from cp <= 208 to cp < 208",
    find: "measurement.averagingWindowHours === 1 && cp <= 208",
    replace: "measurement.averagingWindowHours === 1 && cp < 208",
    mutantType: "BOUNDARY"
  },
  {
    file: "src/domain/cpcb/sub-index-calculator.ts",
    targetTest: "tests/unit/cpcb/sub-index.test.ts",
    description: "Mutate extreme concentration cap from 500 to 450",
    find: "subIndex: 500,",
    replace: "subIndex: 450,",
    mutantType: "CONSTANT"
  },
  {
    file: "src/domain/cpcb/sub-index-calculator.ts",
    targetTest: "tests/unit/cpcb/sub-index.test.ts",
    description: "Invert interpolation numerator subtraction from (bp.aqiHi - bp.aqiLo) to (bp.aqiHi + bp.aqiLo)",
    find: "bp.aqiHi - bp.aqiLo",
    replace: "bp.aqiHi + bp.aqiLo",
    mutantType: "ARITHMETIC"
  },
  {
    file: "src/domain/cpcb/sub-index-calculator.ts",
    targetTest: "tests/unit/cpcb/sub-index.test.ts",
    description: "Mutate continuous breakpoint interval matching from cp >= bp.boundaryLo to cp > bp.boundaryLo",
    find: "cp >= bp.boundaryLo && cp <= bp.boundaryHi",
    replace: "cp > bp.boundaryLo && cp <= bp.boundaryHi",
    mutantType: "BOUNDARY"
  },

  // 3. cpcb-engine.ts mutations
  {
    file: "src/domain/cpcb/cpcb-engine.ts",
    targetTest: "tests/unit/cpcb/cpcb-engine.test.ts",
    description: "Mutate minimum required unique pollutants from 3 to 2",
    find: "distinctValidPollutants.size >= 3",
    replace: "distinctValidPollutants.size >= 2",
    mutantType: "CONSTANT"
  },
  {
    file: "src/domain/cpcb/cpcb-engine.ts",
    targetTest: "tests/unit/cpcb/cpcb-engine.test.ts",
    description: "Invert particulate requirement from (PM2.5 || PM10) to (PM2.5 && PM10)",
    find: 'distinctValidPollutants.has("PM2.5") || distinctValidPollutants.has("PM10")',
    replace: 'distinctValidPollutants.has("PM2.5") && distinctValidPollutants.has("PM10")',
    mutantType: "LOGICAL"
  },
  {
    file: "src/domain/cpcb/cpcb-engine.ts",
    targetTest: "tests/unit/cpcb/cpcb-engine.test.ts",
    description: "Invert cross-station equality from m.stationId !== stationId to m.stationId === stationId",
    find: "m.stationId && m.stationId !== stationId",
    replace: "m.stationId && m.stationId === stationId",
    mutantType: "EQUALITY"
  },

  // 4. safety-guardrails.ts mutations
  {
    file: "src/domain/rules/safety-guardrails.ts",
    targetTest: "tests/unit/rules/safety-guardrails.test.ts",
    description: "Mutate Severe active mobility condition from BICYCLING to TENNIS",
    find: 'act.transitMode === "BICYCLING"',
    replace: 'act.transitMode === "METRO_TRAIN"',
    mutantType: "EQUALITY"
  },
  {
    file: "src/domain/rules/safety-guardrails.ts",
    targetTest: "tests/unit/rules/safety-guardrails.test.ts",
    description: "Mutate Very Poor outdoor physical exertion check from VIGOROUS to RESTING_SEDENTARY",
    find: 'act.physicalIntensity === "VIGOROUS"',
    replace: 'act.physicalIntensity === "RESTING_SEDENTARY"',
    mutantType: "EQUALITY"
  },

  // 5. ventilation-decision.ts mutations
  {
    file: "src/domain/indoor/ventilation-decision.ts",
    targetTest: "tests/unit/indoor/indoor-coach.test.ts",
    description: "Mutate life-safety combustion override from EXHAUST_LOCALIZED_BURST to KEEP_SEALED",
    find: 'windowAction: "EXHAUST_LOCALIZED_BURST",',
    replace: 'windowAction: "KEEP_SEALED",',
    mutantType: "CONSTANT"
  },
  {
    file: "src/domain/indoor/ventilation-decision.ts",
    targetTest: "tests/unit/indoor/indoor-coach.test.ts",
    description: "Invert combustion safety flag from true to false",
    find: "indoorCombustionOverrideActive: true,",
    replace: "indoorCombustionOverrideActive: false,",
    mutantType: "LOGICAL"
  }
];

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf-8").digest("hex");
}

let activeCleanup: (() => void) | null = null;

// Interruption handlers to ensure working copy is restored
function setupSignalHandlers() {
  const cleanupAndExit = (signal: string) => {
    if (activeCleanup) {
      console.warn(`\n[WARN] Interrupted by ${signal}. Restoring source file...`);
      activeCleanup();
      activeCleanup = null;
    }
    process.exit(130);
  };

  process.on("SIGINT", () => cleanupAndExit("SIGINT"));
  process.on("SIGTERM", () => cleanupAndExit("SIGTERM"));
  process.on("uncaughtException", (err) => {
    console.error("\n[FATAL] Uncaught exception:", err);
    if (activeCleanup) {
      activeCleanup();
      activeCleanup = null;
    }
    process.exit(1);
  });
}

function runMutations() {
  console.log("================================================================================");
  console.log("  HAWASAATHI TARGETED DOMAIN MUTATION VERIFICATION SUITE");
  console.log("  (Verification of 16 Selected Critical Domain Mutations, Not Full AST Score)");
  console.log("================================================================================\n");

  setupSignalHandlers();

  let killed = 0;
  let survived = 0;
  const results: { description: string; type: string; status: "KILLED" | "SURVIVED"; details: string }[] = [];

  for (let i = 0; i < MUTATIONS.length; i++) {
    const m = MUTATIONS[i]!;
    const filePath = path.resolve(process.cwd(), m.file);
    const originalContent = fs.readFileSync(filePath, "utf-8");
    const preMutationHash = sha256(originalContent);

    if (!originalContent.includes(typeof m.find === "string" ? m.find : "")) {
      console.error(`[ERROR] Target string not found in ${m.file} for mutation: ${m.description}`);
      process.exit(1);
    }

    const mutatedContent = originalContent.replace(m.find, m.replace);
    const mutatedHash = sha256(mutatedContent);
    if (preMutationHash === mutatedHash) {
      console.error(`[ERROR] Mutation resulted in identical file hash for ${m.description}`);
      process.exit(1);
    }

    // Register active cleanup callback
    activeCleanup = () => {
      fs.writeFileSync(filePath, originalContent, "utf-8");
    };

    // Apply mutation
    fs.writeFileSync(filePath, mutatedContent, "utf-8");

    let testFailed = false;
    let failureOutput = "";

    try {
      execSync(`npx vitest run ${m.targetTest} --reporter=basic`, {
        cwd: process.cwd(),
        stdio: "pipe",
        encoding: "utf-8",
        timeout: 10000 // 10 second timeout protection
      });
      testFailed = false;
    } catch (err: unknown) {
      testFailed = true;
      if (err && typeof err === "object") {
        if ("stdout" in err) {
          failureOutput = String((err as { stdout: string }).stdout).slice(0, 150).replace(/\n/g, " ");
        } else if ("message" in err) {
          failureOutput = String((err as { message: string }).message).slice(0, 150).replace(/\n/g, " ");
        }
      }
    } finally {
      // Revert immediately and verify post-restoration hash
      fs.writeFileSync(filePath, originalContent, "utf-8");
      const postRestorationHash = sha256(fs.readFileSync(filePath, "utf-8"));
      activeCleanup = null;

      if (postRestorationHash !== preMutationHash) {
        console.error(`[FATAL] Cryptographic hash mismatch after restoration on ${m.file}!`);
        console.error(`  Expected: ${preMutationHash}`);
        console.error(`  Actual:   ${postRestorationHash}`);
        process.exit(1);
      }
    }

    if (testFailed) {
      killed++;
      results.push({
        description: m.description,
        type: m.mutantType,
        status: "KILLED",
        details: failureOutput || "Tests caught the injected mutant."
      });
      console.log(`[MUTANT #${i + 1}] KILLED (${m.mutantType}): ${m.description}`);
    } else {
      survived++;
      results.push({
        description: m.description,
        type: m.mutantType,
        status: "SURVIVED",
        details: "WARNING: Tests passed despite mutant!"
      });
      console.log(`[MUTANT #${i + 1}] SURVIVED (${m.mutantType}): ${m.description}`);
    }
  }

  const score = Math.round((killed / MUTATIONS.length) * 100);

  console.log("\n================================================================================");
  console.log("                   TARGETED MUTATION VERIFICATION SUMMARY");
  console.log("================================================================================");
  console.log(`Total Target Mutants Tested : ${MUTATIONS.length}`);
  console.log(`Mutants Killed              : ${killed}`);
  console.log(`Mutants Survived            : ${survived}`);
  console.log(`Kill Rate on Selected Set   : ${score}%`);
  console.log("Classification              : Selected Domain Verification (Not Full AST Score)");
  console.log("================================================================================\n");

  if (survived > 0) {
    console.error(`FAILURE: ${survived} mutants survived! Test suite needs hardening.`);
    process.exit(1);
  } else {
    console.log("SUCCESS: 100% of targeted domain mutants were successfully KILLED by the test suite!");
  }
}

runMutations();
