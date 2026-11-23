# Data Source Verification, Provenance & CPCB Calculation Specification

> **Document ID:** HS-DATA-001  
> **Status:** Revised Baseline (Phase 0 Audit Revisions)  
> **Standards:** MoEFCC National Air Quality Index (2014), Open Government Data (OGD) Platform India, Copernicus Atmosphere Monitoring Service (CAMS), OpenStreetMap Foundation (OSMF) Tile Usage Policy

---

## 1. Provider Verification Matrix & Status Classification

Every candidate data source is audited against live requests or official technical documentation:
- `LIVE ACCESS VERIFIED`: Verified with an actual live HTTP request, recording response status, headers, and payload structure.
- `DOCUMENTATION VERIFIED`: Verified against official technical documentation, but live access is unverified or awaiting credentials.
- `ACCESS UNVERIFIED`: Live access attempted but blocked (e.g. HTTP 401 Unauthorized due to missing API key).
- `NOT SUITABLE`: Excluded or disabled due to licensing restrictions, data conflicts, or terms-of-service barriers.

### 1.1 Provider Audit Summary Table

| Provider | Data Category | Endpoint / Resource | Verified Method | HTTP Status & Freshness | Limits & Terms | Provider Audit Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CPCB CAAQMS (data.gov.in)** | Ground-based physical sensors | Resource `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69` | Live HTTP GET via curl (2026-11-20T16:08:06 GMT) | **HTTP 200 OK**<br>Data Freshness: `20-11-2026 21:00:00`<br>Total records: 4,046 pollutant rows (~500–600 stations) | 1,000 records/page; developer key required for prod (sample key hit burst rate limit) | **LIVE ACCESS VERIFIED** |
| **OpenAQ v3 API** | Ground-based sensor aggregator | `https://api.openaq.org/v3/locations?iso=IN` | Live HTTP GET via curl (2026-11-20T16:09:51 GMT) | **HTTP 401 Unauthorized** (`A valid API key must be provided in X-API-Key header`) | 60 req/min, 2,000 req/hr; ODbL / CC BY 4.0 | **DOCUMENTATION VERIFIED / ACCESS UNVERIFIED** *(Pending developer key)* |
| **Open-Meteo Air Quality (CAMS)** | Atmospheric dispersion model | `https://air-quality-api.open-meteo.com/v1/air-quality?domains=cams_global` | Live HTTP GET via curl (2026-11-20T16:10:06 GMT) | **HTTP 200 OK**<br>120 hourly steps (5 days)<br>Latency: 0.13ms generation | 600 req/min, 10,000 req/day; CC BY 4.0 Non-commercial | **LIVE ACCESS VERIFIED** *(Modelled forecast only)* |
| **Open-Meteo Weather API** | Meteorological parameters | `https://api.open-meteo.com/v1/forecast` | Documentation & parameter schema verified | Verified free endpoint; 10,000 req/day | CC BY 4.0 Attribution mandatory | **DOCUMENTATION VERIFIED** |
| **WAQI (aqicn.org)** | Ground sensor feeds aggregator | `https://api.waqi.info/feed/` | Terms of service review | Integration disabled | Non-commercial individual only; redistribution prohibited; US EPA AQI conflict | **NOT SUITABLE / INTEGRATION DISABLED** |
| **OpenStreetMap Standard Tiles** | Map tile visualization | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Tile usage policy audit | Standard community tile endpoint | ODbL 1.0 (data & Produced Work tiles); OSMF Tile Usage Policy; Caching required; No SLA; Not for unrestricted production | **DOCUMENTATION VERIFIED** |

---

## 2. Evidence-Based Provider Reports

### 2.1 CPCB CAAQMS via data.gov.in (Primary Ground Truth)
- **Live Request Timestamp:** `2026-11-20T16:08:06 GMT`
- **HTTP Response Status:** `HTTP/1.1 200 OK`
- **Resource ID:** `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69`
- **Redacted Verified Sample Response:**
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
- **Record Semantics (Pollutant Rows vs Stations):**
  - **The 4,046 reported records represent individual pollutant measurement rows, NOT distinct stations.**
  - Each CAAQMS station reports up to 8 rows (one for each measured pollutant: `PM2.5`, `PM10`, `NO2`, `SO2`, `CO`, `OZONE`, `NH3`, `PB`).
  - Therefore, 4,046 records represent approximately **500–600 distinct monitoring stations** across India.
  - In Delhi, `total: 406` represents 406 pollutant rows across ~40 active DPCC/CPCB monitoring stations.
  - In Kolkata, `total: 49` represents 49 pollutant rows across ~7 active WBPCB monitoring stations.
