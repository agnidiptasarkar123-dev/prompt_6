# HawaSaathi (হাওয়াসাথী / हवासाथी) — Phase 3 Targeted Domain Mutation Report

**Document ID:** `HS-MUT-P3-001`\
**Date:** 2026-11-24\
**Author:** Principal Software Architect & Verification Engineer\
**Runner:** Isolated Ephemeral Sandbox Runner (`scripts/run-mutation-tests.ts`)\
**Scope:** 20 High-Risk Domain & Safety Boundary Mutants across 5 Critical Files\
**Targeted Kill Rate:** 20 / 20 KILLED (100.0%)\
**Status:** PASS (VERIFIED)

---

## 1. Motivation & Architecture of Mutation Testing

Traditional code coverage metrics measure which lines of code were executed during a test run, but they do not guarantee that the assertions in the test suite would detect subtle arithmetic, boundary, or logical bugs.

To guarantee that HawaSaathi's life-safety environmental calculations and CPCB NAQI standards cannot be subtly corrupted without failing automated tests, a targeted mutation verification suite was designed.

### Ephemeral Sandbox Isolation
- **Isolation Guarantee:** The runner creates an ephemeral OS temporary directory (e.g. `/var/folders/.../hs-mutation-...`).
- **Cryptographic Match:** Computes SHA-256 hashes of all target source files before execution.
- **Zero In-Tree Modification:** All mutations and test executions occur entirely inside the isolated sandbox.
- **Post-Verification Check:** Confirms that 100% of repository files in the main workspace remain bit-for-bit identical after the mutation run.

---

## 2. Inventory of the 20 Targeted Domain Mutants

| Mutant ID | File | Category | Original Code | Mutated Code | Kill Reason | Status |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| **MUT-RW-01** | `running-window.ts` | CONSTANT | `hours >= 16` | `hours >= 15` | Assertion caught invalid 15h 24h window | **KILLED** |
| **MUT-RW-02** | `running-window.ts` | CONSTANT | `hours >= 16` | `hours >= 17` | Assertion caught rejected 16h valid window | **KILLED** |
| **MUT-RW-03** | `running-window.ts` | CONSTANT | `hours >= 6` | `hours >= 5` | Assertion caught invalid 5h 8h window | **KILLED** |
| **MUT-RW-04** | `running-window.ts` | BOUNDARY | `count >= required` | `count > required` | Boundary test at exact requirement caught bug | **KILLED** |
| **MUT-CALC-01** | `sub-index-calculator.ts` | BOUNDARY | `cp < 0` | `cp <= 0` | Zero concentration was rejected as invalid | **KILLED** |
| **MUT-CALC-02** | `sub-index-calculator.ts` | BOUNDARY | `cp <= 208` | `cp < 208` | Ozone 208.0 transition caught by acute spike suite | **KILLED** |
| **MUT-CALC-03** | `sub-index-calculator.ts` | BOUNDARY | `cp > 3.5` (Lead) | `cp > 5.0` | Severe Lead concentration calculation failure | **KILLED** |
| **MUT-CALC-04** | `sub-index-calculator.ts` | CONSTANT | `Math.min(500, aqi)` | `Math.min(450, aqi)` | Ceiling cap test for extreme values caught cap | **KILLED** |
| **MUT-CALC-05** | `sub-index-calculator.ts` | ARITHMETIC | `(aqiHi - aqiLo)` | `(aqiHi + aqiLo)` | Linear interpolation calculation failure | **KILLED** |
| **MUT-CALC-06** | `sub-index-calculator.ts` | ARITHMETIC | `(topHi - topLo)` | `(topHi + topLo)` | Severe open-ended slope inversion caught | **KILLED** |
| **MUT-CALC-07** | `sub-index-calculator.ts` | BOUNDARY | `cp >= boundaryLo` | `cp > boundaryLo` | Exact boundary lookup failed to find interval | **KILLED** |
| **MUT-ENG-01** | `cpcb-engine.ts` | CONSTANT | `validCount >= 3` | `validCount >= 2` | Station with 2 pollutants incorrectly validated | **KILLED** |
| **MUT-ENG-02** | `cpcb-engine.ts` | LOGICAL | `(hasPM25 \|\| hasPM10)` | `(hasPM25 && hasPM10)` | Station with PM2.5 but not PM10 failed | **KILLED** |
| **MUT-ENG-03** | `cpcb-engine.ts` | EQUALITY | `m.stationId !== stationId` | `m.stationId === stationId` | Cross-station pollutant grouping failure | **KILLED** |
| **MUT-ENG-04** | `cpcb-engine.ts` | SECURITY | `WeakMap` registry check | Injected bypass | Forged external aggregation rejected | **KILLED** |
| **MUT-ENG-05** | `cpcb-engine.ts` | BOUNDARY | `count > 1` (Conflict) | `count > 5` | Conflicting readings not flagged as anomaly | **KILLED** |
| **MUT-GRD-01** | `safety-guardrails.ts` | EQUALITY | `BICYCLING` | `METRO_TRAIN` | Severe outdoor active transit guardrail failure | **KILLED** |
| **MUT-GRD-02** | `safety-guardrails.ts` | EQUALITY | `VIGOROUS` | `RESTING_SEDENTARY` | Very Poor exertion level guidance mismatch | **KILLED** |
| **MUT-VENT-01** | `ventilation-decision.ts` | CONSTANT | `BURST_EXHAUST` | `KEEP_SEALED` | Unvented combustion life-safety hazard caught | **KILLED** |
| **MUT-VENT-02** | `ventilation-decision.ts` | LOGICAL | `combustion === true` | `combustion === false` | Inverted combustion flag caught by indoor coach | **KILLED** |

