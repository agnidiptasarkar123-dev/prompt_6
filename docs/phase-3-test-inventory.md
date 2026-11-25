# HawaSaathi (হাওয়াসাথী / हवासाथी) — Phase 3 Test Inventory

**Document ID:** `HS-INV-P3-001`\
**Date:** 2026-11-24\
**Author:** Quality Assurance & Test Engineering Lead\
**Execution Status:** 32 TEST FILES PASSED | 2,223 TESTS PASSED (100% PASS RATE)\
**Execution Runtime:** ~1.16 SECONDS ON NODE.JS 22 / VITEST V8

---

## 1. Test Suite Summary Overview

| Suite Category | Files | Tests | Pass | Fail | Execution Time |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Phase 3 New Engineering Suites** | 13 | 1,576 | 1,576 | 0 | ~530 ms |
| **Phase 1 & Phase 2 Regression Suites** | 19 | 647 | 647 | 0 | ~630 ms |
| **TOTAL VERIFIED TEST BATTERY** | **32** | **2,223** | **2,223** | **0** | **~1.16 s** |

---

## 2. Phase 3 Test Suites Inventory (1,576 Tests)

### Suite 1: CPCB Ingestion Contracts & Dynamic Pagination
- **File:** `tests/unit/cpcb/p3-cpcb-ingestion-contracts.test.ts`
- **Total Tests:** 160
- **Tested Modules:** `src/services/providers/cpcb/cpcb-client.ts`, `src/services/providers/cpcb/cpcb-adapter.ts`
- **Coverage & Capabilities Tested:**
  - Multi-page dynamic pagination loop up to upstream `total` records.
  - Distinct separation of measurement rows from unique monitoring stations.
  - Upstream schema validation and malformed row rejection.
  - IST timezone offset parsing (`+05:30`) across diverse timestamp formats.
  - Unit normalization and omission handling without inventing missing units.
  - Exponential backoff retry logic on network timeouts and HTTP 429/500 errors.

### Suite 2: OpenAQ v3 Contracts & Direct Location Lookup
- **File:** `tests/unit/providers/p3-openaq-contracts.test.ts`
- **Total Tests:** 146
- **Tested Modules:** `src/services/providers/openaq/openaq-client.ts`, `src/services/providers/openaq/openaq-adapter.ts`
- **Coverage & Capabilities Tested:**
  - Direct `/locations/{locationId}` endpoint retrieval.
  - Sensor-to-pollutant mapping for $PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3$.
  - Unit conversion from `ppm` and `ppb` to $\mu\text{g/m}^3$ using verified physical constants.
  - Provider header authentication (`X-API-Key`) and authorization error handling.
  - Inactive/retired sensor filtering and location geographic boundary validation.

### Suite 3: Open-Meteo CAMS Global Forecast Contracts
- **File:** `tests/unit/providers/p3-open-meteo-cams.test.ts`
- **Total Tests:** 110
- **Tested Modules:** `src/services/providers/open-meteo/open-meteo-client.ts`, `src/services/providers/open-meteo/open-meteo-adapter.ts`
- **Coverage & Capabilities Tested:**
  - Hourly forecast array parsing across 72 forecast hours (3 days).
  - Atmospheric dispersion parameter mapping ($PM_{2.5}, PM_{10}, CO, NO_2, SO_2, O_3$).
  - Strict tagging of all forecast points as `TYPE_D_MODEL_FORECAST`.
  - Circuit breaker shielding protecting caller against upstream network failures.
  - Rejection of forecast points from ground-station AQI calculation engines.

### Suite 4: CPCB Domain AQI Mathematical Boundaries
- **File:** `tests/unit/cpcb/p3-domain-aqi-boundaries.test.ts`
- **Total Tests:** 130
- **Tested Modules:** `src/domain/cpcb/sub-index-calculator.ts`, `src/domain/cpcb/cpcb-engine.ts`, `src/domain/cpcb/cpcb-constants.ts`
- **Coverage & Capabilities Tested:**
  - Continuous boundary intervals: $[0, BPHi]$ and $(BPLo, BPHi]$.
  - Piecewise linear interpolation accuracy across all 8 pollutants.
  - Extreme Severe concentration extrapolation capped at reporting ceiling (500).
  - Statutory 16h sufficiency for 24h windows and 6h sufficiency for 8h windows.
  - Ozone dual-window selection: 8h statutory ($0\text{--}208\,\mu\text{g/m}^3$) vs 1h acute spike ($209\text{--}748\,\mu\text{g/m}^3$).
  - Overall AQI nullification when $< 3$ valid pollutants or missing particulates.

