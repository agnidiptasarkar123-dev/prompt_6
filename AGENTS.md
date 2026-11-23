# AGENTS.md — Persistent Project Engineering Rules & Architecture Directives

> **Project:** HawaSaathi — Personalised Urban Air Quality Intelligence Platform for Indian Cities  
> **Status:** Architecture & Planning Phase (Implementation Locked)  
> **Role:** Principal Software Architect, Data Engineer & Application Security Engineer  
> **Baseline Standard:** Strict TypeScript, OWASP ASVS 5.0.0 Level 2, MoEFCC CPCB NAQI (2014) Standard

---

## 1. Prime Directives & Hard Constraints

Every contributor, agent, and subagent working on HawaSaathi MUST abide by these immutable constraints:

1. **Phase Lock:** We are in the ARCHITECTURE AND PLANNING PHASE. Do not write application features, install non-essential dependencies, scaffold boilerplate prematurely, or attempt deployments until explicit sign-off on the architecture.
2. **Repository Safeguards:**
   - **Single Branch:** Exactly one branch: `main`. Feature branches must not be pushed to remote origin.
   - **Repository Size Limit:** Total repository size must stay strictly below **10 MB** at all times. Never commit binary datasets, MP4/video files, heavy fonts, unoptimized images, node_modules, build outputs, or database dumps.
   - **Remote Status:** Public repository setup is currently **PENDING**. No remote origin is configured, no remote visibility is assumed, and no push or remote creation may occur without explicit user approval.
   - **Submission Cap:** Maximum three (3) official submission attempts. 100% verification required before any release tag or submission.
3. **Data Integrity & Truthfulness:**
   - **NEVER** hardcode, mock, invent, or simulate real-time pollution readings in production code.
   - **NEVER** prompt an LLM to compute, estimate, or guess real-time or historical Air Quality Index (AQI). All AQI calculations are executed by our deterministic CPCB Sub-Index Engine.
   - **Four-Way Distinction:** The system must strictly distinguish between:
     - **Type A:** Official CPCB-published AQI (reported directly by CAAQMS bulletin).
     - **Type B:** Independently calculated CPCB-methodology AQI (computed by HawaSaathi from validated raw sensor concentrations).
     - **Type C:** Raw pollutant concentration (measured physical value with timestamp, unit, and averaging window).
     - **Type D:** Modelled atmospheric forecast (Open-Meteo CAMS Global ~45 km grid, strictly tagged `MODEL_FORECAST`).
   - **Record vs Station Semantics:** In the CPCB CAAQMS dataset (`data.gov.in`), reported records represent **individual pollutant measurement rows**, NOT unique stations. A single physical monitoring station produces multiple pollutant rows. Stations must be counted and grouped distinctly.
   - **Regulatory Averaging Semantics:** Never assume `avg_value` in an API feed represents a valid regulatory 24-hour or 8-hour average without verified data sufficiency (minimum 16 hours for 24h window; minimum 6 hours for 8h window). Do not calculate official-looking AQI from incomplete or unverified evidence.
4. **Dynamic Context (Anti-Enum):**
   - **NEVER** reduce a user to a static enum or persona archetype (e.g. `type Persona = 'athlete' | 'cop' | 'elderly'`). Real households contain multi-generational vulnerabilities, variable daily commute modes, flexible schedules, and unique indoor micro-environments. Health info is strictly minimised, non-diagnostic, and optional.
5. **Security Baseline (OWASP ASVS 5.0.0 Level 2):**
   - Target minimum **3,000 meaningful automated security test cases** covering input fuzzing, prompt injection vectors, authentication edge cases, IDOR, and schema boundary violations.
   - CPCB mathematical boundary tests belong strictly to **Domain Correctness Tests**, and are NOT counted toward the 3,000 security test target.
   - Zero secrets in frontend bundles (`NEXT_PUBLIC_` restricted strictly to public configuration).

---

## 2. Engineering Standards & Technology Stack

### 2.1 Framework & Runtime
- **Framework:** Next.js 16.x (latest stable supported release) with App Router and Node.js runtime ($\ge 20.x$).
- **TypeScript Rigor:** Strict mode enabled (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `noUncheckedIndexedAccess: true`). No `any` types permitted.
- **Boundary Validation (Zod):** Every external ingress and egress boundary MUST be validated with Zod schemas.

