# HawaSaathi (हवासार्थी / হাভাসাথী)
### Personalised Urban Air Quality Intelligence Platform for Indian Cities

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Branch: main](https://img.shields.io/badge/Branch-main_only-success.svg)]()
[![Repository Size](https://img.shields.io/badge/Repo_Size-%3C10MB-brightgreen.svg)]()
[![Security: OWASP ASVS 5.0.0](https://img.shields.io/badge/Security-ASVS_5.0.0_L2-blueviolet.svg)]()
[![TypeScript: Strict](https://img.shields.io/badge/TypeScript-Strict_Mode-blue.svg)]()
[![Remote Status](https://img.shields.io/badge/GitHub_Remote-SETUP_PENDING-orange.svg)]()

---

## 1. Executive Summary & Problem Statement

Air pollution across urban and semi-urban India represents a severe environmental health emergency. Cities in the Indo-Gangetic Plain and industrial hubs frequently record Particulate Matter ($PM_{2.5}$ and $PM_{10}$) levels exceeding National Ambient Air Quality Standards (NAAQS) and World Health Organization (WHO) guidelines by an order of magnitude.

However, existing public-facing AQI platforms suffer from critical deficiencies:
1. **Generic, One-Size-Fits-All Advice:** Broadcasting blanket statements ("Avoid going outdoors") without considering that daily-wage workers, students, commuters, and delivery professionals cannot simply stay indoors.
2. **Fixed Persona Oversimplification:** Rigid categories ("Athlete", "Child", "Elderly") ignore the nuanced realities of multi-generational Indian households, varied housing ventilation, cooking methods (LPG vs biomass), and flexible travel windows.
3. **Black-Box AI Hallucinations:** Unregulated generative AI tools invent pollution readings or deliver medically dangerous advice without grounding in real physical measurements.
4. **Data Provenance Erasure:** Blending coarse satellite models with real-time ground monitors without disclosing station latency, sensor health, or averaging periods.

**HawaSaathi** solves this by uniting **verified real-time sensor measurements**, **meteorological dispersion models (CAMS Global)**, and **arbitrary dynamic user context** within a **dual-engine AI and deterministic decision architecture**.

---

## 2. Core Pillars & Capabilities

```
+-----------------------------------------------------------------------------------+
|                                  HAWASAATHI PLATFORM                              |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [1. LIVE AIR QUALITY INTELLIGENCE]           [2. DYNAMIC USER CONTEXT]           |
|  * CPCB CAAQMS (data.gov.in) & OpenAQ v3       * Arbitrary Multi-Gen Households    |
|  * Strict CPCB 2014 16h Sufficiency Engine     * Flexible Schedules & Commutes     |
|  * Open-Meteo CAMS Global 5-Day Forecasts      * Indoor Micro-environment Profile  |
|  * Four-Way Data Typology Contract            * Minimised, Non-Diagnostic Inputs  |
|                         \                           /                             |
|                          \                         /                              |
|                           v                       v                               |
|              +-------------------------------------------------+                  |
|              |         SECURE BACKEND DECISION PIPELINE        |                  |
|              |   - Gemini AI Contextual Synthesizer            |                  |
|              |   - Deterministic Fallback Rules Engine         |                  |
|              |   - Zod Schema Ingress/Egress Guardrails        |                  |
|              +-------------------------------------------------+                  |
|                                       |                                           |
|                                       v                                           |
|  [3. INDOOR AIR COACH]                        [4. DAILY ROUTINE PLANNER]          |
|  * Ventilation & Cooking Guidance             * Morning / Day / Evening / Night   |
|  * Zero-claim without physical sensors        * Emission vs Exposure Decoupling   |
|  * Filtration & True HEPA CADR ROI            * CPCB Health Advisory Alignments   |
|                                                                                   |
+-----------------------------------------------------------------------------------+
|  [SECURITY & PRIVACY]: OWASP ASVS 5.0.0 L2 | Local-Only Guest Mode | Zero PII    |
|  [AUTH & PERSISTENCE]: Firebase Admin SDK (BFF Pattern) | Client Deny Rules       |
|  [LOCALIZATION]: English, Bengali (বাংলা), Hindi (हिन्दी) | WCAG 2.1 AA Accessible  |
+-----------------------------------------------------------------------------------+
```

### A. Live Air Quality Intelligence & Ground Truth
- **Direct Real-Time Monitoring:** Ingests live data from the Central Pollution Control Board (CPCB) continuous ambient monitoring stations (CAAQMS) via Open Government Data (`data.gov.in`) with OpenAQ v3 as secondary failover.
- **CPCB 2014 Compliance Engine:** Computes official National AQI and pollutant sub-indices strictly following the MoEFCC 2014 standard:
  - Requires minimum **16 hours** of valid hourly readings for 24-hr running averages ($PM_{10}, PM_{2.5}, NO_2, SO_2, NH_3, Pb$).
  - Requires minimum **6 hours** of valid hourly readings for 8-hr running averages ($CO, O_3$).
  - Requires minimum **3 valid pollutants** including at least one particulate parameter ($PM_{2.5}$ or $PM_{10}$).
  - Automatically suppresses overall AQI if sufficiency fails, displaying individual sub-indices alongside a clear explanation.
- **Record Semantics:** Distinguishes pollutant measurement rows (e.g. 4,046 rows nationwide on data.gov.in) from unique stations (~500–600 distinct monitoring stations nationwide).
- **Four-Way Data Typology:** Strictly segregates:
  - Type A: Official CPCB-published AQI.
  - Type B: Independently calculated CPCB-methodology AQI.
  - Type C: Raw pollutant concentration.
  - Type D: Modelled atmospheric forecast (Open-Meteo CAMS Global).

### B. Dynamic User Context (No Fixed Enums)
- Enables users to configure complex, real-world household dynamics:
  - Household members across age ranges with optional, non-diagnostic sensitivity checkboxes (respiratory sensitivity, cardiovascular sensitivity, pregnancy).
  - Living conditions: Floor level, room volume, window sealing, proximity to traffic corridors.
  - Indoor sources: Cooking fuels (LPG, induction, solid fuel), incense/dhoop burning, presence and CADR of air purifiers.
  - Commute & daily routines: Mode of transit (walking, cycling, open three-wheeler, non-AC bus, AC metro/car), outdoor exposure hours, and schedule shift flexibility ($\pm 30$ to $180$ minutes).

### C. Dual AI & Deterministic Recommendation Engine
- **Gemini API Backend:** Formulates tailored, structured recommendations citing specific physical evidence, physiological risks, and practical alternatives.
- **Defensible Factuality Pipeline:** Prompts are anchored in immutable factual evidence; model outputs undergo server-side validation against `RecommendationResponseSchema`; all claims must reference valid evidence IDs.
- **Deterministic Fallback Engine:** Should external AI services experience downtime, latency spikes, or schema deviations, HawaSaathi instantly engages a local rule-based expert engine. The fallback engine **never invents measurements**.
- **Availability Objective:** 99.9% uptime is an **architectural engineering design objective**, not an achieved contractual SLA.

### D. Multilingual Localization & High Accessibility
- Fully localized in **English**, **Bengali (বাংলা)**, and **Hindi (हिन्दी)**.
- Designed from the ground up for WCAG 2.1 Level AA accessibility: keyboard navigation, screen-reader landmarks, aria-live updates, and high-contrast AQI visualizers.

---

## 3. Architecture & Repository Standards

### Repository & Challenge Safeguards
| Parameter | Policy | Safeguard Mechanism |
| :--- | :--- | :--- |
| **Branch Policy** | Strictly `main` only | Pre-push hook & CI assertion blocking non-main branch pushes |
| **Repository Size** | Strictly $< 10\text{ MB}$ | Pre-commit size check, `.gitignore` exclusions, no binary commits |
| **GitHub Remote** | **PUBLIC REPOSITORY SETUP PENDING** | Local git repository on `main`. Remote origin will be configured upon explicit user authorization. |
| **Submission Cap** | 3 attempts max | Exhaustive pre-release verification & smoke testing protocol |
| **Security Verification** | OWASP ASVS 5.0.0 Level 2 | Automated test suite targeting **3,050 security assertions** |
| **Type Safety** | TypeScript Strict | Zero `any` policy, 100% runtime boundary validation via Zod |

---

## 4. Documentation Index

Detailed architectural and engineering documentation is maintained in the `docs/` directory using relative links:

| Document | Purpose |
| :--- | :--- |
| [AGENTS.md](AGENTS.md) | Persistent agent engineering rules, CPCB calculation directives, and quality constraints |
| [Requirements Traceability Matrix](docs/requirements-matrix.md) | Full mapping from requirements to features, schemas, and test cases |
| [System Architecture](docs/architecture.md) | Technical blueprint, Next.js 16.x BFF topology, sequence flows, and map tile integration |
| [Architecture Decision Log](docs/architecture-decision-log.md) | Formal ADRs, unresolved technical dependencies, and audit trade-offs |
| [Data Source Verification](docs/data-source-verification.md) | Ground-truth analysis of CPCB, OpenAQ, Open-Meteo, 4-way typology, and CPCB 2014 math |
| [API Dependency Matrix](docs/api-dependency-matrix.md) | Upstream limits, verified evidence, caching strategy, and failover matrix |
| [User Context Model](docs/user-context-model.md) | Flexible schema definitions for households, routines, and non-diagnostic inputs |
| [Security Threat Model](docs/threat-model.md) | STRIDE analysis, OWASP ASVS 5.0.0 checklist, and 3,000+ security test plan |
| [Security Acceptance Criteria](docs/security-acceptance-criteria.md) | Verifiable pass/fail criteria and benchmark release conditions |
| [Testing Strategy](docs/testing-strategy.md) | Unit, integration, E2E, accessibility, and automated security test suite |
| [Phase-Wise Development Plan](docs/phase-plan.md) | Milestone roadmap from Phase 0 to Phase 7 and release gates |
| [Privacy & Authentication](docs/privacy-and-authentication.md) | Local guest mode, Firebase Auth, Firebase Admin SDK BFF pattern, and DPDP Act compliance |
| [Phase 1 Test Matrix](docs/testing/phase-1-test-matrix.md) | Complete traceability matrix for 147 unit tests and 20 targeted domain mutants |
| [CPCB Workbook Verification](docs/references/cpcb-calculator-verification.md) | Extraction, formula audits, Severe slope derivations, and Pb omission analysis |
| [Licensing Architecture](docs/licensing/README.md) | Open-source licensing compliance, data source terms, and third-party notices |

---

## 5. Technology Stack

- **Framework:** Next.js 16.x (App Router, Node.js Runtime $\ge 20.x$, React 19)
- **Language:** Strict TypeScript (Target: ES2022)
- **Validation:** Zod 3.x
- **Styling & UI:** Tailwind CSS, Lucide Icons, Radix UI primitives
- **Map Visualization:** Leaflet.js with OpenStreetMap Carto tiles (OSMF policy compliant; production fallback to Stadia Maps / Protomaps PMTiles)
- **AI Orchestration:** Google Gemini SDK (`@google/genai`) via secure backend API routes
- **Database & Persistence:** Cloud Firestore (managed via server-side Firebase Admin SDK)
- **Authentication:** Firebase Client SDK (Google Sign-In + Passwordless Email Link)
- **Shared Rate Limiting:** Upstash Redis token bucket
- **Testing:** Vitest, Playwright, Axe-Core, Fast-Check

---

## 6. Repository Size & Metrics Transparency

As of Phase 1 Final Closure:
- **Git Loose Objects Database:** **968 KB** (as reported by `git count-objects -vH`).
- **Tracked Working Tree Files:** **583 KB**.
- **Maximum Ceiling:** **10,240 KB (10 MB)**.
- **Safeguard Enforcement:** Verified continuously via [scripts/check-repo-size.sh](scripts/check-repo-size.sh).

---

## 7. Project Status & Implementation Boundary

- **Phase 0 (Architecture & Feasibility):** Complete and approved.
- **Phase 1 (Domain Core & Standards Engine):** Complete and closed with:
  - **147 distinct unit & domain tests passed (147/147)** across 9 test suites.
  - **100% Code Coverage** strictly enforced (100% Statements, 100% Branches, 100% Functions, 100% Lines via Vitest V8).
  - **20 Targeted Domain Mutants Killed (20/20, 100% kill rate)** in isolated OS temp sandbox.
  - **Non-Forgeable In-Memory Aggregation** enforced via module-private `WeakMap` metadata registry.
  - Complete, verifiable provenance separation across Types A, B, C, and D data streams.
- **Phase 2 (Live Environmental Intelligence Platform):** Complete and verified with:
  - **500 new automated tests passed (500/500)** across 10 comprehensive categories (**647 total passing tests** across 19 suites).
  - **Live Provider Integration:** Upstream adapters for CPCB CAAQMS (`data.gov.in`), OpenAQ v3, and Open-Meteo CAMS Global (~45 km).
  - **BFF Architecture:** 8 REST API route handlers (`/api/v1/*`) under Next.js 16.x App Router.
  - **Resilience & Rate Limiting:** Multi-tier CacheService with Upstash Redis and in-memory LRU fallback; sliding window rate limiter; circuit breakers.
  - **Authentication & Privacy:** Firebase Auth with HttpOnly session cookies, Cloud Firestore repository (locked to BFF), guest mode (`sessionStorage`), 1-click JSON export, and 1-click account erasure under DPDP Act 2023.
  - **AI Safety & Evidence Grounding:** Gemini 2.5 Flash explainer strictly forbidden from altering AQI or diagnosing illness, with strict schema parsing and deterministic fallback.
  - **Accessible UI:** Trilingual support (`en`, `bn`, `hi`), Leaflet/OSM station mapping, responsive AQI summary cards, pollutant grid, forecast charts, indoor coach, and routine recommendations.
  - **Security Baseline:** OWASP ASVS 5.0.0 Level 2 verified with 25 security fuzzing and resource abuse tests.
- **Phase 3 (Mobile Micro-Mobility & Clean-Routing):** Pending Phase 3 authorization.

---

## 8. Licensing & Third-Party Compliance

- **First-Party Code:** Licensed under the [Apache License 2.0](LICENSE) (`Apache-2.0`).
- **Data Source Terms & Register:** See [docs/licensing/DATA_SOURCE_REGISTER.md](docs/licensing/DATA_SOURCE_REGISTER.md).
- **Third-Party Notices:** See [docs/licensing/THIRD_PARTY_NOTICES.md](docs/licensing/THIRD_PARTY_NOTICES.md).
- **Dependency Inventory (SBOM):** See [docs/licensing/DEPENDENCY_LICENSES.md](docs/licensing/DEPENDENCY_LICENSES.md).
- **Asset Register:** See [docs/licensing/ASSET_REGISTER.md](docs/licensing/ASSET_REGISTER.md).

