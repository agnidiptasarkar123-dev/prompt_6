# Phase-Wise Development Plan & Milestone Roadmap

> **Document ID:** HS-PLN-001  
> **Status:** Revised Baseline (Post-Audit)  
> **Target Release:** Production Web Application on `main` ($<10\text{ MB}$)

---

## 1. Phase Overview & Progress Dashboard

```mermaid
gantt
    title HawaSaathi Phase-Wise Development Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 0: Baseline
    Phase 0: Architecture, Data Verification & Feasibility Audit :done, 2026-11-20, 2026-11-21
    section Implementation
    Phase 1: Domain Core, CPCB NAQI Engine & Schemas              :2026-11-21, 2026-11-22
    Phase 2: Live Data Ingestion Pipeline & Provenance           :2026-11-22, 2026-11-23
    Phase 3: AI Inference & Deterministic Fallback Engine        :2026-11-23, 2026-11-24
    Phase 4: Identity, Firebase Admin SDK & Privacy Rights       :2026-11-24, 2026-11-25
    Phase 5: Accessible UI, Dynamic Context & Localization       :2026-11-25, 2026-11-26
    section Hardening & Release
    Phase 6: 3,050 Automated Security Assertions (ASVS L2)       :2026-11-26, 2026-11-27
    Phase 7: Production Deployment, Demo Video & Submission      :2026-11-27, 2026-11-28
```

---

## 2. Phase-by-Phase Deliverables & Verification Gates

### Phase 0: Architecture, Data Verification & Feasibility Baseline (CURRENT — COMPLETED)
- **Status:** **COMPLETED & LOCKED (Awaiting Sign-Off)**
- **Completed Deliverables:**
  - `AGENTS.md` with persistent engineering constraints.
  - `docs/requirements-matrix.md` establishing 100% bidirectional traceability.
  - `docs/architecture.md` detailing hexagonal layers and ADRs.
  - `docs/data-source-verification.md` verifying CPCB, OpenAQ v3, and Open-Meteo CAMS.
  - `docs/api-dependency-matrix.md` auditing external dependencies and upstream limits.
  - `docs/architecture-decision-log.md` logging technical trade-offs and open items.
  - `docs/user-context-model.md` defining composable context schemas.
  - `docs/threat-model.md` mapping STRIDE and OWASP ASVS 5.0.0 Level 2.
  - `docs/security-acceptance-criteria.md` detailing formal pass/fail criteria.
  - `docs/testing-strategy.md` separating domain tests from security tests.
  - `firestore.rules` locking down direct client database access.
  - Repository size and single-branch safeguard scripts operational.
- **Verification Gate:** Formal sign-off on architecture before feature scaffolding.

---

### Phase 1: Core Domain Engine, CPCB NAQI Math & Domain Unit Testing
- **Goal:** Implement pure business logic without external I/O or network dependencies.
- **Deliverables:**
  - `src/schemas/`: Canonical Zod schemas (`air-quality`, `provenance`, `user-context`, `recommendation`, `routine`).
  - `src/domain/cpcb/`:
    - Piecewise linear interpolation calculator for all 8 pollutants.
    - Running-average data sufficiency validator (16 hours for 24h average; 6 hours for 8h average).
    - Station sufficiency validator ($\ge 3$ valid pollutants, including $PM_{2.5}$ or $PM_{10}$).
    - Worst-pollutant selector and dominant pollutant assigner.
  - `src/domain/user-context/`:
    - Composable household context validator.
    - Non-diagnostic sensitivity weighting logic.
  - `src/domain/routine/`:
    - 24-hour diurnal timeline segmenter.
    - Particulate exposure vs emission reduction impact calculators.
    - Safety guardrails (blocking strenuous outdoor activity during Very Poor or Severe AQI).
  - `src/domain/indoor/`:
    - Ventilation guidance rules based on outdoor vs indoor particulate gradients.
    - Clean Air Delivery Rate (CADR) and Air Changes per Hour (ACH) calculator.
- **Verification Gate:** `vitest run tests/unit` achieves 100% pass rate with $\ge 90\%$ branch coverage across all domain algorithms.

---

### Phase 2: Live Data Ingestion Pipeline & Provenance
- **Goal:** Build resilient ingestion pipeline with multi-provider failover.
- **Deliverables:**
  - `src/server/air-quality/cpcb-provider.ts`: Ingestion of CAAQMS data from `data.gov.in` (Resource `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69`).
  - `src/server/air-quality/openaq-provider.ts`: OpenAQ v3 secondary fallback provider (`iso=IN`).
  - `src/server/air-quality/cams-forecast-provider.ts`: 5-day CAMS Global atmospheric forecast client.
  - `src/server/air-quality/weather-provider.ts`: Open-Meteo meteorological dispersion provider.
  - `src/server/air-quality/cache.ts`: In-memory / Upstash Redis cache with 15m observed and 3h forecast TTL.
  - `src/server/air-quality/quality-evaluator.ts`: Stale ($>4\text{h}$) and outlier tagging (`SUSPECT_EXTREME`).
