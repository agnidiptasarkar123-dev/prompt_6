# Data Source Verification & Provenance Specification

> **Document ID:** HS-DATA-001  
> **Status:** Verified & Formally Specified  
> **Baseline Standards:** MoEFCC National Air Quality Index (2014), Open Government Data (OGD) Platform India, Copernicus Atmosphere Monitoring Service (CAMS)

---

## 1. Ground Truth Investigation & Verification Status

To ensure scientific truthfulness and regulatory compliance, HawaSaathi strictly categorizes external data sources into **Verified (Production Grade)**, **Secondary / Fallback (Verified)**, and **Unverified / Experimental (Prohibited from Direct Production Claim)**.

### 1.1 Data Source Comparison & Verification Matrix

| Source / Provider | Data Category | Endpoint / Resource ID | Auth Method | Rate Limits | License / Terms | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CPCB CAAQMS (data.gov.in)** | Ground Observed Sensor | `https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69` | `api-key` query param (Free registration on OGD India) | 1,000 records/page, 10,000 req/day per key | Government Open Data License - India (GODL) | **VERIFIED PRIMARY** |
| **OpenAQ API v3** | Ground Observed Aggregator | `https://api.openaq.org/v3/locations` (Country ID: 9 / `IN`) | `X-API-Key` HTTP Header | 60 req/min, 2,000 req/hour (Free Tier) | Open Database License (ODbL) / CC BY 4.0 | **VERIFIED SECONDARY** |
| **WAQI (aqicn.org)** | Ground Observed Feeds | `https://api.waqi.info/feed/geo:{lat};{lng}/` | `token` query param (Free registration) | 1,000 req/min (Standard tier) | Attribution required; Non-commercial standard | **VERIFIED FALLBACK (RAW ONLY)** *(Note: WAQI's calculated AQI is US EPA standard; we ingest only raw `iaqi` measurements)* |
| **Google Gemini API** | AI Contextual Inference | `https://generativelanguage.googleapis.com` via `@google/genai` | API Key (`GEMINI_API_KEY` in server environment) | Free Tier (15 RPM, 1500 RPD); Pay-as-you-go | Google Generative AI Terms | **VERIFIED INFERENCE** *(Structured JSON output mode, temperature 0.2)* |
| **Firebase Auth & Firestore** | Identity & Persisted Store | Google Cloud Firebase Platform (`firebase` SDK) | Firebase Project Config + UID Security Rules | 50k MAU Auth, 50k reads/day, 20k writes/day | Google Cloud Terms of Service | **VERIFIED AUTH & STORE** *(Anonymous guest, Google PKCE, Magic Link, UID rules)* |
| **Open-Meteo Air Quality** | Atmospheric Dispersion Forecast | `https://air-quality-api.open-meteo.com/v1/air-quality?domains=cams_global` | None required (Free tier) | 600 req/min, 5,000 req/hour, 10,000 req/day | CC BY 4.0 (Attribution to Open-Meteo & CAMS mandatory) | **VERIFIED FORECAST** *(Modelled CAMS Global ~45km, NOT ground sensor)* |
| **Open-Meteo Weather API** | Meteorological Context | `https://api.open-meteo.com/v1/forecast` (Wind, Temp, Humidity, Rain) | None required (Free tier) | 600 req/min, 5,000 req/hour, 10,000 req/day | CC BY 4.0 (Attribution to Open-Meteo mandatory) | **VERIFIED METEOROLOGY** |
| **CPCB Realtime Portal Direct Scraper (app.cpcbccr.com)** | Ground Observed HTML | Direct portal scraping | N/A | Variable / Anti-bot challenges | Prohibited under Terms of Service | **UNVERIFIED / PROHIBITED** *(Violates stability & anti-scraping rules)* |
| **AirVisual / IQAir API** | Proprietary Aggregator | `api.airvisual.com/v2/` | API Key (Free tier 10,000 calls/mo) | 5 calls/min (Free tier) | Commercial proprietary restrictions | **UNVERIFIED FOR PROD** *(Severe free-tier rate throttling)* |

---

## 2. In-Depth Provider Specifications

### 2.1 CPCB CAAQMS via data.gov.in (Primary Ground Truth)
- **Host:** `api.data.gov.in`
- **Resource ID:** `3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69`
- **Title:** "Real time Air Quality Index from various location"
- **Update Frequency:** Hourly update cycle (published with ~30–60 min latency from monitoring stations).
- **Supported Parameters:** `PM2.5`, `PM10`, `NO2`, `SO2`, `CO`, `OZONE` ($O_3$), `NH3`.
- **Returned Schema:**
  ```json
  {
    "index_name": "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69",
    "title": "Real time Air Quality Index from various location",
    "total": 1250,
    "records": [
      {
        "country": "India",
        "state": "Delhi",
        "city": "Delhi",
        "station": "Anand Vihar, Delhi - DPCC",
        "last_update": "20-11-2026 14:00:00",
        "latitude": "28.647622",
        "longitude": "77.315809",
        "pollutant_id": "PM2.5",
        "pollutant_min": "145",
        "pollutant_max": "312",
        "pollutant_avg": "228",
        "pollutant_unit": "µg/m³"
      }
    ]
  }
  ```
- **Known Limitations & Mitigations:**
  1. *Intermittent Platform Latency:* data.gov.in experiences occasional maintenance or high-latency responses.
     - *Mitigation:* In-memory server caching with 15-minute TTL; automatic fallback to OpenAQ v3 if timeout $>3000\text{ ms}$.
  2. *Stale Station Records:* Some stations stop transmitting due to sensor maintenance or telemetry power cuts.
     - *Mitigation:* Timestamps are compared against server UTC. Any record older than 4 hours is flagged as `STALE`; any record older than 24 hours is rejected from live AQI display.

### 2.2 OpenAQ API v3 (Secondary Ground Truth)
- **Base URL:** `https://api.openaq.org/v3`
- **Authentication:** `X-API-Key: <TOKEN>`
- **Key Query:** `GET /v3/locations?countries_id=9&coordinates=28.6139,77.2090&radius=25000`
- **Parameters:** Standardized sensor objects with sensor ID, latest measurement, and ISO 8601 UTC timestamp.
- **Coverage in India:** Covers >350 official CPCB and State SPCB stations across tier-1 and tier-2 Indian cities.

### 2.3 Open-Meteo Air Quality (CAMS Global Forecast)
- **Endpoint:** `https://air-quality-api.open-meteo.com/v1/air-quality`
- **Model:** Copernicus Atmosphere Monitoring Service (CAMS) Global.
- **Domain:** `domains=cams_global`
- **Spatial Resolution:** $0.4^\circ$ (~45 km).
- **Temporal Resolution:** 3-hourly intervals, extending 5 days ahead. Updated twice daily (every 12 hours).
- **CRITICAL ARCHITECTURAL DISTINCTION:**
  This is a **fluid dynamics and chemical transport atmospheric dispersion model**, NOT an in-situ physical measurement. The UI must render this in dedicated forecast sections with explicit labels:
  - Label: `"5-Day Regional Forecast (CAMS Model)"`
  - Disclaimer: *"Modelled estimate over a 45 km grid cell. For immediate health decisions, refer to verified ground stations."*

### 2.4 Google Gemini API (Inference Engine)
- **SDK & Client:** `@google/genai` (Official Google Gen AI SDK)
- **Model Target:** `gemini-2.5-flash` (or `gemini-1.5-flash` as backup)
- **Inference Mode:** Structured JSON Output (`responseMimeType: "application/json"`, paired with JSON schema definition matching `RecommendationResponseSchema`).
- **Temperature Setting:** `0.2` (low temperature for deterministic, hallucination-resistant structured advice).
- **Zero Hallucination Anchor:** The prompt injects immutable physical evidence:
  - Exact observed station concentrations and calculated CPCB NAQI.
  - CAMS dispersion forecast for the next 24–48 hours.
  - Meteorological parameters (wind speed, temperature inversion flag).
  - Explicit system instruction: *"Do not calculate, estimate, or modify the provided AQI. Generate contextual recommendations strictly grounded in the supplied physical readings and user dwelling parameters."*
- **Circuit Breaker:** 5,000 ms timeout. Automatic switchover to `DeterministicRecommender` on timeout, HTTP 429/5xx, or Zod validation failure.

### 2.5 Firebase Authentication & Cloud Firestore Verification
- **SDK:** `firebase` (Client modular v10+ SDK)
- **Authentication Providers:**
  1. *Anonymous Authentication (`signInAnonymously`):* Provides an ephemeral session UID for guest users without collecting email or PII.
  2. *Google Sign-In (`GoogleAuthProvider`):* Uses popup/redirect with PKCE on the web.
  3. *Passwordless Email Link (`sendSignInLinkToEmail` / `signInWithEmailLink`):* Generates single-use, 15-minute expiring cryptographic tokens.
  4. *Account Linking (`linkWithCredential`):* Allows an anonymous guest to upgrade to Google or Email Auth while retaining all saved household and routine profiles.
- **Cloud Firestore Security Rules:**
  - Enforces strict tenant boundary: `allow read, write: if request.auth != null && request.auth.uid == userId;`
  - Zero cross-user read or write permissions.
  - Direct root collection writes denied by default (`match /{document=**} { allow read, write: if false; }`).
  - Offline IndexedDB caching enabled automatically by the Firestore SDK for resilient PWA operation.

---

## 3. CPCB National Air Quality Index (NAQI 2014) Calculation Engine

### 3.1 Regulatory Criteria & Sufficiency Rules
According to the CPCB 2014 technical specification:
1. **Monitored Parameters:** 8 pollutants ($PM_{10}, PM_{2.5}, NO_2, O_3, CO, SO_2, NH_3, Pb$).
2. **Data Sufficiency Rule:** An overall AQI can **ONLY** be computed if:
   - Data is available for a **minimum of 3 pollutants** ($\ge 3$), **AND**
   - At least **one of the pollutants is either $PM_{2.5}$ or $PM_{10}$**.
3. **If Sufficiency Fails:**
   - Overall AQI = `null` (status: `INSUFFICIENT_DATA`).
   - The platform calculates and displays individual pollutant sub-indices with an explanatory banner. Under no circumstances may an overall AQI be fabricated.

### 3.2 Health Breakpoints Table (0–500 Scale)

All concentrations in $\mu\text{g/m}^3$ except $CO$ in $\text{mg/m}^3$.

| AQI Category | AQI Range ($I_{Lo} - I_{Hi}$) | $PM_{10}$ (24h) | $PM_{2.5}$ (24h) | $NO_2$ (24h) | $O_3$ (8h) | $CO$ (8h) | $SO_2$ (24h) | $NH_3$ (24h) | $Pb$ (24h) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Good** | 0 – 50 | 0 – 50 | 0 – 30 | 0 – 40 | 0 – 50 | 0 – 1.0 | 0 – 40 | 0 – 200 | 0 – 0.5 |
| **Satisfactory** | 51 – 100 | 51 – 100 | 31 – 60 | 41 – 80 | 51 – 100 | 1.1 – 2.0 | 41 – 80 | 201 – 400 | 0.6 – 1.0 |
| **Moderate** | 101 – 200 | 101 – 250 | 61 – 90 | 81 – 180 | 101 – 168 | 2.1 – 10.0 | 81 – 380 | 401 – 800 | 1.1 – 2.0 |
| **Poor** | 201 – 300 | 251 – 350 | 91 – 120 | 181 – 280 | 169 – 208 | 10.1 – 17.0 | 381 – 800 | 801 – 1200 | 2.1 – 3.0 |
| **Very Poor** | 301 – 400 | 351 – 430 | 121 – 250 | 281 – 400 | 209 – 748 | 17.1 – 34.0 | 801 – 1600 | 1201 – 1800 | 3.1 – 3.5 |
| **Severe** | 401 – 500 | $> 430$ | $> 250$ | $> 400$ | $> 748$ | $> 34.0$ | $> 1600$ | $> 1800$ | $> 3.5$ |

### 3.3 Linear Interpolation Formula
For a pollutant concentration $C_p$:
$$I_p = \frac{I_{Hi} - I_{Lo}}{BPHi - BPLo} \times (C_p - BPLo) + I_{Lo}$$
Where $[BPLo, BPHi]$ is the bracket containing $C_p$, and $[I_{Lo}, I_{Hi}]$ is the corresponding sub-index range.

Overall AQI is determined by the worst pollutant:
$$AQI = \max(I_{PM2.5}, I_{PM10}, I_{NO2}, I_{O3}, I_{CO}, I_{SO2}, I_{NH3}, I_{Pb})$$
The pollutant achieving this maximum is identified as the **Dominant / Prominent Pollutant**.

---

## 4. Provenance Contract Specification (Zod Schema)

Every air quality measurement is immutably wrapped in this schema:

```typescript
import { z } from "zod";

export const PollutantMeasurementSchema = z.object({
  pollutant: z.enum(["PM2.5", "PM10", "NO2", "SO2", "CO", "O3", "NH3", "PB"]),
  concentration: z.number().nonnegative(),
  unit: z.enum(["µg/m³", "mg/m³", "ppm"]),
  averagingPeriodHours: z.number().positive(),
  subIndex: z.number().int().min(0).max(500).nullable(),
  status: z.enum(["VALID", "BELOW_DETECTION", "SENSOR_FAULT", "OUT_OF_RANGE"])
});

export const DataProvenanceRecordSchema = z.object({
  provenanceId: z.string().uuid(),
  provider: z.enum(["CPCB_CAAQMS", "OPENAQ", "WAQI_RAW", "OPEN_METEO_CAMS"]),
  dataType: z.enum(["GROUND_OBSERVATION", "MODEL_FORECAST"]),
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
  latencyMinutes: z.number().nonnegative(),
  qualityFlag: z.enum(["VERIFIED", "PROVISIONAL", "STALE", "MODEL_ESTIMATE"]),
  attributionNotice: z.string().min(1),
  measurements: z.array(PollutantMeasurementSchema)
});

export type DataProvenanceRecord = z.infer<typeof DataProvenanceRecordSchema>;
```

---

## 5. Unresolved Technical Dependencies & Mitigation Strategy

1. **data.gov.in API Downtime Spikes:**
   - *Risk:* OGD India servers periodically reject requests during high load.
   - *Resolution:* Automatic circuit-breaker fails over to OpenAQ v3 within 3 seconds.
2. **Missing Lead ($Pb$) and Ammonia ($NH_3$) Sensors:**
   - *Fact:* Over 70% of Indian CAAQMS stations do not measure Lead ($Pb$) continuously.
   - *Resolution:* Lead is marked as optional in sufficiency calculations ($PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3$ provide full coverage).
3. **WAQI US EPA AQI vs Indian CPCB AQI Divergence:**
   - *Risk:* WAQI's ready-made AQI header follows US EPA breakpoints, yielding different numbers from Indian CPCB NAQI.
   - *Resolution:* We strictly discard WAQI's overall `aqi` field and extract only individual raw concentrations (`iaqi`), passing them into our local CPCB calculation engine.
