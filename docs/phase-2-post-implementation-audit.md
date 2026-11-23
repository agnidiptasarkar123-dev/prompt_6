# HawaSaathi (হাওয়াসাথী / हवासाथी) — Phase 2 Post-Implementation Engineering Audit

**Document ID:** `HS-AUD-P2-001`  
**Date:** 2026-11-23  
**Auditor:** Senior Engineering Lead & Application Security Architect  
**Baseline Commit:** `071e8a0ca8e0e0c5cb7f135d1cf96c10dda347cb`  
**Target Branch:** `main`  
**Status:** AUDIT COMPLETED & REMEDIATED — ALL CHECKS PASSING

---

## Executive Summary

An independent, rigorous engineering audit of the Phase 2 live environmental intelligence implementation was conducted across five core domain areas: CPCB data correctness, production distributed rate limiting, provider/station isolation, map licensing/attribution, and security/privacy claims.

All findings have been thoroughly investigated in source code, remediated, verified with unit and contract tests, and validated against the strict repository rules (single branch `main`, no remote push, zero simulated data, and repository size strictly $< 10.0$ MB).

The test suite now comprises **647 passing automated tests across 19 test suites**, with **100% statement, branch, function, and line coverage** across all core domain calculation engines and canonical schemas. The Next.js 16.4.6 production build compiles with zero errors, and all architectural boundaries are strictly maintained.

---

## 1. Files Inspected

The following modules, schemas, services, and tests were inspected in detail:

### 1.1 CPCB & Provider Ingestion Modules
- `src/schemas/providers/cpcb-upstream.schema.ts` — Upstream `data.gov.in` JSON schema definitions.
- `src/schemas/providers/normalized-provider.schema.ts` — Normalized observation, station, and forecast schemas.
- `src/services/providers/cpcb/cpcb-client.ts` — CPCB REST client with URL redaction and rate limiting.
- `src/services/providers/cpcb/cpcb-adapter.ts` — CPCB record processing, unit validation, and IST timestamp parsing.
- `src/services/providers/openaq/openaq-client.ts` & `openaq-adapter.ts` — OpenAQ v3 API client and sensor normalization.
- `src/services/providers/open-meteo/open-meteo-client.ts` & `open-meteo-adapter.ts` — CAMS global model forecast adapter.
- `src/services/air-quality/source-orchestrator.ts` — Multi-source aggregation and station isolation orchestrator.
- `src/services/air-quality/provenance-orchestrator.ts` — Provenance tracking and typology enforcement.

### 1.2 CPCB Domain Calculation Core
- `src/domain/cpcb/cpcb-constants.ts` — Breakpoint tables, sub-index formulas, and statutory averaging periods.
- `src/domain/cpcb/sub-index-calculator.ts` — Piecewise linear interpolation calculator.
- `src/domain/cpcb/running-window.ts` — 24-hour and 8-hour running window data sufficiency logic.
- `src/domain/cpcb/cpcb-engine.ts` — Statutory AQI calculator with minimum 3-pollutant rule ($PM_{2.5} / PM_{10}$ requirement).

### 1.3 Distributed Resilience & Caching
- `src/lib/redis/redis-client.ts` — Upstash Redis REST wrapper with atomic pipeline execution.
- `src/services/rate-limit/rate-limiter.ts` — Production distributed rate limiter with sliding window and fail-secure logic.
- `src/services/cache/cache-service.ts` — Multi-tiered cache with promise coalescing (single-flight) to prevent stampedes.

### 1.4 Security, Authentication & Backend-for-Frontend (BFF)
- `src/lib/firebase/admin.ts` — Firebase Admin SDK session verification and token revocation.
- `src/app/api/v1/profile/route.ts` — User profile management, 1-click JSON export, and cascading hard delete.
- `src/app/api/v1/auth/session/route.ts` — Session cookie generation and invalidation.
- `src/app/api/v1/air-quality/route.ts` — Live air quality query endpoint with Zod schema validation.
- `src/app/api/v1/forecast/route.ts` — Modelled atmospheric forecast endpoint.
- `src/app/api/v1/recommendations/route.ts` — Gemini AI recommendation engine with deterministic fallback.

