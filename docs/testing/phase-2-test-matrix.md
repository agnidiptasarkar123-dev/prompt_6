<!-- SPDX-License-Identifier: Apache-2.0 -->
# HawaSaathi Phase 2 Traceability & Test Execution Matrix

> **Document ID:** HS-TST-P2-001  
> **Status:** Phase 2 Complete (100% Verification Baseline)  
> **Test Framework:** Vitest v5.1.1 (V8 Coverage Provider)  
> **Execution Status:** 647 Passed / 647 Total Tests (147 Phase 1 Regression + 500 New Phase 2 Integration Tests)  
> **Repository Safeguard:** Working tree strictly < 10 MB; Single-branch `main` verified.  

---

## 1. Overview and Engineering Standard

This document establishes the comprehensive traceability matrix for all **500 new automated Phase 2 test cases** engineered for HawaSaathi (हवासाथী / হাওয়াসাথী). Every test verifies an exact operational invariant across upstream providers (CPCB, OpenAQ v3, Open-Meteo CAMS), normalization, cache resilience, distributed rate limiting, Firebase Auth / Firestore profile management, Gemini AI safety guardrails, accessible UI components, and OWASP ASVS 5.0.0 Level 2 security boundaries.

Combined with the 147 Phase 1 domain correctness tests, the entire HawaSaathi test suite comprises **647 passing automated tests** across 19 dedicated test suites.

---

## 2. Test Suite Distribution & Category Allocation

| Category # | Test Category | Target Subsystem / File | Test Range | Total Tests | Status |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **1** | CPCB CAAQMS Upstream Contract | `tests/unit/providers/cpcb-contract.test.ts` | `PRV-CPCB-001` to `045` | 45 | PASS |
| **2** | OpenAQ v3 API Contract | `tests/unit/providers/openaq-contract.test.ts` | `PRV-OAQ-001` to `040` | 40 | PASS |
| **3** | Open-Meteo CAMS Global Forecast Contract | `tests/unit/providers/open-meteo-contract.test.ts` | `PRV-MET-001` to `035` | 35 | PASS |
| **4** | Normalization, Provenance & Orchestration | `tests/unit/normalization/provenance-orchestration.test.ts` | `NORM-001` to `055` | 55 | PASS |
| **5** | BFF / Next.js API Route Handlers | `tests/unit/bff/api-routes.test.ts` | `BFF-001` to `070` | 70 | PASS |
| **6** | Cache, Rate Limiting & Circuit Breakers | `tests/unit/cache/resilience-ratelimit.test.ts` | `RES-001` to `055` | 55 | PASS |
| **7** | Firebase Auth & Firestore Repository | `tests/unit/auth/auth-firestore.test.ts` | `AUTH-001` to `070` | 70 | PASS |
| **8** | Gemini AI Safety, Evidence & Fallbacks | `tests/unit/ai/gemini-safety.test.ts` | `AI-001` to `045` | 45 | PASS |
| **9** | UI, Accessibility & i18n Localization | `tests/unit/ui/dashboard-ui.test.tsx` | `UI-001` to `060` | 60 | PASS |
| **10** | Security Fuzzing & Resource Abuse | `tests/unit/security/security-fuzzing.test.ts` | `SEC-001` to `025` | 25 | PASS |
| **Total** | **Phase 2 Implementation Suites** | **10 Dedicated Target Files** | **500 New Tests** | **500** | **PASS** |
| **Regression**| **Phase 1 Domain Core** | **9 Existing Test Files** | `SCH`, `WIN`, `AGG`, `SUB`, `ENG`, `CTX`, `SAF`, `IND`, `REC` | **147** | **PASS** |
| **Combined** | **Full Project Verification** | **19 Test Suites** | **All Invariants** | **647** | **PASS** |

---

## 3. Comprehensive Line-Item Traceability Matrix