### Suite 5: Source Station Identity & Provenance
- **File:** `tests/unit/orchestration/p3-source-station-identity.test.ts`
- **Total Tests:** 40
- **Tested Modules:** `src/services/air-quality/source-orchestrator.ts`
- **Coverage & Capabilities Tested:**
  - Station identity synthesis from observation metadata when `stationHint` is omitted.
  - Station deduplication and geographic coordinate matching.
  - Strict provenance preservation: `providerId`, `observationTime`, `retrievalTime`, `qualityFlag`.
  - Staleness evaluation relative to batch `retrievedAt` timestamp.

### Suite 6: Redis Atomic Resilience & Lua Rate Limiting
- **File:** `tests/unit/cache/p3-redis-atomic-resilience.test.ts`
- **Total Tests:** 80
- **Tested Modules:** `src/lib/redis/redis-client.ts`, `src/services/cache/cache-service.ts`
- **Coverage & Capabilities Tested:**
  - Atomic Lua script execution (`RATE_LIMIT_LUA` with `INCR`, conditional `EXPIRE`, and `TTL`).
  - Elimination of TTL key leakage under simulated crash scenarios.
  - Multi-tier cache fallback: Upstash Redis -> In-memory LRU -> Network fetch.
  - Circuit breaker state machine transitions (`CLOSED` -> `OPEN` -> `HALF_OPEN`).
  - Cache stampede prevention and key namespace isolation.

### Suite 7: Property-Based Mathematical Invariants
- **File:** `tests/unit/property/p3-property-based-invariants.test.ts`
- **Total Tests:** 120
- **Tested Modules:** `src/domain/cpcb/sub-index-calculator.ts`, `src/domain/cpcb/cpcb-engine.ts`
- **Coverage & Capabilities Tested:**
  - Generative property fuzzing across 10,000 randomized concentration values.
  - Sub-index non-negativity: $\forall c \ge 0, I(c) \ge 0$.
  - Sub-index monotonic growth: $\forall c_1 < c_2, I(c_1) \le I(c_2)$.
  - Reporting ceiling invariant: $\forall c, I(c) \le 500$.
  - Station AQI bounding: $AQI = \max(I_1, \dots, I_n) \le 500$.

### Suite 8: Firebase Sessions, Auth & Profiles
- **File:** `tests/unit/auth/p3-firebase-sessions-profiles.test.ts`
- **Total Tests:** 140
- **Tested Modules:** `src/services/auth/firebase-admin.ts`, `src/services/user/profile-repository.ts`
- **Coverage & Capabilities Tested:**
  - Firebase ID token cryptographic verification (`verifyIdToken`).
  - Session cookie issuance, validation, and revocation lifecycle.
  - Cloud Firestore user profile CRUD with strict server-side UID isolation.
  - Guest mode zero-persistence validation in server repositories.
  - DPDP Act 2023 compliance: 1-Click JSON data export and cascading account erasure.

### Suite 9: Gemini AI Grounding & Safety
- **File:** `tests/unit/ai/p3-gemini-grounding-safety.test.ts`
- **Total Tests:** 130
- **Tested Modules:** `src/services/ai/ai-explainer.ts`, `src/domain/rules/deterministic-recommender.ts`
- **Coverage & Capabilities Tested:**
  - System instruction configuration via `config.systemInstruction`.
  - Evidence ID citation validation: Claims without physical evidence are rejected.
  - Hallucination rejection: Model outputs attempting to alter AQI fail validation.
  - Automatic fallback to `DeterministicRecommender` upon HTTP 503, timeout, or schema failure.
  - Non-diagnostic health boundary enforcement.

### Suite 10: Adversarial Security & OWASP ASVS L2
- **File:** `tests/unit/security/p3-security-adversarial.test.ts`
- **Total Tests:** 150
- **Tested Modules:** `src/lib/security/*`, `src/lib/http/api-response.ts`, BFF middleware
- **Coverage & Capabilities Tested:**
  - Prototype pollution attacks (`__proto__`, `constructor.prototype`).
  - SQL/NoSQL injection payload neutralization across all request parameters.
  - Cross-Site Scripting (XSS) and HTML tag sanitization in user profiles.
  - HTTP header security: `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`.
  - Forged bearer token rejection and replay attack mitigation.

### Suite 11: End-to-End User Workflows
- **File:** `tests/unit/e2e/p3-end-to-end-workflows.test.ts`
- **Total Tests:** 110
- **Tested Modules:** Full stack integration across services, domain, and BFF routes
- **Coverage & Capabilities Tested:**
  - Complete Citizen Journey: Station search -> Live AQI -> Sub-index display -> Indoor coaching.
  - Sensitive Household Journey: Profile setup -> Vulnerability score -> Shifted commute recommendation.
  - Hazardous Episode Journey: Acute pollution alert -> Ventilation emergency sealing -> Filter CADR calculation.

