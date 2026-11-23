<!-- SPDX-License-Identifier: Apache-2.0 -->
# HawaSaathi Phase 2 Caching & Rate Limiting Strategy

> **Document ID:** HS-RES-P2-001  
> **Status:** Phase 2 Complete  
> **Infrastructure:** Upstash Redis (Distributed) with In-Memory LRU Fallback  

---

## 1. Caching Topology & TTL Hierarchy

HawaSaathi employs a multi-tiered cache hierarchy designed to reduce upstream API load, protect upstream quota limits, and ensure sub-100ms response latencies for frequently queried locations.

```
Incoming Request
      │
      ▼
[CacheService]
      │
      ├─► Layer 1: In-Memory / Distributed Redis Cache
      │      ├─ CPCB Station Hourly Observations (TTL: 900s / 15 mins)
      │      ├─ OpenAQ Location Sensor Readings (TTL: 1800s / 30 mins)
      │      ├─ Open-Meteo CAMS 24h Model Forecast (TTL: 3600s / 60 mins)
      │      └─ Location Geocoding & Prefix Results (TTL: 86400s / 24 hours)
      │
      └─► Layer 2: Live Upstream Fetch (Cache Miss / Stale Eviction)
```

### 1.1 Cache Key Namespaces
- `aq:cpcb:station:{stationId}`: Normalized observations from CPCB CAAQMS.
- `aq:openaq:station:{stationId}`: Normalized observations from OpenAQ.
- `aq:forecast:cams:{lat}:{lon}`: 24-hour CAMS atmospheric forecast.
- `aq:locations:{queryHash}`: Geocoded city and station autocomplete results.
- `rl:{identifier}:{windowStart}`: Sliding window rate limit counters.

---

## 2. Sliding Window Rate Limiting

Rate limiting is implemented using atomic Redis increments with automatic TTL expiry:

### 2.1 Quota Policies
| Client Identity | Route Category | Window | Max Requests | Header Telemetry |
| :--- | :--- | :---: | :---: | :--- |
| **Guest / Anonymous** | Public Read (`/air-quality`, `/forecast`, `/stations`) | 60s | 60 | `X-RateLimit-*` |
| **Guest / Anonymous** | Location Search (`/locations/search`) | 60s | 30 | `X-RateLimit-*` |
| **Authenticated User** | Standard Read & Write (`/profile`, `/recommendations`) | 60s | 300 | `X-RateLimit-*` |
| **All Clients** | Auth & Session Mutation (`/auth/session`) | 60s | 10 | `X-RateLimit-*` |

### 2.2 Graceful Degradation
If Upstash Redis is unconfigured or temporarily unreachable:
- `RedisService` falls back gracefully to local memory storage (`Map<string, { value: unknown; expiresAt: number }>`).
- System continues serving traffic with in-memory sliding window counters, avoiding hard outages.

---

## 3. Circuit Breaker Specification

To prevent cascading failures when external APIs experience outages:
- **Failure Threshold:** 5 consecutive failed upstream requests.
- **Cool-off Duration:** 30 seconds.
- **Half-Open Probes:** Permits 1 test request after cool-off; resets failure count upon success or reopens circuit upon failure.
