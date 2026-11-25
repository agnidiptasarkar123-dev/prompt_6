# HawaSaathi 2.0 — Phase A Architecture Audit

**Audit Date:** 2026-11-25\
**Repository:** `/Users/agnidiptasarkar/Desktop/prompt_6`\
**Branch:** `main` (HEAD `bc7a474`)\
**Auditor:** Principal Software Architect & QA Lead\

---

## 1. Executive Summary

HawaSaathi 1.x implements a strong backend environmental intelligence core—featuring MoEFCC CPCB NAQI (2014) deterministic calculations, weak-map verified measurement boundaries, multi-provider ingestion (CPCB CAAQMS, OpenAQ v3, Open-Meteo CAMS), Upstash Redis distributed rate limiting/caching, Firebase Authentication/Firestore Admin SDK integration, 23 Indian locale JSON catalogs, and Gemini narrative explanations with deterministic fallback.

However, the **product surface (`src/app/page.tsx` and frontend UI components)** exhibits severe structural gaps that prevent users from discovering or operating core workflows:
- Monolithic single-scroll page without navigation shell (`Sidebar` component exists unused).
- Missing Schedule Planner, Intelligent Agent workspace, AI Chat interface, Insights, Station Comparison, Learning Centre, and Appearance Modes (Dark / High Contrast).
- Critical cross-component data consistency bug: `page.tsx` and `recommendations/route.ts` default unavailable `aqiCategory` to `"MODERATE"`, causing the AI explanation and Indoor Coach to claim `"MODERATE"` air quality when the main CPCB AQI panel shows `"Overall CPCB AQI Unavailable"`.
- Critical API validation bug: `RecommendationRequestSchema` and `UserPreferencesSchema` restrict `language` to `["en", "bn", "hi"]`, breaking recommendation generation and profile updates for 20 of the 23 Indian scheduled languages.
- Static SVG `StationMap` lacks zoom, pan, clustering, layer controls, and keyboard exploration despite `leaflet` being present in `package.json`.

---

## 2. Technology Stack & Infrastructure Baseline

| Layer | Technology | Version / Configuration | Status |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router, Webpack build) | `^16.0.0` (16.4.6), React `^19.0.0` | Working (`next build` succeeds) |
| **Styling** | Tailwind CSS + CSS Custom Properties | `^3.4.15` | Light mode only; lacks dark/high-contrast CSS tokens |
| **Validation** | Zod | `^4.6.7` | Working; overly strict language enums in 2 schemas |
| **AI SDK** | `@google/genai` | `^3.6.1` | Working (`gemini-3.5-flash-lite` + fallback chain) |
| **Auth & DB** | Firebase Client SDK + Admin SDK | `13.4.0` / `14.5.1`, default-deny `firestore.rules` | Preserved; Admin SDK BFF mediation |
| **Cache & Rate Limit** | `@upstash/redis` + `@upstash/ratelimit` | `1.41.0` / `2.2.1` | Fail-closed in prod; memory fallback in dev/test |
| **Mapping** | `leaflet` installed, custom SVG rendered | `leaflet ^1.9.4` | Leaflet unused in `StationMap` |
| **Testing & Coverage** | Vitest + `@vitest/coverage-v8` + Puppeteer | `5.1.1`, `puppeteer-core ^25.18.1` | 100% coverage threshold enforced (`vitest.config.ts`) |

---

## 3. Baseline Verification Metrics (Pre-Upgrade)

- **TypeScript (`npm run typecheck`):** Exit code `0` (0 errors).
- **ESLint (`npm run lint`):** Exit code `0` (0 errors).
- **Production Build (`npm run build`):** Exit code `0`.
- **Unit/Integration Suite (`npm test`):** `75 passed, 1 failed` test files (`10,018 passed, 75 failed` out of `10,093` tests).
  - *Failing File:* `tests/unit/p7/p7-browser-e2e-workflows.test.ts` (75 assertions checking `.provider` / `.quality` instead of `.modelDomain` / `.typology` on `NormalizedForecast` when live Open-Meteo data returns >0 items).
- **Baseline Coverage (on 75 passing test files):**
  - Statements: `2143 / 2143` (`100%`)
  - Branches: `1903 / 1903` (`100%`)
  - Functions: `322 / 322` (`100%`)
  - Lines: `2048 / 2048` (`100%`)
- **Browser E2E (`npm run test:e2e:browser`):** `10 / 10` workflows passed against local Next.js production server (`port 3009`).

---

## 4. Preservation Mandate

All existing backend services, CPCB deterministic formulas, WeakSet trusted aggregation boundaries, Firebase BFF authentication, default-deny Firestore rules, Upstash Redis fail-closed rate limiting, Gemini safety guardrails, OpenStreetMap/GODL-India/CC-BY-4.0 legal attributions, and 23 scheduled Indian language catalogs will be strictly preserved and extended.
