# HawaSaathi — Phase 6 Upstash Redis & Rate-Limiting Reliability

**Document ID:** `HS-RES-P6-REDIS-2026`\
**Classification:** Operational Reliability & Denial-of-Service Defense\
**Scope:** Distributed Rate Limiter, In-Memory Fallback, Redis Atomic Pipelines\

---

## 1. Rate-Limiting Policy Architecture

HawaSaathi protects all ingress API routes against denial-of-service (DoS), brute force, and upstream API quota depletion using a distributed sliding-window counter implemented via Upstash Redis REST:

| Route Path | Method | Window | Limit (Req / Min) | Enforcement Policy |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/air-quality` | GET | 60s | 120 | Distributed sliding window |
| `/api/v1/forecast` | GET | 60s | 60 | Distributed sliding window |
| `/api/v1/stations/nearby` | GET | 60s | 90 | Distributed sliding window |
| `/api/v1/locations/search`| GET | 60s | 90 | Distributed sliding window |
| `/api/v1/recommendations` | POST | 60s | 30 | Distributed sliding window (AI compute protection) |
| `/api/v1/auth/session` | POST | 60s | 15 | Strict brute-force limit |
| `/api/v1/profile` | PUT | 60s | 30 | Strict state mutation limit |
| `/api/v1/profile?export=json` | GET | 60s | 5 | Heavy data export throttling |
| `/api/v1/profile` | DELETE | 60s | 5 | Irreversible deletion throttling |

---

## 2. Production Fail-Closed vs Development Fail-Open

### 2.1 Production Enforcement (`NODE_ENV === "production"`)
- If `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` is unset or malformed:
  - `RedisService.isDistributed()` returns `false`.
  - Rate-limit evaluations emit a `[CRITICAL]` security alert and return `allowed: false`.
  - Endpoints reject requests with HTTP 429 Too Many Requests / HTTP 503 Service Unavailable.
- If Redis REST API returns network timeouts or HTTP 5xx:
  - Error is caught and logged as `[CRITICAL] Redis rate limit backend failure`.
  - System fails closed (`allowed: false`), preventing unmetered traffic surges from exhausting downstream CPCB and Gemini quotas.

### 2.2 Development / Test Enforcement (`NODE_ENV !== "production"`)
- Degrades gracefully to an in-memory sliding window counter (`Map<string, { value: string, expiresAt: number }>`).
- Allows local development and testing without network dependencies on cloud Redis.

---

## 3. Atomic Multi-Command Pipelines

To prevent race conditions during concurrent request bursts:
- Key increments and TTL expirations are executed via atomic REST multi-commands:
  ```json
  [
    ["INCR", "hs_rl:<client_ip>:<route>"],
    ["EXPIRE", "hs_rl:<client_ip>:<route>", 60]
  ]
  ```
- Ensures that counter creation and TTL assignment occur atomically, eliminating zombie unexpired keys.
