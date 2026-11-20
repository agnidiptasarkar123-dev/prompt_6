# Requirements-to-Feature-to-Test Traceability Matrix

> **Document ID:** HS-REQ-MTX-001  
> **Status:** Revised Baseline (Post-Audit)  
> **Standard:** IEEE 830 / ISO/IEC/IEEE 29148 Traceability Standard  
> **Current Test Status:** Phase 0 Implementation Locked. All tests are **PLANNED / NOT EXECUTED**.

---

## 1. Overview & Verification Legend

This matrix establishes 100% bidirectional traceability between user requirements, engineering features, data schemas, domain components, and automated test specifications.

### Verification Methods
- **UT:** Unit Test (deterministic, isolated, pure domain logic)
- **IT:** Integration Test (cross-module, API contract verification)
- **ST:** Security Test (OWASP ASVS 5.0.0 Level 2, fuzzing, injection, IDOR)
- **AT:** Accessibility Test (Axe-core, WCAG 2.1 AA keyboard/screen reader)
- **E2E:** End-to-End System Test (Playwright browser automation)

---

## 2. Traceability Matrix

| Req ID | Requirement Description | Implementing Module / File | Schema / Domain Contract | Verification Strategy | Test Case ID Range | Execution Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A.1** | Investigate CPCB, CAAQMS, OpenAQ real-time data providers | `src/server/air-quality/cpcb-provider.ts`<br>`src/server/air-quality/openaq-provider.ts` | `ObservedStationReadingSchema`<br>`StationMetadataSchema` | IT (Contract tests with live mocks) | `TEST-AQ-001` to `TEST-AQ-050` | `PLANNED` |
| **A.2** | Investigate Open-Meteo CAMS for forecasts | `src/server/air-quality/cams-forecast-provider.ts` | `ModelForecastReadingSchema` | IT (Forecast schema & interpolation tests) | `TEST-AQ-051` to `TEST-AQ-080` | `PLANNED` |
| **A.3** | Verify endpoints, coverage, auth, licensing & rate limits | `src/server/air-quality/aggregator.ts`<br>`src/config/rate-limits.ts` | `ProviderConfigSchema`<br>`RateLimitConfigSchema` | IT (Rate limiter throttling & mock quota) | `TEST-AQ-081` to `TEST-AQ-120` | `PLANNED` |
| **A.4** | Never invent, hardcode or fabricate live pollution readings | `src/server/air-quality/aggregator.ts` | `RawReadingSchema` (Null if unavailable) | UT & ST (Negative assertions on mock fallbacks) | `TEST-SEC-100` to `TEST-SEC-150` | `PLANNED` |
| **A.5** | Clearly separate observed measurements from modelled forecasts (4-Way Typology) | `src/components/aqi/StationBadge.tsx`<br>`src/components/aqi/ForecastCard.tsx` | `AirQualitySnapshot` (`typology: 'TYPE_A' \| 'TYPE_B' \| 'TYPE_C' \| 'TYPE_D'`) | UT, AT, E2E (UI badge & tag assertions) | `TEST-UI-001` to `TEST-UI-040` | `PLANNED` |
| **A.6** | Preserve measurement source, station, timestamp, retrieval time, unit, averaging period | `src/server/air-quality/provenance.ts` | `DataProvenanceRecordSchema` | UT (Field completeness & immutable audit log) | `TEST-PROV-001` to `TEST-PROV-060` | `PLANNED` |
| **A.7** | Handle unavailable, stale and incomplete readings safely | `src/server/air-quality/quality-evaluator.ts` | `ReadingQualityStatusSchema` (`VALID`, `STALE`, `SUSPECT_EXTREME`) | UT & IT (Simulation of missing sensors & stale feeds) | `TEST-DEG-001` to `TEST-DEG-100` | `PLANNED` |
| **A.8** | Implement CPCB AQI only when official calculation requirements satisfied (>=3 pollutants, with PM2.5 or PM10, 16h window) | `src/domain/cpcb/aqi-calculator.ts` | `CpcbCalculationResultSchema`<br>`SubIndexBreakdownSchema` | Domain UT (Permutation testing across 8 pollutants & boundary values) | `DOM-CPCB-001` to `DOM-CPCB-500` | `PLANNED` |
| **B.1** | Dynamic User Context: Reject fixed persona enum | `src/domain/user-context/context-builder.ts` | `HouseholdContextSchema` (Composition, Routines, Sensitivities) | UT (Arbitrary household composition fuzzing) | `TEST-CTX-001` to `TEST-CTX-150` | `PLANNED` |
| **B.2** | Support arbitrary household composition (all ages, non-diagnostic sensitivities) | `src/domain/user-context/household.ts` | `HouseholdMemberSchema` | UT (Validation of diverse age/sensitivity mixes) | `TEST-CTX-151` to `TEST-CTX-250` | `PLANNED` |
| **B.3** | Custom daily routines, activities, outdoor exposure & schedules | `src/domain/user-context/routine.ts` | `RoutineActivitySchema`<br>`ScheduleWindowSchema` | UT (Overlapping schedules, 24h timeline validation) | `TEST-CTX-251` to `TEST-CTX-350` | `PLANNED` |
| **B.4** | Commute & transport options (walk, cycle, auto, bus, metro, car) | `src/domain/user-context/commute.ts` | `CommuteSegmentSchema`<br>`TransitModeSchema` | UT (Exposure scoring per transit modality) | `TEST-CTX-351` to `TEST-CTX-420` | `PLANNED` |
| **B.5** | Indoor environment modeling (dwelling, floor, cooking, ventilation, filtration) | `src/domain/user-context/indoor.ts` | `IndoorEnvironmentSchema` | UT (Micro-environment ventilation timing evaluation) | `TEST-CTX-421` to `TEST-CTX-500` | `PLANNED` |
| **B.6** | Flexible user constraints and priorities (affordability tier, schedule shift) | `src/domain/user-context/constraints.ts` | `UserConstraintsSchema` | UT (Schedule shift range validation $\pm 180$ min) | `TEST-CTX-501` to `TEST-CTX-550` | `PLANNED` |
| **B.7** | Optional sensitivity disclosure (minimised, non-diagnostic) | `src/domain/user-context/vulnerability.ts` | `SelfReportedSensitivitiesSchema` (All fields strictly optional) | ST (Field omission & client-side encryption test) | `TEST-PRIV-001` to `TEST-PRIV-050` | `PLANNED` |
| **C.1** | Gemini API through secure backend (Zero secrets in client) | `src/server/ai/gemini-client.ts`<br>`src/app/api/recommendations/generate/route.ts` | `AiInferenceRequestSchema` | ST (Client bundle inspection, mock API exfiltration) | `TEST-SEC-200` to `TEST-SEC-250` | `PLANNED` |
| **C.2** | Supply validated live evidence & user context to AI | `src/server/ai/prompt-synthesizer.ts` | `GroundTruthEvidenceContextSchema` | UT (Prompt injection sanitizer & evidence anchor) | `TEST-AI-001` to `TEST-AI-100` | `PLANNED` |
| **C.3** | Never ask LLM to invent or calculate current AQI | `src/server/ai/prompt-synthesizer.ts` | Immutable System Directive in Prompt | UT & ST (Negative evaluation against AQI math requests) | `TEST-AI-101` to `TEST-AI-200` | `PLANNED` |
| **C.4** | Produce structured recommendations (action, reason, method, benefit, limits, evidence) | `src/server/ai/gemini-client.ts` | `StructuredRecommendationSchema` (Zod enforced JSON) | UT (Schema conformance & malformed output rejection) | `TEST-AI-201` to `TEST-AI-350` | `PLANNED` |
| **C.5** | Validate all model output using Zod & citation IDs | `src/server/ai/output-validator.ts` | `RecommendationResponseSchema` | UT & ST (Fuzzing with corrupt/adversarial LLM replies) | `TEST-AI-351` to `TEST-AI-500` | `PLANNED` |
| **C.6** | Provide deterministic fallback when AI unavailable | `src/server/ai/deterministic-recommender.ts` | `RecommendationResponseSchema` (Unified output) | IT & UT (Fault-injection timeout & 500 error triggers) | `TEST-FALL-001` to `TEST-FALL-200` | `PLANNED` |
| **C.7** | Multilingual support: English, Bengali, Hindi | `src/i18n/translator.ts`<br>`src/i18n/dictionaries/{en,bn,hi}.json` | `LocaleDictionarySchema` | UT & E2E (Language switching & non-Latin rendering) | `TEST-I18N-001` to `TEST-I18N-150` | `PLANNED` |
| **D.1** | Household pollution sources (incense, mosquito coils, unvented heaters) | `src/domain/indoor/hazard-evaluator.ts` | `IndoorHazardProfileSchema` | UT (Source-emission hazard weight calculations) | `TEST-IND-001` to `TEST-IND-060` | `PLANNED` |
| **D.2** | Cooking & ventilation guidance (exhaust fans, cross-ventilation, timing) | `src/domain/indoor/ventilation-advisor.ts` | `VentilationGuidanceSchema` | UT (Outdoor vs indoor delta-driven window rules) | `TEST-IND-061` to `TEST-IND-120` | `PLANNED` |
| **D.3** | Practical exposure-reduction measures (wet mopping, barrier entry) | `src/domain/indoor/exposure-reducer.ts` | `PracticalActionSchema` | UT (Rule relevance based on housing floor and proximity) | `TEST-IND-121` to `TEST-IND-180` | `PLANNED` |
| **D.4** | Filtration guidance (True HEPA CADR sizing, room volume) | `src/domain/indoor/filtration-calculator.ts` | `FiltrationRecommendationSchema` | UT (Room volume vs CADR ACH calculations) | `TEST-IND-181` to `TEST-IND-250` | `PLANNED` |
| **D.5** | Never claim indoor AQI without an indoor sensor | `src/components/indoor/IndoorCoachCard.tsx` | UI Warning Banner Contract | UT & AT (Sensorless assertion check; qualitative advice only) | `TEST-IND-251` to `TEST-IND-300` | `PLANNED` |
| **E.1** | Daily Routine Planner: Morning, afternoon, evening, night | `src/domain/routine/timeline-segmenter.ts` | `DailyRoutineTimelineSchema` | UT (24-hour diurnal partition and timeline continuity) | `TEST-PLN-001` to `TEST-PLN-080` | `PLANNED` |
| **E.2** | Air-aware activities & commute planning | `src/domain/routine/exposure-optimizer.ts` | `OptimizedActivityPlanSchema` | UT (Diurnal smog peak avoidance algorithms) | `TEST-PLN-081` to `TEST-PLN-150` | `PLANNED` |
| **E.3** | Sustainable alternatives (Metro, EV, route adjustments) | `src/domain/routine/sustainable-alternatives.ts` | `SustainableOptionSchema` | UT (Emission vs personal intake trade-off engine) | `TEST-PLN-151` to `TEST-PLN-220` | `PLANNED` |
| **E.4** | Decouple personal exposure from environmental emissions | `src/domain/routine/impact-calculator.ts` | `DualImpactScoreSchema` (`personalRisk`, `emissionsImpact`) | UT (Independent scoring verification) | `TEST-PLN-221` to `TEST-PLN-280` | `PLANNED` |
| **E.5** | Never recommend unsafe outdoor activity merely to reduce emissions | `src/domain/routine/safety-guardrail.ts` | `SafetyConstraintValidatorSchema` | Domain UT & ST (Active blocking of cycling/walking when AQI is Very Poor or Severe) | `TEST-PLN-281` to `TEST-PLN-350` | `PLANNED` |
| **F.1** | Guest access (100% local-only in sessionStorage, zero cloud persistence) | `src/components/auth/GuestSessionProvider.tsx` | `GuestSessionSchema` | E2E & IT (Unauthenticated guest workflow without session cookies or Firestore records) | `TEST-AUTH-001` to `TEST-AUTH-050` | `PLANNED` |
| **F.2** | Google Sign-In via Firebase Auth | `src/config/firebase.ts`<br>`src/server/auth/token-guard.ts` | `OAuthTokenResponseSchema` | ST & IT (Firebase Admin token verification) | `TEST-AUTH-051` to `TEST-AUTH-120` | `PLANNED` |
| **F.3** | Passwordless email authentication via Firebase Auth | `src/config/firebase.ts`<br>`src/server/auth/token-guard.ts` | `MagicLinkPayloadSchema` | ST & IT (Platform-managed email link verification) | `TEST-AUTH-121` to `TEST-AUTH-200` | `PLANNED` |
| **F.4** | Saved household profiles & daily plans for registered users | `src/server/db/user-repository.ts` | `UserProfileEntitySchema` | IT (Persistence and hydration via Firebase Admin SDK) | `TEST-AUTH-201` to `TEST-AUTH-280` | `PLANNED` |
| **F.5** | UID-scoped user data isolation in server repository (Zero IDOR) | `src/server/db/user-repository.ts`<br>`firestore.rules` | `TenantScopedQuerySchema` | ST (Cross-user access, IDOR penetration test matrix) | `TEST-SEC-300` to `TEST-SEC-800` | `PLANNED` |
| **F.6** | Secure token verification via Firebase Admin SDK | `src/server/auth/token-guard.ts` | `JwtClaimsSchema` | ST (Alg=none, expired token injection, key confusion) | `TEST-SEC-801` to `TEST-SEC-1200` | `PLANNED` |
| **F.7** | Account deletion (cascading hard erase) & complete data export (JSON) | `src/server/privacy/gdpr-dpdp-service.ts` | `UserDataExportSchema` | ST & IT (Cascading delete check, export verification) | `TEST-PRIV-051` to `TEST-PRIV-150` | `PLANNED` |
| **F.8** | Zero secrets in frontend code | `next.config.js`<br>`src/config/env.ts` | `ServerEnvSchema` vs `ClientEnvSchema` | ST (Webpack AST scan & bundle string grep for env secrets) | `TEST-SEC-1201` to `TEST-SEC-1300` | `PLANNED` |
| **G.1** | OWASP ASVS 5.0.0 Level 2 Baseline | Entire codebase | ASVS 5.0.0 Verification Checklist | ST (3,050 Automated Security Test Generator) | `TEST-SEC-1301` to `TEST-SEC-4350` | `PLANNED` |
| **G.2** | Repository size $< 10\text{ MB}$ | `.github/workflows/ci.yml`<br>`scripts/check-repo-size.sh` | Shell assertion script | CI assertion (`git count-objects -vH` check) | `TEST-OPS-001` | `ENFORCED` |
| **G.3** | Single branch `main` constraint | `.github/workflows/ci.yml`<br>`scripts/verify-single-branch.sh` | Git branch validation script | CI assertion (Reject if branch != `main`) | `TEST-OPS-002` | `ENFORCED` |
