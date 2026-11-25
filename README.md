# HawaSaathi (हवासार्थी / হাভাসাথী)
### Personalised Urban Air Quality Intelligence Platform for Indian Cities

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Branch: main](https://img.shields.io/badge/Branch-main_only-success.svg)]()
[![Repository Size](https://img.shields.io/badge/Repo_Size-%3C10MB-brightgreen.svg)]()
[![Security: OWASP ASVS 5.0.0](https://img.shields.io/badge/Security-ASVS_5.0.0_L2-blueviolet.svg)]()
[![Tests: 6243 Passing](https://img.shields.io/badge/Tests-6243_Passing-success.svg)]()
[![Locales: 23 Languages](https://img.shields.io/badge/Locales-23_Languages-blue.svg)]()
[![Coverage: 100% Full--Source](https://img.shields.io/badge/Coverage-100%25_Full--Source-brightgreen.svg)]()
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
|  [LOCALIZATION]: English + 22 Indian Scheduled Languages | WCAG 2.2 AA Accessible  |
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

### D. National Multilingual Localization & High Accessibility
- Fully localized in **English (`en-IN`) plus all 22 official Eighth Schedule Indian Languages** (Assamese, Bengali, Bodo, Dogri, Gujarati, Hindi, Kannada, Kashmiri, Konkani, Maithili, Malayalam, Manipuri, Marathi, Nepali, Odia, Punjabi, Sanskrit, Santali, Sindhi, Tamil, Telugu, Urdu) with 100% key parity (52/52 keys) and zero synthetic fallbacks.
- Native **RTL (Right-to-Left) bidirectional layout** and typography support for Urdu, Kashmiri, and Sindhi.
- Designed from the ground up for **WCAG 2.2 Level AA accessibility**: keyboard navigation, screen-reader landmarks, aria-live updates, and high-contrast AQI visualizers across all Indic scripts.

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
| [Security Threat Model](docs/threat-model.md) | STRIDE analysis, OWASP ASVS 5.0.0 checklist, and security test architecture |
| [Security Acceptance Criteria](docs/security-acceptance-criteria.md) | Verifiable pass/fail criteria and benchmark release conditions |
| [Testing Strategy](docs/testing-strategy.md) | Unit, integration, E2E, accessibility, and automated security test suite |
| [Phase-Wise Development Plan](docs/phase-plan.md) | Milestone roadmap from Phase 0 to Phase 7 and release gates |
| [Privacy & Authentication](docs/privacy-and-authentication.md) | Local guest mode, Firebase Auth, Firebase Admin SDK BFF pattern, and DPDP Act compliance |
| [Phase 1 Test Matrix](docs/testing/phase-1-test-matrix.md) | Complete traceability matrix for 147 unit tests and 20 targeted domain mutants |
| [CPCB Workbook Verification](docs/references/cpcb-calculator-verification.md) | Extraction, formula audits, Severe slope derivations, and Pb omission analysis |
| [Licensing Architecture](docs/licensing/README.md) | Open-source licensing compliance, data source terms, and third-party notices |
| [Phase 2 Revalidation Audit](docs/phase-2-revalidation-report.md) | Pre-Phase 3 independent verification of Phase 0, 1 & 2 baselines and defect catalog |
| [Phase 3 Implementation Report](docs/phase-3-implementation-report.md) | Architectural enhancements, CPCB dynamic pagination, OpenAQ v3 location lookup, atomic Lua rate limiter |
| [Phase 3 Test Strategy](docs/phase-3-test-strategy.md) | Multi-tier test pyramid, invariants, property testing, and verification protocols |
| [Phase 3 Test Inventory](docs/phase-3-test-inventory.md) | Complete directory of all 32 test files and 2,223 automated test cases |
| [Phase 3 Coverage Report](docs/phase-3-coverage-report.md) | Detailed 100% statement, branch, function, line coverage metrics across domain core |
| [Phase 3 Targeted Mutation Report](docs/phase-3-mutation-report.md) | 20/20 targeted domain mutants killed in isolated ephemeral sandbox |
| [Phase 3 Live Integration Report](docs/phase-3-live-integration-report.md) | Empirical connectivity audits across CPCB, OpenAQ, Open-Meteo, Gemini, Redis, and Firebase |
| [Phase 3 Security & ASVS Report](docs/phase-3-security-report.md) | OWASP ASVS 5.0.0 Level 2 compliance and adversarial security test results |
| [Phase 3 Revalidation & Phase 4 Entry](docs/phase-3-revalidation-phase-4-entry-report.md) | Verification of Phase 3 baseline, model failover strategy, and Phase 4 entry gates |
| [Phase 4 Architecture Report](docs/phase-4-architecture-report.md) | Multi-model Gemini router, notification engine, commute model, CADR physics, and trilingual architecture |
| [Phase 4 Implementation Report](docs/phase-4-implementation-report.md) | Implementation details of full product experience, components, routers, and state machines |
| [Phase 4 Product Experience Spec](docs/phase-4-product-experience-spec.md) | Detailed UX/UI specifications, interaction flows, commute planning, and alert preferences |
| [Phase 4 Test Strategy](docs/phase-4-test-strategy.md) | Testing architecture across unit, integration, accessibility, mutation, and browser E2E |
| [Phase 4 Test Inventory](docs/phase-4-test-inventory.md) | Complete directory of all 50 test files and 4,443 automated test cases |
| [Phase 4 Coverage Report](docs/phase-4-coverage-report.md) | 100% domain and canonical schema coverage metrics with comprehensive full-stack tests |
| [Phase 4 Targeted Mutation Report](docs/phase-4-mutation-report.md) | 20/20 targeted domain mutants killed in isolated sandbox (100% kill rate) |
| [Phase 4 Browser E2E Report](docs/phase-4-browser-e2e-report.md) | 10/10 real-browser E2E workflows verified in headless Google Chrome via Puppeteer |
| [Phase 4 Accessibility & UX Report](docs/phase-4-accessibility-report.md) | WCAG 2.2 AA accessibility audit, color contrast, keyboard navigation, and screen-reader testing |
| [Phase 4 Security & ASVS Report](docs/phase-4-security-report.md) | OWASP ASVS 5.0.0 Level 2 verification, fuzzing, prompt injection defense, and DPDP Act compliance |
| [Phase 4 Gemini Reliability Report](docs/phase-4-gemini-reliability-report.md) | Multi-model failover matrix (`gemini-3.5-flash-lite`, `gemini-2.5-flash`) and circuit breakers |
| [Phase 4 Firestore Readiness Report](docs/phase-4-firestore-readiness-report.md) | Cloud Firestore configuration, security rules, and production deployment guide |
| [Firebase Firestore Final Verification Report](docs/firebase-firestore-final-verification-report.md) | Live empirical verification of Cloud Firestore database, Admin SDK, security rules, and ProfileRepository |
| [Phase 5 Coverage Closure Report](docs/phase-5-phase-4-coverage-closure-report.md) | Full 100% full-source remediation across all 49 production files |
| [Phase 5 System Architecture](docs/phase-5-architecture-report.md) | National multilingual expansion, deterministic grounding & high-scale resilience |
| [Phase 5 Localisation Architecture](docs/phase-5-localisation-architecture.md) | Linguistic infrastructure for English + 22 Eighth Schedule Indian languages, typography & RTL |
| [Phase 5 Language Coverage Report](docs/phase-5-language-coverage-report.md) | Audit of 23 supported locales, script tags, and demographic reach across India |
| [Phase 5 Environmental Glossary](docs/phase-5-translation-glossary.md) | Standardized environmental terminology dictionary across 23 languages |
| [Phase 5 Translation Quality Report](docs/phase-5-translation-quality-report.md) | Quality verification, human-in-the-loop review, and linguistic governance |
| [Phase 5 Security & ASVS Report](docs/phase-5-security-report.md) | OWASP ASVS 5.0.0 Level 2 verification, 3,200+ security tests, Firestore lockdown |
| [Phase 5 STRIDE Threat Model](docs/phase-5-threat-model.md) | Threat modeling across client, network, service, database, and provider boundaries |
| [Phase 5 Privacy & DPDP Report](docs/phase-5-privacy-report.md) | DPDP Act 2023 / GDPR compliance, data minimization, 1-click JSON export & deletion |
| [Phase 5 Performance Report](docs/phase-5-performance-report.md) | High-concurrency throughput, caching hierarchy (Redis + Memory), sub-25ms response |
| [Phase 5 Reliability Report](docs/phase-5-reliability-report.md) | Multi-tier failover, circuit breakers, and deterministic fallbacks |
| [Phase 5 Test Strategy](docs/phase-5-test-strategy.md) | Architecture of the 6,243 automated test battery and quality gates |
| [Phase 5 Test Inventory](docs/phase-5-test-inventory.md) | Complete catalog of all 64 test suites and 6,243 test cases |
| [Phase 5 Full-Source Coverage](docs/phase-5-full-source-coverage-report.md) | 100.00% statement, function, line coverage across all 49 production files |
| [Phase 5 Mutation Testing Report](docs/phase-5-mutation-report.md) | Targeted mutation testing and 100% kill rate on algorithmic mutants |
| [Phase 5 Accessibility Report](docs/phase-5-accessibility-report.md) | WCAG 2.2 AA audit, screen-reader live regions, and multi-script contrast |
| [Phase 5 Browser E2E Report](docs/phase-5-browser-e2e-report.md) | 10/10 core browser user journeys verified across viewports and locales |
| [Phase 5 Deployment Readiness](docs/phase-5-deployment-readiness-report.md) | Pre-flight audit, environment integrity, secret leak checks, and release safety |
| [Phase 5 Final Acceptance Report](docs/phase-5-final-acceptance-report.md) | Master engineering sign-off and requirement fulfillment matrix |

---

## 5. Technology Stack

- **Framework:** Next.js 16.x (App Router, Node.js Runtime $\ge 20.x$, React 19)
- **Language:** Strict TypeScript (Target: ES2022)
- **Validation:** Zod 3.x
- **Styling & UI:** Tailwind CSS, Lucide Icons, Radix UI primitives
- **Map Visualization:** Leaflet.js with OpenStreetMap Carto tiles (OSMF policy compliant; production fallback to Stadia Maps / Protomaps PMTiles)
- **AI Orchestration:** Google Gemini SDK (`@google/genai`) via multi-model router with per-model circuit breakers and deterministic fallbacks
- **Database & Persistence:** Cloud Firestore (managed via server-side Firebase Admin SDK)
- **Authentication:** Firebase Client SDK (Google Sign-In + Passwordless Email Link)
- **Shared Rate Limiting:** Upstash Redis token bucket (atomic Lua script with in-memory fallback)
- **Testing:** Vitest, Puppeteer-Core (Chrome Headless E2E), Fast-Check, Axe-Core

---

## 6. Repository Size & Metrics Transparency

As of Phase 5 Verification:
- **Git Loose Objects Database:** **2,204 KB** (as reported by `git count-objects -vH`).
- **Tracked Working Tree Files:** **~1,850 KB**.
- **Total Physical Repository Footprint:** **~3.15 MiB**.
- **Maximum Ceiling:** **10,240 KB (10 MB)**.
- **Safeguard Enforcement:** Verified continuously via [scripts/check-repo-size.sh](scripts/check-repo-size.sh).
- **Total Passing Automated Tests:** **6,243 tests** across 64 test files (100% pass rate in ~2.10s).

---

## 7. Project Status & Implementation Boundary

- **Phase 0 (Architecture & Feasibility):** Complete and approved.
- **Phase 1 (Domain Core & Standards Engine):** Complete and closed with 147 tests (100% domain coverage, 20/20 mutants killed).
- **Phase 2 (Live Environmental Intelligence Platform):** Complete and verified with 647 total passing tests across 19 suites.
- **Phase 3 (Live Infrastructure, Mathematical Invariants, Provider Integration & Scaled Testing):** Complete and verified with 2,223 total passing tests across 32 suites.
- **Phase 4 (Complete Product Experience, Personalised Environmental Intelligence, 100% Code Coverage & 4,200+ Tests):** Complete and verified with 4,443 passing tests across 50 test suites.
- **Phase 5 (National Multilingual Expansion, Full-Source Coverage Closure, Security, Performance & Production Hardening):** Complete and verified with:
  - **6,243 Total Passing Automated Tests (6,243/6,243)** across 64 test suites (1,800 new Phase 5 test cases).
  - **National Multilingual Localisation (23 Locales):** English (`en-IN`) plus all 22 official Eighth Schedule Indian Languages with 100% key parity (52/52 keys per language), zero synthetic stubs, and native RTL support for Urdu, Kashmiri, and Sindhi.
  - **100.00% Full-Source Code Coverage:** 100.00% Statements, 100.00% Functions, 100.00% Lines across all 49 production source files in `src/**/*.{ts,tsx}` with zero synthetic ignore directives.
  - **OWASP ASVS 5.0.0 Level 2 Hardening:** Over 3,200 automated security and boundary tests.
  - **DPDP Act 2023 & GDPR Compliance:** Local-only guest mode (`sessionStorage`), 1-click machine-readable JSON data export, and 1-click cascading account hard deletion.
  - **High-Performance Multi-Tier Caching:** Redis REST + in-memory fallback, sub-25ms cached responses, and sub-2.10s full test suite execution.
  - **Multi-Model Gemini Routing & Failover:** 4-tier Gemini failover with circuit breakers and instant fallback to `DeterministicRecommender`.
  - **25/25 Targeted Domain Mutants Killed (100% kill rate).**
  - **10/10 Real-Browser E2E Workflows Verified.**
  - **WCAG 2.2 Level AA Accessible:** Tested across all 23 Indic scripts with screen-reader live regions.
  - **Production Deployment Ready:** 0 TypeScript errors, 0 ESLint warnings, repo size 3.15 MiB (<10 MB), single branch `main`.

---

## 8. Licensing & Third-Party Compliance

- **First-Party Code:** Licensed under the [Apache License 2.0](LICENSE) (`Apache-2.0`).
- **Data Source Terms & Register:** See [docs/licensing/DATA_SOURCE_REGISTER.md](docs/licensing/DATA_SOURCE_REGISTER.md).
- **Third-Party Notices:** See [docs/licensing/THIRD_PARTY_NOTICES.md](docs/licensing/THIRD_PARTY_NOTICES.md).
- **Dependency Inventory (SBOM):** See [docs/licensing/DEPENDENCY_LICENSES.md](docs/licensing/DEPENDENCY_LICENSES.md).
- **Asset Register:** See [docs/licensing/ASSET_REGISTER.md](docs/licensing/ASSET_REGISTER.md).

