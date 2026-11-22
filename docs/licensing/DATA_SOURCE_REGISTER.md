<!-- SPDX-License-Identifier: Apache-2.0 -->
# HawaSaathi Data Source & Telemetry Provider Legal Register

> **Document ID:** HS-LIC-002  
> **Status:** Audited & Corrected Baseline (Phase 1 Closure)  
> **Applicability:** External ambient air quality data, meteorological forecasts, and map services.

---

## 1. Primary Ambient Telemetry Providers

### 1.1 CPCB CAAQMS via Open Government Data (data.gov.in)
- **Originating Agency:** Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change (MoEFCC), Government of India.
- **Publishing Portal:** Open Government Data (OGD) Platform India (`data.gov.in`).
- **Resource ID:** `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69` (*"Real time Air Quality Index from various location"*).
- **Dataset-Level License:** **Government Open Data License - India (GODL-India)** as notified under the National Data Sharing and Accessibility Policy (NDSAP).
- **Permissions:** Worldwide, royalty-free, perpetual right to use, adapt, publish, and translate the data for commercial and non-commercial purposes.
- **Mandatory Attribution String:**
  ```text
  Data source: Central Pollution Control Board (CPCB), published via Open Government Data (OGD) Platform India (data.gov.in).
  ```
- **Caching & Operational Requirements:** In-memory or Redis caching (15–60 minutes) is required to avoid burst rate limits (`Rate limit exceeded`). Production usage requires a dedicated registered developer API key.
- **Integration Status:** **LIVE ACCESS VERIFIED** (HTTP 200 OK, 4,046 pollutant records nationwide).

---

### 1.2 OpenAQ API (v3)
- **Aggregating Entity:** OpenAQ Inc. (US 501(c)(3) non-profit).
- **Endpoint:** `https://api.openaq.org/v3`
- **Data Licensing Structure (No Blanket License):**
  - OpenAQ does NOT own the underlying ambient measurements. It aggregates telemetry from hundreds of independent government and research monitoring networks worldwide.
  - Each individual monitoring station / data source in OpenAQ carries its own specific license metadata (e.g. `CC-BY-4.0`, `ODbL-1.0`, `OGL-UK-3.0`, `GODL-India`, or `unspecified/proprietary`).
  - HawaSaathi rejects blanket assumptions of ODbL or CC BY across the feed.
- **Attribution Contract:** Any data displayed from OpenAQ must cite both OpenAQ and the specific originating monitoring agency identified in the location metadata:
  ```text
  Air quality telemetry aggregated by OpenAQ (openaq.org), sourced from [Originating Agency Name].
  ```
- **Platform Terms of Service:**
  - Free API tier: 60 requests/minute, 2,000 requests/hour; requires developer API key in `X-API-Key`.
  - Commercial / high-throughput usage: OpenAQ Terms of Service require an enterprise tier or commercial sponsorship for sustained high-volume production traffic.
- **Integration Status:** **DOCUMENTATION VERIFIED / LIVE ACCESS PENDING CREDENTIAL** (HTTP 401 on unauthenticated calls; developer key required for Phase 2). Individual upstream provider licenses marked **PENDING INGESTION AUDIT**.

---

## 2. Atmospheric & Meteorological Dispersion Providers

### 2.1 Open-Meteo Air Quality & Weather API
- **Provider Entity:** Open-Meteo GmbH (Basel, Switzerland).
- **Underlying Scientific Models:** Copernicus Atmosphere Monitoring Service (CAMS Global ~45 km grid) and ECMWF numerical weather models.
- **Data License vs Service Terms Separation:**
  - **Data License:** CC BY 4.0 (Creative Commons Attribution 4.0 International) for model output data, incorporating Copernicus open data licensing.
  - **Free API Service Terms:** Strictly limited to **non-commercial use** with a ceiling of $<10,000$ daily API calls and $<600$ calls/minute.
  - **Commercial API Terms:** Commercial deployment or usage exceeding non-commercial caps requires a paid commercial subscription from Open-Meteo GmbH.
