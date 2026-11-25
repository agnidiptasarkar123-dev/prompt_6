# HawaSaathi 2.0 — Live Environmental Data Pipeline Diagnostic & Remediation

> **Date:** 2026-11-25
> **Status:** VERIFIED Live Against `api.data.gov.in` (CPCB CAAQMS) & `api.openaq.org/v3`
> **Target Build:** Next.js `16.4.6` `.next/standalone/server.js`

---

## 1. Initial Live Pipeline Symptoms

Before repair, live queries against Greater Kolkata / Barrackpore (`22.6278, 88.3807`, `35 km` radius) exhibited:
- **CPCB stations (e.g., Rabindra Bharati University & SVSPA Campus Barrackpore):** Station names populated, yet pollutant counts reported `0` observations (`0/3 pollutants`) and Type C raw measurements were silently dropped.
- **OpenAQ v3 discovery & station telemetry (e.g., Padmapukur, Howrah `openaq_5614`):** `/api/v1/stations/nearby` logged upstream `HTTP 422` validation errors, Zod parsing failures on `licenses` / `sensors` / `displayName`, and slow/historical 2018 measurement fetches.

---

## 2. Four Upstream Root Causes Found Empirically

1. **CPCB Field Name Divergence & Missing Unit Metadata (`src/schemas/providers/cpcb-upstream.schema.ts`, `src/services/providers/cpcb/cpcb-adapter.ts`):**
   - Live `api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69` returns record keys `min_value`, `max_value`, and `avg_value` (rather than `pollutant_min`, `pollutant_max`, `pollutant_avg`) and omits `pollutant_unit`.
   - Previously, strict Zod parsing stripped `avg_value`, so `CpcbAdapter` read `undefined` across all 4,032 Indian CPCB rows.
   - Additionally, `entry.availablePollutants.add(...)` executed before verifying finite numeric values (`"NA"`).
2. **CPCB Pagination & Cross-Page Station Boundaries (`src/services/providers/cpcb/cpcb-adapter.ts`, `cpcb-client.ts`, `src/services/providers/types.ts`):**
   - `CpcbAdapter.searchStations()` defaulted to `limit = 1000`, truncating India's ~4,032-record CAAQMS bulletin.
   - `CpcbAdapter.getObservations()` broke out of pagination early on partial page matches (`filtered.length === 0`), losing pollutant rows across page boundaries, and lacked a `filters[station]` fast-path when `query.stationName` is known.
   - `CpcbClient` default `timeoutMs` (`8000` ms) frequently aborted multi-page `data.gov.in` requests; raised to `15000` ms.
3. **OpenAQ v3 Radius Cap & Conflicting Query Parameters (`src/services/providers/openaq/openaq-client.ts`):**
   - OpenAQ `/v3/locations` rejects `iso=IN` when combined with `coordinates` and rejects `radius > 25000` meters with `HTTP 422`.
   - Remediated by capping `radius` at `Math.min((params.radiusKm ?? 25) * 1000, 25000)` and setting `iso` only when `!params.coordinates || params.iso`, with default `timeoutMs = 15000`.
4. **OpenAQ v3 Nullable Schema Fields & Oldest-First Measurement Ordering (`src/schemas/providers/openaq-upstream.schema.ts`, `src/services/providers/openaq/openaq-adapter.ts`):**
   - Live OpenAQ v3 responses return `licenses: null`, `sensors: null`, `parameter.displayName: null`, and nullable `units` / `sensor.name`. Made these explicitly `.nullable()` (and `.transform((v) => v ?? [])` on `sensors` and `licenses`).
   - `/v3/sensors/{id}/measurements` without `datetime_from` returned oldest 2018 records serially across unmapped sensors; updated `OpenAQAdapter.getObservations()` to pre-filter to mapped CPCB sensors and query recent `datetimeFrom` in parallel, while `SourceOrchestrator` deduplicates distinct hourly readings and converts OpenAQ `CO` `µg/m³ -> mg/m³` (`/ 1000`).

---

### 3. Live End-to-End Verification Against Standalone Production Server

Executed against live `.next/standalone/server.js` (with `.env.local` keys and cleared Redis cold-start cache keys) on `2026-11-25` after OpenAQ `/v3/sensors/{id}/hours`, clock-skew `SUSPICIOUS` guards, and window staleness fixes:

| Endpoint / Station | HTTP | Observed Live Result | CPCB Scientific Compliance |
|---|---|---|---|
| `GET /api/v1/stations/nearby?lat=22.6278&lon=88.3807&radiusKm=35` | `200` | **31 stations** (`13` `CPCB_CAAQMS`, `18` `OPENAQ`), `warnings: []` | Zero HTTP 422 / Zod errors |
| `GET /api/v1/air-quality` (`openaq_3409320`, Rabindra Bharati University - WBPCB via OpenAQ `/hours`) | `200` | **138 hourly observations (`23` hours x 6 pollutants)**; `aqiStatus: "AVAILABLE"`, **`overallAqi: 101` (`MODERATE`, Prominent: `PM10`)**, `PM10: 101`, `NO2: 98`, `PM2.5: 87`, `O3: 80` (`µg/m³`) | `OFFICIAL_CPCB_STATUTORY_16H` (`23/16` hours, `>= 3` pollutants w/ PM) |
| `GET /api/v1/air-quality` (`openaq_5614`, Padmapukur, Howrah - WBPCB via OpenAQ `/hours`) | `200` | **138 hourly observations (`23` hours x 6 pollutants)**; `aqiStatus: "AVAILABLE"`, **`overallAqi: 111` (`MODERATE`, Prominent: `PM10`)**, `PM10: 111`, `PM2.5: 83`, `NO2: 75`, `O3: 59` (`µg/m³`) | `OFFICIAL_CPCB_STATUTORY_16H` (`23/16` hours, `>= 3` pollutants w/ PM) |
| `GET /api/v1/air-quality` (`cpcb_west-bengal_kolkata_rabindra-bharati-university-kolkata-wbpcb`, `data.gov.in` `3b01bcb8`) | `200` | **7 Type C rows** (`PM2.5: 97`, `PM10: 101`, `NO2: 54`, `CO: 52`, `O3: 42`, `NH3: 12`, `SO2: 9`, `unit: null`) | `aqiStatus: "AQI_UNAVAILABLE"`, `calculatedAqi: null` (`data.gov.in` snapshot omits physical units & 16h history) |
| `GET /api/v1/air-quality` (`cpcb_west-bengal_barrackpore_svspa-campus-barrackpore-wbpcb`) | `200` | **7 Type C rows** (`unit: null`) | `aqiStatus: "AQI_UNAVAILABLE"`, `calculatedAqi: null` (no fabricated Type B AQI) |