- **Field Semantics & Value Interpretation:**
  - `last_update`: Timestamp when the monitoring station telemetry transmitted the reading to the central server (`DD-MM-YYYY HH:mm:ss`, local IST).
  - `min_value` / `max_value`: Minimum and maximum observed concentrations during the current reporting window.
  - `avg_value`: Reported average concentration over the station's publishing window.
- **CRITICAL DATA INTEGRITY WARNING (Averaging & Sufficiency):**
  - The system must **NEVER** assume `avg_value` represents a valid regulatory 24-hour or 8-hour average without knowing the underlying data sufficiency.
  - If a station is reporting an incomplete window or missing hourly samples ($<16\text{ hours}$ for 24h, $<6\text{ hours}$ for 8h), calculating an official-looking AQI from raw numbers creates an unverified, misleading index.
  - If hourly sufficiency cannot be established, overall station AQI is marked `null` (`status: "INSUFFICIENT_DATA"`), and individual pollutant measurements are presented as raw values (`Type C`) with their respective units and timestamps.
- **Account Quota & Burst Limit Finding:**
  - When issuing multiple burst requests using the public sample API key on 2026-11-20, the API responded with `{"error": "Rate limit exceeded"}`.
  - **Required Action:** A dedicated registered developer API key from data.gov.in must be configured in `DATA_GOV_IN_API_KEY` for production deployments.

### 2.2 Exact Measurement Units by Pollutant

| Pollutant Identifier | Chemical Name | Regulatory Averaging Window | Unit of Measurement | Notes & Critical Calculations |
| :--- | :--- | :--- | :--- | :--- |
| `PM2.5` | Particulate Matter $\le 2.5\ \mu\text{m}$ | 24-Hour Running Average | $\mu\text{g/m}^3$ (micrograms per cubic meter) | Primary fine particulate parameter |
| `PM10` | Particulate Matter $\le 10\ \mu\text{m}$ | 24-Hour Running Average | $\mu\text{g/m}^3$ | Coarse particulate parameter |
| `NO2` | Nitrogen Dioxide | 24-Hour Running Average | $\mu\text{g/m}^3$ | Combustion by-product |
| `SO2` | Sulfur Dioxide | 24-Hour Running Average | $\mu\text{g/m}^3$ | Industrial & fuel emissions |
| `CO` | Carbon Monoxide | 8-Hour Running Average | $\text{mg/m}^3$ (milligrams per cubic meter) | **CRITICAL:** Measured in $\text{mg/m}^3$, NOT $\mu\text{g/m}^3$. A factor of 1000 difference. |
| `OZONE` / `O3` | Ground-level Ozone | 8-Hour Running Average | $\mu\text{g/m}^3$ | Secondary photochemical oxidant (1-hr peak if $>208$) |
| `NH3` | Ammonia | 24-Hour Running Average | $\mu\text{g/m}^3$ | Agricultural & urban emissions |
| `PB` / `Pb` | Lead | 24-Hour Running Average | $\mu\text{g/m}^3$ | Heavy metal particulate (frequently unmonitored) |

---

## 3. OpenStreetMap Tile Policy, Licensing & Alternative Providers

### 3.1 OpenStreetMap Licensing Separation & July 1, 2020 Produced Work Policy
- **Geodata Licensing:** The OpenStreetMap database is licensed under the **Open Database License (ODbL) 1.0**. Any derivation or adaptation of the database itself is governed by ODbL share-alike provisions.
- **Cartography / Standard Tile Licensing (Produced Work):**
  - **Effective July 1, 2020:** The OpenStreetMap Foundation officially transitioned standard map style tiles (`tile.openstreetmap.org`) to be published as a **Produced Work under ODbL 1.0**.
  - The previous Creative Commons Attribution-ShareAlike 2.0 (CC BY-SA 2.0) license is **NO LONGER APPLIED** to standard OSMF tile renderings.
  - As a Produced Work, displaying standard OSM tiles in HawaSaathi does NOT trigger copyleft / share-alike obligations on the host application code, provided mandatory attribution is displayed.
