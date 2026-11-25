# HawaSaathi 2.0 — Provenance Typology Verification

> **Date:** 2026-11-25
> **Baseline:** Four-Way Data Typology Contract (Type A / Type B / Type C / Type D)

---

## 1. Provenance Typology Enforcement

`src/components/air-quality/aqi-summary-card.tsx`, `src/components/air-quality/pollutant-grid.tsx`, and `src/components/shared/provenance-modal.tsx` strictly enforce honest classification:

| Condition | Card Provenance Badge | Enforcement Rule |
|---|---|---|
| `calculatedAqi?.overallAqi != null` and `provider === "CPCB_OFFICIAL"` | `Type A: Official CPCB AQI` | Official CPCB bulletin only |
| `calculatedAqi?.overallAqi != null` and independent calculation | `Type B: CPCB Calculated` | Validated $\ge 3$ pollutants incl. PM2.5 or PM10 |
| `calculatedAqi` unavailable (`null`) AND `observations.length > 0` | `Type C: Raw Monitored` | Raw sensor measurements present only |
| `!station` (no station found) AND `forecastPointsCount > 0` | `Type D: Model Forecast Context` | Explicit ~45 km CAMS model fallback |
| Station selected (`station != null`) with `observations.length === 0` | `No verified observation available` | Never mislabeled as Type C or Type D |

---

## 2. Pollutant Card & Modal Integrity

- **Per-Pollutant Attribution (`src/components/air-quality/pollutant-grid.tsx`):**
  - Displays the `Type C Raw Observations` heading strictly when `observations.length > 0`; otherwise displays `No Raw Observations Available` (station selected with 0 observations), `Select a Monitoring Station`, or `Provider Unavailable`.
  - Renders `VERIFIED`, `PROVISIONAL`, `STALE (>24h)`, and `SUSPICIOUS` quality badges.
  - Displays observation timestamp (`observationTime`), provider identifier (`CPCB_CAAQMS` / `OPENAQ`), unit state (`unit unverified` when missing), and distinct `Provider Unavailable` / `No Station Selected` / `Not Monitored (Not Zero)` empty states.
- **Provenance Modal (`src/components/shared/provenance-modal.tsx`):**
  - Displays `provider`, observation count (`observations.length`), latest observation timestamp (`latestObsTime`), and server retrieval timestamp (`retrievalTime`).

---

## 3. Empirical Verification

- **Unit Tests:** `tests/unit/v2/v2-regression-closure.test.tsx`, `tests/unit/coverage/phase-5-branch-remediation.test.tsx` (`BRANCH-UI-01`), `tests/unit/ui/dashboard-ui.test.tsx` (`UI-020`) — all passing under **100.00%** line/statement/function/branch coverage.
- **Live Standalone Verification:** Rabindra Bharati (`obsCount: 7`, `unit: null`, `qualityFlag: "PROVISIONAL"`) & SVSPA Campus (`obsCount: 7`, `unit: null`) render raw `Type C` concentrations while `calculatedAqi` stays `null`; `openaq_5614` renders `144` raw `Type C` readings with hourly deduplication and `CO` `µg/m³ -> mg/m³` normalization.
- **Chrome E2E (`scripts/run-browser-e2e.ts`):**
  - Scenario 4 `[PROVENANCE] Provenance Truthfulness & Zero Duplicate Copy`: **PASS (`724ms`)** — `neutralProv=true, noFakeMod=true, count=1`.
