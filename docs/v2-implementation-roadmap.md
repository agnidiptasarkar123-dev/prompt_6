# HawaSaathi 2.0 — Implementation Roadmap

**Start Date:** 2026-11-25\
**Target Branch:** `main` (single-branch constraint)

---

## Stage Execution Sequence

### Phase A: Audit & Baseline *(Completed)*
- Audited complete codebase, API routes, domain logic, schemas, UI components, i18n, and test suite.
- Created `docs/v2-architecture-audit.md`, `docs/v2-feature-inventory.md`, `docs/v2-defect-register.md`, `docs/v2-implementation-roadmap.md`.

### Phase B: Critical P0 Repairs & Design Foundation
1. **Fix Existing P7 Forecast Test Mismatch (`DEF-008`)** so baseline suite runs cleanly.
2. **Design Tokens & 3 Appearance Modes (`DEF-005`):** CSS variables (`light`, `dark`, `high-contrast`) + `ThemeProvider` + anti-flash script in `layout.tsx`.
3. **Cross-Component Data Consistency Contract (`DEF-001` & `DEF-007`):** Shared `EnvironmentalSnapshot` state; nullable `aqiCategory` across `page.tsx`, `IndoorCoachPanel`, `recommendations/route.ts`, `ai-explainer.ts`, and `ventilation-decision.ts`; enhanced `AqiSummaryCard`.
4. **Full 23-Language & RTL Reliability (`DEF-002`):** Expand API Zod schemas (`SupportedAiLanguageSchema`), extend `TranslationDictionary` across all 23 locales, auto-update `<html lang dir>`, eliminate unnecessary station refetch on locale switch.
5. **Interactive Map System Rebuild (`DEF-004`):** Rebuild `StationMap` with zoom, pan, reset, fit-bounds, locate-me, clustering, layer filters, collision-free labels, keyboard nav, and accessible list fallback.
6. **Layout & Indoor Coach Repair (`DEF-006`) + Unified AppShell Navigation (`DEF-003`):** Wire responsive sidebar + topbar + mobile navigation with 11 views (`overview`, `map`, `stations`, `planner`, `agent`, `chat`, `insights`, `alerts`, `indoor`, `learn`, `settings`).

### Phase C: Core New Product Features & AI Architecture
1. **Smart Daily Schedule Planner (`src/components/planner/`, `src/domain/planner/`):** Activity CRUD, timeline view, commute window alignment, forecast integration, confidence & medical disclaimers, local guest persistence & consented profile persistence.
2. **HawaSaathi Intelligent Agent & Tool Registry (`src/services/ai/agent-tools.ts`, `src/app/api/v1/agent/route.ts`, `src/components/agent/`):** Strictly typed & validated tool registry (`search_stations`, `get_station_observations`, `get_verified_aqi`, `get_forecast`, `compare_stations`, `evaluate_daily_plan`, `calculate_cadr`, `get_data_provenance`, `get_alert_rules`), structured output, permission/auth checks, deterministic fallback.
3. **Personalised AI Chat (`src/app/api/v1/chat/route.ts`, `src/components/chat/`):** Conversation management (new/rename/delete/clear), starter prompts, copy response, source citations, retry/error recovery, accessible live region announcements, consent guardrails.
4. **Smart Alert Centre (`src/domain/alerts/`, `src/components/alerts/`):** Deduplication, pollutant thresholds, stale & availability alerts, tagged forecast warnings, quiet hours, history log.
5. **Station Comparison & Pollution Insights (`src/components/stations/station-comparison.tsx`, `src/components/insights/`):** Multi-station comparison matrix, CAMS trend & observation gap charts, Data Quality & Coverage transparency, City Overview.

### Phase D: Experience Enhancements
1. **Saved Places & Personal Exposure Journal** (privacy-preserving, explicit consent/local boundary).
2. **Air Quality Learning Centre** (interactive educational cards for all 8 pollutants, CPCB AQI bands, provenance types, CADR/ACH).
3. **Command Palette (`Cmd/Ctrl + K`) & Guided Onboarding** (keyboard & touch accessible).
4. **Offline & Poor-Network Resilience** (last-known cached snapshot banner with explicit stale timestamp & retry).

### Phase E: Quality, Security, Coverage & Browser Verification
1. Write distinct, high-value tests for every new module, domain rule, API route, schema, UI view, theme, locale/RTL, and defect regression—maintaining 100% Statements, Branches, Functions, and Lines coverage.
2. Run TypeScript `tsc --noEmit`, ESLint, Full Coverage (`vitest run --coverage`), Production Build (`next build`), and extended Chrome Browser E2E checks across desktop/tablet/mobile viewports and themes.

### Phase F: Final Documentation & Acceptance Closure
1. Write all remaining `docs/v2-*.md` reports (`architecture`, `aqi-data-integrity`, `ai-agent-architecture`, `localisation-report`, `accessibility-report`, `security-report`, `threat-model`, `performance-report`, `test-report`, `browser-verification`, `final-acceptance`) and update `README.md`.