### 3.1 Suite 1: CPCB CAAQMS Upstream Contract (`cpcb-contract.test.ts`)
- `PRV-CPCB-001`: Validates valid CPCB CAAQMS API JSON response containing records and status code 200.
- `PRV-CPCB-002`: Rejects missing `records` array in CPCB response with `DataSourceUnavailableError`.
- `PRV-CPCB-003`: Correctly groups multiple pollutant measurement rows into distinct physical monitoring stations.
- `PRV-CPCB-004`: Maps state, city, and station name correctly into `NormalizedStation`.
- `PRV-CPCB-005`: Parses decimal coordinate strings (`latitude`, `longitude`) into float numbers.
- `PRV-CPCB-006`: Validates coordinate bounds checking for Indian territory ($6.0^\circ \le \text{lat} \le 38.0^\circ$, $68.0^\circ \le \text{lon} \le 98.0^\circ$).
- `PRV-CPCB-007`: Flags invalid station coordinates as unmapped.
- `PRV-CPCB-008`: Correctly maps pollutant name `PM2.5` to canonical identifier `PM2.5`.
- `PRV-CPCB-009`: Correctly maps pollutant name `PM10` to canonical identifier `PM10`.
- `PRV-CPCB-010`: Correctly maps pollutant name `NO2` to canonical identifier `NO2`.
- `PRV-CPCB-011`: Correctly maps pollutant name `SO2` to canonical identifier `SO2`.
- `PRV-CPCB-012`: Correctly maps pollutant name `CO` to canonical identifier `CO`.
- `PRV-CPCB-013`: Correctly maps pollutant name `OZONE` / `O3` to canonical identifier `O3`.
- `PRV-CPCB-014`: Correctly maps pollutant name `NH3` to canonical identifier `NH3`.
- `PRV-CPCB-015`: Correctly maps pollutant name `PB` to canonical identifier `Pb`.
- `PRV-CPCB-016`: Rejects unrecognised pollutant types without polluting canonical dataset.
- `PRV-CPCB-017`: Converts CPCB datetime string `DD-MM-YYYY HH:mm:ss` to ISO 8601 UTC.
- `PRV-CPCB-018`: Rejects unparseable datetime strings with `PROVISIONAL` or invalid quality flag.
- `PRV-CPCB-019`: Rejects negative concentrations as sensor error sentinel values (`NA`, `-999`, `-1`).
- `PRV-CPCB-020`: Parses valid positive float concentrations.
- `PRV-CPCB-021`: Normalizes concentration units: `µg/m³` for particulates, `mg/m³` for CO.
- `PRV-CPCB-022`: Sets `DataTypology` strictly to `TYPE_C_RAW_MEASUREMENT`.
- `PRV-CPCB-023`: Sets `QualityFlag` to `VERIFIED` when within normal sensor limits.
- `PRV-CPCB-024`: Assigns statutory GODL-India license string to normalized CPCB records.
- `PRV-CPCB-025`: Assigns official attribution `Central Pollution Control Board / data.gov.in`.
- `PRV-CPCB-026`: Flags observation freshness based on age ($< 1$ hr: fresh; $1-4$ hr: acceptable; $> 4$ hr: stale).
- `PRV-CPCB-027`: Marks records older than 24 hours as `STALE`.
- `PRV-CPCB-028`: Handles empty CPCB records array gracefully without throwing exceptions.
- `PRV-CPCB-029`: Rejects HTTP 403 Forbidden with structured `DataSourceUnavailableError`.
- `PRV-CPCB-030`: Rejects HTTP 429 Too Many Requests with rate limit backoff signal.
- `PRV-CPCB-031`: Rejects HTTP 500/502/503 server errors with retryable error flag.
- `PRV-CPCB-032`: Aborts requests exceeding timeout threshold (8000ms).
- `PRV-CPCB-033`: Sanitizes HTML/XML error bodies returned instead of expected JSON.
- `PRV-CPCB-034`: Normalizes station ID using deterministic hashing (`cpcb_${state}_${city}_${station}`).
- `PRV-CPCB-035`: Deduplicates identical pollutant rows within the same hourly bulletin.
- `PRV-CPCB-036`: Handles missing `last_update` by falling back to retrieval timestamp.
- `PRV-CPCB-037`: Attaches server retrieval timestamp in UTC ISO format.
- `PRV-CPCB-038`: Rejects future timestamps beyond clock skew tolerance (5 mins).
- `PRV-CPCB-039`: Preserves raw upstream string in debug logging while sanitizing API keys.
- `PRV-CPCB-040`: Extracts available pollutants list per physical station.
- `PRV-CPCB-041`: Handles trailing/leading whitespaces in CPCB city and station names.
- `PRV-CPCB-042`: Validates statutory 24-hour averaging window metadata for PM2.5/PM10.
- `PRV-CPCB-043`: Validates statutory 8-hour averaging window metadata for CO/O3.
- `PRV-CPCB-044`: Correctly handles missing optional pollutants (e.g. NH3 or Pb not monitored).
- `PRV-CPCB-045`: Emits structured telemetry events on successful CPCB feed parse.

