# HawaSaathi (হাওয়াসাথী / हवासाथী) — Phase 4 Targeted Domain Mutation Report

**Document ID:** `HS-MUT-P4-001`\
**Date:** 2026-11-24\
**Author:** Principal Software Architect & QA Automation Lead\
**Execution Script:** `npm run test:mutation` (`scripts/run-mutation-tests.ts`)\
**Status:** PASS (100% KILLED)\

---

## 1. Objectives & Sandbox Isolation Architecture

Traditional line and branch coverage verifies code execution, but does not prove assertion sensitivity to arithmetic inversions, off-by-one errors, or compromised safety boundaries.

To empirically prove test sensitivity without mutating the repository or leaving persistent file modifications:
1. An isolated temporary sandbox is created in the operating system temp directory (`/var/folders/.../T/hs-mutation-...`).
2. Node dependencies are symlinked.
3. Cryptographic SHA-256 hashes of all 5 target files in the main workspace are calculated before execution.
4. Each mutation is injected strictly into the isolated sandbox file copy.
5. The full Vitest test suite is executed against the mutant.
6. A test failure proves mutant termination (`KILLED`).
7. The temporary sandbox is completely deleted.
8. Workspace hashes are recalculated to confirm 0 modifications to tracked git files.

---

## 2. Targeted Domain Mutation Matrix (20/20 Killed)

| Mutant ID | Category | Target File | Mutation Description | Test Result |
| :--- | :--- | :--- | :--- | :--- |
| `MUT-RW-01` | CONSTANT | `running-window.ts` | Mutate 24h statutory required hours from 16 to 15 | **KILLED** |
| `MUT-RW-02` | CONSTANT | `running-window.ts` | Mutate 24h statutory required hours from 16 to 17 | **KILLED** |
| `MUT-RW-03` | CONSTANT | `running-window.ts` | Mutate 8h secondary adapted required hours from 6 to 5 | **KILLED** |
| `MUT-RW-04` | BOUNDARY | `running-window.ts` | Mutate sufficiency boundary operator from `>=` to `>` | **KILLED** |
| `MUT-CALC-01`| BOUNDARY | `sub-index-calculator.ts` | Mutate negative concentration rejection operator from `cp < 0` to `cp <= 0` | **KILLED** |
| `MUT-CALC-02`| BOUNDARY | `sub-index-calculator.ts` | Mutate Ozone 1h acute spike threshold from `cp <= 208` to `cp < 208` | **KILLED** |
| `MUT-CALC-03`| BOUNDARY | `sub-index-calculator.ts` | Mutate Lead Severe threshold from `cp > 3.5` to `cp > 5.0` | **KILLED** |
| `MUT-CALC-04`| CONSTANT | `sub-index-calculator.ts` | Mutate reporting ceiling cap from 500 to 450 | **KILLED** |
| `MUT-CALC-05`| ARITHMETIC | `sub-index-calculator.ts` | Invert interpolation numerator subtraction from `(bp.aqiHi - bp.aqiLo)` to `(bp.aqiHi + bp.aqiLo)` | **KILLED** |
| `MUT-CALC-06`| ARITHMETIC | `sub-index-calculator.ts` | Invert Severe continuation slope from `(top.aqiHi - top.aqiLo)` to `(top.aqiHi + top.aqiLo)` | **KILLED** |
| `MUT-CALC-07`| BOUNDARY | `sub-index-calculator.ts` | Mutate continuous breakpoint interval matching from `cp >= bp.boundaryLo` to `cp > bp.boundaryLo` | **KILLED** |
| `MUT-ENG-01` | CONSTANT | `cpcb-engine.ts` | Mutate minimum required unique pollutants from 3 to 2 | **KILLED** |
| `MUT-ENG-02` | LOGICAL | `cpcb-engine.ts` | Invert particulate requirement from `(PM2.5 \|\| PM10)` to `(PM2.5 && PM10)` | **KILLED** |
| `MUT-ENG-03` | EQUALITY | `cpcb-engine.ts` | Invert cross-station equality from `m.stationId !== stationId` to `m.stationId === stationId` | **KILLED** |
| `MUT-ENG-04` | SECURITY | `cpcb-engine.ts` | Bypass non-forgeable trusted aggregation boundary check | **KILLED** |
| `MUT-ENG-05` | BOUNDARY | `cpcb-engine.ts` | Mutate conflicting measurement detection threshold from `> 1` to `> 5` | **KILLED** |
| `MUT-GRD-01` | EQUALITY | `safety-guardrails.ts` | Mutate Severe active mobility condition from `BICYCLING` to `METRO_TRAIN` | **KILLED** |
| `MUT-GRD-02` | EQUALITY | `safety-guardrails.ts` | Mutate Very Poor outdoor physical exertion check from `VIGOROUS` to `RESTING_SEDENTARY` | **KILLED** |
| `MUT-VENT-01`| CONSTANT | `ventilation-decision.ts` | Mutate life-safety combustion override from `EXHAUST_LOCALIZED_BURST` to `KEEP_SEALED` | **KILLED** |
| `MUT-VENT-02`| LOGICAL | `ventilation-decision.ts` | Invert combustion safety flag from `true` to `false` | **KILLED** |

---

## 3. Summary & Verification Verdict

- **Total Mutants Tested:** 20
- **Mutants Killed:** 20
- **Mutants Survived:** 0
- **Kill Rate:** **100.0%**
- **Verdict:** All critical domain boundaries, calculation formulas, and safety overrides possess strict assertion sensitivity.
