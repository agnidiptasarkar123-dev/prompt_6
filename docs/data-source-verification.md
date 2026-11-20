# Data Source Verification, Provenance & CPCB Calculation Specification

> **Document ID:** HS-DATA-001  
> **Status:** Revised Baseline (Post-Audit)  
> **Standards:** MoEFCC National Air Quality Index (2014), Open Government Data (OGD) Platform India, Copernicus Atmosphere Monitoring Service (CAMS), OpenStreetMap Tile Policy

---

## 1. Provider Verification Matrix & Status Classification

Every candidate data source is classified using one of the four mandatory audit statuses:
- `LIVE ACCESS VERIFIED`: Verified with an actual live HTTP request, recording response status, headers, and payload structure.
- `DOCUMENTATION VERIFIED`: Verified against official technical documentation, but live access is unverified or awaiting credentials.
- `ACCESS UNVERIFIED`: Live access attempted but blocked (e.g. 401 Unauthorized due to missing API key).
- `NOT SUITABLE`: Excluded or disabled due to licensing restrictions, data conflicts, or terms-of-service barriers.

### 1.1 Provider Audit Summary Table

| Provider | Data Category | Endpoint / Resource | Verified Method | HTTP Status & Freshness | Limits & Terms | Provider Audit Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CPCB CAAQMS (data.gov.in)** | Ground-based physical sensors | Resource `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69` | Live HTTP GET via curl (2026-11-20T16:08:06 GMT) | **HTTP 200 OK**<br>Data Freshness: `20-11-2026 21:00:00` (within 1 hr)<br>Total records: 4,046 | 1,000 records/page; GODL India License | **LIVE ACCESS VERIFIED** |
| **OpenAQ v3 API** | Ground-based sensor aggregator | `https://api.openaq.org/v3/locations?iso=IN` | Live HTTP GET via curl (2026-11-20T16:09:51 GMT) | **HTTP 401 Unauthorized** (`A valid API key must be provided in X-API-Key header`) | 60 req/min, 2,000 req/hr; ODbL / CC BY 4.0 | **DOCUMENTATION VERIFIED / ACCESS UNVERIFIED** *(Pending developer key)* |
| **Open-Meteo Air Quality (CAMS)** | Atmospheric dispersion model | `https://air-quality-api.open-meteo.com/v1/air-quality?domains=cams_global` | Live HTTP GET via curl (2026-11-20T16:10:06 GMT) | **HTTP 200 OK**<br>120 hourly steps (5 days)<br>Latency: 0.13ms generation | 600 req/min, 10,000 req/day; CC BY 4.0 Non-commercial | **LIVE ACCESS VERIFIED** *(Modelled forecast only)* |
| **Open-Meteo Weather API** | Meteorological parameters | `https://api.open-meteo.com/v1/forecast` | Documentation & schema verified | Verified free endpoint; 10,000 req/day | CC BY 4.0 Attribution mandatory | **DOCUMENTATION VERIFIED** |
| **WAQI (aqicn.org)** | Ground sensor feeds aggregator | `https://api.waqi.info/feed/` | Terms of service review | Integration disabled | Non-commercial individual only; redistribution prohibited; US EPA AQI conflict | **NOT SUITABLE / INTEGRATION DISABLED** |
| **OpenStreetMap Carto** | Map tile visualization | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Documentation & tile policy audit | Standard tile endpoint | Max 2 req/s; ODbL / CC BY-SA 2.0; Caching & User-Agent mandatory; No SLA | **DOCUMENTATION VERIFIED** |

---

## 2. Evidence-Based Provider Reports

### 2.1 CPCB CAAQMS via data.gov.in (Primary Ground Truth)
- **Live Request Timestamp:** `2026-11-20T16:08:06 GMT`
- **HTTP Response Status:** `HTTP/1.1 200 OK`
- **Resource ID:** `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69`
- **Total Monitored Records Across India:** `4,046`
- **Actual Response Payload Structure:**
  ```json
  {
    "index_name": "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69",
    "title": "Real time Air Quality Index from various location",
    "total": 4046,
    "records": [
      {
        "country": "India",
        "state": "Bihar",
        "city": "Aurangabad",
        "station": "Gurdeo Nagar, Aurangabad - BSPCB",
        "last_update": "20-11-2026 21:00:00",
        "latitude": "24.75746",
        "longitude": "84.366208",
        "pollutant_id": "PM2.5",
        "min_value": "17",
        "max_value": "303",
        "avg_value": "118"
      }
    ]
  }
  ```
