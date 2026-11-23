<!-- SPDX-License-Identifier: Apache-2.0 -->
# HawaSaathi Phase 2 API Contracts & Specification

> **Document ID:** HS-API-P2-001  
> **Status:** Phase 2 Complete  
> **Protocol:** HTTPS RESTful JSON  
> **Base URL:** `/api/v1`  
> **Security Baseline:** OWASP ASVS 5.0.0 Level 2  

---

## 1. Global Request & Response Conventions

### 1.1 Success Response Wrapper
All successful responses return HTTP 200/201 with the canonical envelope:
```json
{
  "status": "SUCCESS",
  "data": { ... },
  "meta": {
    "timestamp": "2026-11-23T06:05:00.000Z",
    "requestId": "req_abc123"
  }
}
```

### 1.2 Error Response Wrapper
All client and server errors return an appropriate HTTP status code (400, 401, 403, 404, 429, 500, 503) with the error envelope:
```json
{
  "status": "ERROR",
  "errorCode": "INVALID_COORDINATES",
  "message": "Latitude must be between -90 and 90.",
  "meta": {
    "timestamp": "2026-11-23T06:05:00.000Z"
  }
}
```

### 1.3 Rate Limiting Headers
Every API response includes rate limiting telemetry:
- `X-RateLimit-Limit`: Maximum requests permitted within window.
- `X-RateLimit-Remaining`: Remaining requests available in current window.
- `X-RateLimit-Reset`: Seconds remaining until window reset.

---

## 2. API Endpoints

### 2.1 Location Search
- **Route:** `GET /api/v1/locations/search`
- **Query Parameters:**
  - `q` (string, required): Search query string ($1-100$ characters).
  - `limit` (number, optional, default: 10, max: 50): Number of matching cities/neighborhoods.
- **Sample Request:** `GET /api/v1/locations/search?q=Kolkata&limit=5`
- **Sample Response:**
```json
{
  "status": "SUCCESS",
  "data": {
    "query": "Kolkata",
    "locations": [
      {
        "name": "Kolkata",
        "city": "Kolkata",
        "state": "West Bengal",
        "latitude": 22.5726,
        "longitude": 88.3639
      }
    ]
  }
}
```

### 2.2 Nearby Stations
- **Route:** `GET /api/v1/stations/nearby`
- **Query Parameters:**
  - `latitude` (number, required): $-90 \le \text{lat} \le 90$.
  - `longitude` (number, required): $-180 \le \text{lon} \le 180$.
  - `radiusKm` (number, optional, default: 25, max: 100): Search radius in kilometers.
  - `limit` (number, optional, default: 10, max: 50): Maximum stations returned.
- **Sample Request:** `GET /api/v1/stations/nearby?latitude=22.57&longitude=88.36&radiusKm=20`

### 2.3 Air Quality & Sub-Index Analysis
- **Route:** `GET /api/v1/air-quality`
- **Query Parameters:**
  - `latitude` (number, optional): Target latitude.
  - `longitude` (number, optional): Target longitude.
  - `stationId` (string, optional): Specific station identifier.
- **Sample Response:**
```json
{
  "status": "SUCCESS",
  "data": {
    "station": {
      "id": "cpcb_wb_kolkata_victoria",
      "name": "Victoria Memorial, Kolkata",
      "city": "Kolkata",
      "state": "West Bengal",
      "latitude": 22.5448,
      "longitude": 88.3426,
      "distanceKm": 1.4,
      "availablePollutants": ["PM2.5", "PM10", "NO2", "SO2", "CO", "O3"]
    },
    "observations": [ ... ],
    "calculatedAqi": {
      "overallAqi": 304,
      "rawMathematicalAqi": 304.2,
      "category": "VERY_POOR",
      "prominentPollutant": "PM2.5",
      "sufficiencyStatus": "SUFFICIENT",
      "subIndices": [ ... ],
      "reportingCeilingCappedAqi": 304,
      "explanation": "Calculated based on 6 valid sub-indices with prominent PM2.5."
    },
    "provenance": {
      "provider": "CPCB_CAAQMS",
      "dataTypology": "TYPE_B_CALCULATED_CPCB_AQI",
      "license": "GODL-India",
      "attribution": "Central Pollution Control Board / data.gov.in"
    }
  }
}
```

### 2.4 Atmospheric Forecast (Open-Meteo CAMS)
- **Route:** `GET /api/v1/forecast`
- **Query Parameters:** `latitude`, `longitude`, `hours` (default: 24, max: 72).
- **Sample Response:**
```json
{
  "status": "SUCCESS",
  "data": {
    "modelDomain": "cams_global",
    "spatialResolutionKm": 45,
    "hourlyForecast": [
      {
        "validTime": "2026-11-23T12:00:00Z",
        "pollutant": "PM2.5",
        "forecastValue": 95.2,
        "unit": "µg/m³",
        "typology": "TYPE_D_MODEL_FORECAST"
      }
    ]
  }
}
```

### 2.5 Personalized Behavioral Recommendations
- **Route:** `POST /api/v1/recommendations`
- **Payload:** User context, current observations, and optional prompt preferences.
- **Sample Response:** Contains category-aware actions (`VENTILATION_WINDOW`, `EXERCISE_ADAPTATION`, etc.) citing verified evidence IDs.

### 2.6 Session & Authentication
- **Route:** `POST /api/v1/auth/session` (Issues HttpOnly `hs_session` cookie from verified Firebase ID token).
- **Route:** `DELETE /api/v1/auth/session` (Clears session cookie and revokes refresh tokens).

### 2.7 User Profile Management
- **Route:** `GET /api/v1/profile` (Fetches authenticated user profile).
- **Route:** `PUT /api/v1/profile` (Updates user profile with strict Zod mass-assignment protection).
- **Route:** `DELETE /api/v1/profile` (Executes 1-click cascading hard delete under DPDP Act 2023).

### 2.8 System Health Probe
- **Route:** `GET /api/v1/health` (Readiness and liveness probe reporting Redis, Cache, and Upstream provider circuit breaker states).
