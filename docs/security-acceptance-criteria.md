# Security Acceptance Criteria & ASVS 5.0.0 Verification Standard

> **Document ID:** HS-SEC-AC-001  
> **Status:** Revised Baseline (Post-Audit)  
> **Standard:** OWASP ASVS 5.0.0 (Level 2), OWASP Top 10 for LLM (2025), DPDP Act 2023 (India)  
> **Execution Status:** Planning Phase. Verification criteria defined below are **BENCHMARKS FOR RELEASE SIGN-OFF**.

---

## 1. Traceable Security Acceptance Criteria (SAC)

To achieve formal security verification sign-off, HawaSaathi must satisfy every acceptance criterion defined below across all testing environments before release.

### 1.1 Category 1: Authentication & Session Integrity (ASVS V2 & V3)

| Criterion ID | Requirement Statement | Verification Method | Pass / Fail Condition | Current Status |
| :--- | :--- | :--- | :--- | :--- |
| **SAC-AUTH-01** | **Guest Access (Local Only):** Users can access the live dashboard, indoor coach, and routine planner without creating an account or submitting credentials. No records are created in Cloud Firestore. | Automated E2E & Cookie inspection | **PASS:** Unauthenticated user completes routine without any session cookie or server-side user record created. State resides 100% in `sessionStorage`. | `PLANNED (Phase 5)` |
| **SAC-AUTH-02** | **Firebase ID Token Verification:** Protected API routes must verify Firebase ID tokens using the Firebase Admin SDK (`verifyIdToken`). | Unit & Integration test | **PASS:** Requests with missing, expired, or forged tokens return HTTP 401 Unauthorized. | `PLANNED (Phase 4)` |
| **SAC-AUTH-03** | **Backend UID Derivation:** The authenticated user's `uid` must be derived directly from the verified Firebase ID token on the server, never accepted from unverified request body parameters. | Security unit test | **PASS:** Manipulating a `userId` field in the request body has zero effect; server repository strictly uses `decodedToken.uid`. | `PLANNED (Phase 4)` |
| **SAC-AUTH-04** | **Firebase Auth Sign-In:** Google Sign-In and Passwordless Email Link must be handled via the Firebase Client SDK with platform-managed token lifecycles. | Integration test | **PASS:** Sign-in completes and issues a valid ID token without exposing custom client secrets. | `PLANNED (Phase 4)` |
| **SAC-AUTH-05** | **Session Security & Transport:** All client-to-backend communication must occur over TLS 1.3 with standard security headers. | Automated header scan | **PASS:** Responses carry HSTS, CSP, X-Content-Type-Options, and Referrer-Policy headers. | `PLANNED (Phase 4)` |

---

### 1.2 Category 2: Backend-for-Frontend (BFF) Tenant Isolation & Database Security (ASVS V4)

| Criterion ID | Requirement Statement | Verification Method | Pass / Fail Condition | Current Status |
| :--- | :--- | :--- | :--- | :--- |
| **SAC-DATA-01** | **Server-Enforced Tenant Scoping:** All Firestore operations executed via Firebase Admin SDK must be explicitly scoped to `users/{verified_uid}/**`. | Server Repository Unit Tests | **PASS:** Repository methods accept `verifiedUid` derived from token and reject queries omitting the tenant filter. | `PLANNED (Phase 4)` |
| **SAC-DATA-02** | **Client-Side Direct Access Lockout:** Cloud Firestore Security Rules must deny all direct client reads and writes (`allow read, write: if false;`). | Firebase Emulator Suite Scan | **PASS:** Direct client SDK calls (`getDoc`, `setDoc`) from browser context fail with `PERMISSION_DENIED`. | `PLANNED (Phase 4)` |
| **SAC-DATA-03** | **Cascading Account Erasure:** When a user triggers account deletion, all subcollections under `users/{uid}` and the user's Firebase Auth identity must be hard-deleted. | Integration test on `/api/user/privacy/account` | **PASS:** Post-deletion verification query confirms 0 documents exist under `users/{uid}` and `adminAuth.getUser(uid)` throws not-found. | `PLANNED (Phase 4)` |
| **SAC-DATA-04** | **Shared Rate Limiting:** All public API routes must be protected by a shared token bucket rate limiter backed by Upstash Redis. | Load generator fuzzer | **PASS:** Rate limit is consistently enforced across parallel serverless instances (HTTP 429 returned after threshold). | `PLANNED (Phase 4)` |

---

### 1.3 Category 3: Gemini AI Orchestration & Injection Defense (OWASP LLM Top 10)

