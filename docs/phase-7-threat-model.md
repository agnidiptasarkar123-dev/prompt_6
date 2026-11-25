# Phase 7 — STRIDE Threat Model & Attack Surface Analysis

> **Project:** HawaSaathi (হাওয়াসাথী / हवा साथी) — Pan-India Urban Air Quality Intelligence Platform\
> **Milestone:** Phase 7 Security Hardening\
> **Methodology:** Microsoft STRIDE Threat Modeling Framework

---

## 1. System Architecture & Trust Boundaries

```
[ Unauthenticated Client / Guest Browser ]
               │
               ▼ (Public HTTPS / TLS 1.3)
┌─────────────────────────────────────────────────────────────┐
│ Next.js Backend-for-Frontend (BFF)                          │
│                                                             │
│  [ Rate Limiter (Upstash Redis + Memory Fallback) ]         │
│  [ Zod Ingress Validation & Sanitization ]                  │
│  [ Firebase Admin SDK (Session & Token Verification) ]      │
└──────────────┬───────────────────────────────┬──────────────┘
               │ (Private Server HTTPS)        │ (Admin SDK)
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│ Upstream Environmental APIs  │ │ Google Cloud Firestore     │
│ - CPCB CAAQMS (data.gov.in)  │ │ (asia-south1 Mumbai)       │
│ - OpenAQ v3 API              │ │ Client Access Rules:       │
│ - Open-Meteo CAMS Global     │ │ allow read, write: false;  │
│ - Google Gemini Flash / Pro  │ │ Server-Only Persistence    │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## 2. STRIDE Threat Analysis & Mitigation Register

| Threat Category | Specific Attack Vector | Potential Impact | Implemented Architectural Mitigation | Residual Risk |
|:---|:---|:---|:---|:---:|
| **Spoofing** | Attacker crafts forged JWT to impersonate a legitimate user. | Account takeover, unauthorized data access. | Server-side verification via `FirebaseAdminService.verifySessionCookie()` and `verifyIdToken()` validating Google public keys. | **LOW** |
| **Tampering** | Parameter manipulation (`q`, `lat`, `lon`, `stationId`) with SQL/NoSQL injection payloads. | Database manipulation or runtime crash. | 100% Zod validation at route boundaries; numeric bounds validation for latitude [6, 38] and longitude [68, 98]. | **NEGLIGIBLE** |
| **Repudiation** | User denies performing account deletion or sensitive data modification. | Regulatory compliance dispute under DPDP Act 2023. | Audit logging of authentication events and deletion timestamps; structured JSON responses. | **LOW** |
| **Information Disclosure** | Leakage of private API keys (`GEMINI_API_KEY`, Firebase Admin credentials) in client bundles. | Credential compromise, unauthorized API usage. | All secrets strictly restricted to Node.js server runtime; zero secrets prefixed with `NEXT_PUBLIC_`. | **NEGLIGIBLE** |
| **Denial of Service** | High-volume API burst targeting `/api/v1/recommendations` or `/api/v1/locations/search`. | Service degradation, upstream quota exhaustion. | Multi-tier sliding window rate limiter; circuit breakers trip to offline fallback when upstream latency spikes. | **LOW** |
| **Elevation of Privilege** | User attempts IDOR by altering `targetUid` in profile requests. | Access to another user's personal health context. | Server derives target UID strictly from authenticated session token, ignoring client-supplied query parameters. | **NEGLIGIBLE** |
