# Architecture Decision Log & Technical Dependency Audit

> **Document ID:** HS-ADL-001  
> **Status:** Active Baseline  
> **Phase:** Phase 0 Architecture Audit (Phase 1 Planning)

---

## 1. Overview & Purpose

This log documents every major architectural decision, unresolved technical dependency, upstream external finding, and engineering trade-off for HawaSaathi. For every open or unresolved dependency, this document outlines the issue, why it matters, current evidence, required action, and whether feature implementation is blocked.

---

## 2. Unresolved Technical Dependencies & Issue Audit Log

| Issue ID | Issue Description | Why It Matters | Evidence Currently Available | Required Action | Implementation Blocked? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LOG-01** | **OpenAQ v3 API Key Provisioning** | OpenAQ v3 mandates an `X-API-Key` header on all `/v3/locations` requests. Without an active key, requests return `HTTP 401 Unauthorized`. | Direct curl to `https://api.openaq.org/v3/locations?iso=IN` on 2026-11-20 returned `HTTP/2 401 Unauthorized: A valid API key must be provided in the X-API-Key header.` | Register free developer account at explore.openaq.org and set `OPENAQ_API_KEY` in server environment before deploying live OpenAQ fallback. | **NO (Phase 1 unblocked; Phase 2 requires key)** |
| **LOG-02** | **WAQI (aqicn.org) Integration Permission & Redistribution Terms** | WAQI standard free tokens are restricted to personal/non-commercial use. Redistribution of aggregated feeds and commercial display may violate aqicn terms of service. | Official WAQI terms state standard feeds cannot be repackaged into third-party commercial platforms without explicit data partnership. WAQI calculated AQI follows US EPA standard, conflicting with CPCB. | Keep WAQI integration **DISABLED** (`NOT SUITABLE`) until explicit written collection, display, and redistribution permissions are established with aqicn.org. | **NO (CPCB on data.gov.in and OpenAQ provide primary & secondary coverage)** |
| **LOG-03** | **OpenStreetMap Tile Server Usage Policy & SLA** | Standard OpenStreetMap Carto tile servers (`tile.openstreetmap.org`) are volunteer-run, free community resources with strict usage limits (max 2 req/s, bulk downloading prohibited, no SLA). | OpenStreetMap Tile Usage Policy mandates client-side HTTP caching, custom User-Agent identifying the application, and prohibits heavy traffic or mission-critical reliance. | Set Leaflet `attribution` to `© OpenStreetMap contributors`, configure client tile cache headers, and set User-Agent string. For production scaling, plan fallback to self-hosted vector tiles (Protomaps / PMTiles). | **NO (Phase 1 unblocked; standard Leaflet OSM configuration sufficient for dev/demo)** |
| **LOG-04** | **data.gov.in Personal Developer Account Quota vs Sample Key** | The public sample API key (`579b464d...`) works for initial testing (HTTP 200 returned on 2026-11-20), but can be subject to undocumented rate throttles or sudden revocation by NIC/OGD India. | Live request on 2026-11-20 returned `HTTP 200 OK` with 4,046 total active records, but response headers show `X-Ratelimit-Limit: -1` (unspecified/untracked on sample key). | Provision dedicated personal developer API key from data.gov.in and configure `DATA_GOV_IN_API_KEY` in server environment before production launch. | **NO (Sample key verified functional for Phase 0/1 testing; developer key required for release)** |
| **LOG-05** | **Shared Rate Limiting for Serverless Multi-Instance Deployment** | In-memory token bucket rate limiting does not share state across serverless container instances (e.g. Vercel or Cloud Run scale-out). | Single-instance memory rate limiters allow request amplification across multiple parallel serverless cold starts. | Use Upstash Redis / Redis token bucket via `@upstash/ratelimit` or edge gateway rate-limiting for shared IP tracking across serverless instances. | **NO (In-memory fallback works for local dev; Redis connection configured via environment variable)** |
| **LOG-06** | **Lead ($Pb$) and Ammonia ($NH_3$) Sensor Scarcity in CAAQMS** | In reality, $>70\%$ of CAAQMS stations in India do not monitor Lead ($Pb$), and many do not monitor Ammonia ($NH_3$). | CPCB 2014 report explicitly recognizes this scarcity and structured the minimum 3-pollutant sufficiency rule (including PM2.5 or PM10) to accommodate stations lacking Pb/NH3. | Domain calculator handles missing Pb and NH3 gracefully, computing sub-indices where present without failing the overall station calculation if other pollutants satisfy the 3-pollutant sufficiency rule. | **NO (Fully addressed in CPCB calculation specification)** |

---

## 3. Formal Architecture Decision Records (ADRs)