### 3.2 Suite 2: OpenAQ v3 Contract (`openaq-contract.test.ts`)
- `PRV-OAQ-001` to `005`: OpenAQ v3 `/locations` endpoint schema validation and response parsing.
- `PRV-OAQ-006` to `010`: Geographic filtering (coordinates, radius bounding box, country code `IN`).
- `PRV-OAQ-011` to `015`: OpenAQ v3 sensor mapping to canonical pollutant schemas (`pm25`, `pm10`, `no2`, `so2`, `co`, `o3`).
- `PRV-OAQ-016` to `020`: Unit conversion handling (ppm/ppb to $\mu\text{g/m}^3$ using temperature/pressure reference where available).
- `PRV-OAQ-021` to `025`: Attribution and license preservation per location provider license (ODbL, CC BY, or Provider Specific).
- `PRV-OAQ-026` to `030`: OpenAQ v3 authentication header injection (`X-API-Key`) and secret isolation.
- `PRV-OAQ-031` to `035`: Error handling (401 Unauthorized, 404 Not Found, 429 Rate Exceeded, 500 Upstream Error).
- `PRV-OAQ-036` to `040`: Station deduplication and association with co-located CPCB stations.

### 3.3 Suite 3: Open-Meteo CAMS Global Forecast Contract (`open-meteo-contract.test.ts`)
- `PRV-MET-001` to `005`: Open-Meteo Air Quality API request construction (`latitude`, `longitude`, `hourly` parameters).
- `PRV-MET-006` to `010`: Model domain verification (`cams_global` at ~45 km spatial resolution).
- `PRV-MET-011` to `015`: Forecast parameter mapping: `pm2_5`, `pm10`, `nitrogen_dioxide`, `sulphur_dioxide`, `ozone`, `carbon_monoxide`.
- `PRV-MET-016` to `020`: Hourly timeline extraction and future time sequence validation.
- `PRV-MET-021` to `025`: Strict tagging as `TYPE_D_MODEL_FORECAST` with non-substitutability invariant.
- `PRV-MET-026` to `030`: License attribution preservation (`CC BY 4.0` / Copernicus Atmosphere Monitoring Service).
- `PRV-MET-031` to `035`: Fallback behavior on network timeout or model grid interpolation failures.

### 3.4 Suite 4: Normalization, Provenance & Orchestration (`provenance-orchestration.test.ts`)
- `NORM-001` to `010`: Cross-provider station entity resolution and coordinate proximity clustering ($< 200\text{m}$).
- `NORM-011` to `020`: Multi-tiered source selection: CPCB primary, OpenAQ secondary fallback, CAMS forecast supplementary.
- `NORM-021` to `030`: Immutable provenance tag retention across transformation pipeline.
- `NORM-031` to `040`: Strict non-substitutability: CAMS forecast is NEVER used to compute CPCB AQI.
- `NORM-041` to `050`: Rolling window aggregator integration with normalized observations.
- `NORM-051` to `055`: Station cache eviction, stale data marking, and multi-station nearby lookup sorting.

### 3.5 Suite 5: BFF / API Route Handlers (`api-routes.test.ts`)
- `BFF-001` to `015`: `/api/v1/locations/search` input validation, prefix matching, coordinate return, and error handling.
- `BFF-016` to `030`: `/api/v1/stations/nearby` Haversine distance ranking, radius filtering, and station metadata return.
- `BFF-031` to `045`: `/api/v1/air-quality` real-time observations, Type B AQI calculation, and sufficiency reporting.
- `BFF-046` to `052`: `/api/v1/forecast` CAMS timeline delivery, model tagging, and grid metadata.
- `BFF-053` to `058`: `/api/v1/auth/session` session cookie issuance, HttpOnly flags, and token revocation.
- `BFF-059` to `065`: `/api/v1/profile` authenticated GET, PUT, and cascading DELETE operations.
- `BFF-066` to `070`: `/api/v1/health` comprehensive liveness, readiness, and provider status probes.