### 2.2 Map Visualization & Tile Policies
- **Tile Provider:** OpenStreetMap Standard Tile Layer rendered with OSM Carto style (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`).
- **Licensing & Attribution:** OpenStreetMap database is licensed under Open Data Commons Open Database License (ODbL) 1.0. Effective July 1, 2020, standard map style tiles from OSMF tile servers are published as a Produced Work under ODbL 1.0 (the outdated CC BY-SA 2.0 license no longer applies). Mandatory attribution: `© OpenStreetMap contributors` linked to `https://www.openstreetmap.org/copyright`.
- **Tile Terms:** Complies with OpenStreetMap Foundation (OSMF) Tile Usage Policy: client HTTP caching is strictly honored; automated scraping or bulk pre-downloading is prohibited. Standard browser requests carry standard browser headers (custom User-Agent is not required or feasible on browser `<img>` requests). Standard OSM tiles must NOT be used as an unrestricted production tile service.
- **Alternative Production Providers:** For production scale exceeding OSMF acceptable usage, use commercial tile services (Stadia Maps, Mapbox, CARTO) or self-hosted vector tiles (Protomaps PMTiles via CDN).

### 2.3 Exception & Error Handling
- **No Swallowed Exceptions:** Never write empty `catch` blocks or log-and-continue without structured error states.
- Domain error hierarchy: `DataSourceUnavailableError`, `DataStaleError`, `InsufficientDataError`, `AIServiceUnavailableError`, `SchemaValidationError`, `UnauthorizedError`, `ForbiddenError`.
- UI async state handling: `idle`, `loading`, `empty`, `error`, `unavailable / stale`.

---

## 3. Data Pipeline & CPCB Standards (MoEFCC NAQI 2014)

### 3.1 CPCB Calculation Rules & Sufficiency Standard
- **Monitored Parameters (8 total):**
  - 24-hourly average: $PM_{10}, PM_{2.5}, NO_2, SO_2, NH_3, Pb$ (all in $\mu\text{g/m}^3$).
  - 8-hourly average: $CO$ (in $\text{mg/m}^3$), $O_3$ (in $\mu\text{g/m}^3$).
- **Running Average Data Sufficiency:**
  - 24-hour average requires a minimum of **16 hours** of valid hourly readings (67% data availability rule).
  - 8-hour average requires a minimum of **6 hours** of valid hourly readings (75% data availability rule).
  - If fewer hours exist, the sub-index for that parameter is marked `INSUFFICIENT_WINDOW` and cannot be computed.
- **Overall AQI Sufficiency Requirement:**
  - A station AQI is valid ONLY IF at least **3 pollutants** are available with valid sub-indices, and at least ONE of them is either $PM_{2.5}$ or $PM_{10}$.
- **Insufficiency Handling:**
  - If sufficiency fails, overall AQI MUST be `null`.
  - The UI displays individual pollutant concentrations and their calculated sub-indices with an explicit explanation: *"Overall CPCB AQI unavailable: fewer than 3 valid pollutants monitored or missing particulate parameters."*
- **Sub-index Formula:** Piecewise linear interpolation:
  $$I_p = \frac{I_{Hi} - I_{Lo}}{BPHi - BPLo} \times (C_p - BPLo) + I_{Lo}$$
- **Final AQI:** The highest sub-index determines the overall AQI and the prominent pollutant:
  $$AQI = \max(I_1, I_2, \dots, I_n)$$

### 3.2 Provenance Preservation Contract
Every air quality data point stored or displayed must preserve its complete provenance:
- `stationId`, `stationName`, `city`, `state`, `latitude`, `longitude`.
- `provider`: `"CPCB_CAAQMS"` | `"OPENAQ"` | `"OPEN_METEO_CAMS"`.
- `observationTime`: ISO 8601 UTC timestamp of measurement.
- `retrievalTime`: ISO 8601 UTC timestamp when our server fetched it.
- `pollutant`: Identifier, unit (e.g., `µg/m³`, `mg/m³`), averaging period (`1h`, `8h`, `24h`).
- `quality`: `"VERIFIED"` | `"PROVISIONAL"` | `"STALE"` | `"MODEL_FORECAST"`.
- A cached reading must NEVER be represented as a new observation.

---

## 4. AI Orchestration & Deterministic Fallback Rules

1. **Role of Gemini:** Synthesizes evidence-backed contextual advice from validated ground readings, CAMS forecasts, weather dispersion metrics, and user-provided micro-environment context.
2. **Defensible Factuality Pipeline:**
   - Pre-calculated CPCB metrics and weather variables are injected as immutable facts into the prompt.
   - The model is explicitly forbidden from calculating or altering AQI.
   - Server-side output validation parses all completions against `RecommendationResponseSchema`.
   - All factual claims in output must cite verified evidence IDs supplied in the prompt; invalid citations fail validation.
3. **Availability Objective:** 99.9% uptime is an **architectural engineering objective**, not an achieved contractual SLA.
4. **Deterministic Fallback Engine:** If Gemini fails, times out (>5000ms), or returns schema-violating output, the system transitions to our deterministic rule-based engine (`DeterministicRecommender`). The fallback engine provides safe, category-aware behavioral guidance and **never invents measurements**.

---

## 5. Security & Privacy Safeguards (ASVS 5.0.0 Level 2)

1. **Authoritative Access Architecture:** Next.js Backend-for-Frontend (BFF) server routes with Firebase Admin SDK.
   - Client authenticates with Firebase Auth (Google Sign-In or Passwordless Email Link) to obtain a Firebase ID token.
   - Client sends token in `Authorization: Bearer <token>` to BFF API routes.
   - Backend API routes verify the token via Firebase Admin SDK (`verifyIdToken`).
   - Backend derives `uid` directly from the verified token and enforces UID ownership in every repository operation.
   - Cloud Firestore client access rules are set to `allow read, write: if false;` (defense-in-depth: all mutations flow through BFF).
2. **Guest Mode (Local Only):** Unauthenticated users get full access to live AQI, routine planner, and indoor coach. Sensitive user context is kept solely in client-side ephemeral storage (`sessionStorage`). Zero cloud database persistence for guests.
3. **Data Privacy (DPDP Act 2023 / GDPR):**
   - Zero health data profiling or sharing.
   - Health info strictly minimised to optional, non-diagnostic sensitivity checkboxes (e.g. self-reported respiratory sensitivity).
   - 1-Click Complete Data Export (machine-readable JSON).
   - 1-Click Account Deletion (cascading hard delete across all user data).
4. **No Secrets in Frontend:** API keys (`GEMINI_API_KEY`, `DATA_GOV_IN_API_KEY`, `OPENAQ_API_KEY`, Firebase Admin credentials) are accessible strictly within server runtime.

---

## 6. Verification Before Completion

Before claiming any task or phase complete:
- Run typecheck (`tsc --noEmit`).
- Run linter (`eslint .`).
- Run full test suite including security test generators.
- Verify repo size: `git count-objects -vH` must show `< 10 MB`.
- Verify single branch: `git branch -avv` shows only `main`.
