# HawaSaathi — Phase 6 Observability & Incident Response Specification

**Document ID:** `HS-OPS-P6-OBS-2026`\
**Classification:** Site Reliability Engineering (SRE) & Production Operations\

---

## 1. Operational Telemetry & Monitoring Endpoints

### 1.1 Health & Readiness Diagnostics (`/api/v1/health`)
- **HTTP 200 OK:** Returned when all core subsystems are operational. Emits JSON status:
  ```json
  {
    "status": "HEALTHY",
    "timestamp": "2026-11-24T18:50:00Z",
    "version": "1.0.0",
    "services": {
      "redis": "CONFIGURED",
      "firebase": "CONFIGURED",
      "cpcb": "CONFIGURED",
      "openaq": "CONFIGURED",
      "gemini": "CONFIGURED"
    }
  }
  ```
- **HTTP 200 Degraded:** Returned when an optional service (e.g. Gemini AI or Upstash Redis in non-production) is down, but core deterministic calculations and CPCB ingestion continue functioning.

### 1.2 Structured PII-Free Logging
- Logs follow Google Cloud Logging JSON schema:
  - Standard attributes: `severity`, `message`, `timestamp`, `traceId`, `component`.
  - Prohibited log content: API keys, Firebase bearer tokens, session cookies, passwords, user email addresses, full GPS coordinates.

---

## 2. Ten Core Incident Response Classes

| Incident Class | Trigger Condition | Severity | Automated Action | Manual SRE Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **INC-01: CPCB Outage** | data.gov.in returns 5xx / timeouts > 10s | Medium | Circuit breaker trips; OpenAQ / CAMS forecast served | Verify data.gov.in portal status; update API key if expired |
| **INC-02: OpenAQ Outage** | OpenAQ returns 5xx / rate-limit 429 | Low | CPCB and CAMS continue serving | Monitor OpenAQ rate quotas |
| **INC-03: CAMS Outage** | Open-Meteo API unreachable | Low | Hourly forecast omitted; live observations displayed | Inspect Open-Meteo status |
| **INC-04: Gemini AI Outage** | Gemini returns 503 / 429 / timeout > 5s | Low | Instant fallback to `DeterministicRecommender` | Confirm Gemini model quota; rotate API key |
| **INC-05: Upstash Redis Partition**| Redis REST calls throw network errors | High | Prod fails closed (429/503); non-prod falls back in-memory | Inspect Upstash console; verify REST URL/token |
| **INC-06: Firestore Failure** | Firestore writes reject with permission error | High | Read-only mode; anonymous session keeps local state | Inspect GCP IAM roles for Cloud Run service account |
| **INC-07: Auth Invalidation** | Firebase token verification fails globally | High | Prompts client sign-in refresh | Verify Firebase project ID in Cloud Run env |
| **INC-08: Traffic Surge / DDoS** | Requests exceed 100 req/s on BFF | High | Cloud Run autoscales up to 10 instances; rate limiter throttles | Apply Cloud Armor IP rate limiting rule |
| **INC-09: Data Stale Warning** | Latest CAAQMS record age > 24 hours | Medium | Observations flagged `STALE`; UI warns user | Trigger CPCB manual ingestion sync |
| **INC-10: Security IDOR Attack** | Rapid cross-user ID traversal detected | Critical | Route rate limiter bans client IP for 15 mins | Review Cloud Logging security audit trace |
