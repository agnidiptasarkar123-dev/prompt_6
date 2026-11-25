# HawaSaathi 2.0 — Real Chrome Browser End-to-End Verification Report

> **Date:** 2026-11-25
> **Runner:** `node --experimental-strip-types scripts/run-browser-e2e.ts`
> **Browser:** Google Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`) via `puppeteer-core`
> **Target Server:** `node .next/standalone/server.js` (Next.js `16.4.6` production standalone build with `.env.local` loaded)

---

## 1. Execution Scope & Transparency Note

- Live standalone Next.js server routes `/`, `/api/v1/recommendations`, `/api/v1/planner`, `/api/v1/agent`, and `/api/v1/chat` executed directly end-to-end (including distributed Upstash Redis rate limiting).
- External upstream air-quality/tile endpoints (`/api/v1/stations/nearby`, `/api/v1/air-quality`, `/api/v1/forecast`, `tile.openstreetmap.org`) were deterministically intercepted inside Puppeteer per test scenario so Normal, Zero-Station, and Unavailable-AQI cases could be asserted reproducibly without upstream portal volatility.

---

## 2. All 12 Chrome E2E Journeys — Summary (`Passed=12/12, Failed=0`, Port `64718`)

| # | Category | Journey Name | Duration | Verified Evidence | Status |
|---|---|---|---|---|---|
| 1 | `CORE` | Initial Dashboard & Onboarding Persistence | `1391ms` | `362` AQI rendered, `hs_onboarding_seen=true`, `domContentLoaded=254ms`, `load=331ms`, `fcp=328ms` | **PASS** |
| 2 | `CORE` | Live Recommendations & Indoor Coach Wiring | `502ms` | Live `/api/v1/recommendations` hydrated guidance & Indoor Air Coach | **PASS** |
| 3 | `DATA_INTEGRITY` | Location vs Station Separation (Zero Stations) | `726ms` | `Search Location:` shown cleanly with no synthetic station suffix or `Type C` badge | **PASS** |
| 4 | `PROVENANCE` | Provenance Truthfulness & Zero Duplicate Copy | `722ms` | `neutralProv=true` (`No verified observation available`), `noFakeMod=true`, `count=1` | **PASS** |
| 5 | `MAPS` | Interactive Map Zoom, Layers & Accessible List | `1599ms` | `zoom 1.0 -> 1.4`, `OPENAQ` layer filter applied, `Accessible List` table rendered | **PASS** |
| 6 | `PLANNER` | Daily Schedule Planner Full CRUD & Edit | `1075ms` | Created `"Evening Park Run"` (`RUNNING`), edited/saved changes, deleted cleanly | **PASS** |
| 7 | `AGENT` | Intelligent Agent Live BFF Execution | `1463ms` | Live `/api/v1/agent` executed CADR & ACH sizing (`PURIFIER_SIZING`, `calculate_cadr`) | **PASS** |
| 8 | `CHAT` | Grounded AI Chat & Thread Persistence | `1696ms` | Live `/api/v1/chat` rendered grounded assistant reply in `role="log"` with zero alerts | **PASS** |
| 9 | `THEME` | Three Theme Modes & Zero-Flash Reload Persistence | `981ms` | `data-theme="high-contrast"` applied & persisted after full page reload | **PASS** |
| 10 | `I18N` | 23-Locale Switching & Urdu RTL Direction | `679ms` | `bn-IN`/`ltr`, `ur-IN`/`rtl` switched cleanly with `0` extra station/AQI refetches | **PASS** |
| 11 | `A11Y` | Keyboard Command Palette (Ctrl+K) & ARIA Landmarks | `227ms` | `paletteOpen=true`, `Escape` dismisses, `landmarks=6` | **PASS** |
| 12 | `RESPONSIVE` | Responsive Viewports Matrix & Zero Runtime Page Errors | `1003ms` | `320:320/320`, `375:375/375`, `768:768/768`, `1280:1280/1280`, `1920:1920/1920`, `pageErrors=0` | **PASS** |
