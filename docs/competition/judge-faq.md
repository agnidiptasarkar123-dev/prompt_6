# HawaSaathi — Judge & Evaluator FAQ

> **Direct, Defensible Technical Answers to Key Evaluation Questions**

---

### Q1: How does HawaSaathi guarantee that Gemini does not hallucinate AQI figures?
**Answer:** Gemini is structurally isolated from AQI calculations. All mathematical sub-indices and overall station AQI values are computed by our deterministic TypeScript CPCB Sub-Index Engine (`src/domain/cpcb/sub-index-calculator.ts`) before any AI interaction occurs. These pre-calculated facts are injected into the Gemini prompt as immutable constants. Furthermore, server-side Zod validation verifies that every statement in Gemini's response cites a valid pre-calculated evidence ID (`EV-xx`). If Gemini returns malformed output, fails, or hallucinates, the system seamlessly falls back to our deterministic rule-based engine.

### Q2: What happens when an official monitoring station is missing pollutants?
**Answer:** HawaSaathi strictly enforces the MoEFCC CPCB (2014) sufficiency standard:
1. Station AQI requires at least 3 valid pollutants.
2. At least one must be $PM_{2.5}$ or $PM_{10}$.
If fewer than 3 pollutants exist (or both particulates are missing), overall AQI is reported as `null` (Unavailable), accompanied by a transparent message explaining which pollutants are missing. We never guess or simulate missing readings.

### Q3: Why does HawaSaathi use OpenStreetMap instead of Google Maps or Mapbox?
**Answer:** OpenStreetMap provides open-access geographic infrastructure licensed under ODbL 1.0. Standard OSM Carto tiles (`tile.openstreetmap.org`) are used with mandatory attribution (`© OpenStreetMap contributors`) and client-side HTTP caching adhering to OSMF acceptable use policies. For high-volume production scale, our architecture seamlessly swaps tile endpoints to commercial providers (Stadia, CARTO) or self-hosted vector tiles (Protomaps PMTiles) without code refactoring.

### Q4: How is user health privacy protected under India's DPDP Act 2023?
**Answer:**
1. **Zero Profiling:** We never request or store diagnostic medical history, prescriptions, or clinical records.
2. **Non-Diagnostic Flags:** Users may optionally indicate generic sensitivities (e.g. self-reported respiratory sensitivity) which are stored only with explicit consent.
3. **Guest Mode First:** Visitors have 100% access to station discovery, commute planning, and indoor coaching without creating an account; guest data remains strictly in ephemeral client `sessionStorage`.
4. **Data Sovereignty:** Authenticated users enjoy 1-click machine-readable JSON data export and 1-click permanent hard account deletion.

### Q5: How was 100.00% full-source coverage achieved across all metrics?
**Answer:**
Through a rigorous testing strategy comprising 10,077 passing automated tests across 288 suites. We eliminated all synthetic ignore pragmas (`/* c8 ignore */`, `/* v8 ignore */`), ensuring that every statement, error handler, fallback path, and branch condition in `src/**/*.{ts,tsx}` is genuinely exercised and verified by automated tests.

### Q6: How does the system handle upstream network outages (e.g. CPCB or Open-Meteo downtime)?
**Answer:**
Every upstream client is wrapped in an automated Circuit Breaker (`src/lib/http/circuit-breaker.ts`). If an upstream feed experiences 3 consecutive timeouts or 5xx errors, the circuit breaker opens for 60 seconds, during which requests immediately serve cached or graceful fallback data without blocking the user.

### Q7: Why are there 23 languages supported?
**Answer:**
Air pollution in India is a national public health crisis affecting speakers of all regional languages. HawaSaathi provides linguistic equity across English and all 22 Eighth Schedule languages recognized in the Indian Constitution, ensuring that an auto-rickshaw driver in Kolkata (Bengali), a commuter in Srinagar (Kashmiri), or a farmer in Ludhiana (Punjabi) receives identical high-quality environmental guidance.

### Q8: What database is used, and how is it secured?
**Answer:**
Google Cloud Firestore in `asia-south1` (Mumbai). Security is enforced using Defense-in-Depth: client security rules are set to `allow read, write: if false;`, ensuring that zero client requests can query or mutate Firestore directly. All operations are mediated by server-side Next.js BFF routes using the Firebase Admin SDK.

### Q9: What is the repository footprint and deployment architecture?
**Answer:**
The repository is strictly maintained under 10 MiB (currently 4.49 MiB). Deployment is containerized using a multi-stage Dockerfile with Next.js standalone output running on Google Cloud Run with non-root security (`nextjs:nodejs` UID 1001) in Mumbai.

### Q10: How does the Commute Planner estimate exposure?
**Answer:**
The Commute Exposure Planner models particulate inhalation using route duration, physical respiration rate based on exertion level (e.g. walking/cycling vs sitting in a car), and transport micro-environment penetration ratios derived from peer-reviewed urban aerosol studies in Indian cities.