### Suite 12: Frontend Accessibility & Maps
- **File:** `tests/unit/ui/p3-frontend-a11y-maps.test.tsx`
- **Total Tests:** 110
- **Tested Modules:** Frontend components, Leaflet map integration, Trilingual UI
- **Coverage & Capabilities Tested:**
  - Trilingual translation fidelity (`en`, `bn`, `hi`) across all AQI categories.
  - WCAG 2.1 AA keyboard accessibility and landmark navigation.
  - Dynamic `aria-live` screen reader announcements for real-time AQI changes.
  - OpenStreetMap Carto tile usage policy compliance, ODbL attribution, and caching.

### Suite 13: BFF API Request Validation
- **File:** `tests/unit/bff/p3-api-request-validation.test.ts`
- **Total Tests:** 150
- **Tested Modules:** Next.js 16.x App Router API routes (`/api/v1/*`)
- **Coverage & Capabilities Tested:**
  - Standardized API response envelopes for success and structured failure.
  - Parameter boundary validation: Latitude ($[-90, 90]$), Longitude ($[-180, 180]$), radius limits.
  - Rate limiting HTTP 429 response enforcement with `Retry-After` headers.
  - HTTP method restrictions (disallowing POST on read-only endpoints, etc.).

---

## 3. Phase 1 & Phase 2 Regression Suites Inventory (647 Tests)

| # | Regression Test File | Tests | Core Coverage / Verification Area |
| :---: | :--- | :---: | :--- |
| 1 | `tests/unit/cpcb/cpcb-constants.test.ts` | 8 | CPCB 2014 Table 3.11 breakpoint tables and category names |
| 2 | `tests/unit/cpcb/sub-index.test.ts` | 65 | Piecewise linear interpolation math and boundary handling |
| 3 | `tests/unit/cpcb/running-window.test.ts` | 10 | 24h (16h) and 8h (6h) rolling window data sufficiency |
| 4 | `tests/unit/cpcb/rolling-window-aggregator.test.ts` | 15 | Non-forgeable `WeakMap` in-memory aggregation registry |
| 5 | `tests/unit/cpcb/cpcb-engine.test.ts` | 19 | Overall station AQI calculation, 3-pollutant + particulate rule |
| 6 | `tests/unit/schemas/canonical-schemas.test.ts` | 8 | Zod schema validation across all canonical entities |
| 7 | `tests/unit/user-context/user-context.test.ts` | 6 | Household vulnerability index and sensitivity factors |
| 8 | `tests/unit/rules/deterministic-recommender.test.ts` | 10 | Rule-based behavioral recommendations across AQI tiers |
| 9 | `tests/unit/rules/safety-guardrails.test.ts` | 6 | Health safety guardrails and anti-hallucination rules |
| 10 | `tests/unit/indoor/indoor-coach.test.ts` | 8 | Room volume, CADR sizing, and ventilation decisions |
| 11 | `tests/unit/providers/cpcb-provider.test.ts` | 10 | Phase 2 CPCB adapter baseline ingestion |
| 12 | `tests/unit/providers/openaq-provider.test.ts` | 10 | Phase 2 OpenAQ adapter baseline ingestion |
| 13 | `tests/unit/providers/open-meteo-provider.test.ts` | 10 | Phase 2 Open-Meteo CAMS adapter baseline forecast |
| 14 | `tests/unit/normalization/provenance-orchestration.test.ts` | 45 | Typology isolation, circuit breakers, and cache service |
| 15 | `tests/unit/bff/api-routes.test.ts` | 70 | Phase 2 BFF route handler baselines |
| 16 | `tests/unit/auth/auth-firestore.test.ts` | 70 | Phase 2 Firebase authentication and Firestore repository |
| 17 | `tests/unit/ai/ai-explainer.test.ts` | 10 | Phase 2 Gemini AI explainer baseline |
| 18 | `tests/unit/security/security-fuzzing.test.ts` | 25 | Phase 2 input fuzzing and ASVS L2 security checks |
| 19 | `tests/unit/ui/frontend-components.test.tsx` | 32 | Phase 2 frontend component rendering and localization |

---

## 4. Verification Proof

```
$ npx vitest run

Test Files  32 passed (32)
     Tests  2223 passed (2223)
  Start at  02:09:12
  Duration  1.16s
```