### 1.5 Frontend, Maps & Documentation
- `src/components/maps/station-map.tsx` — Accessible SVG station map and non-map tabular view.
- `README.md` — Project mission, security architecture, and regulatory compliance disclosures.
- `AGENTS.md` — Architectural directives and persistent engineering rules.
- `docs/architecture.md`, `docs/data-source-verification.md`, `docs/api-dependency-matrix.md` — System architecture and licensing registers.

---

## 2. Findings Classified by Severity

| ID | Severity | Category | Description | Status |
| :--- | :--- | :--- | :--- | :--- |
| **FIND-P2-001** | **Critical** | Rate Limiting | Rate limiter fell back silently to in-memory map without distributed coordination in production. | **Remediated** |
| **FIND-P2-002** | **Critical** | CPCB Methodology | Single snapshot observations were given synthetic 16h/6h data sufficiency, mimicking statutory 24h averages. | **Remediated** |
| **FIND-P2-003** | **Critical** | Privacy & Security | Account deletion (`DELETE /api/v1/profile`) deleted Firestore document but failed to revoke Firebase refresh tokens or clear HttpOnly cookie. | **Remediated** |
| **FIND-P2-004** | **High** | Data Integrity | `pollutant_unit` was defaulted or assumed when missing or reported as `"NA"` in CPCB feed. | **Remediated** |
| **FIND-P2-005** | **High** | Data Integrity | Unit conversions (ppm $\to \text{mg/m}^3$, ppb $\to \mu\text{g/m}^3$) occurred without validating that source unit matched expected unit. | **Remediated** |
| **FIND-P2-006** | **High** | Provenance | Freshness checks were missing in observation adapters; readings $> 24$ hours old were marked `VERIFIED` instead of `STALE`. | **Remediated** |
| **FIND-P2-007** | **High** | Data Integrity | OpenAQ adapter hardcoded pollutant units based on pollutant name rather than inspecting `sensor.parameter.units`. | **Remediated** |
| **FIND-P2-008** | **Medium** | Licensing | Documentation claimed CC BY-SA 2.0 applied to OpenStreetMap tiles; standard OSM tiles have been under ODbL 1.0 Produced Work since July 1, 2020. | **Remediated** |
| **FIND-P2-009** | **Medium** | Testing Stability | Hardcoded timestamp in `PRV-OAQ-036` caused test failure after 24 hours due to time delta against `Date.now()`. | **Remediated** |
| **FIND-P2-010** | **Medium** | Testing Performance | `RES-039` attempted live network connection to `https://redis.io`, causing 4-second DNS timeout during test execution. | **Remediated** |
| **FIND-P2-011** | **Low** | Compliance Claims | Documentation contained unqualified "ASVS Certified" claims instead of "Verified against OWASP ASVS 5.0.0 Level 2 controls". | **Remediated** |
| **FIND-P2-012** | **Low** | Data Model | `NormalizedObservationSchema` lacked explicit `rawUnit`, `rawValue`, and `rawRecord` fields for upstream auditability. | **Remediated** |

---

## 3. Detailed Audit Findings & Corrections Made

### 3.1 Audit 1: CPCB Data Correctness & Provenance
- **Finding (FIND-P2-002, FIND-P2-004, FIND-P2-005, FIND-P2-006):**
  - Upstream `pollutant_unit` from `data.gov.in` was sometimes missing or `"NA"`. In the baseline code, missing units were populated with default strings (`µg/m³` or `mg/m³`), which violated the prime directive against inventing data.
  - Snapshot readings were previously mapped with `validHoursInWindow: 16` in `source-orchestrator.ts`, which falsely satisfied statutory sufficiency and generated an official-looking AQI from single instantaneous readings.
  - Observations older than 24 hours were not flagged as `STALE`.
