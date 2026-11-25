# HawaSaathi — Phase 6 Pilot Acceptance Metrics & Evaluation Gate

**Document ID:** `HS-MET-P6-PILOT-2026`\
**Classification:** Pilot Success Criteria & Release Gate Evaluation\

---

## 1. Pilot Success Evaluation Thresholds

To transition from the Controlled Pilot to General Availability (GA), the pilot must satisfy the following empirical thresholds:

| Metric Category | Specific Target Metric | Minimum Acceptance Threshold | Measurement Method |
| :--- | :--- | :--- | :--- |
| **System Availability** | Core BFF & Dashboard Uptime | $\ge 99.5\%$ | Cloud Run synthetic monitoring |
| **Data Freshness** | CPCB Cache Refresh Cadence | Age $\le 60\text{ mins}$ on active stations | Ingestion timestamps |
| **Scientific Integrity** | Zero Unqualified AQI Outputs | **0 occurrences** | Output schema validation logs |
| **AI Fallback Resilience** | Fallback on Gemini timeout | **100% graceful fallback** | AI Explainer error metrics |
| **User Comprehension** | Rating of AQI Clarity (Q1) | $\ge 4.2 / 5.0$ average score | Pilot Survey Questionnaire |
| **Commute Utility** | Active Commute Planner Usage | $\ge 60\%$ weekly cohort active | Anonymous interaction logs |
| **Crash-Free Sessions** | Client-Side Error Rate | $\ge 99.8\%$ crash-free sessions | Global error boundary reports |
| **Privacy Invariants** | Zero PII Leaks in Logs/DB | **0 leaks** | SRE log audits & Firestore scans |

---

## 2. Phase 6 Acceptance Decision

- **Prerequisites Satisfied:**
  - Production container build passes (`Dockerfile` with non-root user).
  - Environment variable schema enforced.
  - Cloud Run least-privilege service account defined.
  - Rollback runbook rehearsed and documented.
  - Redis production fail-closed verified.
  - Observability and 10 incident response classes documented.
  - Performance benchmarks measured.
- **Decision:** **PHASE 6 IMPLEMENTATION COMPLETE — PILOT READY**.
