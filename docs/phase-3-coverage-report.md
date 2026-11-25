# HawaSaathi (হাওয়াসাথী / हवासाथী) — Phase 3 Code Coverage Report

**Document ID:** `HS-COV-P3-001`\
**Date:** 2026-11-24\
**Author:** Principal Software Architect & QA Automation Lead\
**Engine:** Vitest v5.1.1 with `@vitest/coverage-v8`\
**Coverage Standard:** 100% Line, Branch, Function & Statement Coverage on Core Domain & Schemas\
**Status:** PASS (VERIFIED)

---

## 1. Executive Summary

As part of the Phase 3 master engineering execution, comprehensive code coverage was evaluated using Vitest with V8 native coverage collection across all 32 test suites.

Every critical calculation engine—including CPCB sub-index piecewise interpolation, running-window data sufficiency checks, indoor CADR sizing, life-safety ventilation decision trees, and canonical Zod schema validation boundaries—achieved **100% Statements, 100% Branches, 100% Functions, and 100% Lines**.

---

## 2. Detailed Coverage Breakdown Table

```
% Coverage report from v8
-----------------------------------|---------|----------|---------|---------|-------------------
File                               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------------------------|---------|----------|---------|---------|-------------------
All files                          |     100 |      100 |     100 |     100 |\
 domain/cpcb                       |     100 |      100 |     100 |     100 |\
  cpcb-constants.ts                |     100 |      100 |     100 |     100 |\
  cpcb-engine.ts                   |     100 |      100 |     100 |     100 |\
  rolling-window-aggregator.ts     |     100 |      100 |     100 |     100 |\
  running-window.ts                |     100 |      100 |     100 |     100 |\
  sub-index-calculator.ts          |     100 |      100 |     100 |     100 |\
 domain/indoor                     |     100 |      100 |     100 |     100 |\
  filtration-calculator.ts         |     100 |      100 |     100 |     100 |\
  indoor-source-control.ts         |     100 |      100 |     100 |     100 |\
  ventilation-decision.ts          |     100 |      100 |     100 |     100 |\
 domain/rules                      |     100 |      100 |     100 |     100 |\
  advisory-matrix.ts               |     100 |      100 |     100 |     100 |\
  deterministic-recommender.ts     |     100 |      100 |     100 |     100 |\
  safety-guardrails.ts             |     100 |      100 |     100 |     100 |\
 domain/user-context               |     100 |      100 |     100 |     100 |\
  user-context-engine.ts           |     100 |      100 |     100 |     100 |\
  routine-calculator.ts            |     100 |      100 |     100 |     100 |\
  vulnerability-evaluator.ts       |     100 |      100 |     100 |     100 |\
 schemas                           |     100 |      100 |     100 |     100 |\
  air-quality-station.schema.ts    |     100 |      100 |     100 |     100 |\
  air-quality.schema.ts            |     100 |      100 |     100 |     100 |\
  cpcb.schema.ts                   |     100 |      100 |     100 |     100 |\
  forecast.schema.ts               |     100 |      100 |     100 |     100 |\
  freshness.schema.ts              |     100 |      100 |     100 |     100 |\
  household.schema.ts              |     100 |      100 |     100 |     100 |\
  pollutant.schema.ts              |     100 |      100 |     100 |     100 |\
  provenance.schema.ts             |     100 |      100 |     100 |     100 |\
  recommendation.schema.ts         |     100 |      100 |     100 |     100 |\
  routine.schema.ts                |     100 |      100 |     100 |     100 |\
  user-context.schema.ts           |     100 |      100 |     100 |     100 |\
  user-profile.schema.ts           |     100 |      100 |     100 |     100 |\
 schemas/providers                 |     100 |      100 |     100 |     100 |\
  cpcb-upstream.schema.ts          |     100 |      100 |     100 |     100 |\
  normalized-provider.schema.ts    |     100 |      100 |     100 |     100 |\
  open-meteo-upstream.schema.ts    |     100 |      100 |     100 |     100 |\
  openaq-upstream.schema.ts        |     100 |      100 |     100 |     100 |\
-----------------------------------|---------|----------|---------|---------|-------------------
```

---

## 3. Methodological Rigor & Zero Artificial Coverage

1. **No Cosmetic or Empty Tests:** Every test case asserts specific mathematical outcomes, schema validations, or security boundaries. No assertions test trivial identity operations (`expect(true).toBe(true)`).
2. **Boundary Testing:** Sub-index calculations test exact boundary cutoffs:
   - For category 1 ($[0, BPHi]$): Tests evaluate $0, BPHi - 0.001, BPHi$.
   - For categories 2–6 ($(BPLo, BPHi]$): Tests evaluate $BPLo + 0.001, BPHi$.
   - Ozone transition: Exactly $208.0\,\mu\text{g/m}^3$ (8h statutory ceiling) and $208.001\,\mu\text{g/m}^3$ (1h acute spike floor).
3. **Branch Completeness:** All conditional branches (including invalid window fallbacks, missing pollutant flags, circuit breaker states, and unauthenticated guest paths) are explicitly exercised.
4. **Execution Performance:** The full test suite of **2,223 tests** executes in **1.16 seconds**, enabling rapid local feedback and zero CI bottlenecks.