- **Mandatory Attribution:** All UI views rendering OSM tiles must display: `© OpenStreetMap contributors` linking to `https://www.openstreetmap.org/copyright`.

### 3.2 OSM Foundation (OSMF) Tile Usage Policy Restrictions
The standard tile server (`tile.openstreetmap.org`) is a free community service operated by volunteer donations. In accordance with official OSMF policy:
- **No Universal 2 req/s Rule:** The OSMF tile policy does not define a universal "2 req/s" numeric cap; rather, it states that **heavy usage, bulk scraping, and commercial high-volume traffic are strictly prohibited**.
- **Referer Header Requirement:** Browser-initiated tile requests must supply a valid, intact `Referer` header identifying the originating application domain. Missing or spoofed Referers are subject to automated IP blocking.
- **User-Agent Requirement:** Browser requests carry standard browser headers. Any automated scripts, service workers, or server-side proxies MUST supply a specific, contactable `User-Agent`.
- **Caching Mandatory:** Applications must strictly respect HTTP caching headers (`Cache-Control`, `Expires`). Client-side HTTP caching (7-day default cache) must be strictly honored.
- **Bulk Downloading Prohibited:** Systematic pre-downloading or mass tile caching across geographic bounding boxes is forbidden.
- **Reliability & SLA:** The community tile servers offer **zero uptime SLA**.

### 3.3 Production Alternative Tile Providers (Evaluation Status)
If HawaSaathi's traffic exceeds OSMF acceptable usage limits, the platform evaluates the following options:
1. **Stadia Maps (Alidade Smooth):** Dedicated map tile provider. Free tier is restricted to non-commercial/development with request limits. Commercial production deployment requires an active commercial subscription plan. (*Status: Planned evaluation candidate; not contracted.*)
2. **CARTO Basemaps (Positron):** Cloud-hosted basemap tiles. Subject to CARTO terms of service; commercial embedding requires a commercial agreement. (*Status: Planned evaluation candidate; not contracted.*)
3. **Self-Hosted Vector Tiles (Protomaps / PMTiles):** Serving static PMTiles directly from Cloudflare R2 / AWS S3 with MapLibre GL. Zero tile-server compute costs, unlimited scale, and total operational autonomy. (*Status: Recommended production architecture.*)

---

## 4. Air Quality Data Typology & Provenance Contract

```
+-----------------------------------------------------------------------------------+
|                           FOUR-WAY DATA TYPOLOGY                                  |
+-----------------------------------------------------------------------------------+
|  [TYPE A: Official CPCB-Published AQI]                                            |
|  - Source: CPCB CAAQMS official bulletin                                          |
|  - Description: The regulatory AQI calculated and certified directly by CPCB.     |
|                                                                                   |
|  [TYPE B: Independently Calculated CPCB-Methodology AQI]                          |
|  - Source: HawaSaathi deterministic calculation engine                            |
|  - Description: Computed strictly using the official MoEFCC 2014 NAQI formula     |
|    from verified raw sensor concentrations with 16h/6h sufficiency.              |
|                                                                                   |
|  [TYPE C: Raw Pollutant Concentration]                                            |
|  - Source: Physical ground monitoring station                                     |
|  - Description: Unmodified physical measurement with unit (µg/m³ or mg/m³),       |
|    station ID, averaging period, observation time, and retrieval time.            |
|                                                                                   |
|  [TYPE D: Modelled Atmospheric Forecast]                                          |
|  - Source: Open-Meteo CAMS Global                                                 |
|  - Description: Atmospheric dispersion model (~45 km grid cell). Strictly        |
|    segregated from ground monitors in UI and schemas.                             |
+-----------------------------------------------------------------------------------+
```

### 4.1 Provenance Contract Rules
1. **Time Separation:** Every record preserves both `observationTimestampUtc` (time sensor recorded reading) and `retrievalTimestampUtc` (time HawaSaathi ingested it).
2. **Cache Transparency:** A cached reading is never represented as new. Cached data carries `isCached: true` and cache age in minutes.
3. **Single-Station Integrity:** Never combine pollutants from different stations into one calculated CPCB AQI.
4. **Outlier Tagging (No Silent Deletion):** Extreme readings ($PM_{2.5} > 1500\ \mu\text{g/m}^3$) are tagged `SUSPECT_EXTREME` for investigation, but are never silently dropped or clamped.