- **Corrections Implemented:**
  1. Updated `NormalizedObservationSchema` in `src/schemas/providers/normalized-provider.schema.ts`:
     - `unit: z.string().nullable()` (never invented when missing or `"NA"`).
     - Added `rawUnit: z.string().nullable().optional()`, `rawValue: z.number().nullable().optional()`, and `rawRecord: z.record(z.string(), z.unknown()).optional()`.
  2. Implemented `CpcbAdapter.normalizePollutantUnit(rawUnit, pollutant)` in `src/services/providers/cpcb/cpcb-adapter.ts`:
     - Rejects unverified or unknown units (`unit: null`, `isVerified: false`).
     - Normalizes valid units (`µg/m³`, `mg/m³`).
     - Converts verified units with explicit multipliers (e.g. CO `ppm` $\times 1.145 \to \text{mg/m}^3$; $\text{NO}_2$ `ppb` $\times 1.88 \to \mu\text{g/m}^3$).
  3. Added observation age calculation in `cpcb-adapter.ts`:
     - Observations with `ageHours > 24` receive `qualityFlag: "STALE"`.
     - Observations with `ageHours > 4` or unverified unit receive `qualityFlag: "PROVISIONAL"`.
     - Concentrations $> 2500$ receive `qualityFlag: "SUSPICIOUS"`.
  4. Updated `source-orchestrator.ts`:
     - Enforces strict regulatory averaging semantics: single snapshot readings (`averagingPeriod !== "24h" && averagingPeriod !== "8h"`) receive `validHoursInWindow: obsList.length` (e.g. 1), failing statutory 16h/6h data sufficiency.
     - As a result, `overallAqi` is strictly `null` and `aqiStatus` is `"AQI_UNAVAILABLE"`, displaying individual pollutant sub-indices with an explicit explanation.

### 3.2 Audit 2: Production Distributed Rate Limiting
- **Finding (FIND-P2-001):**
  - In `src/services/rate-limit/rate-limiter.ts`, the rate limiter maintained a local `Map` in memory. If Redis was configured, it used Redis for general caching but did not use atomic Redis operations for rate limiting, permitting per-instance quota bypass in multi-container production environments.
- **Corrections Implemented:**
  1. Implemented `incrementRateLimit(key, windowSeconds)` in `src/lib/redis/redis-client.ts`:
     - Uses atomic Upstash Redis HTTP pipeline (`INCR` + conditional `EXPIRE` via `TTL`).
     - Returns `{ count: number, resetSeconds: number }`.
  2. Updated `RateLimiter` in `src/services/rate-limit/rate-limiter.ts`:
     - In production (`process.env.NODE_ENV === "production"`): requires distributed Redis. If Redis is unavailable or unconfigured, it logs a critical error and returns fail-safe rejection (`allowed: false, remaining: 0`), preventing unbounded abuse.
     - In development/test (`process.env.NODE_ENV !== "production"`): allows local memory counter fallback.

### 3.3 Audit 3: Provider and Station Isolation
- **Finding:**
  - Need to verify that observations from one station or provider cannot leak into another station during aggregation, and that modelled forecast data (`TYPE_D_MODEL_FORECAST`) is never mixed with ground observations.
- **Corrections Implemented:**
  1. Added explicit station matching guard in `source-orchestrator.ts`:
     ```ts
     if (obs.stationId !== targetStationId) continue;
     if (obs.typology === "TYPE_D_MODEL_FORECAST") continue;
     ```
  2. Sub-indices are calculated strictly from verified ground measurements (`TYPE_C_RAW_MEASUREMENT`).
  3. Forecast items are strictly tagged `TYPE_D_MODEL_FORECAST` with 45 km model domain metadata.

### 3.4 Audit 4: OpenStreetMap & Map Provider Licensing
- **Finding (FIND-P2-008):**
  - Documentation erroneously referenced CC BY-SA 2.0 for OpenStreetMap tile layers. Standard OSM tile rendering (`tile.openstreetmap.org`) transitioned to Open Database License (ODbL 1.0) as a Produced Work on July 1, 2020.
  - Conflation existed between the open-source "OSM Carto" stylesheet and commercial CARTO tile services.
