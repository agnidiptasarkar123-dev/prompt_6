# Phase 5 — Reliability, Resilience & Fault Tolerance Engineering Report
## Multi-Tier Failover, Circuit Breakers & Deterministic Fallbacks

> **Document ID:** `HS-P5-REL-001`\
> **Timestamp:** `2026-11-24T15:03:00+05:30`\
> **Platform:** HawaSaathi (हवासाथী / হাওয়াসাথী)\
> **Author:** Site Reliability Engineer & Distributed Systems Architect\
> **Target Engineering Objective:** 99.9% Availability\
> **Status:** RATIFIED & TESTED\

---

## 1. Reliability Philosophy & Core Tenets

In public environmental health systems, downtime or erroneous guidance during severe pollution emergencies can cause real-world harm. HawaSaathi adheres to three foundational reliability principles:
1. **Never Fail Hard on External Dependencies:** Upstream API outages (CPCB, OpenAQ, Open-Meteo, Google Gemini, Upstash Redis) must never cause 500 crashes for end users.
2. **Deterministic Fallbacks for All AI Syntheses:** If generative AI is unavailable, times out, or hallucinates schema-violating output, the system seamlessly transitions to our rule-based `DeterministicRecommender`.
3. **Data Provenance Preservation in Degraded States:** When falling back to regional meteorological forecasts (CAMS Global), the UI prominently badges data as `MODEL_FORECAST` rather than pretending it is an authoritative ground measurement.

---

## 2. Multi-Tier Failover & Circuit Breaker Architecture

```
[User Requests Air Quality]
           │
           ▼
+─────────────────────────────────────────+
| 1. Authoritative Ground Data Source     | ──(200 OK)──► CPCB Sub-Index Engine (Type A / B / C)
|    - CPCB CAAQMS (data.gov.in)          |
+─────────────────────────────────────────+
           │ (Fails / Stale / Offline)
           ▼
+─────────────────────────────────────────+
| 2. Secondary Ground Data Source         | ──(200 OK)──► CPCB Sub-Index Engine (Type B / C)
|    - OpenAQ v3 Real-time Station Feed   |
+─────────────────────────────────────────+
           │ (Fails / Unmonitored Station)
           ▼
+─────────────────────────────────────────+
| 3. Atmospheric Dispersion Model         | ──(200 OK)──► Open-Meteo CAMS Global (~45km grid)
|    - Tagged strictly: [MODEL_FORECAST]  |               (Type D Provenance Badge)
+─────────────────────────────────────────+
           │ (Fails)
           ▼
+─────────────────────────────────────────+
| 4. Cached Station Fallback State        | ──► Last Verified Ground Telemetry with
|    - Redis / In-Memory Store            |     Explicit STALE Indicator
+─────────────────────────────────────────+
```

---

## 3. Gemini Multi-Model AI Routing & Failover Circuit

AI explanations in `src/services/ai/ai-explainer.ts` implement a battle-hardened multi-tier failover circuit:

```
[Input: Validated Environmental Telemetry + User Context]
                          │
                          ▼
             +─────────────────────────+
             | Tier 1: gemini-2.5-flash|
             +─────────────────────────+
                          │ (503 / 429 / Timeout > 5s)
                          ▼
             +─────────────────────────+
             | Tier 2: gemini-2.5-pro  |
             +─────────────────────────+
                          │ (503 / 429 / Timeout > 5s)
                          ▼
             +─────────────────────────+
             | Tier 3: gemini-1.5-flash|
             +─────────────────────────+
                          │ (503 / 429 / Timeout > 5s)
                          ▼
             +─────────────────────────+
             | Tier 4: gemini-1.5-pro  |
             +─────────────────────────+
                          │ (All External LLM Tiers Fail)
                          ▼
             +──────────────────────────────────────────+
             | Tier 5: DeterministicRecommender         |
             | - Pure TypeScript Rule Engine            |
             | - CPCB / WHO Health Guidance             |
             | - Zero Network Latency (<1ms)            |
             | - 100% Availability Guarantee            |
             +──────────────────────────────────────────+
```

### 3.1 Circuit Breaker Implementation Details
- **Threshold:** 3 consecutive failures trip the circuit into `OPEN` state.
- **Cool-off Duration:** 30 seconds before transitioning to `HALF-OPEN`.
- **Validation Guardrail:** Every LLM completion is validated against `AiExplanationResponseSchema` using Zod. If the model returns malformed JSON or omits required fields, the response is discarded and failover is triggered immediately.

---

## 4. Redis Cache Outage Survival

If Upstash Redis experiences network latency, DNS resolution failures, or token expiration:
- The `RedisService` (`src/lib/redis/redis-client.ts`) catches the error without bubbling exceptions.
- It automatically diverts read and write operations to an in-memory sliding-window cache.
- Telemetry queries continue resolving within $<5 \text{ ms}$.
- Verified via `tests/unit/performance/p5-performance-concurrency.test.ts`.