---

## 5. CPCB National AQI (2014) Technical Specification

### 5.1 Sufficiency Rules & Breakpoint Table
- **24-Hour Average:** Minimum **16 hours** of valid hourly readings (67% data availability rule).
- **8-Hour Average ($CO, O_3$):** Minimum **6 hours** of valid hourly readings (75% data availability rule).
- **Overall Station AQI Sufficiency:** Valid sub-indices for at least **3 pollutants** ($\ge 3$), including at least one of $PM_{2.5}$ or $PM_{10}$.
- **Insufficiency:** If sufficiency fails, overall AQI is `null`. Individual sub-indices are displayed with an explanation.

All units in $\mu\text{g/m}^3$ except $CO$ in $\text{mg/m}^3$.

| AQI Category | AQI Range ($I_{Lo} - I_{Hi}$) | $PM_{10}$ (24h) | $PM_{2.5}$ (24h) | $NO_2$ (24h) | $O_3$ (8h) | $CO$ (8h) | $SO_2$ (24h) | $NH_3$ (24h) | $Pb$ (24h) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Good** | 0 – 50 | 0 – 50 | 0 – 30 | 0 – 40 | 0 – 50 | 0 – 1.0 | 0 – 40 | 0 – 200 | 0 – 0.5 |
| **Satisfactory** | 51 – 100 | 51 – 100 | 31 – 60 | 41 – 80 | 51 – 100 | 1.1 – 2.0 | 41 – 80 | 201 – 400 | 0.6 – 1.0 |
| **Moderate** | 101 – 200 | 101 – 250 | 61 – 90 | 81 – 180 | 101 – 168 | 2.1 – 10.0 | 81 – 380 | 401 – 800 | 1.1 – 2.0 |
| **Poor** | 201 – 300 | 251 – 350 | 91 – 120 | 181 – 280 | 169 – 208 | 10.1 – 17.0 | 381 – 800 | 801 – 1200 | 2.1 – 3.0 |
| **Very Poor** | 301 – 400 | 351 – 430 | 121 – 250 | 281 – 400 | 209 – 748 | 17.1 – 34.0 | 801 – 1600 | 1201 – 1800 | 3.1 – 3.5 |
| **Severe** | 401 – 500 | $> 430$ | $> 250$ | $> 400$ | $> 748$ | $> 34.0$ | $> 1600$ | $> 1800$ | $> 3.5$ |

Piecewise linear interpolation:
$$I_p = \frac{I_{Hi} - I_{Lo}}{BPHi - BPLo} \times (C_p - BPLo) + I_{Lo}$$
$$AQI = \max(I_1, I_2, \dots, I_n)$$
The pollutant corresponding to $\max(I_p)$ is the **Dominant / Prominent Pollutant**.

---

## 6. Official CPCB Workbook Reconciliation & Mathematical Contracts

### 6.1 Cryptographic Provenance of CPCB Calculator
- **Workbook URL:** `https://cpcb.gov.in/upload/national-air-quality-index/AQI-Calculator.xls`
- **File Format:** Microsoft Excel 97-2004 Workbook (BIFF8 OLE2 Binary)
- **Local Location:** `docs/references/AQI-Calculator.xls`
- **File Size:** 46,080 bytes
- **SHA-256 Checksum:** `92eb788f7f61bd46edea1814a9e1b8f5dd75d05dfb88f34a460905bc07bd151a`

### 6.2 Severe Extension Anchors Derived from Official Formulas
In CUPS/82/2014-15 Table 3.11, the Severe concentration ranges are published as open-ended ($> 430$, $> 250$, etc.). In the official CPCB `AQI-Calculator.xls` workbook, the actual formulas continue the linear slope of the Very Poor interval:
$$\text{SubIndex}_{\text{Severe}} = 400 + (C_p - BP_{Lo}) \times \frac{100}{\Delta_{VP}}$$