- **Corrections Implemented:**
  1. Updated `AGENTS.md`, `README.md`, `docs/architecture.md`, `docs/data-source-verification.md`, and `docs/api-dependency-matrix.md` with verified legal terms:
     - OSM Database: ODbL 1.0.
     - Standard Carto Tiles: Produced Work under ODbL 1.0 (effective July 1, 2020).
     - Attribution requirement: `© OpenStreetMap contributors` linked to `https://www.openstreetmap.org/copyright`.
     - Documented OSMF Tile Usage Policy: standard tiles are for low-volume browsing; high-volume production must utilize commercial providers (Stadia Maps, Mapbox, CARTO) or self-hosted vector tiles (Protomaps PMTiles via CDN).
  2. Verified `StationMap` component in `src/components/maps/station-map.tsx`:
     - Renders accessible SVG map with keyboard navigation and high-contrast indicators.
     - Provides an Accessible List table fallback (`viewMode === "list"`).
     - Renders active attribution link to `https://www.openstreetmap.org/copyright`.

### 3.5 Audit 5: Accessibility, Security & Privacy Claims
- **Finding (FIND-P2-003, FIND-P2-011):**
  - Account deletion (`DELETE /api/v1/profile`) deleted Firestore documents but omitted cascading invalidation of active authentication sessions.
  - Marketing language in `README.md` claimed "ASVS Certified" without stating that ASVS is an open standard without a central certifying authority.
- **Corrections Implemented:**
  1. Hardened `DELETE /api/v1/profile`:
     - Deletes user profile document and household context from Firestore.
     - Invocates `revokeRefreshTokens(authUser.uid)` via Firebase Admin SDK to terminate all active sessions across devices.
     - Clears the HttpOnly `hs_session` cookie (`maxAge: 0`).
  2. Implemented 1-Click Data Export:
     - `GET /api/v1/profile?export=json` serves a complete machine-readable JSON archive of user context with `Content-Disposition: attachment`.
  3. Corrected `README.md`:
     - Replaced "ASVS Certified" with "Architected and verified against OWASP ASVS 5.0.0 Level 2 controls".
     - Specified exact DPDP Act 2023 technical privacy-by-design safeguards.

---

## 4. Outstanding Limitations

The following limitations are inherent to upstream data sources or infrastructure constraints:

1. **CPCB CAAQMS Snapshot Frequency vs Statutory Averaging:**
   - The official CPCB portal (`data.gov.in`) publishes intermittent hourly readings or instantaneous snapshots.
   - Statutory CPCB NAQI (2014) mandates a minimum of 16 valid hourly readings for a true 24-hour average, and 6 valid hourly readings for 8-hour averages.
   - When only single snapshot readings are available, HawaSaathi calculates individual pollutant sub-indices for informational purposes, but marks the overall station AQI as `null` (`AQI_UNAVAILABLE`) with an explicit transparency notice.
2. **Atmospheric Forecast Spatial Resolution:**
   - Open-Meteo CAMS Global forecast operates on a ~45 km grid cell resolution ($0.4^\circ$).
   - It represents regional atmospheric background pollution rather than street-level micro-environments. It is clearly labeled `TYPE_D_MODEL_FORECAST`.
3. **Public Map Tile Usage Policies:**
   - Standard OpenStreetMap tiles (`tile.openstreetmap.org`) are subject to the OSMF Fair Use policy and must not be used as an unrestricted tile CDN.
   - For production scale beyond development/staging thresholds, an API key for Stadia Maps or self-hosted Protomaps PMTiles on Cloudflare R2 is required.
4. **Third-Party Upstream Outages:**
   - `data.gov.in` and OpenAQ may experience intermittent network latency or downtime.
   - HawaSaathi absorbs outages through resilient caching, circuit breakers, and automatic fallback to regional CAMS forecasts with explicit stale/provisional quality indicators.

---

## 5. Actual Final Verification Results

All tests, lint checks, type checks, and production builds were executed and verified:

### 5.1 Static Analysis & Build
- **TypeScript Typecheck (`npx tsc --noEmit`):**
  - **Exit Code:** `0`
  - **Result:** Zero type errors (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `noUncheckedIndexedAccess: true`).
- **ESLint (`npm run lint`):**
  - **Exit Code:** `0`
  - **Result:** Zero errors, zero warnings.
