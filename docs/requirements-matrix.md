# Requirements-to-Feature-to-Test Traceability Matrix

> **Document ID:** HS-REQ-MTX-001  
> **Status:** Approved Baseline  
> **Standard:** IEEE 830 / ISO/IEC/IEEE 29148 Traceability Standard

---

## 1. Overview & Verification Legend

This matrix establishes 100% bidirectional traceability between user requirements, engineering features, data schemas, domain components, and automated test specifications.

### Verification Methods
- **UT:** Unit Test (deterministic, isolated, mocked dependencies)
- **IT:** Integration Test (cross-module, API contract verification)
- **ST:** Security Test (OWASP ASVS, fuzzing, injection, IDOR)
- **AT:** Accessibility Test (Axe-core, WCAG 2.1 AA keyboard/screen reader)
- **E2E:** End-to-End System Test (Playwright browser automation)

---

## 2. Traceability Matrix

| Req ID | Requirement Description | Implementing Module / File | Schema / Domain Contract | Verification Strategy | Test Case ID Range |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A.1** | Investigate CPCB, CAAQMS, OpenAQ real-time data providers | `src/services/air-quality/cpcb-provider.ts`<br>`src/services/air-quality/openaq-provider.ts` | `ObservedStationReadingSchema`<br>`StationMetadataSchema` | IT (Contract tests with live mocks) | `TEST-AQ-001` to `TEST-AQ-050` |
| **A.2** | Investigate Open-Meteo CAMS for forecasts | `src/services/air-quality/cams-forecast-provider.ts` | `ModelForecastReadingSchema` | IT (Forecast schema & interpolation tests) | `TEST-AQ-051` to `TEST-AQ-080` |
| **A.3** | Verify endpoints, coverage, auth, licensing & rate limits | `src/services/air-quality/aggregator.ts`<br>`src/config/rate-limits.ts` | `ProviderConfigSchema`<br>`RateLimitConfigSchema` | IT (Rate limiter throttling & mock quota) | `TEST-AQ-081` to `TEST-AQ-120` |
| **A.4** | Never invent, hardcode or fabricate live pollution readings | `src/services/air-quality/aggregator.ts` | `RawReadingSchema` (Null if unavailable) | UT & ST (Negative assertions on mock fallbacks) | `TEST-SEC-100` to `TEST-SEC-150` |
| **A.5** | Clearly separate observed measurements from modelled forecasts | `src/components/aqi/StationBadge.tsx`<br>`src/components/aqi/ForecastCard.tsx` | `AirQualitySnapshot` (`type: 'OBSERVED' \| 'MODEL_FORECAST'`) | UT, AT, E2E (UI badge & tag assertions) | `TEST-UI-001` to `TEST-UI-040` |
| **A.6** | Preserve measurement source, station, timestamp, retrieval time, unit, averaging period | `src/services/air-quality/provenance.ts` | `DataProvenanceRecordSchema` | UT (Field completeness & immutable audit log) | `TEST-PROV-001` to `TEST-PROV-060` |
| **A.7** | Handle unavailable, stale and incomplete readings safely | `src/services/air-quality/quality-evaluator.ts` | `ReadingQualityStatusSchema` (`VALID`, `STALE`, `INCOMPLETE`) | UT & IT (Simulation of missing sensors & stale feeds) | `TEST-DEG-001` to `TEST-DEG-100` |
| **A.8** | Implement CPCB AQI only when official calculation requirements satisfied (>=3 pollutants, with PM2.5 or PM10) | `src/domain/cpcb/aqi-calculator.ts` | `CpcbCalculationResultSchema`<br>`SubIndexBreakdownSchema` | UT (Permutation testing across 8 pollutants & boundary values) | `TEST-CPCB-001` to `TEST-CPCB-500` |
| **B.1** | Dynamic User Context: Reject fixed persona enum | `src/domain/user-context/context-builder.ts` | `HouseholdContextSchema` (Composition, Routines, Sensitivities) | UT (Arbitrary household composition fuzzing) | `TEST-CTX-001` to `TEST-CTX-150` |
| **B.2** | Support arbitrary household composition (all ages, vulnerabilities) | `src/domain/user-context/household.ts` | `HouseholdMemberSchema` | UT (Validation of diverse age/vulnerability mixes) | `TEST-CTX-151` to `TEST-CTX-250` |
| **B.3** | Custom daily routines, activities, outdoor exposure & schedules | `src/domain/user-context/routine.ts` | `RoutineActivitySchema`<br>`ScheduleWindowSchema` | UT (Overlapping schedules, 24h timeline validation) | `TEST-CTX-251` to `TEST-CTX-350` |
| **B.4** | Commute & transport options (walk, cycle, auto, bus, metro, car) | `src/domain/user-context/commute.ts` | `CommuteSegmentSchema`<br>`TransitModeSchema` | UT (Exposure scoring per transit modality) | `TEST-CTX-351` to `TEST-CTX-420` |
| **B.5** | Indoor environment modeling (dwelling, floor, cooking, ventilation, filtration) | `src/domain/user-context/indoor.ts` | `IndoorEnvironmentSchema` | UT (Micro-environment risk coefficient calculation) | `TEST-CTX-421` to `TEST-CTX-500` |
| **B.6** | Flexible user constraints and priorities (budget, schedule shift) | `src/domain/user-context/constraints.ts` | `UserConstraintsSchema` | UT (Schedule shift range validation $\pm 120$ min) | `TEST-CTX-501` to `TEST-CTX-550` |
| **B.7** | Optional vulnerability disclosure (privacy-preserving) | `src/domain/user-context/vulnerability.ts` | `VulnerabilityDisclosureSchema` (All fields strictly optional) | ST (Field omission & client-side encryption test) | `TEST-PRIV-001` to `TEST-PRIV-050` |
| **C.1** | Gemini API through secure backend (Zero secrets in client) | `src/server/ai/gemini-client.ts`<br>`src/app/api/recommendations/route.ts` | `AiInferenceRequestSchema` | ST (Client bundle inspection, mock API exfiltration) | `TEST-SEC-200` to `TEST-SEC-250` |
| **C.2** | Supply validated live evidence & user context to AI | `src/server/ai/prompt-synthesizer.ts` | `GroundTruthEvidenceContextSchema` | UT (Prompt injection sanitizer & evidence anchor) | `TEST-AI-001` to `TEST-AI-100` |
| **C.3** | Never ask LLM to invent or calculate current AQI | `src/server/ai/prompt-synthesizer.ts` | Immutable System Directive in Prompt | UT & ST (Negative evaluation against AQI math requests) | `TEST-AI-101` to `TEST-AI-200` |
| **C.4** | Produce structured recommendations (action, reason, method, benefit, limits, evidence) | `src/server/ai/gemini-client.ts` | `StructuredRecommendationSchema` (Zod enforced JSON) | UT (Schema conformance & malformed output rejection) | `TEST-AI-201` to `TEST-AI-350` |
| **C.5** | Validate all model output using Zod | `src/server/ai/output-validator.ts` | `RecommendationResponseSchema` | UT & ST (Fuzzing with corrupt/adversarial LLM replies) | `TEST-AI-351` to `TEST-AI-500` |
| **C.6** | Provide deterministic fallback when AI unavailable | `src/server/ai/deterministic-recommender.ts` | `RecommendationResponseSchema` (Unified output) | IT & UT (Fault-injection timeout & 500 error triggers) | `TEST-FALL-001` to `TEST-FALL-200` |
| **C.7** | Multilingual support: English, Bengali, Hindi | `src/i18n/translator.ts`<br>`src/locales/{en,bn,hi}.json` | `LocaleDictionarySchema` | UT & E2E (Language switching & non-Latin rendering) | `TEST-I18N-001` to `TEST-I18N-150` |
| **D.1** | Household pollution sources (incense, mosquito coils, unvented heaters) | `src/domain/indoor/hazard-evaluator.ts` | `IndoorHazardProfileSchema` | UT (Source-emission hazard weight calculations) | `TEST-IND-001` to `TEST-IND-060` |
| **D.2** | Cooking & ventilation guidance (exhaust fans, cross-ventilation, timing) | `src/domain/indoor/ventilation-advisor.ts` | `VentilationGuidanceSchema` | UT (Outdoor vs indoor delta-driven window rules) | `TEST-IND-061` to `TEST-IND-120` |
| **D.3** | Practical exposure-reduction measures (wet mopping, barrier entry) | `src/domain/indoor/exposure-reducer.ts` | `PracticalActionSchema` | UT (Rule relevance based on housing floor and proximity) | `TEST-IND-121` to `TEST-IND-180` |
| **D.4** | Filtration guidance (DIY Corsi-Rosenthal boxes, true HEPA CADR sizing) | `src/domain/indoor/filtration-calculator.ts` | `FiltrationRecommendationSchema` | UT (Room volume vs CADR ACH calculations) | `TEST-IND-181` to `TEST-IND-250` |
| **D.5** | Never claim indoor AQI without an indoor sensor | `src/components/indoor/IndoorCoachCard.tsx` | UI Warning Banner Contract | UT & AT (Sensorless assertion check; qualitative advice only) | `TEST-IND-251` to `TEST-IND-300` |
| **E.1** | Daily Routine Planner: Morning, afternoon, evening, night | `src/domain/routine/timeline-segmenter.ts` | `DailyRoutineTimelineSchema` | UT (24-hour diurnal partition and timeline continuity) | `TEST-PLN-001` to `TEST-PLN-080` |
| **E.2** | Air-aware activities & commute planning | `src/domain/routine/exposure-optimizer.ts` | `OptimizedActivityPlanSchema` | UT (Diurnal smog peak avoidance algorithms) | `TEST-PLN-081` to `TEST-PLN-150` |
| **E.3** | Sustainable alternatives (Metro, EV, route adjustments) | `src/domain/routine/sustainable-alternatives.ts` | `SustainableOptionSchema` | UT (Emission vs personal intake trade-off engine) | `TEST-PLN-151` to `TEST-PLN-220` |
| **E.4** | Decouple personal exposure from environmental emissions | `src/domain/routine/impact-calculator.ts` | `DualImpactScoreSchema` (`personalRisk`, `emissionsImpact`) | UT (Independent scoring verification) | `TEST-PLN-221` to `TEST-PLN-280` |
| **E.5** | Never recommend unsafe outdoor activity merely to reduce emissions | `src/domain/routine/safety-guardrail.ts` | `SafetyConstraintValidatorSchema` | UT & ST (Active blocking of cycling/walking when AQI > 200) | `TEST-PLN-281` to `TEST-PLN-350` |
| **F.1** | Guest access to core features without authentication | `src/server/auth/guest-session.ts` | `GuestSessionSchema` | E2E & IT (Unauthenticated guest workflow without session cookies) | `TEST-AUTH-001` to `TEST-AUTH-050` |
| **F.2** | Google OAuth 2.0 Sign-In (PKCE) | `src/server/auth/oauth-provider.ts` | `OAuthTokenResponseSchema` | ST & IT (CSRF state verification, replay rejection) | `TEST-AUTH-051` to `TEST-AUTH-120` |
| **F.3** | Passwordless email authentication (Magic Link / OTP) | `src/server/auth/passwordless.ts` | `MagicLinkPayloadSchema` | ST & IT (Expiry, single-use nonce, HMAC validation) | `TEST-AUTH-121` to `TEST-AUTH-200` |
| **F.4** | Saved household profiles & daily plans for registered users | `src/server/db/user-repository.ts` | `UserProfileEntitySchema` | IT (Persistence and hydration lifecycle) | `TEST-AUTH-201` to `TEST-AUTH-280` |
| **F.5** | UID-scoped user data isolation (Zero IDOR) | `src/server/db/tenant-guard.ts` | `TenantScopedQuerySchema` | ST (Cross-user access, IDOR penetration test matrix) | `TEST-SEC-300` to `TEST-SEC-800` |
| **F.6** | Secure token verification & revocation | `src/server/auth/token-service.ts` | `JwtClaimsSchema` | ST (Alg=none, key confusion, expired token injection) | `TEST-SEC-801` to `TEST-SEC-1200` |
| **F.7** | Account deletion (hard erase) & complete data export (JSON) | `src/server/privacy/gdpr-dpdp-service.ts` | `UserDataExportSchema` | ST & IT (Cascading delete check, export verification) | `TEST-PRIV-051` to `TEST-PRIV-150` |
| **F.8** | Zero secrets in frontend code | `next.config.js`<br>`src/config/env.ts` | `ServerEnvSchema` vs `ClientEnvSchema` | ST (Webpack AST scan & bundle string grep for env secrets) | `TEST-SEC-1201` to `TEST-SEC-1300` |
| **G.1** | OWASP ASVS 5.0.0 Level 2 Baseline | Entire codebase | ASVS 5.0.0 Verification Checklist | ST (3,000+ Automated Security Test Generator) | `TEST-SEC-1301` to `TEST-SEC-4300` |
| **G.2** | Repository size $< 10\text{ MB}$ | `.github/workflows/ci.yml`<br>`scripts/check-repo-size.sh` | Shell assertion script | CI assertion (`git count-objects -vH` check) | `TEST-OPS-001` |
| **G.3** | Single branch `main` constraint | `.github/workflows/ci.yml`<br>`scripts/verify-single-branch.sh` | Git branch validation script | CI assertion (Reject if `refs/heads/* != main`) | `TEST-OPS-002` |

---

## 3. Coverage Summary
- **Total Mapped Functional Requirements:** 41
- **Total Non-Functional Constraints:** 8
- **Projected Automated Security Test Cases:** $>3,000$ (automated parameter fuzzing across ASVS categories)
- **Target Overall Code Coverage:** $\ge 90\%$ line and branch coverage across domain logic.
