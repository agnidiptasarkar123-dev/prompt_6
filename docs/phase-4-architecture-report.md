# HawaSaathi (হাওয়াসাথী / हवासाथी) — Phase 4 Product Architecture Report

**Document ID:** `HS-ARCH-P4-001`\
**Date:** 2026-11-24\
**Author:** Principal Software Architect & Engineering Head\
**Status:** COMPLETE (VERIFIED)\
**Classification:** Technical Architecture Specification\

---

## 1. Architectural Mission & Overview

Phase 4 elevates HawaSaathi from an engineering engine into a complete, usable, personalized, production-grade air quality intelligence platform for Indian cities.

The system combines:
1. **Multi-Source Environmental Ground Truth & Atmospheric Modelling:**
   - Primary: CPCB CAAQMS official regulatory ground sensors (`data.gov.in`).
   - Secondary: OpenAQ v3 continuous spatial monitors.
   - Atmospheric Model: Open-Meteo CAMS Global (~45 km spatial grid) forecast with strict visual and semantic separation (`TYPE_D_MODEL_FORECAST`).
2. **Deterministic CPCB Sub-Index & AQI Engine:**
   - 100% mathematical fidelity to MoEFCC NAQI 2014 piecewise linear interpolation formulas.
   - Non-negotiable data sufficiency rules (16h for 24h windows, 6h for 8h windows).
   - Strict 3-pollutant minimum requirement with mandatory particulate presence (PM2.5 or PM10).
3. **Resilient AI Synthesis & Failover Architecture:**
   - High-throughput Gemini client with per-model circuit breakers.
   - Fast failover from primary (`gemini-2.5-flash`) to verified candidate (`gemini-3.5-flash-lite`, HTTP 200 in 1,075ms).
   - Defensible factuality pipeline: all AI claims must cite verifiable evidence IDs.
   - Safe deterministic rule engine fallback (`DeterministicRecommender`) during upstream downtime.
4. **Personalized Context & Indoor Life-Safety Coach:**
   - Dynamic household context (no static enums or personas).
   - Dynamic CADR air purifier room sizing calculator ($\text{ACH} = \text{CADR} / \text{Volume}$).
   - Life-safety combustion ventilation overrides (cooking, biomass, incense).
5. **Commute Exposure Planner:**
   - Origin/destination station AQI interpolation.
   - Peak-hour exposure penalties (morning/evening rush hour).
   - Mode-specific exposure multipliers (Walk: 1.0, Bicycle: 0.9, Two-Wheeler: 0.85, Car/Bus: 0.5).
6. **In-App Notification Center:**
   - Threshold-driven alert generation with hysteresis buffer ($\pm 5$ AQI) to eliminate edge flapping.
   - Configurable quiet hours with emergency override for SEVERE AQI ($> 400$).

---

## 2. Component Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Next.js 16.x Client Tier (App Router)"]
        UI[Dashboard UI & Map View]
        NC[Notification Center & In-App Alerts]
        CP[Commute Exposure Planner]
        IPC[Indoor Air Coach & CADR Sizing]
        I18N[Trilingual Localization Engine (en, bn, hi)]
        SessionLocal[Guest Mode Ephemeral sessionStorage]
    end

    subgraph BFF["Next.js 16.x Backend-for-Frontend (BFF)"]
        Routes["API Routes (/api/v1/*)"]
        RL["Atomic Redis Rate Limiter (Lua)"]
        CB["Circuit Breakers (CPCB, OpenAQ, Gemini)"]
    end

    subgraph Domain["Deterministic Domain Core (100% Tested)"]
        CPCBEval["CPCB Sub-Index Engine (NAQI 2014)"]
        SuffCheck["Window Sufficiency (16h / 6h)"]
        CADRCalc["CADR & ACH Calculator"]
        VentDecision["Ventilation Safety Decision Tree"]
        RuleRec["Deterministic Rule Recommender"]
    end

    subgraph External["External Services & Upstreams"]
        CPCB_API["data.gov.in (CPCB CAAQMS)"]
        OpenAQ_API["OpenAQ v3 API"]
        OpenMeteo_API["Open-Meteo CAMS Global"]
        Gemini_API["Google Gemini 3.5 Flash-Lite / 2.5 Flash"]
        Upstash_Redis["Upstash Redis (REST)"]
        Firebase_Admin["Firebase Admin SDK / Cloud Firestore"]
    end

    UI --> Routes
    NC --> Routes
    CP --> Routes
    IPC --> Routes
    Routes --> RL
    RL --> Upstash_Redis
    Routes --> CB
    CB --> CPCB_API
    CB --> OpenAQ_API
    CB --> OpenMeteo_API
    CB --> Gemini_API
    Routes --> CPCBEval
    CPCBEval --> SuffCheck
    Routes --> CADRCalc
    Routes --> VentDecision
    Routes --> RuleRec
    Routes --> Firebase_Admin
```

---

## 3. Data Typology & Provenance Preservation Contract

To prevent public misinterpretation and ensure regulatory transparency, all data points adhere strictly to the four-way classification:

| Typology | Identifier | Semantics | Source / Attribution |
| :--- | :--- | :--- | :--- |
| **Type A** | `TYPE_A_OFFICIAL_AQI` | Statutory AQI directly published by CPCB official bulletin | CPCB official bulletins |
| **Type B** | `TYPE_B_CALCULATED_AQI` | Computed by HawaSaathi from validated raw sensor concentrations | HawaSaathi deterministic CPCB calculator |
| **Type C** | `TYPE_C_RAW_MEASUREMENT` | Physical sensor reading with verified unit, timestamp, and averaging window | Continuous Ambient Air Quality Monitoring Station (CAAQMS) |
| **Type D** | `TYPE_D_MODEL_FORECAST` | Atmospheric transport model forecast (~45 km grid) | Copernicus Atmosphere Monitoring Service (CAMS) / Open-Meteo |

---

## 4. Privacy Architecture (DPDP Act 2023 & GDPR)

1. **Guest Mode by Default:** All core features (live AQI, station map, commute exposure calculation, indoor CADR sizing, notifications) operate without mandatory sign-in. All context is stored in client-side ephemeral `sessionStorage`. Zero server persistence for guests.
2. **Explicit Cloud Persistence Consent:** User profiles, saved routes, and household contexts are persisted to Cloud Firestore ONLY when the user explicitly signs in and ticks the cloud synchronization consent checkbox.
3. **Right to Access & Data Portability:** 1-Click JSON export of all stored profile and routine data via `/api/v1/profile?export=json`.
4. **Right to Erasure:** 1-Click cascading hard delete via `/api/v1/profile` DELETE, removing all user records, sessions, and preferences permanently.
