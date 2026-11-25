# HawaSaathi 2.0 — Intelligent Agent Tool Registry & Orchestrator Verification

> **Date:** 2026-11-25
> **Primary Modules:** `src/services/ai/agent-tools.ts`, `src/services/ai/agent-orchestrator.ts`, `src/components/agent/agent-workspace.tsx`, `src/app/api/v1/agent/route.ts`

---

## 1. Typed Allowlisted Tool Registry (`src/services/ai/agent-tools.ts`)

16 allowlisted deterministic tools validated strictly via Zod schemas with auditable execution traces (`toolName`, `status`, `dataClassification`, `source`):
- **Air Quality & Provenance:** `search_stations`, `get_station_details`, `get_station_observations`, `get_verified_aqi`, `get_forecast`, `compare_stations`, `get_data_provenance`
- **Indoor Air & Sizing:** `calculate_cadr`, `calculate_ach`, `get_ventilation_guidance`
- **Planner & Smart Alerts:** `evaluate_daily_plan`, `create_daily_plan`, `update_daily_plan`, `get_alert_rules`, `update_alert_rules`, `validate_alert_rule`

---

## 2. Authentication & DPDP Consent Boundaries

- Read-only / local computational tools operate safely in Guest Mode (`isAuthenticated: false`, `hasCloudConsent: false`).
- Cloud-persistent write intents (`create_daily_plan`, `update_daily_plan`, `update_alert_rules` with `persistToCloud: true`) fail closed with `PERMISSION_DENIED` unless both `isAuthenticated` and `hasCloudConsent` are verified true.

---

## 3. Empirical Verification

- **Unit & Coverage Tests (`tests/unit/v2/v2-regression-closure.test.tsx`, `tests/unit/v2/v2-ai-agent-chat-routes.test.ts`):** 100.00% coverage across `agent-tools.ts`, `agent-orchestrator.ts`, `agent-workspace.tsx`, and `app/api/v1/agent/route.ts`, verifying `calculate_ach` (`OPTIMAL` / `MODERATE` / `UNDERSIZED`), `get_station_details`, permission denials, alert-rule orchestration (`ALERT_RULES_ADVISORY`), and validation errors.
- **Chrome Standalone E2E (`scripts/run-browser-e2e.ts`):**
  - Scenario 7 `[AGENT] Intelligent Agent Live BFF Execution`: **PASS (`1463ms`)** — executed live CADR & ACH sizing task against `/api/v1/agent` (backed by `.env.local` Upstash rate limiter in standalone production mode), rendering `PURIFIER_SIZING` and auditable `calculate_cadr` tool trace.