From these exact formulas, the physical concentrations where the sub-index evaluates to nominal 500 are:
- **$\text{PM}_{10}$ (24h):** $430 + 80 = 510\,\mu\text{g/m}^3$ (Cell `D8`)
- **$\text{PM}_{2.5}$ (24h):** $250 + 130 = 380\,\mu\text{g/m}^3$ (Cell `D10`)
- **$\text{NO}_2$ (24h):** $400 + 120 = 520\,\mu\text{g/m}^3$ (Cell `D14`)
- **$\text{SO}_2$ (24h):** $1600 + 800 = 2400\,\mu\text{g/m}^3$ (Cell `D12`)
- **$\text{CO}$ (8h):** $34.0 + 17.0 = 51.0\,\text{mg/m}^3$ (Cell `D16`)
- **$\text{NH}_3$ (24h):** $1800 + 600 = 2400\,\mu\text{g/m}^3$ (Cell `D20`)

### 6.3 Lead (Pb) Methodology Limitation & Absence
- **Workbook Absence:** Lead is completely absent from `AQI-Calculator.xls` (no row, formula, or cell).
- **Statutory Gap:** Table 3.11 provides an open-ended breakpoint ($> 3.5\,\mu\text{g/m}^3$) with zero mathematical interpolation anchors.
- **HawaSaathi Rigorous Handling:**
  - Concentrations $\le 3.5\,\mu\text{g/m}^3$ are calculated according to Table 3.11.
  - Concentrations $> 3.5\,\mu\text{g/m}^3$ are classified as category `SEVERE`, but `subIndex` is returned as `null` with `qualityFlag: "NO_DEFENSIBLE_SUBINDEX_FORMULA"`.
  - Lead Severe readings with `null` sub-index are strictly excluded from the station AQI maximum and do NOT count toward the 3-pollutant sufficiency requirement. An explicit explanatory note is appended.

### 6.4 Atmospheric Concentrations Exceeding AQI 500
- During extreme episodic smog events in northern India, particulate concentrations can exceed $380\,\mu\text{g/m}^3$ ($\text{PM}_{2.5}$) or $510\,\mu\text{g/m}^3$ ($\text{PM}_{10}$).
- Clamping scientific calculations to 500 silently conceals life-threatening air toxicity.
- HawaSaathi continues the official linear formula slope, preserves the true unrounded float in `rawMathematicalSubIndex`, computes integer `subIndex` (which can legitimately exceed 500), flags `isBeyondNominalScale = true`, and provides `reportingCeilingCappedAqi = 500` for visual UI gauges.

### 6.5 Ground-Level Ozone ($O_3$) Dual-Window Calculation
- **8-Hour Running Average:** Valid strictly for concentrations up to $208\,\mu\text{g/m}^3$ (sub-index up to 300, Very Poor threshold). Concentrations $> 208\,\mu\text{g/m}^3$ are rejected on the 8-hour window because photochemical ozone exhibits acute diurnal spikes.
- **1-Hour Acute Spike Average:** Valid strictly for acute concentrations $> 208\,\mu\text{g/m}^3$. Concentrations $\le 208\,\mu\text{g/m}^3$ are rejected on the 1-hour window.
- **CPCB Workbook Typo Correction:** In cell `D18`, the spreadsheet subtracted 400 instead of 748 and divided by 539. HawaSaathi implements the corrected linear continuation:
  $$I_{O_3,\text{Severe}} = 400 + (C - 748) \times \frac{100}{540}$$

### 6.6 Non-Forgeable In-Memory Aggregation Boundary
- Aggregation results are registered in a module-private in-process `WeakMap` metadata registry (`TRUSTED_METADATA_REGISTRY`).
- Objects returned by `createValidatedAggregatedMeasurement` are deeply frozen (`Object.freeze`).
- Plain object literals, serialized/deserialized JSON (`JSON.parse`), or spread copies cannot forge trusted status and are rejected at the station AQI calculation boundary.

---

### 6.7 Independently Reproducible Numerical Trace for Ozone ($O_3$)

The following trace validates the mathematical and eligibility behavior of ground-level Ozone ($O_3$) across all regulatory transition points:

