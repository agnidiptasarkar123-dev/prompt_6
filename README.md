# HawaSaathi (हवासार्थी / হাভাসাথী)
### Personalised Urban Air Quality Intelligence Platform for Indian Cities

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Branch: main](https://img.shields.io/badge/Branch-main_only-success.svg)]()
[![Repository Size](https://img.shields.io/badge/Repo_Size-%3C10MB-brightgreen.svg)]()
[![Security: OWASP ASVS 5.0.0](https://img.shields.io/badge/Security-ASVS_5.0.0_L2-blueviolet.svg)]()
[![TypeScript: Strict](https://img.shields.io/badge/TypeScript-Strict_Mode-blue.svg)]()

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
- **Strict Zod Guardrails & Citation Verification:** All model outputs undergo rigorous schema validation against `RecommendationResponseSchema` and citation check against injected evidence IDs.
- **Deterministic Fallback Engine:** Should external AI services experience downtime, latency spikes, or schema deviations, HawaSaathi instantly engages a local rule-based expert engine ensuring continuous service availability.

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
| [System Architecture](docs/architecture.md) | Technical blueprint, BFF topology, sequence flows, and map tile integration |
| [Architecture Decision Log](docs/architecture-decision-log.md) | Formal ADRs, unresolved technical dependencies, and audit trade-offs |
| [Data Source Verification](docs/data-source-verification.md) | Ground-truth analysis of CPCB, OpenAQ, Open-Meteo, 4-way typology, and CPCB 2014 math |
| [API Dependency Matrix](docs/api-dependency-matrix.md) | Upstream limits, verified evidence, caching strategy, and failover matrix |
| [User Context Model](docs/user-context-model.md) | Flexible schema definitions for households, routines, and non-diagnostic inputs |
| [Security Threat Model](docs/threat-model.md) | STRIDE analysis, OWASP ASVS 5.0.0 checklist, and 3,000+ security test plan |
| [Security Acceptance Criteria](docs/security-acceptance-criteria.md) | Verifiable pass/fail criteria and benchmark release conditions |
| [Testing Strategy](docs/testing-strategy.md) | Unit, integration, E2E, accessibility, and automated security test suite |
| [Phase-Wise Development Plan](docs/phase-plan.md) | Milestone roadmap from Phase 0 to Phase 7 and release gates |
| [Privacy & Authentication](docs/privacy-and-authentication.md) | Local guest mode, Firebase Auth, Firebase Admin SDK BFF pattern, and DPDP Act compliance |

---

## 5. Technology Stack

- **Framework:** Next.js 15.x (App Router, Node.js Runtime)
- **Language:** Strict TypeScript (Target: ES2022)
- **Validation:** Zod 3.x
- **Styling & UI:** Tailwind CSS, Lucide Icons, Radix UI primitives
- **Map Visualization:** Leaflet.js with OpenStreetMap Carto tiles
- **AI Orchestration:** Google Gemini SDK (`@google/genai`) via secure backend API routes
- **Database & Persistence:** Cloud Firestore (managed via server-side Firebase Admin SDK)
- **Authentication:** Firebase Client SDK (Google Sign-In + Passwordless Email Link)
- **Shared Rate Limiting:** Upstash Redis token bucket
- **Testing:** Vitest, Playwright, Axe-Core, Fast-Check

---

## 6. Repository Size & Metrics Transparency

As of the Phase 0 Architecture Audit (2026-11-20):
- **Working Tree (Files on Disk):** **408 KB** (includes 252 KB of `.git` metadata and 156 KB of workspace documentation).
- **Git Loose Objects Database:** **152 KiB** (as reported by `git count-objects -vH`).
- **Maximum Ceiling:** **10,240 KB (10 MB)**.
- **Safeguard Enforcement:** Verified continuously via [scripts/check-repo-size.sh](scripts/check-repo-size.sh).

---

## 7. Project Status & Roadmap

We are currently in the **Architecture & Planning Phase (Phase 0 Complete, Phase 1 Ready)**. Application feature implementation and package installations are locked, awaiting explicit architecture approval.
