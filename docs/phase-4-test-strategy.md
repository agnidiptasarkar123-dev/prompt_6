# HawaSaathi (হাওয়াসাথী / हवासाथী) — Phase 4 Test Strategy & Quality Assurance Framework

**Document ID:** `HS-STRAT-P4-001`\
**Date:** 2026-11-24\
**Author:** QA Automation Lead & Principal Architect\
**Status:** COMPLETE (VERIFIED)\
**Standard:** Strict TypeScript, OWASP ASVS 5.0.0 Level 2, WCAG 2.2 AA, MoEFCC NAQI (2014)\

---

## 1. Test Pyramid & Verification Philosophy

HawaSaathi enforces a multi-layered verification strategy designed to prevent data inaccuracies, security vulnerabilities, and UI degradation:

```
                  /\
                 /  \      Browser E2E (10 Workflows in Headless Chrome)
                /----\
               /      \    Contract, Integration & Security Suites (1,800+ Tests)
              /--------\
             /          \  Targeted Domain Mutation Verification (20/20 Mutants Killed)
            /------------\
           /              \ Unit, Invariant, Mathematical & A11y Tests (2,600+ Tests)
          /----------------\
```

---

## 2. Testing Layers & Allocations

### 2.1 Unit & Invariant Testing (Vitest Native V8)
- Piecewise linear interpolation accuracy across all 8 CPCB pollutants.
- Boundary condition evaluation (e.g. Ozone $208.0\,\mu\text{g/m}^3$ ceiling vs $208.001\,\mu\text{g/m}^3$ acute floor).
- Data sufficiency validation (16h running window for 24h average; 6h for 8h average).
- 3-pollutant minimum check with mandatory particulate presence.

### 2.2 Product Experience & Interactive Components (P4 Suites)
- 13 dedicated Phase 4 test files (`tests/unit/p4/`):
  1. `p4-gemini-routing-failover.test.ts`: 150 tests
  2. `p4-dashboard-visualisation.test.tsx`: 200 tests
  3. `p4-commute-activity-guidance.test.tsx`: 180 tests
  4. `p4-alerts-notification-workflows.test.tsx`: 180 tests
  5. `p4-onboarding-multilingual-ux.test.tsx`: 140 tests
  6. `p4-profiles-personalisation.test.ts`: 240 tests
  7. `p4-recommendation-explanations.test.ts`: 180 tests
  8. `p4-maps-location-stations.test.tsx`: 140 tests
  9. `p4-accessibility-responsive.test.tsx`: 150 tests
  10. `p4-firestore-lifecycle-consent.test.ts`: 190 tests
  11. `p4-bff-product-api.test.ts`: 140 tests
  12. `p4-adversarial-security.test.ts`: 120 tests
  13. `p4-concurrency-performance-recovery.test.ts`: 140 tests

### 2.3 Targeted Mutation Testing (`scripts/run-mutation-tests.ts`)
- Evaluates invariant robustness by injecting deliberate mutations into core domain files in an isolated ephemeral sandbox.
- Tested: 20 mutations covering sufficiency thresholds, arithmetic signs, comparison operators, and combustion overrides.
- Kill Rate: **20/20 (100%)**.

### 2.4 Browser E2E Automation (`scripts/run-browser-e2e.ts`)
- Spawns local Next.js production server on port 3009.
- Launches real headless Google Chrome (`puppeteer-core`).
- Tests 10 complete user journeys: Initial Load, Provider Display, Provenance Modals, CPCB Insufficiency Display, Stale Warnings, Model Forecast Isolation, Trilingual Localization, Accessible Landmarks, Guest Session Ephemeral State, and Gemini Outage Fallback.
- Success Rate: **10/10 (100%)**.

---

## 3. Coverage Enforcement Policy

- 100% statement, branch, function, and line coverage across core calculation engines (`src/domain/**`) and canonical schemas (`src/schemas/**`).
- Monitored via `npm run test:coverage` (`vitest run --coverage`).
- Zero untested fallbacks or ignored error handlers.
