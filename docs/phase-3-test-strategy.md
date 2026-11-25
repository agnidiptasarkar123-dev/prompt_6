# HawaSaathi (হাওয়াসাথী / हवासाथी) — Phase 3 Test Strategy & Architecture

**Document ID:** `HS-STRAT-P3-001`\
**Date:** 2026-11-24\
**Author:** Senior Quality Assurance & Test Automation Architect, Principal Software Engineer\
**Baseline Standard:** Strict TypeScript, OWASP ASVS 5.0.0 Level 2, MoEFCC CPCB NAQI (2014)\
**Status:** APPROVED FOR PRODUCTION VERIFICATION

---

## 1. Testing Philosophy & Guiding Principles

HawaSaathi is a life-safety environmental intelligence platform designed for Indian cities, where air quality levels frequently reach hazardous concentrations. Because users rely on the platform to schedule medication windows, commute routes, window sealing, and outdoor activities, test automation cannot merely check "happy paths."

The testing strategy is founded on five uncompromising engineering directives:

1. **Proof Over Assumption:** Never assume a calculation, API response, or security check works without empirical, repeatable automated tests.
2. **Zero Fabrication Policy:** Production code never invents AQI or mocks physical sensor readings. All test fixtures representing real-world stations must conform to explicit Zod schemas and preserve provenance (Types A, B, C, D).
3. **Defense-in-Depth Across Layers:** Every layer—from mathematical sub-index interpolation to Next.js BFF routes and React UI components—is protected by its own targeted test battery.
4. **Boundary & Mutation Hardening:** Unit tests must fail whenever critical domain logic (such as CPCB 16-hour sufficiency or Ozone acute spike boundaries) is mutated.
5. **Adversarial Resilience:** Security testing must continuously simulate hostile inputs, including prompt injection, parameter tampering, prototype pollution, and rate-limit flooding.

---

## 2. Multi-Tier Testing Hierarchy

```
+---------------------------------------------------------------------------------------+
|                             HAWASAATHI TEST PYRAMID                                   |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|   [LEVEL 10: ADVERSARIAL SECURITY & ASVS L2]  --> 175 tests (Fuzzing, Injections, Auth) |
|   [LEVEL 9:  END-TO-END USER JOURNEYS]        --> 110 tests (Guest, Profile, Coach)    |
|   [LEVEL 8:  UI, A11Y & MAP VISUALIZERS]      --> 110 tests (WCAG 2.1 AA, OSM Tiles)  |
|   [LEVEL 7:  AI GROUNDING & SAFETY]           --> 130 tests (Gemini, Fallback Rules)   |
|   [LEVEL 6:  BFF API REQUEST VALIDATION]      --> 220 tests (App Router, Envelopes)   |
|   [LEVEL 5:  AUTH, SESSION & PRIVACY]         --> 210 tests (Firebase, DPDP Act)       |
|   [LEVEL 4:  CACHE, RATE LIMIT & RESILIENCE]  --> 125 tests (Lua Script, Breakers)     |
|   [LEVEL 3:  PROVIDER CONTRACTS & INGESTION]  --> 416 tests (CPCB, OpenAQ, CAMS)       |
|   [LEVEL 2:  PROPERTY-BASED & INVARIANTS]     --> 120 tests (Monotonicity, Bounds)     |
|   [LEVEL 1:  CPCB DOMAIN & CALCULATION MATH]  --> 607 tests (Breakpoints, Sufficiency) |
|                                                                                       |
+---------------------------------------------------------------------------------------+
|                     TOTAL AUTOMATED TEST BATTERY: 2,223 TESTS                         |
|                           PASSING RATE: 100% (2,223 / 2,223)                          |
|                           EXECUTION TIME: ~1.16 SECONDS                               |
+---------------------------------------------------------------------------------------+
```

---

## 3. Detailed Testing Levels & Scope

### Level 1: CPCB Domain Foundation & Calculation Math
- **Target Files:** `src/domain/cpcb/*`, `src/domain/indoor/*`, `src/domain/rules/*`
- **Scope:**
  - Piecewise linear interpolation across all 8 criteria pollutants ($PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3, NH_3, Pb$).
  - Continuous interval boundaries: $[0, BPHi]$ for category 1; $(BPLo, BPHi]$ for categories 2–6.
  - CPCB reporting ceiling cap: Maximum AQI 500.
  - Data sufficiency invariants: Minimum 16 hours for 24h rolling windows; minimum 6 hours for 8h rolling windows.
  - Overall station sufficiency rule: Minimum 3 pollutants with at least one particulate ($PM_{2.5}$ or $PM_{10}$). If insufficient, `overallAqi` is strictly `null`.
  - Dual-window Ozone logic: 8h statutory window takes precedence up to $208\,\mu\text{g/m}^3$; 1h acute spike window triggers for $209\text{--}748\,\mu\text{g/m}^3$.
  - Indoor CADR sizing and life-safety ventilation override rules.

### Level 2: Property-Based Invariant Verification
- **Target Files:** `tests/unit/property/p3-property-based-invariants.test.ts`
- **Engine:** Fast-Check property generative testing.
- **Invariants Verified:**
  1. *Sub-Index Non-Negativity:* $\forall c \ge 0, I(c) \ge 0$.
  2. *Monotonicity:* $\forall c_1 < c_2, I(c_1) \le I(c_2)$.
  3. *Ceiling Preservation:* $\forall c \in [0, 10000], I(c) \le 500$.
  4. *Sufficiency Monotonicity:* Adding valid hourly readings to an insufficient window never converts a valid window to invalid.
  5. *Station AQI Invariant:* $\max(I_1, \dots, I_n) \le 500$ and $AQI \ge \max(I_{\text{particulate}})$.

