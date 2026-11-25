# HawaSaathi — Limitations, Engineering Assumptions & Roadmap

> **Focus:** Scientific Truthfulness, Engineering Tradeoffs, and Future Evolution

---

## 1. Known Architectural Limitations & Tradeoffs

1. **Ground Station Spatial Sparsity:**
   - CPCB CAAQMS stations are predominantly located in tier-1 and tier-2 urban centers. Many rural and peri-urban districts lack continuous ground monitoring stations.
   - *HawaSaathi's Tradeoff:* Rather than fabricating synthetic data via ungrounded interpolation, HawaSaathi explicitly informs the user when no ground station exists within 60 km and presents Open-Meteo CAMS Global atmospheric model forecasts (Type D) with transparent attribution.
2. **Missing Pollutant Sub-Index Transparency:**
   - In real-world telemetry, ozone analyzers or sulfur dioxide sensors occasionally experience calibration downtime.
   - *HawaSaathi's Tradeoff:* The platform displays individual pollutant sub-indices for whatever is monitored, but explicitly withholds overall station AQI unless the statutory 3-pollutant rule (with particulate matter) is satisfied.
3. **Indoor Micro-Environment Physics:**
   - Without dedicated physical indoor sensors (e.g. laser particle counters), true indoor particulate levels cannot be known with 100% empirical certainty.
   - *HawaSaathi's Tradeoff:* The Indoor Air Coach provides physical source-control and ventilation guidance based on peer-reviewed building infiltration physics, accompanied by a mandatory disclaimer that actual indoor air quality requires dedicated hardware.

---

## 2. Post-Competition Product Roadmap

1. **Phase 8: Hyper-Local Low-Cost Sensor Ingestion (Breathe Delhi / UrbanSciences):**
   - Ingest calibrated low-cost optical particle sensors (PMS5003 / Sensirion SPS30) as **Type E (Calibrated Micro-Sensor)** air quality points, applying dynamic relative humidity correction factors.
2. **Phase 9: Native Mobile Applications (React Native / Flutter):**
   - Package HawaSaathi for Android (Google Play) and iOS (App Store) with background push notifications for sudden AQI category transitions and severe smog alerts.
3. **Phase 10: Wearable Health Sensor Integration:**
   - Connect with Apple HealthKit and Android Health Connect to cross-correlate ambient outdoor exposure during outdoor runs with heart rate variability (HRV) and respiratory metrics.