### ADR-01: Framework Selection — Next.js 15.x (App Router) Full-Stack Architecture
- **Context:** HawaSaathi requires a unified full-stack architecture combining server-side credential isolation (Next.js API routes), edge middleware, and responsive React UI within a $<10\text{ MB}$ repository limit.
- **Decision:** Use Next.js 15.x App Router with Node.js runtime.
- **Justification:**
  - Complete server-side isolation: API keys (`GEMINI_API_KEY`, `DATA_GOV_IN_API_KEY`, `OPENAQ_API_KEY`, Firebase Admin credentials) never reach the client bundle.
  - Eliminates multi-repository overhead, keeping the entire repository well below the 10 MB limit.
  - Stable Active release with long-term support.
  - Note on repository size: Repository size is guaranteed by strict exclusion of binary assets and dependency artifacts in `.gitignore`, verified by pre-commit and CI scripts (`scripts/check-repo-size.sh`), not by build-time tree-shaking.

### ADR-02: Authoritative Access Architecture — BFF Server with Firebase Admin SDK
- **Context:** The previous draft contained an inconsistent client/backend Firestore access model, mixing direct client Firestore SDK writes with backend BFF API routes.
- **Decision:** Establish a single authoritative architecture: **Next.js Backend-for-Frontend (BFF) with Firebase Admin SDK**.
- **Justification:**
  - Client uses Firebase Client SDK strictly for Authentication (Google Sign-In, Passwordless Email Link) to obtain a verified Firebase ID token.
  - All profile persistence, routine management, and privacy operations flow through Next.js BFF API routes (`/api/user/...`).
  - Backend API routes verify the ID token via `admin.auth().verifyIdToken(token)`.
  - Backend code derives `uid` directly from the verified token and enforces UID ownership on every Firestore document operation (`users/{uid}/...`).
  - Firestore Security Rules deploy with default deny (`allow read, write: if false;`), locking out direct client manipulation and providing defense-in-depth.
  - Guest mode is 100% local-only in browser `sessionStorage`, persisting zero user records to Cloud Firestore.

### ADR-03: Zero-Hallucination Air Quality Engine & 4-Way Typology
- **Context:** LLMs cannot perform reliable piecewise linear interpolation and will hallucinate AQI values when prompted.
- **Decision:** Strictly forbid LLM calculation or estimation of AQI. Implement the MoEFCC 2014 NAQI formula in pure TypeScript (`src/domain/cpcb/`).
- **Justification:** Guarantees 100% mathematical precision and compliance with government standards. In addition, the platform explicitly categorizes air quality data into four distinct types in schemas and UI:
  - **Type A:** Official CPCB-published AQI (from CAAQMS bulletin).
  - **Type B:** Independently calculated CPCB-methodology AQI (from raw sensor values).
  - **Type C:** Raw pollutant concentration.
  - **Type D:** Modelled atmospheric forecast (Open-Meteo CAMS Global ~45 km grid).

### ADR-04: CPCB Running Average Sufficiency Standard
- **Context:** A raw hourly reading is not a 24-hour average. CPCB guidelines mandate specific running-average durations and data sufficiency thresholds.
- **Decision:** Implement CPCB's official rolling-window rules:
  - 24-hour average ($PM_{10}, PM_{2.5}, NO_2, SO_2, NH_3, Pb$) requires $\ge 16\text{ hours}$ of valid data (67% data availability).
  - 8-hour average ($CO, O_3$) requires $\ge 6\text{ hours}$ of valid data (75% data availability).
  - Overall AQI requires $\ge 3$ valid pollutants, including at least one particulate parameter ($PM_{2.5}$ or $PM_{10}$).
  - When criteria fail, overall AQI is `null` (`status: "INSUFFICIENT_DATA"`), while individual sub-indices that met the 16-hr / 6-hr window are displayed with an explanatory banner.

### ADR-05: AI Orchestration, Evidence Anchoring & Deterministic Fallback
- **Context:** Free-tier AI APIs experience transient rate limits (429), regional downtime (503), or schema compliance variations.
- **Decision:** Deploy a dual recommendation engine:
  - Primary: Gemini API with structured JSON output, low temperature (0.2), and strict citation validation against injected evidence IDs.
  - Fallback: Local rule-based expert engine (`DeterministicRecommender`) based on CPCB Health Advisory guidelines and WHO exposure recommendations.
  - Circuit breaker: 5,000 ms timeout instantly trips fallback with zero user interruption.
- **Justification:** Provides tailored conversational intelligence while guaranteeing high reliability (99.9% target availability) without dependency on external AI uptime.

### ADR-06: Separation of Testing Categories & Honest Reporting
- **Context:** The earlier test strategy conflated CPCB mathematical boundary tests with security tests.
- **Decision:** Formally separate test categories:
  - Security Tests ($\ge 3,000$ automated tests targeting OWASP ASVS 5.0.0 Level 2).
  - Domain Correctness Tests (CPCB breakpoint math, running average windows, routine calculators).
  - Integration Tests (HTTP mock fixtures, Gemini fallback, Firebase token verification).
  - Accessibility Tests (Axe-core WCAG 2.1 AA).
  - Performance Tests (latency, bundle size).
  - End-to-End Tests (Playwright browser flows).
- **Execution Truthfulness:** Mark all planned tests as `PLANNED / NOT EXECUTED` until feature code is implemented and tests are run.