- **Mandatory Attribution String:**
  ```text
  Atmospheric forecast data from Open-Meteo.com under CC BY 4.0, utilizing Copernicus Atmosphere Monitoring Service (CAMS) models.
  ```
- **Data Typology Contract:** Strictly classified and rendered as `TYPE_D_MODEL_FORECAST` in all schemas and user-facing views; never conflated with ground physical observations.
- **Integration Status:** **LIVE ACCESS VERIFIED** (HTTP 200 OK, 120-hour forecast grid verified).

---

## 3. Map Cartography & Geodata Providers

### 3.1 OpenStreetMap (OSM)
- **Governing Entity:** OpenStreetMap Foundation (OSMF).
- **Database Licensing (ODbL 1.0):** The underlying map database is licensed under the **Open Database License (ODbL) 1.0**. Any extracted or adapted geodata database is subject to ODbL share-alike rules.
- **Standard Carto Tiles Licensing (Produced Work):**
  - **Effective July 1, 2020:** The OpenStreetMap Foundation officially transitioned standard map style tiles (`tile.openstreetmap.org`) to be published as a **Produced Work under ODbL 1.0**. The previous Creative Commons Attribution-ShareAlike 2.0 (CC BY-SA 2.0) license is **NO LONGER APPLIED** to standard OSMF tile renderings.
  - As a Produced Work, downstream applications are NOT forced into share-alike copyleft for their own application code, provided proper attribution is maintained.
- **Mandatory Attribution:**
  ```text
  © OpenStreetMap contributors (hyperlinked to https://www.openstreetmap.org/copyright)
  ```
- **OSMF Tile Server Usage Policy Restrictions:**
  - **Zero SLA:** Community tile servers are volunteer-supported with no uptime guarantee.
  - **Heavy Usage Prohibited:** High-volume commercial traffic, automated bulk pre-downloading, and scraping are strictly forbidden.
  - **Headers:** Browser requests carry standard browser headers; server-side proxies MUST send a valid, contactable `User-Agent`.
  - **Referer:** Browser-initiated tile requests must send an intact `Referer` header matching the application domain.
  - **HTTP Caching:** Client-side HTTP caching (7-day default cache) must be strictly honored.
- **Integration Status:** **DOCUMENTATION VERIFIED** (Baseline development tile layer).

---

### 3.2 Stadia Maps (Evaluated Fallback)
- **Provider Entity:** Stadia Maps LLC.
- **Licensing & Terms:**
  - Commercial terms apply. Free tier is strictly capped (currently up to 200,000 tile requests/month) and restricted to non-commercial / evaluation use.
  - Commercial production deployment requires an active paid subscription plan.
  - Geodata attribution requirements (`© Stadia Maps © OpenStreetMap contributors`) apply.
- **Integration Status:** **PLANNED EVALUATION CANDIDATE / NOT CONTRACTED / NOT INTEGRATED**.

---

### 3.3 CARTO Basemaps (Evaluated Fallback)
- **Provider Entity:** CARTO.
- **Licensing & Terms:**
  - Free access to CARTO basemaps is subject to CARTO terms of service and volume thresholds.
  - Direct commercial use or embedding in enterprise SaaS requires an explicit commercial agreement with CARTO.
  - Attribution string: `© CARTO © OpenStreetMap contributors`.
- **Integration Status:** **PLANNED EVALUATION CANDIDATE / NOT CONTRACTED / NOT INTEGRATED**.

---

## 4. Discontinued / Prohibited Data Providers

### 4.1 World Air Quality Index (WAQI / aqicn.org)
- **Status:** **STRICTLY DISABLED / PROHIBITED**.
- **Legal & Methodological Reasons:**
  - WAQI terms of service explicitly prohibit programmatic re-distribution or automated aggregation without commercial enterprise contracts.
  - WAQI calculates and displays US EPA AQI formulas for international stations, which creates severe methodological conflicts with India's official MoEFCC CPCB NAQI standard.
