# HawaSaathi — Phase 6 Production Runtime Architecture

**Document ID:** `HS-ARCH-P6-PROD-2026`\
**Milestone:** Phase 6 — Deployment Engineering & Real-World Pilot Readiness\
**Target Environment:** Google Cloud Run (`asia-south1`, Mumbai, India)\
**Security Baseline:** OWASP ASVS 5.0.0 Level 2 / CIS Google Cloud Benchmarks\

---

## 1. System Topology & Trust Boundaries

HawaSaathi employs a Next.js Backend-for-Frontend (BFF) topology running as an autoscaling containerized workload on Google Cloud Run. Direct client connections to databases, administrative APIs, or third-party provider feeds are strictly prohibited.

```mermaid
flowchart TD
    subgraph Untrusted Client Tier
        Browser[Client Browser / Mobile PWA]
        ScreenReader[Assistive Tech / Screen Reader]
    end

    subgraph Edge & Security Boundary
        CloudArmor[Cloud Armor WAF / DDoS Mitigation]
        CDN[Cloud CDN / Static Asset Cache]
    end

    subgraph Trust Boundary: Server Tier (Cloud Run)
        BFF[Next.js App Server & BFF API Routes]
        RateLimiter[Distributed Rate Limiter]
        CircuitBreaker[Resilience Circuit Breakers]
        AIEngine[Gemini Multi-Model Routing Engine]
        DetEngine[Deterministic Category Recommender]
        CPCBEngine[CPCB NAQI Sub-Index Calculator]
        AdminAuth[Firebase Admin Auth Validator]
    end

    subgraph Persistence & State Boundary
        UpstashRedis[(Upstash Redis: Cache & Rate Limit)]
        Firestore[(Cloud Firestore: asia-south1)]
    end

    subgraph External Provider Boundary
        CPCB[CPCB CAAQMS / data.gov.in API]
        OpenAQ[OpenAQ v3 API]
        CAMS[Open-Meteo CAMS Global API]
        Gemini[Google Gemini Generative AI API]
    end

    Browser -->|HTTPS / TLS 1.3| CloudArmor
    ScreenReader --> Browser
    CloudArmor --> CDN
    CDN -->|Dynamic Requests| BFF
\
    BFF --> RateLimiter
    RateLimiter -->|Fail-Closed in Prod| UpstashRedis
    BFF --> AdminAuth
    AdminAuth -->|ADC Token Verify| Firestore
\
    BFF --> CircuitBreaker
    CircuitBreaker --> CPCB
    CircuitBreaker --> OpenAQ
    CircuitBreaker --> CAMS
\
    BFF --> CPCBEngine
    CPCBEngine -->|Validated Sub-Indices| BFF
\
    BFF --> AIEngine
    AIEngine -->|Strict Prompt Injection Guard| Gemini
    AIEngine -- Timeout > 5s / Fallback --> DetEngine
```

---

## 2. Boundary Isolation & Security Invariants

### 2.1 Untrusted Client Tier vs BFF Boundary
- The client receives only pre-rendered HTML and client bundles sanitised of server credentials.
- All environment variables prefixed with `NEXT_PUBLIC_` are restricted to non-sensitive public configuration (e.g. Firebase Client API Key, Project ID).
- All mutations and authenticated requests must pass an `Authorization: Bearer <Firebase_ID_Token>` or session cookie validated by the server-side Firebase Admin SDK.

### 2.2 Server Tier vs Database Boundary (Cloud Firestore)
- Firestore Client Security Rules remain locked in production mode:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if false;
      }
    }
  }
  ```
- All Firestore access occurs exclusively via the server-side Firebase Admin SDK running under the Cloud Run service identity using Application Default Credentials (ADC).

### 2.3 Server Tier vs Redis Boundary (Upstash Redis)
- Distributed rate-limiting and response caching execute over TLS to Upstash Redis REST endpoints.
- In production (`NODE_ENV === "production"`), the system enforces a strict fail-closed policy: if Redis is unreachable or credentials are missing, write-sensitive routes return HTTP 429 / 503 rather than failing open.

### 2.4 External Provider Boundary
- External APIs (data.gov.in, OpenAQ, Open-Meteo, Gemini) are wrapped in domain-specific `CircuitBreaker` instances (trip threshold: 5 consecutive failures, cooling window: 30 seconds).
- Telemetry from external providers is parsed into immutable Zod schemas before being processed by domain calculations.

---

## 3. Single Points of Failure (SPOF) & Mitigations

| Component / Layer | Potential Failure Mode | Impact | Automated Resilience Mitigation |
| :--- | :--- | :--- | :--- |
| **Cloud Run Service** | Container crash or OOM | Request drop | Cloud Run automated container restart, minimum instances $\ge 1$ |
| **Upstash Redis** | Service outage or network partition | Rate limit failure | Production fail-closed rejects high-risk mutations; read caches serve stale-while-revalidate |
| **CPCB API (`data.gov.in`)**| Timeout or upstream 500 error | Live ground data missing | Circuit breaker trips; fails over to OpenAQ or CAMS forecast tagged `MODEL_FORECAST` |
| **Gemini AI API** | HTTP 503 / 429 or quota exhaustion | Contextual narrative missing | Multi-model routing (flash-lite $\rightarrow$ latest $\rightarrow$ 3.1) and instant fallback to `DeterministicRecommender` |
| **Firebase Auth** | Identity provider downtime | User sign-in blocked | Unauthenticated Guest Mode provides full access to live AQI, routine planner, and indoor coach via `sessionStorage` |
| **Firestore Database**| Region partition (`asia-south1`) | Profile read/write fails | Read-only mode: cached user state used; anonymous session retains temporary preferences |
