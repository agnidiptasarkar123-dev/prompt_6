# HawaSaathi 2.0 — AQI Consistency & Null-Safety Report

> **Date:** 2026-11-25
> **Standard:** MoEFCC CPCB National Air Quality Index (2014)

---

## 1. Defects Resolved

- **Synthetic Category Suppression (`DEF-V2-004`):** Fixed `src/app/page.tsx` where BFF recommendation requests and indoor guidance could imply `MODERATE` air quality when verified `calculatedAqi` was `null`.
- **Recommendation API Contract Mismatch (`DEF-V2-006`):** `src/app/page.tsx` now sends `evidenceList` in the schema expected by `src/app/api/v1/recommendations/route.ts` and consumes `deterministicRecommendations` plus `indoorAirCoach.{hazardAssessment, ventilation, filtration}`.
- **Duplicate Unavailable Copy (`DEF-V2-005`):** Eliminated duplicate rendering of `statusMessage` inside `src/components/air-quality/aqi-summary-card.tsx` (now rendered once cleanly alongside structured missing-criteria, raw-readings, and coverage/freshness diagnostics).

---

## 2. Deterministic CPCB Engine Verification

Across `src/domain/cpcb/cpcb-engine.ts`, `rolling-window-aggregator.ts`, `running-window.ts`, and `sub-index-calculator.ts`:
- Overall AQI returns `null` whenever `< 3` distinct valid pollutants exist or neither `PM2.5` nor `PM10` meets sufficiency windows (16h of 24h; 6h of 8h).
- All 6 CPCB sub-index breakpoint suites (`cpcb-engine.test.ts`, `sub-index.test.ts`, `running-window.test.ts`, `rolling-window-aggregator.test.ts`) passed with **100.00%** coverage.

---

## 3. Cross-View Consistency Verification

- **Summary + Pollutant Grid + Recommendations + Indoor Coach + Daily Planner + Agent + AI Chat:** All receive `calculatedAqi` and `verifiedAqiCategory` derived strictly from `aqiStatus === "AVAILABLE" ? calculatedAqi?.category ?? null : null` (no `MODERATE`/`GOOD` fallback when `null`).
- **Chrome E2E Verification (`scripts/run-browser-e2e.ts`):**
  - Scenario 1 (`362` AQI `VERY_POOR` for Anand Vihar): **PASS (`1445ms`)**.
  - Scenario 2 (`Live Recommendations & Indoor Coach Wiring`): **PASS (`502ms`)**.
  - Scenario 4 (`UNAVAILABLE` station): `noFakeMod=true`, `count=1` (zero fake `MODERATE` text, zero duplicate unavailable copy) — **PASS (`724ms`)**.
