// SPDX-License-Identifier: Apache-2.0
/**
 * HawaSaathi Domain Core Mutation Testing Harness (Hardened Isolated Runner)
 * 
 * Verifies the sensitivity and kill-rate of the test suite against 20 selected
 * critical domain, statutory, arithmetic, boundary, and life-safety mutations.
 * 
 * Hardening Guarantees:
 * 1. Isolated Temporary Execution: Runs all mutations inside an isolated temporary sandbox
 *    directory in OS temp. The workspace source files in `src/` are NEVER modified on disk.
 * 2. Cryptographic Pre/Post Verification: Computes SHA-256 of all workspace source files
 *    before and after execution, mathematically proving that no mutation leaked to the main repository.
 * 3. Strict Execution Timeout: Enforces a strict 10,000ms timeout protection per mutant test run.
 * 4. Multi-Vector Error Classification: Distinguishes between:
 *    - TEST_ASSERTION_FAILURE (Killed by test assertion)
 *    - SYNTAX_OR_BUILD_ERROR (Killed by compilation/syntax guard)
 *    - TIMEOUT (Killed by execution time boundary)
 *    - SURVIVED (Failure: tests passed despite mutant)
 * 5. Automatic Sandbox Lifecycle: Signal traps (SIGINT, SIGTERM, uncaughtException) and
 *    `finally` block guarantee immediate cleanup of the temporary sandbox.
 * 6. Explicit Labelling: Explicitly catalogued as Targeted Domain Mutation Verification,
 *    not a vanity AST-wide metric.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

export interface MutationTarget {
  id: string;
  subsystem: string;
  requirement: string;
  file: string;
  targetTest: string;
  description: string;
  find: string;
  replace: string;
  mutantType: "BOUNDARY" | "ARITHMETIC" | "LOGICAL" | "CONSTANT" | "EQUALITY" | "SECURITY";
}

export const MUTATIONS: MutationTarget[] = [
  // ---------------------------------------------------------------------------
  // 1. running-window.ts (Statutory & Adapted Data Sufficiency Windows)
  // ---------------------------------------------------------------------------
  {
    id: "MUT-RW-01",
    subsystem: "Sufficiency Engine",
    requirement: "MoEFCC NAQI Sec 4.1 (16h Rule)",
    file: "src/domain/cpcb/running-window.ts",
    targetTest: "tests/unit/cpcb/running-window.test.ts",
    description: "Mutate 24h statutory required hours from 16 to 15",
    find: "requiredHours = 16;",
    replace: "requiredHours = 15;",
    mutantType: "CONSTANT"
  },
  {
    id: "MUT-RW-02",
    subsystem: "Sufficiency Engine",
    requirement: "MoEFCC NAQI Sec 4.1 (16h Rule)",
    file: "src/domain/cpcb/running-window.ts",
    targetTest: "tests/unit/cpcb/running-window.test.ts",
    description: "Mutate 24h statutory required hours from 16 to 17",
    find: "requiredHours = 16;",
    replace: "requiredHours = 17;",
    mutantType: "CONSTANT"
  },
  {
    id: "MUT-RW-03",
    subsystem: "Sufficiency Engine",
    requirement: "Adapted 6h Completeness Policy",
    file: "src/domain/cpcb/running-window.ts",
    targetTest: "tests/unit/cpcb/running-window.test.ts",
    description: "Mutate 8h secondary adapted required hours from 6 to 5",
    find: "requiredHours = 6;",
    replace: "requiredHours = 5;",
    mutantType: "CONSTANT"
  },
  {
    id: "MUT-RW-04",
    subsystem: "Sufficiency Engine",
    requirement: "Window Inclusivity Boundary",
    file: "src/domain/cpcb/running-window.ts",
    targetTest: "tests/unit/cpcb/running-window.test.ts",
    description: "Mutate sufficiency boundary operator from >= to >",
    find: "validHoursInWindow >= requiredHours",
    replace: "validHoursInWindow > requiredHours",
    mutantType: "BOUNDARY"
  },

  // ---------------------------------------------------------------------------
  // 2. sub-index-calculator.ts (Mathematical Sub-Index & Breakpoint Logic)
  // ---------------------------------------------------------------------------
  {
    id: "MUT-CALC-01",
    subsystem: "Sub-Index Calculator",
    requirement: "Sensor Validation (Non-negative)",
    file: "src/domain/cpcb/sub-index-calculator.ts",
    targetTest: "tests/unit/cpcb/sub-index.test.ts",
    description: "Mutate negative concentration rejection operator from cp < 0 to cp <= 0",
    find: "cp < 0",
    replace: "cp <= 0",
    mutantType: "BOUNDARY"
  },
  {
    id: "MUT-CALC-02",
    subsystem: "Sub-Index Calculator",
    requirement: "Ozone 1h Acute Eligibility Boundary",
    file: "src/domain/cpcb/sub-index-calculator.ts",
    targetTest: "tests/unit/cpcb/sub-index.test.ts",
    description: "Mutate Ozone 1h acute spike threshold from cp <= 208 to cp < 208",
    find: "measurement.averagingWindowHours === 1 && cp <= 208",
    replace: "measurement.averagingWindowHours === 1 && cp < 208",
    mutantType: "BOUNDARY"
  },
  {
    id: "MUT-CALC-03",
    subsystem: "Sub-Index Calculator",
    requirement: "Lead (Pb) Severe Exclusion Threshold",
    file: "src/domain/cpcb/sub-index-calculator.ts",
    targetTest: "tests/unit/cpcb/sub-index.test.ts",
    description: "Mutate Lead Severe threshold from cp > 3.5 to cp > 5.0",
    find: 'measurement.pollutant === "Pb" && cp > 3.5',
    replace: 'measurement.pollutant === "Pb" && cp > 5.0',
    mutantType: "BOUNDARY"
  },
  {
    id: "MUT-CALC-04",
    subsystem: "Sub-Index Calculator",
    requirement: "Visual Reporting Ceiling Cap",
    file: "src/domain/cpcb/sub-index-calculator.ts",
    targetTest: "tests/unit/cpcb/sub-index.test.ts",
    description: "Mutate reporting ceiling cap from 500 to 450",
    find: "reportingCeilingCappedAqi: 500",
    replace: "reportingCeilingCappedAqi: 450",
    mutantType: "CONSTANT"
  },
  {
    id: "MUT-CALC-05",
    subsystem: "Sub-Index Calculator",
    requirement: "Linear Interpolation Numerator Arithmetic",
    file: "src/domain/cpcb/sub-index-calculator.ts",
    targetTest: "tests/unit/cpcb/sub-index.test.ts",
    description: "Invert interpolation numerator subtraction from (bp.aqiHi - bp.aqiLo) to (bp.aqiHi + bp.aqiLo)",
    find: "bp.aqiHi - bp.aqiLo",
    replace: "bp.aqiHi + bp.aqiLo",
    mutantType: "ARITHMETIC"
  },
  {
    id: "MUT-CALC-06",
    subsystem: "Sub-Index Calculator",
    requirement: "Severe Linear Extension Arithmetic",
    file: "src/domain/cpcb/sub-index-calculator.ts",
    targetTest: "tests/unit/cpcb/sub-index.test.ts",
    description: "Invert Severe continuation slope from (topBreakpoint.aqiHi - topBreakpoint.aqiLo) to (topBreakpoint.aqiHi + topBreakpoint.aqiLo)",
    find: "topBreakpoint.aqiHi - topBreakpoint.aqiLo",
    replace: "topBreakpoint.aqiHi + topBreakpoint.aqiLo",
    mutantType: "ARITHMETIC"
  },
  {
    id: "MUT-CALC-07",
    subsystem: "Sub-Index Calculator",
    requirement: "Continuous Breakpoint Boundary Matching",
    file: "src/domain/cpcb/sub-index-calculator.ts",
    targetTest: "tests/unit/cpcb/sub-index.test.ts",
    description: "Mutate continuous breakpoint interval matching from cp >= bp.boundaryLo to cp > bp.boundaryLo",
    find: "cp >= bp.boundaryLo && cp <= bp.boundaryHi",
    replace: "cp > bp.boundaryLo && cp <= bp.boundaryHi",
    mutantType: "BOUNDARY"
  },

  // ---------------------------------------------------------------------------
  // 3. cpcb-engine.ts (Station-Level AQI, Governance & Aggregation Boundaries)
  // ---------------------------------------------------------------------------
  {
    id: "MUT-ENG-01",
    subsystem: "Station AQI Engine",
    requirement: "3-Pollutant Minimum Sufficiency Rule",
    file: "src/domain/cpcb/cpcb-engine.ts",
    targetTest: "tests/unit/cpcb/cpcb-engine.test.ts",
    description: "Mutate minimum required unique pollutants from 3 to 2",
    find: "distinctValidPollutants.size >= 3",
    replace: "distinctValidPollutants.size >= 2",
    mutantType: "CONSTANT"
  },
  {
    id: "MUT-ENG-02",
    subsystem: "Station AQI Engine",
    requirement: "Mandatory Particulate Rule (PM2.5 or PM10)",
    file: "src/domain/cpcb/cpcb-engine.ts",
    targetTest: "tests/unit/cpcb/cpcb-engine.test.ts",
    description: "Invert particulate requirement from (PM2.5 || PM10) to (PM2.5 && PM10)",
    find: 'distinctValidPollutants.has("PM2.5") || distinctValidPollutants.has("PM10")',
    replace: 'distinctValidPollutants.has("PM2.5") && distinctValidPollutants.has("PM10")',
    mutantType: "LOGICAL"
  },
  {
    id: "MUT-ENG-03",
    subsystem: "Station AQI Engine",
    requirement: "Cross-Station Isolation Boundary",
    file: "src/domain/cpcb/cpcb-engine.ts",
    targetTest: "tests/unit/cpcb/cpcb-engine.test.ts",
    description: "Invert cross-station equality from m.stationId !== stationId to m.stationId === stationId",
    find: "m.stationId && m.stationId !== stationId",
    replace: "m.stationId && m.stationId === stationId",
    mutantType: "EQUALITY"
  },
  {
    id: "MUT-ENG-04",
    subsystem: "Station AQI Engine",
    requirement: "Non-Forgeable Trusted Aggregation Boundary",
    file: "src/domain/cpcb/cpcb-engine.ts",
    targetTest: "tests/unit/cpcb/cpcb-engine.test.ts",
    description: "Bypass non-forgeable trusted aggregation boundary check",
    find: "const hasUnvalidated = measurements.some((m) => !isTrustedAggregatedMeasurement(m));",
    replace: "const hasUnvalidated = measurements.some((m) => false);",
    mutantType: "SECURITY"
  },
  {
    id: "MUT-ENG-05",
    subsystem: "Station AQI Engine",
    requirement: "Duplicate Conflicting Telemetry Rejection",
    file: "src/domain/cpcb/cpcb-engine.ts",
    targetTest: "tests/unit/cpcb/cpcb-engine.test.ts",
    description: "Mutate conflicting measurement detection threshold from > 1 to > 5",
    find: "distinctConcentrations.size > 1",
    replace: "distinctConcentrations.size > 5",
    mutantType: "BOUNDARY"
  },

  // ---------------------------------------------------------------------------
  // 4. safety-guardrails.ts (NCDC Advisory & Physical Exertion Constraints)
  // ---------------------------------------------------------------------------
  {
    id: "MUT-GRD-01",
    subsystem: "Safety Guardrails",
    requirement: "NCDC Severe Active Mobility Prohibition",
    file: "src/domain/rules/safety-guardrails.ts",
    targetTest: "tests/unit/rules/safety-guardrails.test.ts",
    description: "Mutate Severe active mobility condition from BICYCLING to METRO_TRAIN",
    find: 'act.transitMode === "BICYCLING"',
    replace: 'act.transitMode === "METRO_TRAIN"',
    mutantType: "EQUALITY"
  },
  {
    id: "MUT-GRD-02",
    subsystem: "Safety Guardrails",
    requirement: "NCDC Severe Exertion Cessation",
    file: "src/domain/rules/safety-guardrails.ts",
    targetTest: "tests/unit/rules/safety-guardrails.test.ts",
    description: "Mutate Very Poor outdoor physical exertion check from VIGOROUS to RESTING_SEDENTARY",
    find: 'act.physicalIntensity === "VIGOROUS"',
    replace: 'act.physicalIntensity === "RESTING_SEDENTARY"',
    mutantType: "EQUALITY"
  },

  // ---------------------------------------------------------------------------
  // 5. ventilation-decision.ts (Indoor Life-Safety Combustion Overrides)
  // ---------------------------------------------------------------------------
  {
    id: "MUT-VENT-01",
    subsystem: "Indoor Ventilation Coach",
    requirement: "Combustion Life-Safety Exhaust Override",
    file: "src/domain/indoor/ventilation-decision.ts",
    targetTest: "tests/unit/indoor/indoor-coach.test.ts",
    description: "Mutate life-safety combustion override from EXHAUST_LOCALIZED_BURST to KEEP_SEALED",
    find: 'windowAction: "EXHAUST_LOCALIZED_BURST",',
    replace: 'windowAction: "KEEP_SEALED",',
    mutantType: "CONSTANT"
  },
  {
    id: "MUT-VENT-02",
    subsystem: "Indoor Ventilation Coach",
    requirement: "Combustion Life-Safety Flag Invariant",
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

let activeTempDir: string | null = null;

function setupSignalHandlers() {
  const cleanupAndExit = (signal: string) => {
    if (activeTempDir && fs.existsSync(activeTempDir)) {
      console.warn(`\n[WARN] Interrupted by ${signal}. Cleaning up isolated temporary sandbox: ${activeTempDir}`);
      try {
        fs.rmSync(activeTempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors on shutdown
      }
      activeTempDir = null;
    }
    process.exit(130);
  };

  process.on("SIGINT", () => cleanupAndExit("SIGINT"));
  process.on("SIGTERM", () => cleanupAndExit("SIGTERM"));
  process.on("uncaughtException", (err) => {
    console.error("\n[FATAL] Uncaught exception:", err);
    if (activeTempDir && fs.existsSync(activeTempDir)) {
      try {
        fs.rmSync(activeTempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
      activeTempDir = null;
    }
    process.exit(1);
  });
}

function runMutations() {
  console.log("================================================================================");
  console.log("  HAWASAATHI TARGETED DOMAIN MUTATION VERIFICATION SUITE (ISOLATED RUNNER)");
  console.log("  (Verification of 20 Selected Critical Domain Mutations, Not Full AST Score)");
  console.log("================================================================================\n");

  setupSignalHandlers();

  // Step 1: Pre-execution Cryptographic Verification of Workspace
  const workspaceFiles = new Set(MUTATIONS.map((m) => m.file));
  const preWorkspaceHashes = new Map<string, string>();
  for (const relFile of workspaceFiles) {
    const absPath = path.resolve(process.cwd(), relFile);
    const content = fs.readFileSync(absPath, "utf-8");
    preWorkspaceHashes.set(relFile, sha256(content));
  }
  console.log(`[PRE-CHECK] Cryptographic integrity verified for ${workspaceFiles.size} workspace target files.`);

  // Step 2: Create Isolated Temporary Sandbox
  const sandboxId = `hs-mutation-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const tempDir = path.join(os.tmpdir(), sandboxId);
  activeTempDir = tempDir;
  fs.mkdirSync(tempDir, { recursive: true });

  console.log(`[SANDBOX] Initialising isolated sandbox at: ${tempDir}`);
  fs.cpSync(path.resolve(process.cwd(), "src"), path.join(tempDir, "src"), { recursive: true });
  fs.cpSync(path.resolve(process.cwd(), "tests"), path.join(tempDir, "tests"), { recursive: true });
  fs.copyFileSync(path.resolve(process.cwd(), "package.json"), path.join(tempDir, "package.json"));
  fs.copyFileSync(path.resolve(process.cwd(), "tsconfig.json"), path.join(tempDir, "tsconfig.json"));
  fs.copyFileSync(path.resolve(process.cwd(), "vitest.config.ts"), path.join(tempDir, "vitest.config.ts"));

  // Symlink node_modules for zero-copy dependency access
  fs.symlinkSync(path.resolve(process.cwd(), "node_modules"), path.join(tempDir, "node_modules"));
  console.log("[SANDBOX] Ready with linked dependencies. Workspace files in main repo are fully read-only.\n");

  let killed = 0;
  let survived = 0;
  const results: {
    id: string;
    subsystem: string;
    requirement: string;
    type: string;
    description: string;
    status: "KILLED" | "SURVIVED";
    detectionMode: "TEST_ASSERTION_FAILURE" | "SYNTAX_OR_BUILD_ERROR" | "TIMEOUT" | "SURVIVED";
    details: string;
  }[] = [];

  try {
    for (let i = 0; i < MUTATIONS.length; i++) {
      const m = MUTATIONS[i]!;
      const targetFilePath = path.join(tempDir, m.file);
      const originalSandboxContent = fs.readFileSync(targetFilePath, "utf-8");

      if (!originalSandboxContent.includes(m.find)) {
        console.error(`[ERROR] Target string not found in sandbox copy of ${m.file} for ${m.id}: ${m.description}`);
        process.exit(1);
      }

      const mutatedSandboxContent = originalSandboxContent.replace(m.find, m.replace);
      fs.writeFileSync(targetFilePath, mutatedSandboxContent, "utf-8");

      let testFailed = false;
      let detectionMode: "TEST_ASSERTION_FAILURE" | "SYNTAX_OR_BUILD_ERROR" | "TIMEOUT" | "SURVIVED" = "SURVIVED";
      let failureOutput = "";

      try {
        execSync(`npx vitest run ${m.targetTest}`, {
          cwd: tempDir,
          stdio: "pipe",
          encoding: "utf-8",
          timeout: 10000 // Strict 10-second timeout
        });
        testFailed = false;
      } catch (err: unknown) {
        testFailed = true;
        let stdout = "";
        let stderr = "";
        let message = "";

        if (err && typeof err === "object") {
          if ("stdout" in err) stdout = String((err as { stdout: string }).stdout);
          if ("stderr" in err) stderr = String((err as { stderr: string }).stderr);
          if ("message" in err) message = String((err as { message: string }).message);
        }

        const combinedOutput = `${stdout} ${stderr} ${message}`;

        if (combinedOutput.includes("ETIMEDOUT") || message.includes("timed out")) {
          detectionMode = "TIMEOUT";
          failureOutput = "Execution timed out (>10,000ms)";
        } else if (
          combinedOutput.includes("SyntaxError") ||
          combinedOutput.includes("TransformError") ||
          combinedOutput.includes("error TS") ||
          combinedOutput.includes("Failed to resolve")
        ) {
          detectionMode = "SYNTAX_OR_BUILD_ERROR";
          failureOutput = "Transpilation / syntax validation failure";
        } else {
          detectionMode = "TEST_ASSERTION_FAILURE";
          failureOutput = combinedOutput.slice(0, 150).replace(/\n/g, " ");
        }
      } finally {
        // Revert sandbox copy to pristine state for subsequent mutations
        fs.writeFileSync(targetFilePath, originalSandboxContent, "utf-8");
      }

      if (testFailed) {
        killed++;
        results.push({
          id: m.id,
          subsystem: m.subsystem,
          requirement: m.requirement,
          type: m.mutantType,
          description: m.description,
          status: "KILLED",
          detectionMode,
          details: failureOutput || "Tests caught the injected mutant."
        });
        console.log(`[${m.id}] KILLED (${detectionMode}) [${m.mutantType}]: ${m.description}`);
      } else {
        survived++;
        results.push({
          id: m.id,
          subsystem: m.subsystem,
          requirement: m.requirement,
          type: m.mutantType,
          description: m.description,
          status: "SURVIVED",
          detectionMode: "SURVIVED",
          details: "WARNING: Tests passed despite mutant!"
        });
        console.log(`[${m.id}] SURVIVED [${m.mutantType}]: ${m.description}`);
      }
    }
  } finally {
    // Teardown sandbox
    console.log(`\n[SANDBOX] Cleaning up isolated temporary directory: ${tempDir}`);
    fs.rmSync(tempDir, { recursive: true, force: true });
    activeTempDir = null;

    // Step 3: Post-execution Cryptographic Verification of Workspace
    let workspaceUntouched = true;
    for (const [relFile, preHash] of preWorkspaceHashes.entries()) {
      const absPath = path.resolve(process.cwd(), relFile);
      const postHash = sha256(fs.readFileSync(absPath, "utf-8"));
      if (preHash !== postHash) {
        console.error(`[FATAL] Workspace integrity breach! ${relFile} was modified during mutation testing!`);
        workspaceUntouched = false;
      }
    }

    if (workspaceUntouched) {
      console.log(`[POST-CHECK] 100% Cryptographic Match: All ${workspaceFiles.size} workspace files in main repo are strictly untouched.\n`);
    } else {
      process.exit(1);
    }
  }

  const score = Math.round((killed / MUTATIONS.length) * 100);

  console.log("================================================================================");
  console.log("                   TARGETED MUTATION VERIFICATION SUMMARY");
  console.log("================================================================================");
  console.log(`Total Target Mutants Tested : ${MUTATIONS.length}`);
  console.log(`Mutants Killed              : ${killed}`);
  console.log(`Mutants Survived            : ${survived}`);
  console.log(`Kill Rate on Selected Set   : ${score}%`);
  console.log("Classification              : Selected Domain Verification (Not Full AST Score)");
  console.log("Sandbox Isolation           : Ephemeral OS Temp Directory (0 Workspace Modifications)");
  console.log("================================================================================\n");

  if (survived > 0) {
    console.error(`FAILURE: ${survived} mutants survived! Test suite needs hardening.`);
    process.exit(1);
  } else {
    console.log("SUCCESS: 100% of targeted domain mutants were successfully KILLED by the test suite!");
  }
}

runMutations();