- **Observed Field Schema:**
  - Station name, City, State, Country.
  - Geolocation: `latitude`, `longitude`.
  - Timestamp: `last_update` (Format: `DD-MM-YYYY HH:mm:ss`, local IST).
  - Pollutant: `pollutant_id` (`PM2.5`, `PM10`, `NO2`, `SO2`, `CO`, `OZONE`, `NH3`).
  - Values: `min_value`, `max_value`, `avg_value` (String-encoded numbers).
- **Multi-City Availability Verification (Sampled 2026-11-20):**
  - **Delhi (DPCC):** `406` active records across stations including Karala, Anand Vihar, Punjabi Bagh, IGI Airport.
  - **Kolkata (WBPCB):** `49` active records across stations including Rabindra Sarobar, Victoria Memorial, Ballygunge.
  - **Aurangabad (BSPCB):** Verified active.
- **Account Quota Finding:**
  - The live response header returned `X-Ratelimit-Limit: -1` and `X-Ratelimit-Remaining: -1` for the sample key. While functional for Phase 0/1 testing, a registered developer account key must be provisioned in `DATA_GOV_IN_API_KEY` to prevent sudden rate throttling in production.

### 2.2 OpenAQ API v3 (Secondary Ground Truth)
- **Live Request Timestamp:** `2026-11-20T16:09:51 GMT`
- **Endpoint Tested:** `https://api.openaq.org/v3/locations?iso=IN&limit=1`
- **HTTP Response Status:** `HTTP/2 401 Unauthorized`
- **Response Body:** `{"message": "Unauthorized. A valid API key must be provided in the X-API-Key header."}`
- **Verification Finding:**
  - OpenAQ v3 mandates an `X-API-Key` header on all `/v3/locations` requests.
  - Filtering by ISO code (`iso=IN`) is officially supported and preferred over hardcoding internal country IDs.
  - **Status:** Marked as `ACCESS UNVERIFIED (PENDING DEVELOPER KEY)`. Station counts (registered vs actively reporting) cannot be verified live until `OPENAQ_API_KEY` is configured in the development environment.
  - Terms: Open Database License (ODbL) and CC BY 4.0; attribution to OpenAQ is mandatory.

### 2.3 Open-Meteo Air Quality (CAMS Global Forecast)
- **Live Request Timestamp:** `2026-11-20T16:10:06 GMT`
- **Endpoint Tested:** `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=28.6139&longitude=77.2090&hourly=pm10,pm2_5&domains=cams_global`
- **HTTP Response Status:** `HTTP/1.1 200 OK`
- **Model Parameters & Specifications:**
  - **Domain:** Copernicus Atmosphere Monitoring Service (CAMS) Global.
  - **Spatial Resolution:** $0.4^\circ$ (~45 km).
  - **Update Frequency:** Twice daily (every 12 hours).
  - **Forecast Horizon:** 5 days (120 hourly time steps returned).
  - **Parameters:** `pm10`, `pm2_5`, `carbon_monoxide`, `nitrogen_dioxide`, `sulphur_dioxide`, `ozone`, `dust`.
- **Licensing & Quotas:**
  - Creative Commons Attribution 4.0 (CC BY 4.0). Attribution to "Open-Meteo" and "Copernicus CAMS" is mandatory.
  - Free non-commercial quota: 10,000 calls/day, 600 calls/min, 5,000 calls/hour. No API key required.

### 2.4 WAQI (aqicn.org) — Integration Status
- **Status:** **NOT SUITABLE / INTEGRATION DISABLED**
- **Justification:**
  1. *Licensing Restrictions:* Standard WAQI tokens are for personal use only. Bulk collection, redistribution, and commercial display require an explicit written partnership with aqicn.org.
  2. *Standard Discrepancy:* WAQI's calculated AQI uses the US EPA standard, which conflicts directly with the Indian National AQI standard (CPCB NAQI 2014).
  3. *Action:* WAQI integration is disabled in HawaSaathi. Live ground readings are ingested strictly from CPCB CAAQMS (`data.gov.in`) and OpenAQ v3.

