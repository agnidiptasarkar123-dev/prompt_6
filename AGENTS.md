# AGENTS.md — Persistent Project Engineering Rules & Architecture Directives

> **Project:** HawaSaathi — Personalised Urban Air Quality Intelligence Platform for Indian Cities  
> **Status:** Architecture & Planning Phase (Implementation Locked)  
> **Role:** Principal Software Architect & Lead Security Engineer  
> **Baseline Standard:** Strict TypeScript, OWASP ASVS 5.0.0, Zero-Hallucination Air Quality Engine

---

## 1. Prime Directives & Hard Constraints

Every contributor, agent, and subagent working on HawaSaathi MUST abide by these immutable constraints:

1. **Phase Lock:** We are in the ARCHITECTURE AND PLANNING PHASE. Do not write application features, install non-essential dependencies, scaffold boilerplate prematurely, or attempt deployments until explicit sign-off on the architecture.
2. **Repository Safeguards:**
   - **Single Branch:** Exactly one branch: `main`. Feature branches must not be pushed to remote origin.
   - **Repository Size Limit:** Total repository size must stay strictly below **10 MB** at all times. Never commit binary datasets, MP4/video files, heavy fonts, unoptimized images, node_modules, build outputs, or database dumps.
   - **Submission Cap:** Maximum three (3) official submission attempts. 100% verification required before any release tag or submission.
3. **Data Integrity & Truthfulness:**
   - **NEVER** hardcode, mock, invent, or simulate real-time pollution readings in production code.
   - **NEVER** prompt an LLM to compute, estimate, or guess real-time or historical Air Quality Index (AQI). All AQI calculations are executed by our deterministic CPCB Sub-Index Engine.
   - **Clear Boundary:** Ground-based physical sensor readings (CPCB/CAAQMS/OpenAQ) and atmospheric dispersion models (Open-Meteo CAMS Global) MUST be strictly separated in UI and schemas. Never blend modelled forecasts into observed sensor badges.
4. **Dynamic Context (Anti-Enum):**
   - **NEVER** reduce a user to a static enum or persona archetype (e.g. `type Persona = 'athlete' | 'cop' | 'elderly'`). Real households contain multi-generational vulnerabilities, variable daily commute modes, flexible schedules, and unique indoor micro-environments.
5. **Security Baseline (OWASP ASVS 5.0.0):**
   - Target minimum **3,000 meaningful automated security test cases** covering input fuzzing, prompt injection vectors, authentication edge cases, IDOR, and schema boundary violations.
   - Zero secrets in frontend bundles (`NEXT_PUBLIC_` restricted strictly to public URLs).

---

## 2. Engineering Standards & Code Quality

### 2.1 TypeScript Rigor
- Strict mode enabled (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `noUncheckedIndexedAccess: true`).
- No `any` types permitted. Use `unknown` with type guards or schema validation when dealing with untyped boundaries.
- Explicit return types on all domain functions, API route handlers, and service methods.

### 2.2 Boundary Validation (Zod)
- Every external ingress and egress boundary MUST be validated with Zod:
  - External API responses (CPCB/OGD, OpenAQ, Open-Meteo).
  - LLM completion payloads (Gemini API structured output).
  - HTTP request headers, query parameters, and JSON bodies.
  - Database records and user session state.
- Parse failures must never crash the service; they must trigger domain-specific error handling and fallbacks.

### 2.3 Exception & Error Handling
- **No Swallowed Exceptions:** Never write empty `catch` blocks or log-and-continue without structured error states.
- Domain error hierarchy:
  - `DataSourceUnavailableError` (API down or timeout).
  - `DataStaleError` (Timestamp older than threshold).
  - `InsufficientDataError` (CPCB criteria < 3 pollutants or missing PM).
  - `AIServiceUnavailableError` (Gemini API 5xx/rate limit).
  - `SchemaValidationError` (Malformed payload).
  - `UnauthorizedError` / `ForbiddenError`.
- Every UI component consuming async data must handle all 5 standard states:
  1. `idle`
  2. `loading` (accessible skeleton / spinner with aria-live)
  3. `empty` (no stations found / no routines scheduled)
  4. `error` (actionable recovery message + retry button)
  5. `unavailable` / `stale` (clear visual warning badge + timestamp)