| Concentration ($C_p$) | Eligible Averaging Window | Ineligible Window Behavior | Interpolation Formula Applied | Full-Precision Float (`rawMathematicalSubIndex`) | Display Integer (`subIndex`) | Category Assigned | Methodological Limitation / Note |
| :---: | :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **$208.0\,\mu\text{g/m}^3$** | **8-Hour** | 1-Hour rejected (`INCOMPATIBLE_AVERAGING_WINDOW`) | $200 + \frac{300 - 200}{208 - 168} \times (208 - 168)$ | `300.0` | `300` | `POOR` | Maximum permissible concentration for 8-hour regulatory window. |
| **$208.1\,\mu\text{g/m}^3$** | **1-Hour** | 8-Hour rejected (`INCOMPATIBLE_AVERAGING_WINDOW`) | $300 + \frac{400 - 300}{748 - 208} \times (208.1 - 208)$ | `300.0185185185185` | `300` | `VERY_POOR` | Transition to 1h acute spike window. Continuous interval $(208, 748]$ assigns `VERY_POOR`; display integer rounds to 300 without jump discontinuity. |
| **$748.0\,\mu\text{g/m}^3$** | **1-Hour** | 8-Hour rejected (`INCOMPATIBLE_AVERAGING_WINDOW`) | $300 + \frac{400 - 300}{748 - 208} \times (748 - 208)$ | `400.0` | `400` | `VERY_POOR` | Upper boundary of Very Poor 1-hour acute monitoring window. |
| **$748.1\,\mu\text{g/m}^3$** | **1-Hour** | 8-Hour rejected (`INCOMPATIBLE_AVERAGING_WINDOW`) | $400 + \frac{500 - 400}{1288 - 748} \times (748.1 - 748)$ | `400.0185185185185` | `400` | `SEVERE` | Transition to Severe 1h acute spike. Continuous interval $(748, 1288]$ assigns `SEVERE`; display integer rounds to 400 without jump discontinuity. |
| **$1288.0\,\mu\text{g/m}^3$** | **1-Hour** | 8-Hour rejected (`INCOMPATIBLE_AVERAGING_WINDOW`) | $400 + \frac{500 - 400}{1288 - 748} \times (1288 - 748)$ | `500.0` | `500` | `SEVERE` | Nominal Severe calculation anchor evaluating to 500. Concentrations $>1288$ continue linearly (e.g. $1300 \implies 502$), flagged `isBeyondNominalScale = true`. |

#### Rounding Policy Discrepancy Resolution (300/301 and 400/401)
In Table 3.11, categories are tabulated with integer gaps (Poor: 201–300; Very Poor: 301–400; Severe: 401–500). If integer rounding were applied prior to category lookup, or if integer truncation were applied to concentrations, boundary readings like $208.1\,\mu\text{g/m}^3$ would either evaluate to AQI 300 (which naive integer lookup maps to Poor, conflicting with the concentration) or artificially jump to 301.

HawaSaathi resolves this rigorously:
1. **Category Assignment is Governed by Real Concentration Intervals:** Breakpoint intervals are matched continuously as $(\text{boundaryLo}, \text{boundaryHi}]$. Because $208.1 > 208.0$, it unambiguously belongs to the `VERY_POOR` interval.
2. **Numeric Precision is Preserved:** The exact scientific float ($300.0185...$) is preserved in `rawMathematicalSubIndex`.
3. **Display Rounding is Non-Destructive:** Integer `Math.round()` produces $300$ solely for integer visual display, while the underlying object maintains category `VERY_POOR` and raw mathematical precision.
4. **Values Above 500 are Severe Extrapolations:** Readings resulting in sub-indices $> 500$ are classified as `category: "SEVERE"` with `isBeyondNominalScale: true`. They represent mathematical extrapolations of the Severe formula, **NOT** new or invented AQI categories.
5. **Reconciliation of CPCB Formula Verification:** When stating that CPCB formulas are verified, it applies to all 7 parameters ($PM_{10}, PM_{2.5}, NO_2, SO_2, CO, O_3, NH_3$) across all categories. For Lead ($Pb$), statutory formulas are verified for categories Good through Very Poor ($0$ to $3.5\,\mu\text{g/m}^3$); for Severe ($> 3.5\,\mu\text{g/m}^3$), Lead has no formula in CPCB NAQI methodology and is explicitly marked with `qualityFlag: "NO_DEFENSIBLE_SUBINDEX_FORMULA"`.

---

### 6.8 Physical Anomaly Hard Rejection Limits & Telemetry Evidence

HawaSaathi enforces physical upper sanity limits strictly to reject instrument diagnostic test loops, telemetry corruption (e.g. stuck `9999` registers), or transmission bit flips. These thresholds are grounded in continuous ambient air monitoring station (CAAQMS) analyzer specifications:

