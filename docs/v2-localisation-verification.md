# HawaSaathi 2.0 — National Localisation & RTL Verification

> **Date:** 2026-11-25
> **Scope:** English (`en-IN`) + All 22 Indian Eighth Schedule Languages (`23` Canonical Locales)

---

## 1. Complete Native-Script Coverage (`src/i18n/v2-translations.ts`)

- `V2UiStrings` defines all 2.0 UI strings (`navOverview`, `navExploreMap`, `navStations`, `navDailyPlanner`, `navIntelligentAgent`, `navAiChat`, `navInsights`, `navAlerts`, `navIndoorCoach`, `navLearning`, `navSettings`, theme labels, planner headings, agent/chat headings, map controls).
- `buildLocaleCatalog` populates complete native-script entries across all `23` `CANONICAL_LOCALES` (`en-IN`, `hi-IN`, `bn-IN`, `ta-IN`, `te-IN`, `mr-IN`, `gu-IN`, `kn-IN`, `ml-IN`, `or-IN`, `pa-IN`, `as-IN`, `ur-IN`, `ks-IN`, `sd-IN`, `sa-IN`, `ne-IN`, `kok-IN`, `mai-IN`, `doi-IN`, `mni-IN`, `brx-IN`, `sat-IN`).
- `getV2UiStrings(locale).fallbackKeys` is verified `[]` (`0` missing keys) across every canonical locale.

---

## 2. RTL Layout & Telemetry Decoupling

- **RTL Directionality (`ur-IN`, `ks-IN`, `sd-IN`):**
  - `LOCALE_REGISTRY[locale].direction === "rtl"`.
  - Applied cleanly to `<html dir>` and dashboard shell (`rtl:lg:pl-0 rtl:lg:pr-60` in `src/app/page.tsx`).
- **Telemetry Preservation on Language Switch:**
  - Switching language in `Navbar` or `SettingsWorkspace` updates `language` state and document `lang` / `dir` attributes without adding `language` to `fetchStationsAndForecast` dependency array, eliminating spurious CPCB/OpenAQ station refetches.

---

## 3. Empirical Verification

- **Unit & Coverage Tests:** `tests/unit/v2/v2-regression-closure.test.tsx`, `tests/unit/i18n/p5-multilingual-catalogs.test.ts`, `tests/unit/p7/p7-localisation-scripts.test.ts` — 100.00% coverage on `src/i18n/**`.
- **Chrome Standalone E2E (`scripts/run-browser-e2e.ts`):**
  - Scenario 10 `[I18N] 23-Locale Switching & Urdu RTL Direction`: **PASS (`677ms`)** — verified `bn=bn-IN/ltr`, `ur=ur-IN/rtl`, and `refetches=0`.