### 2.4 Accessibility & UI Standards
- WCAG 2.1 Level AA compliance throughout.
- Full keyboard navigability (logical tab order, visible focus rings, escape to dismiss modals/menus).
- Accessible color contrast (minimum 4.5:1 for normal text, 3:1 for large text and UI components; tested against dark mode and AQI color palettes).
- Internationalization (i18n): Native support for **English**, **Bengali (বাংলা)**, and **Hindi (हिन्दी)**.

---

## 3. Data Pipeline & CPCB Standards

### 3.1 CPCB Calculation Rules (National AQI Standard, 2014)
- **Monitored Parameters:** $PM_{10}$, $PM_{2.5}$, $NO_2$, $O_3$, $CO$, $SO_2$, $NH_3$, $Pb$.
- **Data Sufficiency Threshold:** A station AQI is valid ONLY IF at least **3 pollutants** are available, and at least ONE of them is either $PM_{2.5}$ or $PM_{10}$.
- If sufficiency fails:
  - The overall AQI MUST NOT be computed or displayed.
  - The UI must display individual pollutant concentrations with their corresponding sub-indices and a prominent note: *"Overall CPCB AQI unavailable due to insufficient pollutant parameters (minimum 3 required including PM2.5/PM10)."*
- **Sub-index Formula:** Piecewise linear interpolation:
  $$I_p = \frac{I_{Hi} - I_{Lo}}{BPHi - BPLo} \times (C_p - BPLo) + I_{Lo}$$
- **Final AQI:** The highest sub-index determines the overall AQI and the "prominent pollutant":
  $$AQI = \max(I_1, I_2, \dots, I_n)$$

### 3.2 Provenance Preservation
Every air quality data point stored or displayed must preserve its complete provenance contract:
- `stationId`, `stationName`, `city`, `state`, `latitude`, `longitude`.
- `provider`: `"CPCB_CAAQMS"` | `"OPENAQ"` | `"WAQI_RAW"` | `"OPEN_METEO_CAMS"`.
- `observationTime`: ISO 8601 UTC timestamp of measurement.
- `retrievalTime`: ISO 8601 UTC timestamp when our server fetched it.
- `pollutant`: Identifier, unit (e.g., `µg/m³`, `mg/m³`), averaging period (`1h`, `8h`, `24h`).
- `quality`: `"VERIFIED"` | `"PROVISIONAL"` | `"STALE"` | `"MODEL_FORECAST"`.

---

## 4. AI Orchestration & Deterministic Fallback Rules

1. **Role of Gemini:** Synthesizes evidence-backed advice from validated ground readings, CAMS forecasts, weather dispersion metrics, and user-provided micro-environment context.
2. **Zero Hallucination Anchor:** The prompt injects immutable factual evidence. The model is instructed never to produce health advice contrary to CPCB/WHO exposure guidelines.
3. **Structured Schema Enforcement:** Gemini outputs strictly typed JSON matching `RecommendationResponseSchema`.
4. **Deterministic Fallback Engine:** If Gemini fails, times out (>5000ms), or returns schema-violating output, the system seamlessly transitions to our deterministic rule-based engine (`DeterministicRecommender`). The user receives verified recommendations without interruption, tagged with `generator: "RULE_ENGINE"`.

---

## 5. Security & Privacy Safeguards (ASVS 5.0.0)

1. **Guest Mode:** Unauthenticated users get full access to live AQI, routine planner, and indoor coach. Sensitive user context is kept solely in client-side ephemeral storage (`sessionStorage` or local memory).
2. **Authenticated Mode:** Google OAuth 2.0 (PKCE) + Passwordless Magic Link. Tokens verified cryptographically in backend middleware.
3. **UID-Scoped Isolation:** All database tables enforce strict tenant isolation using UID matching. Cross-user access is impossible by design.
4. **Data Privacy (DPDP Act 2023 / GDPR):**
   - Zero health data profiling or sharing.
   - 1-Click Complete Data Export (machine-readable JSON).
   - 1-Click Account Deletion (hard delete cascading to all child records).
5. **No Secrets in Frontend:** API keys (`GEMINI_API_KEY`, `DATA_GOV_IN_API_KEY`, `OPENAQ_API_KEY`, `AUTH_SECRET`) are accessible strictly within server runtime.

---

## 6. Verification Before Completion

Before claiming any task or phase complete:
- Run typecheck (`tsc --noEmit`).
- Run linter (`eslint .`).
- Run full test suite including security test generators.
- Verify repo size: `git count-objects -vH` must show `< 10 MB`.
- Verify single branch: `git branch -a` shows only `main`.