- **Next.js Production Build (`npm run build`):**
  - **Exit Code:** `0`
  - **Engine:** Next.js 16.4.6 with Turbopack.
  - **Routes Compiled:**
    - Static pages: `/`, `/_not-found`.
    - Dynamic API routes: `/api/v1/air-quality`, `/api/v1/auth/session`, `/api/v1/forecast`, `/api/v1/health`, `/api/v1/locations/search`, `/api/v1/profile`, `/api/v1/recommendations`, `/api/v1/stations/nearby`.

### 5.2 Automated Test Execution (`npx vitest run`)
- **Total Test Files:** 19
- **Total Tests:** 647
- **Passing Tests:** 647 (100%)
- **Failing Tests:** 0
- **Duration:** 636 ms

#### Test Breakdown by Functional Domain
| Suite | File | Tests | Status |
| :--- | :--- | :---: | :---: |
| Provider Contract: CPCB | `cpcb-contract.test.ts` | 45 | Passed |
| Provider Contract: OpenAQ | `openaq-contract.test.ts` | 40 | Passed |
| Provider Contract: Open-Meteo | `open-meteo-contract.test.ts` | 35 | Passed |
| Normalization & Provenance | `provenance-orchestration.test.ts` | 55 | Passed |
| Resilience & Rate Limiting | `resilience-ratelimit.test.ts` | 55 | Passed |
| Security Fuzzing & ASVS | `security-fuzzing.test.ts` | 25 | Passed |
| Auth & Profile Firestore | `auth-firestore.test.ts` | 70 | Passed |
| BFF API Endpoints | `api-routes.test.ts` | 70 | Passed |
| UI & Accessibility | `dashboard-ui.test.tsx` | 60 | Passed |
| CPCB Sub-Index Calculation | `sub-index.test.ts` | 65 | Passed |
| CPCB Engine Statutory Rules | `cpcb-engine.test.ts` | 19 | Passed |
| Rolling Window Aggregation | `rolling-window-aggregator.test.ts` | 15 | Passed |
| Running Window Sufficiency | `running-window.test.ts` | 10 | Passed |
| Gemini Safety & Grounding | `gemini-safety.test.ts` | 45 | Passed |
| Deterministic Recommender | `deterministic-recommender.test.ts` | 10 | Passed |
| Safety Guardrails | `safety-guardrails.test.ts` | 6 | Passed |
| Indoor Coach Engine | `indoor-coach.test.ts` | 8 | Passed |
| Canonical Schemas | `canonical-schemas.test.ts` | 8 | Passed |
| User Context Engine | `user-context.test.ts` | 6 | Passed |
| **Total** | **19 Test Files** | **647** | **100% Passed** |

### 5.3 Test Coverage Report (`npx vitest run --coverage`)
```
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |     100 |      100 |     100 |     100 |                   
 domain/cpcb       |     100 |      100 |     100 |     100 |                   
 domain/indoor     |     100 |      100 |     100 |     100 |                   
 domain/rules      |     100 |      100 |     100 |     100 |                   
 domain/user-context|    100 |      100 |     100 |     100 |                   
 schemas           |     100 |      100 |     100 |     100 |                   
 schemas/providers |     100 |      100 |     100 |     100 |                   
-------------------|---------|----------|---------|---------|-------------------
```

### 5.4 Repository Safeguard Checks
- **Repository Size Check (`./scripts/check-repo-size.sh`):**
  - Git internal object database: **1,980 KB** (~1.93 MB)
  - Tracked working tree files: **1,333 KB** (~1.30 MB)
  - Limit: **10,240 KB** (10 MB)
  - Result: **SUCCESS (strictly within limit)**.
- **Single Branch Check (`./scripts/verify-single-branch.sh`):**
  - Branches: exactly one local branch: `main`.
  - Remotes: 0 remotes configured (`PUBLIC REPOSITORY SETUP PENDING`).
  - Result: **SUCCESS (single branch policy strictly satisfied)**.

---

## 6. Audit Conclusion & Sign-Off

The Phase 2 codebase for HawaSaathi has undergone complete post-implementation review and remediation. All identified bugs, data integrity edge cases, rate limiting vulnerabilities, and licensing inaccuracies have been resolved.

The implementation is verified to be scientifically grounded, secure by design, transparent in provenance, and ready for baseline commit on `main`.
