# HawaSaathi 2.0 — Interactive Stations Map Verification

> **Date:** 2026-11-25
> **Primary Module:** `src/components/maps/station-map.tsx`

---

## 1. Map Interaction, Layers & Tile Policy Compliance

1. **Multi-Modal Viewport Controls:**
   - Discrete toolbar controls: Zoom In (`+`), Zoom Out (`-`), Fit All Markers, Reset View (`0`), Locate User (`navigator.geolocation` -> `onLocateUser`), Fullscreen toggle, and explicit live zoom indicator (`Zoom X.Xx`).
   - Mouse drag pan, wheel zoom, touch single-finger drag pan (`onTouchStart`/`onTouchMove`/`onTouchEnd`), two-finger pinch-to-zoom (`pinchDistRef`), and keyboard navigation (`+`, `=`, `-`, `_`, `0`, Arrow keys).
2. **Clustering & Collision Avoidance:**
   - `clusterMapMarkers` groups dense markers when `zoom < 2.2` and expands on click/Enter/Space.
   - Axis-aligned bounding-box (`placedBoxes`) collision detection prevents overlapping station labels at dense zoom levels while keeping selected/hovered station labels prioritized.
3. **Layer Filtering:** `ALL`, `CPCB_CAAQMS`, `OPENAQ`, `AQI_CATEGORY` (filtering $\ge 3$ pollutants incl. PM2.5/PM10), `POLLUTANTS`, and `FORECAST` (CAMS ~45 km methodology callout).
4. **Optional OpenStreetMap Tile Backdrop (ODbL 1.0):**
   - Opt-in `OSM Carto Backdrop` checkbox rendering `https://tile.openstreetmap.org/{z}/{x}/{y}.png` with automatic grid fallback (`onError -> setTileLoadError(true)`) and mandatory `© OpenStreetMap contributors` ODbL attribution link.
5. **Accessible Non-Map Fallback:** Toggleable `Accessible List` table with coordinates, source pill, distance, and station selection.

---

## 2. Empirical Verification

- **Unit & Coverage Tests (`tests/unit/v2/v2-regression-closure.test.tsx`, `tests/unit/v2/v2-final-100-closure.test.tsx`):** 100.00% coverage across all `station-map.tsx` branches (touch pan, 2-finger pinch delta thresholds, OSM tile error fallback, `AQI_CATEGORY` filter, keyboard nav, error banner).
- **Chrome Standalone E2E (`scripts/run-browser-e2e.ts`):**
  - Scenario 5 `[MAPS] Interactive Map Zoom, Layers & Accessible List`: **PASS (`1597ms`)** — `zoom 1.0 -> 1.4, list=true`.
