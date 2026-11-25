# HawaSaathi — Technical & Systems Architecture

> **Focus:** Full-Stack Architecture, Data Flow, Resilience, and Cloud Infrastructure

---

## 1. High-Level Architectural Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 Web Frontend                         │
│   (React 19, Tailwind CSS v4, Lucide Icons, WCAG 2.2 AA, 23 Locales)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         HTTPS / TLS 1.3 Requests
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Next.js Backend-for-Frontend (BFF) Server Routes           │
│                                                                        │
│  ┌────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │ Rate Limiter           │  │ Zod Boundary Validation              │  │
│  │ - Upstash Redis REST   │  │ - Location, Station, Recommendation  │  │
│  │ - In-Memory Fail-Closed│  │ - User Profile & Session Schemas     │  │
│  └────────────────────────┘  └──────────────────────────────────────┘  │
│  ┌────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │ Firebase Admin SDK     │  │ Resilient HTTP Circuit Breakers      │  │
│  │ - verifySessionCookie  │  │ - CPCB, OpenAQ, Open-Meteo, Gemini   │  │
│  │ - asia-south1 Firestore│  │ - CLOSED, OPEN, HALF_OPEN states     │  │
│  └────────────────────────┘  └──────────────────────────────────────┘  │
└───────┬───────────────────┬──────────────────┬──────────────────┬──────┘
        │                   │                  │                  │
        ▼                   ▼                  ▼                  ▼
┌──────────────┐   ┌─────────────────┐  ┌─────────────┐   ┌──────────────┐
│ CPCB CAAQMS  │   │ OpenAQ v3       │  │ Open-Meteo  │   │ Google Gemini│
│ (data.gov.in)│   │ (Geo-Spatial)   │  │ CAMS Global │   │ (Flash/Pro)  │
│ Ground Feed  │   │ Cross-Validation│  │ Atmospheric │   │ Grounded AI  │
└──────────────┘   └─────────────────┘  └─────────────┘   └──────────────┘
```

---

## 2. Core Architectural Components

### 2.1 Backend-for-Frontend (BFF) Pattern
All frontend requests communicate exclusively with server routes under `/api/v1/`:
- `/api/v1/locations/search`: Sub-millisecond geographic search across 300+ major Indian urban centers.
- `/api/v1/stations/nearby`: Geo-radius station discovery querying verified CPCB stations.
- `/api/v1/air-quality`: Real-time multi-pollutant ingestion, averaging, and CPCB sub-index calculation.
- `/api/v1/forecast`: Atmospheric chemical dispersion forecasts from Open-Meteo CAMS Global.
- `/api/v1/recommendations`: Hybrid pipeline combining deterministic domain rules with grounded Gemini AI explanation.
- `/api/v1/profile`: Multi-tenant user profile management with DPDP Act 2023 1-click export and deletion.

### 2.2 Distributed Rate Limiting & High Availability
- **Upstash Redis REST Integration:** Multi-tier sliding-window rate limiter limits abuse while allowing legitimate traffic bursts.
- **Fail-Closed Resilience:** If Upstash Redis is unreachable, the system automatically falls back to an internal memory sliding-window limiter without failing open.
- **Circuit Breakers:** Upstream API calls are protected by circuit breakers with 3-failure threshold, 60s cooldown, and half-open probing.

### 2.3 Standalone Docker Deployment on Google Cloud Run
- Multi-stage Alpine container packaging `.next/standalone`.
- Non-root user execution (`nextjs:nodejs` UID 1001).
- Port 8080 binding optimized for Cloud Run autoscaling from 0 to 10+ instances in `asia-south1` (Mumbai).
