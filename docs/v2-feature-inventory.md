# HawaSaathi 2.0 — Feature Preservation Inventory

**Date:** 2026-11-25\
**Scope:** Complete inventory of all 1.x capabilities to be preserved and enhanced in 2.0.

---

## 1. Existing Frontend Components (`src/components/`)

| Feature Area | File Path | Status in 1.x | 2.0 Target Disposition |
| :--- | :--- | :--- | :--- |
| Top Navigation Bar | `src/components/shared/navbar.tsx` | Active | Preserve & enhance with theme toggle, search/command palette trigger, mobile menu, 23-lang switcher |
| Navigation Sidebar | `src/components/shared/sidebar.tsx` | Unused in `page.tsx` | Wire into unified responsive AppShell with 11 primary product routes/views |
| Global Footer | `src/components/shared/footer.tsx` | Active | Preserve legal/DPDP/CPCB/OSM attributions; theme-aware & i18n-complete |
| City & Location Search | `src/components/dashboard/location-search.tsx` | Active | Preserve autocomplete & geolocation; add saved places & recent stations |
| AQI Summary Card | `src/components/air-quality/aqi-summary-card.tsx` | Active | Fix "Unavailable" UX (reasons, missing pollutants, nearby fallback station); add theme support |
| Monitored Pollutant Cards | `src/components/air-quality/pollutant-grid.tsx` | Active | Preserve 8 CPCB pollutants (PM2.5, PM10, NO2, SO2, CO, O3, NH3, Pb) & sub-indices; theme-aware |
| Monitoring Station Panel | `src/components/stations/station-panel.tsx` | Active | Preserve CPCB/OpenAQ filters & provenance modal trigger; localize & add comparison selection |
| Monitoring Map | `src/components/maps/station-map.tsx` | Static SVG | Rebuild with interactive zoom/pan/reset/fit/locate, clustering, layers & accessible list fallback |
| Commute Exposure Planner | `src/components/commute/commute-planner.tsx` | Active | Preserve & integrate into Daily Planner section with forecast awareness |
| Forecast Chart | `src/components/forecast/forecast-chart.tsx` | Active | Preserve Type D separation; enhance chart responsiveness & theme contrast |
| Recommendations Panel | `src/components/recommendations/recommendations-panel.tsx` | Active | Fix `"MODERATE"` default contradiction when AQI unavailable; show deterministic vs AI badge |
| Indoor Air Quality Coach | `src/components/household/indoor-coach-panel.tsx` | Active (cramped) | Fix 3-column clipping defect; preserve CADR/ACH calculator, ventilation, source control, disclaimers |
| Household Profile Modal | `src/components/household/household-modal.tsx` | Active | Preserve non-diagnostic sensitivity checkboxes, DPDP consent, commute mode |
| Auth & DPDP Account Modal | `src/components/auth/auth-modal.tsx` | Active | Preserve Google/Email link sign-in, guest mode, 1-click JSON export & hard deletion |
| Notification Center & Rules | `src/components/alerts/notification-center.tsx`, `alert-preferences-modal.tsx` | Active | Preserve hysteresis & quiet hours; upgrade into Smart Alert Centre with deduplication & pollutant rules |
| Provenance & Source Modal | `src/components/shared/provenance-modal.tsx` | Active | Preserve Type A/B/C/D typology & GODL-India/OpenAQ/CAMS/OSM licenses |
| Brand Logo SVG | `src/components/brand/logo.tsx` | Active | Preserve original HawaSaathi SVG across light/dark/high-contrast |

---

## 2. Backend API Routes (`src/app/api/v1/`)

- `GET /api/v1/health` — Infrastructure & provider readiness healthcheck.
- `GET /api/v1/locations/search` — Indian city registry autocomplete.
- `GET /api/v1/stations/nearby` — Spatial CPCB & OpenAQ station discovery with Haversine distance sorting & Redis caching.
- `GET /api/v1/air-quality` — Station-isolated pollutant observations & Type B CPCB AQI calculation.
- `GET /api/v1/forecast` — Open-Meteo CAMS Global forecast (`TYPE_D_MODEL_FORECAST`).
- `POST /api/v1/recommendations` — Deterministic rules + Indoor Coach + Gemini grounded explainer.
- `POST / DELETE /api/v1/auth/session` — HttpOnly Firebase session cookie management & CSRF protection.
- `GET / PUT / POST / DELETE /api/v1/profile` — Authenticated Firestore profile CRUD, DPDP export & cascading deletion.

---

## 3. Domain & Infrastructure Services

- **CPCB Engine (`src/domain/cpcb/`):** Sub-index piecewise linear equations (`PM2.5`, `PM10`, `NO2`, `SO2`, `CO`, `O3`, `NH3`, `Pb`), WeakMap trusted aggregation boundary, 3-pollutant + PM sufficiency rule, extrapolation beyond 500.
- **Rules & Indoor Domain (`src/domain/rules/`, `src/domain/indoor/`, `src/domain/user-context/`):** Deterministic recommender, NCDC diurnal exposure windows, safety guardrails, CADR/ACH filtration calculator, ventilation strategy (including active indoor combustion safety override).
- **Providers (`src/services/providers/`):** CPCB adapter (IST->UTC parsing, GODL-India, pagination), OpenAQ v3 adapter, Open-Meteo CAMS adapter.
- **Resilience & Security (`src/lib/`):** Circuit breakers, Upstash Redis atomic Lua rate limiting (fail-closed in prod), Firebase Admin SDK verification, default-deny `firestore.rules`.
- **Localisation (`src/i18n/`):** Registry of 23 Indian languages (English + 22 Eighth Schedule languages), RTL direction metadata (`ur-IN`, `ks-IN`, `sd-IN`), environmental glossary.