---

## 3. Execution Output Verification

```
================================================================================
  HAWASAATHI TARGETED DOMAIN MUTATION VERIFICATION SUITE (ISOLATED RUNNER)
  (Verification of 20 Selected Critical Domain Mutations, Not Full AST Score)
================================================================================

[PRE-CHECK] Cryptographic integrity verified for 5 workspace target files.
[SANDBOX] Initialising isolated sandbox at: /var/folders/l5/.../hs-mutation-...
[SANDBOX] Ready with linked dependencies. Workspace files in main repo are fully read-only.

[MUT-RW-01] KILLED (TEST_ASSERTION_FAILURE) [CONSTANT]: Mutate 24h statutory required hours from 16 to 15
[MUT-RW-02] KILLED (TEST_ASSERTION_FAILURE) [CONSTANT]: Mutate 24h statutory required hours from 16 to 17
[MUT-RW-03] KILLED (TEST_ASSERTION_FAILURE) [CONSTANT]: Mutate 8h secondary adapted required hours from 6 to 5
[MUT-RW-04] KILLED (TEST_ASSERTION_FAILURE) [BOUNDARY]: Mutate sufficiency boundary operator from >= to >
[MUT-CALC-01] KILLED (TEST_ASSERTION_FAILURE) [BOUNDARY]: Mutate negative concentration rejection operator from cp < 0 to cp <= 0
[MUT-CALC-02] KILLED (TEST_ASSERTION_FAILURE) [BOUNDARY]: Mutate Ozone 1h acute spike threshold from cp <= 208 to cp < 208
[MUT-CALC-03] KILLED (TEST_ASSERTION_FAILURE) [BOUNDARY]: Mutate Lead Severe threshold from cp > 3.5 to cp > 5.0
[MUT-CALC-04] KILLED (TEST_ASSERTION_FAILURE) [CONSTANT]: Mutate reporting ceiling cap from 500 to 450
[MUT-CALC-05] KILLED (TEST_ASSERTION_FAILURE) [ARITHMETIC]: Invert interpolation numerator subtraction from (bp.aqiHi - bp.aqiLo) to (bp.aqiHi + bp.aqiLo)
[MUT-CALC-06] KILLED (TEST_ASSERTION_FAILURE) [ARITHMETIC]: Invert Severe continuation slope from (topBreakpoint.aqiHi - topBreakpoint.aqiLo) to (topBreakpoint.aqiHi + topBreakpoint.aqiLo)
[MUT-CALC-07] KILLED (TEST_ASSERTION_FAILURE) [BOUNDARY]: Mutate continuous breakpoint interval matching from cp >= bp.boundaryLo to cp > bp.boundaryLo
[MUT-ENG-01] KILLED (TEST_ASSERTION_FAILURE) [CONSTANT]: Mutate minimum required unique pollutants from 3 to 2
[MUT-ENG-02] KILLED (TEST_ASSERTION_FAILURE) [LOGICAL]: Invert particulate requirement from (PM2.5 || PM10) to (PM2.5 && PM10)
[MUT-ENG-03] KILLED (TEST_ASSERTION_FAILURE) [EQUALITY]: Invert cross-station equality from m.stationId !== stationId to m.stationId === stationId
[MUT-ENG-04] KILLED (TEST_ASSERTION_FAILURE) [SECURITY]: Bypass non-forgeable trusted aggregation boundary check
[MUT-ENG-05] KILLED (TEST_ASSERTION_FAILURE) [BOUNDARY]: Mutate conflicting measurement detection threshold from > 1 to > 5
[MUT-GRD-01] KILLED (TEST_ASSERTION_FAILURE) [EQUALITY]: Mutate Severe active mobility condition from BICYCLING to METRO_TRAIN
[MUT-GRD-02] KILLED (TEST_ASSERTION_FAILURE) [EQUALITY]: Mutate Very Poor outdoor physical exertion check from VIGOROUS to RESTING_SEDENTARY
[MUT-VENT-01] KILLED (TEST_ASSERTION_FAILURE) [CONSTANT]: Mutate life-safety combustion override from EXHAUST_LOCALIZED_BURST to KEEP_SEALED
[MUT-VENT-02] KILLED (TEST_ASSERTION_FAILURE) [LOGICAL]: Invert combustion safety flag from true to false

[SANDBOX] Cleaning up isolated temporary directory: /var/folders/l5/...
[POST-CHECK] 100% Cryptographic Match: All 5 workspace files in main repo are strictly untouched.

================================================================================
                   TARGETED MUTATION VERIFICATION SUMMARY
================================================================================
Total Target Mutants Tested : 20
Mutants Killed              : 20
Mutants Survived            : 0
Kill Rate on Selected Set   : 100%
Classification              : Selected Domain Verification (Not Full AST Score)
Sandbox Isolation           : Ephemeral OS Temp Directory (0 Workspace Modifications)
================================================================================

SUCCESS: 100% of targeted domain mutants were successfully KILLED by the test suite!
```