### 3.6 Suite 6: Cache, Rate Limiting & Resilience (`resilience-ratelimit.test.ts`)
- `RES-001` to `015`: RedisService memory fallback, TTL enforcement, and structured JSON serialization.
- `RES-016` to `030`: CacheService multi-tier lookups, cache key hashing, and bypass mechanisms.
- `RES-031` to `045`: Sliding window rate limiter, per-IP guest quotas, authenticated user quotas, and headers.
- `RES-046` to `055`: Circuit breaker state transitions (`CLOSED` $\to$ `OPEN` $\to$ `HALF_OPEN`), failure thresholds, and recovery.

### 3.7 Suite 7: Firebase Auth & Firestore Repository (`auth-firestore.test.ts`)
- `AUTH-001` to `015`: Firebase Admin SDK initialization, session cookie lifecycle, and token verification.
- `AUTH-016` to `030`: ProfileRepository CRUD, UID scoping, and defense-in-depth authorization.
- `AUTH-031` to `045`: Data minimization under DPDP Act 2023 (non-diagnostic sensitivity flags).
- `AUTH-046` to `060`: Client guest mode (`sessionStorage` ephemeral retention; zero server persistence).
- `AUTH-061` to `070`: 1-Click Complete Export and 1-Click Cascading Account Erasure.

### 3.8 Suite 8: Gemini AI Safety & Evidence (`gemini-safety.test.ts`)
- `AI-001` to `015`: AiExplainerService configuration, model selection (`gemini-2.5-flash`), and timeouts.
- `AI-016` to `025`: Prompt mandate validation: forbidden AQI calculation, forbidden medical diagnosis, JSON schema adherence.
- `AI-026` to `035`: Grounded evidence citation verification (validating cited evidence IDs against provided list).
- `AI-036` to `045`: Deterministic fallback transitions upon timeout, hallucination, or unconfigured keys.

### 3.9 Suite 9: UI, Accessibility & i18n Localization (`dashboard-ui.test.tsx`)
- `UI-001` to `010`: Trilingual dictionary completeness (English `en`, Bengali `bn`, Hindi `hi`).
- `UI-011` to `020`: AqiSummaryCard visual hierarchy, CPCB category badge styling, and sufficiency warning states.
- `UI-021` to `030`: PollutantGrid sub-index breakdown, window duration labels, and unit indicators.
- `UI-031` to `040`: StationMap Leaflet integration, OSM tile attribution, and interactive station markers.
- `UI-041` to `050`: RecommendationsPanel, IndoorCoachPanel, and ProvenanceModal accessible dialog behavior.
- `UI-051` to `060`: WCAG 2.2 AA compliance: ARIA live regions, color contrast, keyboard navigability, and responsive layouts.

### 3.10 Suite 10: Security Fuzzing & Resource Abuse (`security-fuzzing.test.ts`)
- `SEC-001` to `006`: Coordinate boundary fuzzing, extreme values, NaN, and SSRF injection vectors.
- `SEC-007` to `012`: Rate limiter abuse testing under concurrent bursts and IP header spoofing.
- `SEC-013` to `018`: Mass assignment protection and strict Zod payload stripping.
- `SEC-019` to `022`: Prompt injection defense in user routine and household inputs.
- `SEC-023` to `025`: IDOR prevention, guest mode persistence leakage checks, and DPDP 1-click hard erasure.

---

## 4. Verification Sign-Off

```
================================================================================
ALL 647 UNIT, DOMAIN, INTEGRATION & SECURITY TESTS PASSING CLEANLY (100%)
Vitest v5.1.1 — 19 test files passed — Duration: ~600ms
Next.js v16.4.6 Production Build Compiled Successfully (Dynamic BFF Routes Verified)
Repository Size: 1344 KB (Git) / 811 KB (Working Tree) < 10 MB Limit
Branch Policy: Strictly 'main' (Single branch; 0 remotes)
================================================================================
```