| Pollutant | Rejection Limit | Unit | Standard Analyzer Technology | Full-Scale Measurement Span & Evidence | Rationale Regarding Genuine Ambient Peaks |
| :--- | :---: | :---: | :--- | :--- | :--- |
| **$PM_{2.5}$** | `2500` | $\mu\text{g/m}^3$ | Beta Attenuation Monitor (BAM-1020) / TEOM | BAM-1020 detector operational range is configured to $0 - 1000\,\mu\text{g/m}^3$ or $0 - 2000\,\mu\text{g/m}^3$. | Historical severe post-Diwali ambient peaks in Delhi reach $1200 - 1800\,\mu\text{g/m}^3$. A 24-hr average exceeding $2500\,\mu\text{g/m}^3$ exceeds ambient analyzer saturation and represents filter tape jamming or stuck sensor error codes. |
| **$PM_{10}$** | `4000` | $\mu\text{g/m}^3$ | Beta Attenuation / Optical Particle Counter | Standard ambient inlet PM10 detector saturation ceiling is $0 - 2000$ to $0 - 5000\,\mu\text{g/m}^3$. | Accommodates extreme dust storm episodes ($2000 - 3000\,\mu\text{g/m}^3$) while rejecting instrument sensor error values ($9999$). |
| **$NO_2$** | `2000` | $\mu\text{g/m}^3$ | Chemiluminescence Analyzer | Standard full scale: $0 - 500\,\text{ppb}$ or $0 - 1000\,\text{ppb}$ ($\approx 1880\,\mu\text{g/m}^3$). | Ambient urban NO2 rarely exceeds $400 - 600\,\mu\text{g/m}^3$ even near major traffic corridors. $2000\,\mu\text{g/m}^3$ represents detector ceiling. |
| **$SO_2$** | `4000` | $\mu\text{g/m}^3$ | Pulsed UV Fluorescence | Standard full scale: $0 - 1000\,\text{ppb}$ to $0 - 2000\,\text{ppb}$ ($\approx 5240\,\mu\text{g/m}^3$). | Ambient industrial plume max readings remain well below $2000\,\mu\text{g/m}^3$. $4000\,\mu\text{g/m}^3$ prevents corrupted integer feeds. |
| **$CO$** | `150` | $\text{mg/m}^3$ | Non-Dispersive Infrared (NDIR) Gas Filter | Standard NDIR ambient full scale: $0 - 50\,\text{ppm}$ or $0 - 100\,\text{ppm}$ ($\approx 115\,\text{mg/m}^3$). | 8-hr NAAQS standard is $2\,\text{mg/m}^3$; Severe threshold begins at $34\,\text{mg/m}^3$. $150\,\text{mg/m}^3$ represents ambient detector saturation. |
| **$O_3$** | `2500` | $\mu\text{g/m}^3$ | UV Photometric Analyzer | Standard ambient full scale: $0 - 500\,\text{ppb}$ to $0 - 1000\,\text{ppb}$ ($\approx 1960\,\mu\text{g/m}^3$). | Acute photolytic ambient ozone peaks rarely exceed $600 - 800\,\mu\text{g/m}^3$. $2500\,\mu\text{g/m}^3$ prevents baseline drift faults. |
| **$NH_3$** | `5000` | $\mu\text{g/m}^3$ | Chemiluminescent with Molybdenum Converter | Analyzer full scale: $0 - 2000\,\text{ppb}$ to $0 - 5000\,\text{ppb}$. | Severe threshold begins at $1800\,\mu\text{g/m}^3$. $5000\,\mu\text{g/m}^3$ rejects sensor converter failure. |
| **$Pb$** | `50` | $\mu\text{g/m}^3$ | ICP-MS / ED-XRF Laboratory Filter Analysis | Ambient urban lead typically ranges between $0.05 - 1.5\,\mu\text{g/m}^3$. | Very Poor upper breakpoint is $3.5\,\mu\text{g/m}^3$. $50\,\mu\text{g/m}^3$ represents analytical extraction ceiling. |

**Safeguard Guarantee:** These thresholds are set strictly at or above the physical saturation limits of ambient regulatory monitoring instruments. Genuine extreme atmospheric pollution events—including northern Indian winter smog episodes where PM2.5 reaches $1000 - 1500\,\mu\text{g/m}^3$—fall comfortably within the valid measurement envelope and are calculated with full mathematical Severe continuation.