- **Verification Gate:** Integration tests pass against mocked HTTP responses; upstream failure triggers seamless failover within 3,000 ms.

---

### Phase 3: AI Inference & Deterministic Fallback Engine
- **Goal:** Contextual advisory generation with factual evidence anchoring and high availability.
- **Deliverables:**
  - `src/server/ai/gemini-client.ts`: Google Gemini client (`@google/genai`) using structured JSON output mode (`temperature: 0.2`).
  - `src/server/ai/prompt-synthesizer.ts`: Injection-safe prompt builder anchoring verified CPCB AQI as immutable evidence with citation verification.
  - `src/server/ai/deterministic-recommender.ts`: Pure rule-based recommendation expert engine.
  - Circuit-breaker and fault-injection coordinator (fallback on timeout $>5000\text{ ms}$ or schema violation).
- **Verification Gate:** Vitest tests prove 100% of malformed or timed-out AI requests return valid deterministic recommendations flagged `generator: "RULE_ENGINE"`.

---

### Phase 4: Identity, Firebase Admin SDK & Privacy Rights
- **Goal:** Secure identity management, server-side UID isolation, and statutory DPDP Act compliance.
- **Deliverables:**
  - Client Firebase Auth integration:
    - Google Sign-In.
    - Passwordless Email Link.
  - Server Token Guard (`src/server/auth/token-guard.ts`):
    - Firebase ID token cryptographic verification via Firebase Admin SDK.
    - Server-side UID derivation.
  - Server Repository (`src/server/db/user-repository.ts`):
    - UID-scoped Firestore operations.
  - Privacy endpoints (`/api/user/privacy`):
    - 1-Click machine-readable JSON data export (`GET /api/user/privacy/export`).
    - 1-Click cascading account hard deletion (`DELETE /api/user/privacy/account`).
- **Verification Gate:** Cross-user IDOR access attempts return HTTP 403 Forbidden; account deletion cascades completely.

---

### Phase 5: Accessible UI, Dynamic Context & Localization
- **Goal:** Responsive, keyboard-navigable frontend supporting English, Bengali, and Hindi.
- **Deliverables:**
  - Next.js App Router views:
    - `/`: Live AQI map (Leaflet with OSM tiles), nearest station search, and CAMS forecast view.
    - `/routine`: 24-hour diurnal planner with exposure minimization timeline.
    - `/indoor`: Indoor Air Quality Coach with ventilation & filtration calculators.
    - `/settings`: Household profile editor, language selector, and privacy center.
  - Accessibility implementation:
    - Keyboard focus management and ARIA live regions.
    - 5 standard UI states (idle, loading, empty, error, stale/unavailable).
  - Localization dictionaries (`en.json`, `bn.json`, `hi.json`).
- **Verification Gate:** Axe-core accessibility scan returns zero critical or serious violations (WCAG 2.1 Level AA compliant).

---

### Phase 6: Automated Security Test Generation & Hardening
- **Goal:** Execute the full 3,050 automated security test suite and eliminate any security flaws.
- **Deliverables:**
  - `tests/security/fuzzers/`: 700 input fuzzing & payload injection tests.
  - `tests/security/injection/`: 650 prompt injection & jailbreak safety tests.
  - `tests/security/auth/`: 600 token tampering & session tests.
  - `tests/security/idor/`: 600 cross-tenant Firestore isolation tests.
  - `tests/security/secrets/`: 500 client bundle hygiene scans.
- **Verification Gate:** All 3,050 automated security tests pass with 0 failures; repository size verified $< 10\text{ MB}$.

---

### Phase 7: Verification, Production Deployment & Submission
- **Goal:** Deploy live web application and finalize submission package.
- **Deliverables:**
  - Functional deployed web application on production hosting (e.g. Vercel / Cloud Run).
  - Public GitHub repository audit: single branch `main`, repo size strictly $< 10\text{ MB}$.
  - Demonstration video illustrating live AQI, routine planner, indoor coach, and privacy features.
  - LinkedIn engineering process post highlighting architecture, data integrity, and security standards.
- **Verification Gate:** 100% verification checklist passed; submission within the 3-attempt limit.
