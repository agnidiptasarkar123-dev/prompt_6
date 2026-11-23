<!-- SPDX-License-Identifier: Apache-2.0 -->
# HawaSaathi Phase 2 Known Limitations & Future Roadmap

> **Document ID:** HS-LIM-P2-001  
> **Status:** Phase 2 Complete  

---

## 1. Upstream Data Feed Constraints

1. **CPCB CAAQMS Bulletin Latency:** CPCB hourly observations on `data.gov.in` reflect approximately 1 to 3 hours of publication lag from physical measurement time.
2. **Missing Sub-Index Parameters:** Many regional Indian monitoring stations report only 2 to 3 parameters (typically PM2.5 and PM10). When fewer than 3 pollutants are available, HawaSaathi strictly refuses to synthesize a false station AQI, reporting individual concentrations with an explicit insufficiency notice.
3. **CAMS Atmospheric Model Spatial Resolution:** Open-Meteo CAMS Global operates on a ~45 km grid cell resolution, which may smooth out ultra-local street-canyon or hyper-local vehicular pollution hotspots.

---

## 2. Infrastructure & Client Environment Constraints

1. **Leaflet Client-Side Render:** Leaflet requires `window` and dynamic imports (`next/dynamic` with `ssr: false`) to avoid server-side rendering errors.
2. **OpenStreetMap Carto Tile Usage Policy:** Client requests must honor browser caching. In high-traffic production environments, deploying vector tiles via Protomaps PMTiles or a commercial CDN layer (e.g. Stadia Maps) is recommended.
3. **In-Memory Cache Eviction:** When running multi-instance serverless deployments without Upstash Redis, the in-memory fallback operates independently per server instance.

---

## 3. Roadmap to Phase 3

- **Phase 3 Objective:** Advanced Mobile Micro-Mobility, Multi-Modal Commute Clean-Routing, IoT Low-Cost Sensor Ingestion (PurpleAir, ATMOS), and Automated Multi-Region Push Alerts.