### 2.5 Map Tile Provider (OpenStreetMap Carto)
- **Tile URL Template:** `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- **Licence & Copyright:** Open Database License (ODbL) 1.0; Map tiles under CC BY-SA 2.0. Mandatory attribution: `© OpenStreetMap contributors`.
- **Usage Policy & Technical Requirements:**
  - Maximum 2 tile requests per second per client.
  - Bulk downloading or pre-rendering tiles is prohibited.
  - Custom HTTP `User-Agent` header identifying the application is mandatory.
  - Client-side HTTP caching is strictly required (Tile servers send `Cache-Control: max-age=604800` (7 days)).
- **Availability Limitation:** OSM tile servers are run by volunteers with no uptime Service Level Agreement (SLA). For production scale, vector tile self-hosting (e.g. Protomaps / PMTiles) is planned in the release roadmap.

---

## 3. Air Quality Data Typology & Integrity Contract

To prevent data ambiguity and protect scientific truthfulness, HawaSaathi enforces a **Four-Way Data Typology** across all schemas, APIs, and UI components:

```
+-----------------------------------------------------------------------------------+
|                           FOUR-WAY DATA TYPOLOGY                                  |
+-----------------------------------------------------------------------------------+
|  [TYPE A: Official CPCB-Published AQI]                                            |
|  - Source: CPCB CAAQMS official bulletin or direct portal report                 |
|  - Description: The regulatory AQI calculated and published directly by CPCB      |
|                                                                                   |
|  [TYPE B: Independently Calculated CPCB-Methodology AQI]                          |
|  - Source: HawaSaathi deterministic calculation engine                            |
|  - Description: Computed strictly using the official MoEFCC 2014 NAQI formula     |
|    from verified raw sensor concentrations. Clearly labeled as calculated.       |
|                                                                                   |
|  [TYPE C: Raw Pollutant Concentration]                                            |
|  - Source: Physical ground monitoring station                                     |
|  - Description: Unmodified physical measurement (µg/m³ or mg/m³) with unit,       |
|    station ID, averaging period, observation time, and retrieval time             |
|                                                                                   |
|  [TYPE D: Modelled Atmospheric Forecast]                                          |
|  - Source: Open-Meteo CAMS Global                                                 |
|  - Description: Fluid dynamics and chemical transport atmospheric model (~45 km   |
|    grid cell). Strictly segregated from ground monitors in UI and schemas.        |
+-----------------------------------------------------------------------------------+
```

### 3.1 Provenance Contract Rules
1. **Time Separation:** Every record must preserve both:
   - `observationTimestampUtc`: Exact time the sensor recorded the physical reading.
   - `retrievalTimestampUtc`: Exact time HawaSaathi's backend ingested the reading.
2. **Cache Integrity:** A cached reading must NEVER be presented as a new observation. Cached readings preserve their original `observationTimestampUtc` and carry an explicit `isCached: true` flag and cache age in minutes.
3. **No Cross-Station Blending:** Never combine pollutants from different physical stations into a single calculated CPCB AQI. Every AQI calculation must belong to exactly one physical station ID.
4. **Provider Fallback Transparency:** If a station fails over to a secondary provider (e.g. data.gov.in $\to$ OpenAQ), the UI must explicitly disclose the changed station and source provider.
5. **Outlier Detection Without Silent Deletion:**
   - Physical readings are never silently dropped or clipped.
   - If a concentration exceeds historical bounds ($PM_{2.5} > 1500\ \mu\text{g/m}^3$), it is flagged as `SUSPECT_EXTREME` or `UNCONFIRMED_ANOMALY` for verification, while the raw value is preserved in full.

---

## 4. CPCB National AQI (2014) Technical Specification

### 4.1 Monitored Parameters & Averaging Windows
The official National Air Quality Index (NAQI) established by the Central Pollution Control Board (CPCB) in 2014 monitors 8 pollutants:

| Pollutant | Chemical Notation | Standard Averaging Period | Unit |
| :--- | :--- | :--- | :--- |
| **Particulate Matter 10** | $PM_{10}$ | 24-hourly running average | $\mu\text{g/m}^3$ |
| **Particulate Matter 2.5** | $PM_{2.5}$ | 24-hourly running average | $\mu\text{g/m}^3$ |
| **Nitrogen Dioxide** | $NO_2$ | 24-hourly running average | $\mu\text{g/m}^3$ |
| **Ozone** | $O_3$ | 8-hourly running average (or 1-hr for peaks $>208$) | $\mu\text{g/m}^3$ |
| **Carbon Monoxide** | $CO$ | 8-hourly running average | $\text{mg/m}^3$ |
| **Sulfur Dioxide** | $SO_2$ | 24-hourly running average | $\mu\text{g/m}^3$ |
| **Ammonia** | $NH_3$ | 24-hourly running average | $\mu\text{g/m}^3$ |
| **Lead** | $Pb$ | 24-hourly running average | $\mu\text{g/m}^3$ |

### 4.2 Running Average Windows & Data Sufficiency Rules
- **24-Hour Running Average:** Minimum **16 hours** of valid hourly readings (67% data availability rule) are required to form a valid 24-hour concentration.
- **8-Hour Running Average ($CO, O_3$):** Minimum **6 hours** of valid hourly readings (75% data availability rule) are required to form a valid 8-hour concentration.
- **Incomplete Window Behaviour:** If a station has fewer than 16 hours of data in the 24-hour window, the sub-index for that pollutant is declared `INSUFFICIENT_WINDOW` and cannot be computed.

### 4.3 Overall Station AQI Sufficiency Requirement
An overall station AQI can **ONLY** be computed if:
1. Valid sub-indices are available for at least **3 pollutants** ($\ge 3$), **AND**
2. At least one of the available pollutants is **either $PM_{2.5}$ or $PM_{10}$**.

**If Sufficiency Fails:**
- The overall station AQI is set to `null` (`status: "INSUFFICIENT_DATA"`).
- Individual pollutant concentrations and their calculated sub-indices ARE displayed alongside an explanatory note: *"Overall CPCB AQI unavailable due to insufficient pollutant parameters (minimum 3 required including PM2.5/PM10)."*
- Under no circumstances is an overall AQI fabricated or guessed.

### 4.4 Health Breakpoints Table (0–500 Scale)

All units in $\mu\text{g/m}^3$ except $CO$ in $\text{mg/m}^3$.

| AQI Category | AQI Range ($I_{Lo} - I_{Hi}$) | $PM_{10}$ (24h) | $PM_{2.5}$ (24h) | $NO_2$ (24h) | $O_3$ (8h) | $CO$ (8h) | $SO_2$ (24h) | $NH_3$ (24h) | $Pb$ (24h) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Good** | 0 – 50 | 0 – 50 | 0 – 30 | 0 – 40 | 0 – 50 | 0 – 1.0 | 0 – 40 | 0 – 200 | 0 – 0.5 |
| **Satisfactory** | 51 – 100 | 51 – 100 | 31 – 60 | 41 – 80 | 51 – 100 | 1.1 – 2.0 | 41 – 80 | 201 – 400 | 0.6 – 1.0 |
| **Moderate** | 101 – 200 | 101 – 250 | 61 – 90 | 81 – 180 | 101 – 168 | 2.1 – 10.0 | 81 – 380 | 401 – 800 | 1.1 – 2.0 |
| **Poor** | 201 – 300 | 251 – 350 | 91 – 120 | 181 – 280 | 169 – 208 | 10.1 – 17.0 | 381 – 800 | 801 – 1200 | 2.1 – 3.0 |
| **Very Poor** | 301 – 400 | 351 – 430 | 121 – 250 | 281 – 400 | 209 – 748 | 17.1 – 34.0 | 801 – 1600 | 1201 – 1800 | 3.1 – 3.5 |
| **Severe** | 401 – 500 | $> 430$ | $> 250$ | $> 400$ | $> 748$ | $> 34.0$ | $> 1600$ | $> 1800$ | $> 3.5$ |

### 4.5 Sub-Index Formula & Dominant Pollutant
$$I_p = \frac{I_{Hi} - I_{Lo}}{BPHi - BPLo} \times (C_p - BPLo) + I_{Lo}$$
The overall AQI is the maximum of all valid sub-indices:
$$AQI = \max(I_1, I_2, \dots, I_n)$$
The pollutant corresponding to $\max(I_p)$ is identified as the **Dominant / Prominent Pollutant**.

---

## 5. Provenance Zod Schema Contract

```typescript
import { z } from "zod";

