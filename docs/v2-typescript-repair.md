# HawaSaathi 2.0 — Priority 0 TypeScript & Null-AQI Contract Repair

> **Date:** 2026-11-25
> **Status:** VERIFIED (`tsc --noEmit` exit `0`, `eslint .` exit `0`, `10,132 / 10,132` tests pass)

---

## 1. Root Cause Analysis (`src/app/page.tsx` TypeScript Mismatches)

Prior to remediation, `src/app/page.tsx` passed explicit null-aware state when verified AQI was unavailable, exposing two component contract mismatches:

1. **`RecommendationsPanel` (`src/components/recommendations/recommendations-panel.tsx`):**
   - `src/app/page.tsx` passed `isAqiUnavailable={verifiedAqiCategory === null}`, which `RecommendationsPanelProps` did not declare cleanly across component revisions.
2. **`IndoorCoachPanel` (`src/components/household/indoor-coach-panel.tsx`):**
   - `IndoorCoachPanelProps.aqiCategory` was previously typed non-nullably or lacked an explicit null path, forcing callers toward synthetic defaults (`MODERATE` / `GOOD`) instead of honoring `verifiedAqiCategory: CpcbCategory | null` (`aqiStatus === "AVAILABLE" ? calculatedAqi?.category ?? null : null`).

---

## 2. Implemented Type-Safe Null Contracts

1. **`src/components/recommendations/recommendations-panel.tsx`:**
   - Exposes `readonly isAqiUnavailable?: boolean` on `RecommendationsPanelProps`.
   - When `isAqiUnavailable` is `true`, surfaces clear unavailable-AQI behavioral guidance rather than fabricating an AQI severity category.
2. **`src/components/household/indoor-coach-panel.tsx`:**
   - Types `readonly aqiCategory: CpcbCategory | null` via shared domain type `@/domain/cpcb/cpcb-breakpoints`.
   - Delegates ventilation calculation cleanly to `determineVentilationStrategy(aqiCategory, ...)`.
   - When `aqiCategory === null`, renders `Outdoor AQI Context: UNAVAILABLE` and surfaces the explicit unavailable-AQI caution inside the Natural Ventilation card (`resolvedVentilation.cautions`) without implying `GOOD` or `MODERATE` air quality.

---

## 3. Empirical Verification

- **Strict TypeScript (`npm run typecheck`):** `tsc --noEmit` — **0 errors** (`strict`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`).
- **ESLint (`npm run lint`):** `eslint .` — **0 errors, 0 warnings**.
- **Automated Tests (`tests/unit/v2/v2-regression-closure.test.tsx`):** Verified null `CpcbCategory` behavior on both `RecommendationsPanel` (`isAqiUnavailable={true}`) and `IndoorCoachPanel` (`aqiCategory={null}`).
