# Phase 7 — Engineering Requirement Traceability Matrix (RTM)

> **Project:** HawaSaathi (হাওয়াসাথী / हवा साथी) — Pan-India Urban Air Quality Intelligence Platform\
> **Milestone:** Phase 7 Final Traceability Verification\
> **Traceability Standard:** ISO/IEC/IEEE 29119 Software Testing Standard

---

## 1. Traceability Matrix

| Requirement ID | Requirement Description | Implementation Module | Automated Test Suites | Verification Status |
|:---|:---|:---|:---|:---:|
| **REQ-ENV-01** | MoEFCC CPCB NAQI (2014) Piecewise Linear Sub-Index Calculation | `src/domain/cpcb/sub-index-calculator.ts` | `p7-aqi-science-provenance.test.ts`, `cpcb-calculator.test.ts` | **VERIFIED (100%)** |
| **REQ-ENV-02** | Running Window Data Sufficiency (16h/24h and 6h/8h rules) | `src/domain/cpcb/running-window.ts` | `p7-aqi-science-provenance.test.ts`, `running-window.test.ts` | **VERIFIED (100%)** |
| **REQ-ENV-03** | Minimum 3 Pollutants Overall AQI Sufficiency (with PM2.5 or PM10) | `src/domain/cpcb/cpcb-engine.ts` | `p7-aqi-science-provenance.test.ts`, `cpcb-engine.test.ts` | **VERIFIED (100%)** |
| **REQ-ENV-04** | 4-Way Atmospheric Provenance Classification (Types A, B, C, D) | `src/schemas/provenance.schema.ts`, `aqi-summary-card.tsx` | `p7-aqi-science-provenance.test.ts`, `provenance-modal.test.tsx` | **VERIFIED (100%)** |
| **REQ-ENV-05** | Lead (Pb) NAQI Table 3.11 Severe Handling & Physical Anomaly Bounds | `src/domain/cpcb/sub-index-calculator.ts` | `p7-aqi-science-provenance.test.ts` | **VERIFIED (100%)** |
| **REQ-SEC-01** | OWASP ASVS 5.0.0 Level 2 Authentication & IDOR Prevention | `src/app/api/v1/profile/route.ts`, `src/lib/firebase/admin.ts` | `p7-security-adversarial-api.test.ts`, `p7-firebase-auth-privacy.test.ts` | **VERIFIED (100%)** |
| **REQ-SEC-02** | DPDP Act 2023 1-Click Machine-Readable Data Export (JSON) | `src/app/api/v1/profile/route.ts` | `p7-firebase-auth-privacy.test.ts`, `p7-browser-e2e-workflows.test.ts` | **VERIFIED (100%)** |
| **REQ-SEC-03** | DPDP Act 2023 1-Click Cascading Hard Account & Profile Deletion | `src/app/api/v1/profile/route.ts` | `p7-firebase-auth-privacy.test.ts`, `p7-browser-e2e-workflows.test.ts` | **VERIFIED (100%)** |
| **REQ-SEC-04** | Rate Limiting & SSRF / CRLF Header Injection Safeguards | `src/lib/http/api-response.ts`, `rate-limiter.ts` | `p7-security-adversarial-api.test.ts` | **VERIFIED (100%)** |
| **REQ-SEC-05** | Gemini AI Grounded Citations & Deterministic Fallback Engine | `src/services/ai/ai-explainer.ts`, `recommendations/route.ts` | `p7-security-adversarial-api.test.ts`, `gemini-safety.test.ts` | **VERIFIED (100%)** |
| **REQ-LOC-01** | English + 22 Eighth Schedule Indian Languages Parity | `src/i18n/translations.ts`, `locales/index.ts` | `p7-localisation-scripts.test.ts`, `translations.test.ts` | **VERIFIED (100%)** |
| **REQ-LOC-02** | RTL Script Directionality (Urdu, Kashmiri, Sindhi) & Font Typography | `src/i18n/locale-registry.ts` | `p7-localisation-scripts.test.ts` | **VERIFIED (100%)** |
| **REQ-LOC-03** | Statutory Environmental Terminology & ICU Token Protection | `src/i18n/glossary.ts` | `p7-localisation-scripts.test.ts` | **VERIFIED (100%)** |
| **REQ-UI-01** | WCAG 2.2 AA Keyboard Focus, ARIA Roles, Non-Color Contrast | `src/components/**/*` | `p7-keyboard-a11y.test.tsx`, `a11y-audit.test.tsx` | **VERIFIED (100%)** |
| **REQ-UI-02** | Responsive Device Matrix (11 Viewports, Orientation Shifts, Indic Wrapping) | `src/components/**/*` | `p7-responsive-device-matrix.test.tsx` | **VERIFIED (100%)** |
| **REQ-REL-01** | Upstream Circuit Breakers & Upstash Fail-Closed Resilience | `src/lib/http/circuit-breaker.ts`, `redis-client.ts` | `p7-cloud-infrastructure-resilience.test.ts` | **VERIFIED (100%)** |
| **REQ-REL-02** | High-Concurrency Calculation & Memory Throughput | `src/domain/**/*`, `src/services/**/*` | `p7-performance-concurrency.test.ts` | **VERIFIED (100%)** |