export const PollutantMeasurementSchema = z.object({
  pollutant: z.enum(["PM2.5", "PM10", "NO2", "SO2", "CO", "O3", "NH3", "PB"]),
  concentration: z.number().nonnegative(),
  unit: z.enum(["µg/m³", "mg/m³"]),
  averagingPeriodHours: z.union([z.literal(1), z.literal(8), z.literal(24)]),
  subIndex: z.number().int().min(0).max(500).nullable(),
  qualityFlag: z.enum(["VERIFIED", "PROVISIONAL", "SUSPECT_EXTREME", "INSUFFICIENT_WINDOW"])
});

export const DataProvenanceRecordSchema = z.object({
  provenanceId: z.string().uuid(),
  typology: z.enum(["TYPE_A_OFFICIAL_AQI", "TYPE_B_CALCULATED_AQI", "TYPE_C_RAW_SENSOR", "TYPE_D_MODEL_FORECAST"]),
  provider: z.enum(["CPCB_CAAQMS", "OPENAQ", "OPEN_METEO_CAMS"]),
  stationId: z.string().min(1),
  stationName: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }),
  observationTimestampUtc: z.string().datetime(),
  retrievalTimestampUtc: z.string().datetime(),
  isCached: z.boolean(),
  cacheAgeMinutes: z.number().nonnegative(),
  calculatedAqi: z.number().int().min(0).max(500).nullable(),
  dominantPollutant: z.string().nullable(),
  sufficiencyStatus: z.enum(["SUFFICIENT", "INSUFFICIENT_DATA"]),
  attributionNotice: z.string().min(1),
  measurements: z.array(PollutantMeasurementSchema)
});

export type DataProvenanceRecord = z.infer<typeof DataProvenanceRecordSchema>;
```