| Criterion ID | Requirement Statement | Verification Method | Pass / Fail Condition | Current Status |
| :--- | :--- | :--- | :--- | :--- |
| **SAC-AI-01** | **Backend-Only Inference:** Gemini API key (`GEMINI_API_KEY`) must never be bundled into client assets or called directly from client browsers. | Bundle AST scanner & network inspection | **PASS:** Client bundle contains zero API keys; all AI calls route through `/api/recommendations/generate`. | `PLANNED (Phase 3)` |
| **SAC-AI-02** | **Prompt Injection Resistance:** Untrusted user input (household notes, activity labels) must be structurally segregated in system prompts and cannot override safety directives. | 650 automated prompt injection test cases | **PASS:** Injected payloads attempting to recommend strenuous outdoor activity during Severe smog are ignored; safety guidelines prevail. | `PLANNED (Phase 6)` |
| **SAC-AI-03** | **Factual Evidence Anchoring:** Pre-calculated CPCB metrics must be injected into prompts as immutable facts; the system prompt must explicitly forbid the model from calculating or estimating AQI. | Automated prompt & response test | **PASS:** Model response never generates an alternate or conflicting AQI number. | `PLANNED (Phase 3)` |
| **SAC-AI-04** | **Citation Verification & Zod Output Parsing:** All model completions must strictly conform to `RecommendationResponseSchema` and cite valid evidence IDs supplied in the prompt. | Malformed JSON & schema violation fuzzer | **PASS:** 100% of malformed replies or responses citing invalid evidence IDs trip the circuit breaker and transition to `DeterministicRecommender`. | `PLANNED (Phase 3)` |
| **SAC-AI-05** | **Zero Agency & Execution Boundary:** The model has zero access to external tools, database write functions, or shell execution. | Architectural static analysis | **PASS:** Inference is strictly text-to-structured-JSON with zero function-calling enabled. | `PLANNED (Phase 3)` |

---

### 1.4 Category 4: Air Quality Data Truthfulness & CPCB Engine

| Criterion ID | Requirement Statement | Verification Method | Pass / Fail Condition | Current Status |
| :--- | :--- | :--- | :--- | :--- |
| **SAC-AQ-01** | **Zero Mock Pollution Data:** Production builds must never render hardcoded, simulated, or randomized air pollution values. | Codebase AST audit & negative assertions | **PASS:** Zero instances of Math.random(), mock arrays, or hardcoded AQI values in production build. | `PLANNED (Phase 2)` |
| **SAC-AQ-02** | **CPCB Sufficiency Enforcement:** Overall AQI must be rendered if and only if $\ge 3$ pollutants are present, with at least one being $PM_{2.5}$ or $PM_{10}$, and running average windows meet 16-hr / 6-hr thresholds. | Domain Correctness Test Suite | **PASS:** Station lacking sufficiency renders `null` AQI with `INSUFFICIENT_DATA` badge; individual sub-indices displayed with explanation. | `PLANNED (Phase 1)` |
| **SAC-AQ-03** | **Four-Way Data Typology Separation:** The system must strictly distinguish Type A (Official CPCB), Type B (Independent CPCB), Type C (Raw Sensor), and Type D (Model Forecast) in schemas and UI. | UI & Schema Contract Verification | **PASS:** Model forecasts are explicitly tagged `MODEL_FORECAST` with 45km grid disclaimer; sensor readings tagged with physical station ID. | `PLANNED (Phase 1)` |
| **SAC-AQ-04** | **Data Provenance & Outlier Preservation:** Every measurement record must carry station ID, station name, coordinates, provider, observation timestamp, retrieval timestamp, unit, and averaging period. Genuine extreme readings are flagged `SUSPECT_EXTREME` without being dropped. | Schema assertion test | **PASS:** 100% of emitted air quality payloads conform to `DataProvenanceRecordSchema`. | `PLANNED (Phase 2)` |

---

### 1.5 Category 5: Privacy & Statutory Compliance (DPDP Act 2023 / GDPR)

| Criterion ID | Requirement Statement | Verification Method | Pass / Fail Condition | Current Status |
| :--- | :--- | :--- | :--- | :--- |
| **SAC-PRIV-01** | **1-Click Machine-Readable Export:** Authenticated users can download their complete profile, routines, and consent history as structured JSON. | API integration test on `/api/user/privacy/export` | **PASS:** Exported payload conforms to `UserDataExportSchema` containing all user-scoped data. | `PLANNED (Phase 4)` |
| **SAC-PRIV-02** | **1-Click Complete Erasure:** Authenticated users can trigger account and data deletion with instantaneous cascading removal. | API integration test on `/api/user/privacy/account` | **PASS:** Verification query returns 0 documents across all collections for the user's UID. | `PLANNED (Phase 4)` |
| **SAC-PRIV-03** | **Data Minimization (Non-Diagnostic):** Health sensitivity checkboxes are strictly optional, non-diagnostic, and used solely for environmental exposure mitigation. | Schema omission testing | **PASS:** Creating an account and planning a routine with zero health data disclosed succeeds completely. | `PLANNED (Phase 1)` |

---

## 2. Planned Security Test Distribution (Target: 3,050 Cases)

```
[ Phase 6 ASVS 5.0.0 Security Verification Suite — PLANNED ]
├── Input Fuzzing & Malicious Payloads:        700 Tests (PLANNED)
├── LLM Prompt Injection & Safety Vectors:     650 Tests (PLANNED)
├── Authentication & Session Tampering:        600 Tests (PLANNED)
├── Backend Tenant Isolation & IDOR Matrix:    600 Tests (PLANNED)
└── Secret Scanning & Bundle Hygiene:          500 Tests (PLANNED)
─────────────────────────────────────────────────────────────────────────────
TOTAL PLANNED SECURITY ASSERTIONS:           3,050 (Excludes CPCB Math)
```
