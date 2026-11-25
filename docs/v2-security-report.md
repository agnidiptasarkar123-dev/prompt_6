# HawaSaathi 2.0 — Security & Privacy Verification Report (OWASP ASVS 5.0.0 Level 2)

> **Date:** 2026-11-25
> **Standard:** OWASP ASVS 5.0.0 Level 2 + DPDP Act 2023 Minimization

---

## 1. Security Architecture Summary

1. **Authoritative BFF & Firebase Auth Integration:**
   - Verified bearer ID tokens and session cookies (`hs_session`) via Firebase Admin SDK (`src/lib/firebase/admin.ts`) in server routes (`/api/v1/profile`, `/api/v1/auth/session`, `/api/v1/agent`, `/api/v1/chat`, `/api/v1/planner`).
   - All authenticated profile mutations require explicit `cloudPersistenceConsent: true`.
2. **Distributed Rate Limiting (Fail-Closed Production Policy):**
   - `src/services/rate-limit/rate-limiter.ts` + `src/lib/http/api-response.ts` enforce distributed Upstash Redis rate limiting in `NODE_ENV=production` and fail closed (`429 RATE_LIMIT_EXCEEDED`) when Redis is unavailable or unconfigured in production.
3. **Allowlisted Agent Tool Execution & Zod Boundary Validation:**
   - Every BFF ingress body and egress response is parsed with Zod schemas (`AgentRequestSchema`, `RecommendationResponseSchema`, `PlannerActivitySchema`, `UserProfileSchema`, `AIReplyValidation`).
   - Agent cloud-write intents (`create_daily_plan`, `update_daily_plan`, `update_alert_rules` with `persistToCloud: true`) are blocked (`PERMISSION_DENIED`) unless authenticated with consent.
4. **AI Prompt Injection & Data-Truth Guardrails:**
   - Chat and recommender pipelines forbid LLM AQI estimation and validate category assertions against verified AQI evidence (`src/services/ai/chat-service.ts`, `ai-explainer.ts`).
5. **Privacy Controls (DPDP Act 2023):**
   - Guest Mode stores preferences/plans/threads in local browser storage without cloud writes.
   - `GET /api/v1/profile?export=json` exports complete user data; `DELETE /api/v1/profile` revokes refresh tokens and cascades deletion.
   - Zero server secrets in `NEXT_PUBLIC_*` client environment variables.

---

## 2. Empirical Security Verification

- **Automated Security, Fuzzing, Adversarial & Auth Suites Included in Passing `82/82` Run (`10,130` tests):**
  - `tests/unit/security/p3-security-adversarial.test.ts`
  - `tests/unit/security/p5-security-asvs-hardening.test.ts`
  - `tests/unit/security/security-fuzzing.test.ts`
  - `tests/unit/p7/p7-security-adversarial-api.test.ts`
  - `tests/unit/p7/p7-firebase-auth-privacy.test.ts`
  - `tests/unit/v2/v2-ai-agent-chat-routes.test.ts` & `tests/unit/v2/v2-regression-closure.test.tsx` (permission & schema boundary enforcement)
- **Production E2E Verification (`scripts/run-browser-e2e.ts`):** Confirmed fail-closed rate limiter logs when Redis env vars were omitted, and clean BFF execution with zero runtime exceptions when `.env.local` Upstash configuration was supplied.