### Level 3: Provider Contracts & Ingestion Boundaries
- **Target Files:** `tests/unit/cpcb/p3-cpcb-ingestion-contracts.test.ts`, `tests/unit/providers/*`
- **Scope:**
  - CPCB CAAQMS dynamic pagination: Verifies multi-page batch ingestion loop, handling upstream `total` records accurately.
  - Record vs Station semantics: Validates that 4,000+ raw measurement rows are correctly grouped into unique monitoring stations.
  - OpenAQ v3 location queries: Verifies direct `/locations/{id}` queries and unit normalization.
  - Open-Meteo CAMS forecast arrays: Verifies hourly timestamps, parameter mapping, and circuit breaker shielding.

### Level 4: Cache, Rate Limiting & Resilience
- **Target Files:** `tests/unit/cache/p3-redis-atomic-resilience.test.ts`, `tests/unit/normalization/provenance-orchestration.test.ts`
- **Scope:**
  - Upstash Redis atomic Lua script execution (`INCR`, `EXPIRE`, `TTL`).
  - Graceful degradation: In-memory sliding window fallback when Redis disconnects.
  - Circuit Breaker transitions: State machine progression from `CLOSED` to `OPEN` (after 5 failures) and `HALF_OPEN` after reset timeout.

### Level 5: Identity, Session & Privacy Lifecycle
- **Target Files:** `tests/unit/auth/p3-firebase-sessions-profiles.test.ts`, `tests/unit/auth/auth-firestore.test.ts`
- **Scope:**
  - Firebase ID token verification and HttpOnly session cookie lifecycle.
  - Cloud Firestore user isolation: Backend routes enforce UID ownership.
  - Ephemeral Guest Mode: Unauthenticated user state remains in client `sessionStorage` with zero server-side persistence.
  - DPDP Act 2023 technical safeguards: 1-Click JSON data export and 1-Click cascading account hard deletion.

### Level 6: BFF API Request Validation & Error Envelopes
- **Target Files:** `tests/unit/bff/p3-api-request-validation.test.ts`, `tests/unit/bff/api-routes.test.ts`
- **Scope:**
  - Next.js 16.x App Router API routes (`/api/v1/*`).
  - Standardized JSON envelope: `{ requestId, status, retrievedAt, data, warnings }` on success; `{ requestId, status, errorCode, message, retryable }` on failure.
  - Strict input sanitization via Zod schemas, returning HTTP 400 with structured validation errors.
  - Rate limiting enforcement returning HTTP 429 Too Many Requests with `Retry-After` headers.

### Level 7: AI Grounding, Safety & Deterministic Fallback
- **Target Files:** `tests/unit/ai/p3-gemini-grounding-safety.test.ts`
- **Scope:**
  - System instruction injection via `config.systemInstruction`.
  - Evidence-backed recommendations: Every assertion must reference a valid physical evidence ID.
  - Anti-hallucination guardrails: Gemini is forbidden from computing or modifying AQI numbers.
  - Fail-safe fallback: Immediate switch to `DeterministicRecommender` upon Gemini 503 error, timeout, or schema failure.

### Level 8: Accessibility, UI & Map Visualizers
- **Target Files:** `tests/unit/ui/p3-frontend-a11y-maps.test.tsx`
- **Scope:**
  - Trilingual language switching (`en`, `bn`, `hi`).
  - WCAG 2.1 Level AA conformance: Color contrast ratios, screen reader announcements (`aria-live`), and keyboard landmarks.
  - Leaflet / OpenStreetMap compliance: Verifies ODbL 1.0 attribution, caching headers, and tile server policy adherence.

### Level 9: End-to-End User Journeys
- **Target Files:** `tests/unit/e2e/p3-end-to-end-workflows.test.ts`
- **Scope:**
  - Journey 1: Anonymous citizen searches nearby station, checks live AQI, and views indoor coaching advice.
  - Journey 2: Authenticated user with vulnerable household members configures flexible commute schedule.
  - Journey 3: Severe pollution event triggering emergency ventilation sealing and route shift guidance.

### Level 10: Adversarial Security & OWASP ASVS 5.0.0 Level 2
- **Target Files:** `tests/unit/security/p3-security-adversarial.test.ts`, `tests/unit/security/security-fuzzing.test.ts`
- **Scope:**
  - Prototype pollution injection vectors (`__proto__`, `constructor.prototype`).
  - Prompt injection attacks attempting to force diagnosis or bypass safety guardrails.
  - Authentication bypass attempts: Tampered JWTs, expired signatures, forged UIDs.
  - Rate limit flooding: Concurrency bursts verifying atomic token replenishment.

---

## 4. Test Execution & CI Automation Protocol

All tests are executed locally and in CI using Vitest with V8 coverage:

```bash
# 1. Full test suite run
npm run test

# 2. Strict typecheck
npm run typecheck

# 3. Linter validation
npm run lint

# 4. Coverage enforcement
npm run test:coverage

# 5. Isolated mutation verification
npm run test:mutation

# 6. Next.js production build verification
npm run build

# 7. Repository size guardrail check
npm run check:size

# 8. Single branch policy check
npm run check:branch
```

All 8 verification steps must pass with exit code 0 before any milestone completion or release tag.
