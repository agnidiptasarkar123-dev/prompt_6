# Architecture Decision Log & Technical Dependency Audit

> **Document ID:** HS-ADL-001  
> **Status:** Revised Baseline (Phase 0 Audit Revisions)  
> **Phase:** Phase 0 Architecture Audit (Phase 1 Planning)

---

## 1. Overview & Purpose

This log documents every architectural decision, unresolved technical dependency, upstream external finding, and engineering trade-off for HawaSaathi. For every open or unresolved dependency, this document outlines the issue, why it matters, current evidence, required action, and whether feature implementation is blocked.

---

## 2. Unresolved Technical Dependencies & Issue Audit Log

| Issue ID | Issue Description | Why It Matters | Evidence Currently Available | Required Action | Implementation Blocked? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LOG-01** | **OpenAQ v3 API Key Provisioning** | OpenAQ v3 mandates an `X-API-Key` header on all `/v3/locations` requests. Without an active key, requests return `HTTP 401 Unauthorized`. | Direct curl to `https://api.openaq.org/v3/locations?iso=IN` on 2026-11-20 returned `HTTP/2 401 Unauthorized: A valid API key must be provided in the X-API-Key header.` | Register free developer account at explore.openaq.org and set `OPENAQ_API_KEY` in server environment before deploying live OpenAQ fallback. | **NO (Phase 1 unblocked; Phase 2 requires key)** |
| **LOG-02** | **data.gov.in Personal Developer Key & Burst Limit** | The public sample API key (`579b464d...`) works for initial testing, but live burst queries on 2026-11-20 returned `{"error": "Rate limit exceeded"}`. | Live curl query to `data.gov.in` returned HTTP 200 OK initially with 4,046 pollutant records, but subsequent burst calls failed with rate limit error. | Provision dedicated personal developer account key from data.gov.in and configure `DATA_GOV_IN_API_KEY` in server environment for production. | **NO (Phase 1 unblocked; developer key required for Phase 2/Production)** |
| **LOG-03** | **Public GitHub Remote Repository Setup** | The challenge mandates a public GitHub repository. Currently, local git repository is initialized on `main`, but no remote origin is configured. | `git remote -v` returns empty. Git branch is local `* main`. No push has occurred. | **PUBLIC REPOSITORY SETUP PENDING.** Create public GitHub repository and add remote origin (`git remote add origin <URL>`) upon explicit user authorization. | **NO (Local Phase 1 development unblocked; remote push pending user approval)** |
| **LOG-04** | **WAQI (aqicn.org) Integration Permission & Standard Mismatch** | WAQI standard free tokens are restricted to personal/non-commercial use. Redistribution and commercial display violate aqicn terms. WAQI calculated AQI follows US EPA standard, conflicting with CPCB. | Official WAQI terms state standard feeds cannot be repackaged into third-party commercial platforms. | Keep WAQI integration **DISABLED** (`NOT SUITABLE`) until explicit written collection, display, and redistribution permissions are established with aqicn.org. | **NO (CPCB on data.gov.in and OpenAQ provide primary & secondary coverage)** |
| **LOG-05** | **OpenStreetMap Tile Usage Policy at Scale** | Standard OpenStreetMap Carto tile servers (`tile.openstreetmap.org`) are volunteer-run, free community resources with zero uptime SLA and strict policies against high-volume traffic. | OSMF Tile Usage Policy states heavy usage is prohibited and client caching is mandatory. | Set Leaflet attribution to `© OpenStreetMap contributors` and honor browser caching. For production scale, configure fallback to Stadia Maps or self-hosted vector tiles (Protomaps PMTiles via CDN). | **NO (Phase 1 unblocked; standard OSM Carto sufficient for initial development)** |
| **LOG-06** | **Shared Rate Limiting for Multi-Instance Serverless** | In-memory token bucket rate limiting does not share state across serverless container instances (e.g. Vercel or Cloud Run scale-out). | Single-instance memory rate limiters allow request amplification across multiple parallel serverless cold starts. | Use Upstash Redis / Redis token bucket via `@upstash/ratelimit` for shared IP tracking across serverless instances. | **NO (In-memory fallback works for local dev; Redis connection configured via environment variable)** |

---

## 3. Formal Architecture Decision Records (ADRs)

### ADR-01: Framework Selection — Next.js 16.x (App Router) Full-Stack Architecture
- **Context:** HawaSaathi requires a unified full-stack architecture combining server-side credential isolation (Next.js API routes), edge middleware, and responsive React UI within a $<10\text{ MB}$ repository limit.
- **Decision:** Use **Next.js 16.x** App Router with Node.js runtime ($\ge 20.x$) and React 19.
- **Compatibility Requirements:**
  - Node.js runtime: $\ge 20.10.0$ LTS.
  - React / React DOM: 19.x.
  - TypeScript: $\ge 5.2$.
  - Target: ES2022.
- **Justification:**
  - Complete server-side isolation: API keys (`GEMINI_API_KEY`, `DATA_GOV_IN_API_KEY`, `OPENAQ_API_KEY`, Firebase Admin credentials) never reach the client bundle.
  - Eliminates multi-repository overhead, keeping the entire repository well below the 10 MB limit.
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

### ADR-04: CPCB Running Average Sufficiency Standard & Record Semantics
- **Context:** The CAAQMS dataset on `data.gov.in` reports 4,046 rows where each row represents an individual pollutant measurement, not a distinct station. Furthermore, raw `avg_value` cannot be assumed to be a regulatory average without sufficiency.
- **Decision:**
  - Group and count stations distinctly by `station` and `stationId` (~500–600 distinct stations nationwide).
  - Implement CPCB's official rolling-window rules: 24h average ($PM_{10}, PM_{2.5}, NO_2, SO_2, NH_3, Pb$) requires $\ge 16\text{ hours}$ of valid data (67% rule); 8h average ($CO, O_3$) requires $\ge 6\text{ hours}$ of valid data (75% rule).
  - Monitored units: $CO$ in $\text{mg/m}^3$; all other parameters in $\mu\text{g/m}^3$.
  - When criteria fail, overall AQI is `null` (`status: "INSUFFICIENT_DATA"`), while individual sub-indices that met the 16-hr / 6-hr window are displayed with an explanatory banner. Never calculate an official-looking AQI from incomplete evidence.

### ADR-05: AI Defensible Factuality Pipeline & Fallback
- **Context:** Free-tier AI APIs experience transient rate limits (429), regional downtime (503), or schema compliance variations. Claims of "factuality guaranteed" or "100% uptime" are scientifically and contractually indefensible.
- **Decision:** Deploy a defensible factuality pipeline:
  - Primary: Gemini API with structured JSON output, low temperature (0.2), and strict citation validation against injected evidence IDs.
  - Fallback: Local rule-based expert engine (`DeterministicRecommender`) based on CPCB Health Advisory guidelines and WHO exposure recommendations. Fallback engine **never invents measurements**.
  - 99.9% availability is treated as an **engineering design objective**, not an achieved contractual SLA.
  - Circuit breaker: 5,000 ms timeout instantly trips fallback with zero user interruption.
