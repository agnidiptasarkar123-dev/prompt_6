# Phase 7 — Architectural Known Limitations & Engineering Assumptions

> **Project:** HawaSaathi (হাওয়াসাথী / हवा साथी) — Pan-India Urban Air Quality Intelligence Platform\
> **Milestone:** Phase 7 Transparency & Defensible Engineering\
> **Status:** Officially Documented Production Invariants

---

## 1. Scientific & Environmental Limitations

1. **Station vs Atmospheric Model Spatial Resolution:**
   - CPCB CAAQMS ground monitoring stations provide high-precision physical sensor readings at point locations. Spatial interpolation between distant stations is not performed by HawaSaathi to avoid inventing synthetic local air quality.
   - When a user is more than 60 km from any monitoring station, the system clearly presents Type D Modeled Atmospheric Forecast (Open-Meteo CAMS Global at ~45 km grid resolution) rather than extrapolating ground sensor readings.
2. **Regulatory Averaging Window Sufficiency:**
   - 24-hour pollutant averages strictly require at least 16 hours of valid readings (CPCB 67% rule).
   - 8-hour pollutant averages (CO, Ozone) require at least 6 hours of valid readings (CPCB 75% rule).
   - If sufficiency fails, overall AQI is reported as `null` with a transparent explanation rather than calculating an invalid number.
3. **Indoor Environmental Sensing:**
   - HawaSaathi explicitly informs users that indoor air quality cannot be measured directly without dedicated indoor sensors. Indoor Air Coach recommendations are derived from source control physics (cooking fuel, smoking, incense) and outdoor ambient infiltration rates.

---

## 2. Infrastructure & Network Invariants

1. **Upstream Rate Limits:**
   - `data.gov.in` rate limits apply to public CAAQMS feeds. HawaSaathi protects upstream quotas using Upstash Redis sliding-window caching (15-minute TTL on live ground data).
2. **Circuit Breakers:**
   - If an upstream environmental feed (CPCB, OpenAQ, or Open-Meteo) experiences consecutive timeouts or 5xx errors, its circuit breaker trips to `OPEN` for 60 seconds, during which cached or fallback data is served with an explicit provenance warning.
3. **AI Fallback:**
   - If Gemini is unreachable or exceeds 5,000ms latency, the deterministic rule-based engine immediately serves category-aware guidance without blocking user requests.
