# HawaSaathi 2.0 — Location vs Monitoring Station Integrity Verification

> **Date:** 2026-11-25
> **Status:** VERIFIED (Unit Tests + Chrome Standalone E2E)

---

## 1. Root Cause Defect Resolved

Prior to remediation (`DEF-V2-001`, `DEF-V2-002`, `DEF-V2-003`):
- Searching a locality or city displayed mixed semantics between searched geography (`selectedLocation`) and monitoring infrastructure (`selectedStation`).
- `src/app/page.tsx` queried `/api/v1/stations/nearby` with `?radius=35` instead of `radiusKm`, omitting custom search-radius parameterization.
- `alternativeStation` used static `stations[1]` indexing, which broke when a user selected `stations[1]`.
- Switching rapidly between locations or stations lacked monotonic request counters and `AbortController` cancellation, creating race conditions where slow responses could overwrite newly selected stations.

---

## 2. Implemented Architectural Controls

1. **API Query Parameter Compatibility (`src/app/api/v1/stations/nearby/route.ts`):**
   - Accepts both `radiusKm` and `radius` (`url.searchParams.get("radiusKm") ?? url.searchParams.get("radius")`).
   - Client request updated in `src/app/page.tsx` to `?lat=...&lon=...&radiusKm=35`.
2. **Request Cancellation & Monotonic Sequence Guards (`src/app/page.tsx`):**
   - Added `aqAbortRef` + `aqReqSeqRef` in `fetchAirQuality` and `stationsAbortRef` + `locReqSeqRef` in `fetchStationsAndForecast`.
   - Clears prior observations, calculated AQI, AI explanations, and warnings immediately when initiating a new station or location fetch.
   - Ignores superseded async responses and `AbortError` rejections.
3. **Explicit Entity Separation (`src/components/air-quality/aqi-summary-card.tsx` & `src/components/stations/station-panel.tsx`):**
   - Displays `Search Location: <name>, <city>, <state>` distinctly from monitoring station identity (`Station ID`, `<city>, <state>`, `<distanceKm> km from center`).
   - Renders explicit zero-station messaging when `station === null` (`NO_STATION` pill + `"No eligible monitoring station found within 35 km radius."`) without fabricating a station suffix.
   - `StationPanel` renders an explicit nearby station coverage breakdown (`fresh (<=24h)`, `multi-pollutant PM`, `partial raw`, `inactive`) without conflating station metadata timestamps with observation timestamps.
4. **Intelligent Alternative Station Selection & Hint Propagation (`src/app/page.tsx`, `src/app/api/v1/air-quality/route.ts`):**
   - `alternativeStation` `useMemo` filters out `selectedStation?.id`, prioritizes nearby stations with $\ge 3$ pollutants including `PM2.5` or `PM10`, and falls back to the nearest alternate candidate when none meet full AQI eligibility.
   - Propagates `stationName` / `resolvedStationHint` through `/api/v1/air-quality` to `SourceOrchestrator.getStationAirQuality()` for atomic `filters[station]` retrieval.

---

## 3. Empirical Verification

- **Unit & Race-Condition Suite (`tests/unit/v2/v2-regression-closure.test.tsx`):**
  - Verifies location-without-station rendering (`Search Location: Kolkata, West Bengal`, `Location: Kolkata, Kolkata`, zero station suffix).
  - Verifies concurrent location & station race abort/sequence discard without cross-station data contamination.
  - Verifies `StationPanel` nearby coverage summary breakdown and safe `TRANSLATIONS[language] || TRANSLATIONS["en-IN"]` lookup fallback.
- **Live Standalone API Check:** `/api/v1/stations/nearby?lat=22.6278&lon=88.3807&radiusKm=35` returned `31` real stations (`13` `CPCB_CAAQMS`, `18` `OPENAQ`) with zero warnings.
- **Real Chrome Standalone E2E (`scripts/run-browser-e2e.ts`):**
  - Scenario 3 `[DATA_INTEGRITY] Location vs Station Separation (Zero Stations)`: **PASS (`726ms`)** — `"Pure location header displayed without fake station suffix or Type C badge"`.
