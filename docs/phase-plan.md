# Phase-Wise Development Plan & Milestone Roadmap

> **Document ID:** HS-PLN-001  
> **Status:** Approved Baseline  
> **Target Release:** Production Web Application on `main` ($<10\text{ MB}$)

---

## 1. Phase Overview & Progress Dashboard

```mermaid
gantt
    title HawaSaathi Phase-Wise Development Roadmap
    dateFormat  YYYY-MM-DD
    section Architecture
    Phase 0: Architecture & Data Verification     :done, 2026-11-20, 2026-11-21
    section Implementation
    Phase 1: Domain Core & Schemas                :active, 2026-11-21, 2026-11-22
    Phase 2: Live Data Aggregator & Provenance    :2026-11-22, 2026-11-23
    Phase 3: AI Decision & Deterministic Fallback :2026-11-23, 2026-11-24
    Phase 4: Auth, Firestore & Privacy Rights     :2026-11-24, 2026-11-25
    Phase 5: Accessible UI & i18n Localization    :2026-11-25, 2026-11-26
    section Hardening
    Phase 6: 3,000+ Security Tests & ASVS Audit   :2026-11-26, 2026-11-27
    Phase 7: Production Deploy & Video Submission :2026-11-27, 2026-11-28
```

---

## 2. Phase-by-Phase Deliverables & Verification Gates

### Phase 0: Architecture, Data Verification & Security Baseline (CURRENT — COMPLETE)
- **Status:** **COMPLETED & LOCKED**
- **Deliverables:**
  - `AGENTS.md` with persistent engineering constraints.
  - [docs/requirements-matrix.md](file:///Users/agnidiptasarkar/Desktop/prompt_6/docs/requirements-matrix.md) establishing full bidirectional traceability.
  - [docs/architecture.md](file:///Users/agnidiptasarkar/Desktop/prompt_6/docs/architecture.md) detailing hexagonal layers and ADRs.
  - [docs/data-source-verification.md](file:///Users/agnidiptasarkar/Desktop/prompt_6/docs/data-source-verification.md) verifying CPCB, OpenAQ v3, and Open-Meteo CAMS.
  - [docs/user-context-model.md](file:///Users/agnidiptasarkar/Desktop/prompt_6/docs/user-context-model.md) defining composable context schemas.
  - [docs/threat-model.md](file:///Users/agnidiptasarkar/Desktop/prompt_6/docs/threat-model.md) mapping STRIDE and OWASP ASVS 5.0.0 Level 2.
  - [docs/security-acceptance-criteria.md](file:///Users/agnidiptasarkar/Desktop/prompt_6/docs/security-acceptance-criteria.md) detailing formal pass/fail criteria.
  - [docs/api-dependency-matrix.md](file:///Users/agnidiptasarkar/Desktop/prompt_6/docs/api-dependency-matrix.md) auditing external dependencies.
  - Repository size and single-branch safeguard scripts operational.
- **Verification Gate:** Formal sign-off on architecture before feature scaffolding.

---

### Phase 1: Core Domain Engine, Schemas & Unit Testing
- **Goal:** Implement pure business logic without external I/O or network dependencies.
- **Deliverables:**
  - `src/schemas/`: Zod boundary schemas (`air-quality`, `provenance`, `user-context`, `recommendation`, `routine`).
  - `src/domain/cpcb/`:
    - Piecewise linear interpolation calculator for all 8 pollutants.
    - Data sufficiency validator ($\ge 3$ pollutants, PM2.5 or PM10 required).
    - Worst-pollutant selector and dominant pollutant assigner.
  - `src/domain/user-context/`:
    - Composable household context validator.
    - Multi-generational vulnerability weighting matrix.
  - `src/domain/routine/`:
    - 24-hour diurnal timeline segmenter.
    - Particulate exposure vs emission reduction impact calculators.
    - Safety guardrails (blocking strenuous outdoor activity during Severe AQI).
  - `src/domain/indoor/`:
    - Ventilation guidance rules based on outdoor vs indoor particulate gradients.
    - Clean Air Delivery Rate (CADR) and Air Changes per Hour (ACH) calculator.
- **Verification Gate:** `vitest run tests/unit` achieves 100% pass rate with $\ge 90\%$ branch coverage.

---

### Phase 2: Live Data Aggregator & Provenance Ingestion
- **Goal:** Build resilient ingestion pipeline with multi-provider failover.
- **Deliverables:**
  - `src/server/air-quality/cpcb-provider.ts`: Ingestion of CAAQMS data from `data.gov.in` (Resource `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69`).
  - `src/server/air-quality/openaq-provider.ts`: OpenAQ v3 fallback provider (`countries_id=9`).
  - `src/server/air-quality/cams-forecast-provider.ts`: 5-day CAMS Global atmospheric forecast client.
  - `src/server/air-quality/weather-provider.ts`: Open-Meteo meteorological dispersion provider.
  - `src/server/air-quality/cache.ts`: In-memory KV cache with 15m observed and 3h forecast TTL.
  - `src/server/air-quality/quality-evaluator.ts`: Stale ($>4\text{h}$) and incomplete data tagging.
- **Verification Gate:** Integration tests pass against mocked HTTP responses; upstream failure triggers seamless failover within 3,000 ms.

---

### Phase 3: AI Inference & Deterministic Fallback Engine
- **Goal:** Contextual advisory generation with zero hallucination and 100% uptime guarantee.
- **Deliverables:**
  - `src/server/ai/gemini-client.ts`: Google Gemini client (`@google/genai`) using structured JSON schema output mode (`temperature: 0.2`).
  - `src/server/ai/prompt-synthesizer.ts`: Injection-safe prompt builder anchoring verified CPCB AQI as immutable evidence.
  - `src/server/ai/deterministic-recommender.ts`: Pure rule-based recommendation expert engine.
  - Circuit-breaker and fault-injection coordinator (fallback on timeout $>5000\text{ ms}$ or schema violation).
- **Verification Gate:** Vitest tests prove 100% of malformed or timed-out AI requests return valid deterministic recommendations flagged `RULE_ENGINE`.

---

### Phase 4: Authentication, Cloud Firestore & Privacy Rights
- **Goal:** Secure identity management, UID-scoped storage, and statutory DPDP Act compliance.
- **Deliverables:**
  - Client Firebase Auth integration:
    - Anonymous Guest Mode.
    - Google OAuth 2.0 PKCE.
    - Passwordless Email Magic Link.
    - Anonymous account conversion (`linkWithCredential`).
  - `firestore.rules`: UID-scoped rules restricting all reads/writes to `users/{userId}/**`.
  - Privacy endpoints (`/api/user/privacy`):
    - 1-Click machine-readable JSON data export.
    - 1-Click cascading account hard deletion.
- **Verification Gate:** Firestore emulator security rules tests pass 100%; cross-user IDOR access attempts return `PERMISSION_DENIED`.

---

### Phase 5: Accessible UI, Context Builder & Localization
- **Goal:** Responsive, keyboard-navigable frontend supporting English, Bengali, and Hindi.
- **Deliverables:**
  - Next.js App Router views:
    - `/`: Live AQI map, nearest station search, and CAMS forecast view.
    - `/routine`: 24-hour diurnal planner with exposure minimization timeline.
    - `/indoor`: Indoor Air Quality Coach with ventilation & filtration calculators.
    - `/settings`: Household profile editor, language selector, and privacy center.
  - Accessibility implementation:
    - Keyboard focus management and ARIA live regions.
    - 5 standard UI states (idle, loading, empty, error, stale/unavailable).
  - Localization dictionaries (`en.json`, `bn.json`, `hi.json`).
- **Verification Gate:** Axe-core accessibility scan returns zero critical or serious violations (WCAG 2.1 AA compliant).

---

### Phase 6: Automated Security Test Generation & Hardening
- **Goal:** Execute the full 3,050 automated security test suite and eliminate any security flaws.
- **Deliverables:**
  - `tests/security/fuzzers/`: 600 input fuzzing & payload injection tests.
  - `tests/security/injection/`: 550 prompt injection & jailbreak safety tests.
  - `tests/security/auth/`: 500 token tampering & session tests.
  - `tests/security/idor/`: 500 cross-tenant Firestore isolation tests.
  - `tests/security/cpcb/`: 500 calculation boundary and missing pollutant tests.
  - `tests/security/secrets/`: 400 client bundle hygiene scans.
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
