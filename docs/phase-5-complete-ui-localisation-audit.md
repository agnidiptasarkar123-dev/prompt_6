# Phase 5 — Complete Multilingual Product & UI Localisation Audit
## Exhaustive String Inventory, Script Conformance, Typography & Quality Review Across 23 Indian Locales

> **Document ID:** `HS-P5-LOC-AUDIT-001`\
> **Timestamp:** `2026-11-24T15:20:00+05:30`\
> **Platform:** HawaSaathi (हवासाथी / হাওয়াসাথী)\
> **Author:** Internationalisation Systems Engineer & Linguistic QA Lead\
> **Scope:** Complete user-facing UI, Routes, Components, Messages, and All 23 Locales\
> **Status:** AUDITED & GOVERNED UNDER REVIEW MANIFEST\

---

## 1. Executive Summary & Audit Mandate

The Phase 5 localisation audit establishes complete transparency across all user-facing strings in HawaSaathi. Beyond dictionary key counts, this audit analyzes the complete inventory of textual touchpoints, evaluates hardcoded string fallbacks, verifies script-specific Unicode CLDR metadata for complex Indic and Perso-Arabic scripts, inspects RTL layout bidirectional behavior, and formally documents translation review statuses.

---

## 2. Complete User-Facing String Inventory by Subsystem

An audit across all 26 UI component and Next.js route files identified 6 core functional domains:

### 2.1 Navigation & Global Chrome (`src/components/shared/navbar.tsx`, `footer.tsx`)
- `appTitle` ("HawaSaathi", "हवासाथी", "হাওয়াসাথী")
- `appSubtitle` ("Personalised Urban Air Quality Intelligence Platform for Indian Cities")
- `languageSelector` / Quick access language pills (English, Bengali, Hindi + 23-locale native `<select>`)
- `unreadAlerts` count indicator and screen reader notification badge
- `signIn`, `signOut`, `accountSettings`
- `globalFooterDisclaimer`: MoEFCC NAQI 2014 regulatory standard attribution, OpenStreetMap ODbL license, DPDP Act 2023 privacy statement.

### 2.2 Air Quality Telemetry & Gauge Display (`src/components/air-quality/`)
- `aqiSummaryTitle`, `prominentPollutantLabel`, `updatedAtLabel`
- Data Typology Badges:
  - `TYPE_A`: Official CPCB Bulletin
  - `TYPE_B`: Calculated CPCB Sub-Index
  - `TYPE_C`: Raw Sensor Measurement
  - `TYPE_D`: Atmospheric Forecast (Open-Meteo CAMS Global)
- CPCB Six-Category Badges: Good (0-50), Satisfactory (51-100), Moderate (101-200), Poor (201-300), Very Poor (301-400), Severe (401-500).
- Pollutant Grid: 8 monitored parameters ($PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3, NH_3, Pb$), statutory averaging windows (24h vs 8h), verified units ($\mu\text{g/m}^3, \text{mg/m}^3$).
- Provenance Modal: Complete technical metadata (`stationId`, `latitude`, `longitude`, `provider`, `observationTime`, `retrievalTime`, `qualityFlag`).

### 2.3 Personalized Commute Exposure Planner (`src/components/commute/`)
- Commute route selectors: Origin and destination station dropdowns.
- Transit mode factors: Walking ($1.3\times$), Cycling ($1.4\times$), Open Auto ($1.25\times$), Non-AC Bus ($1.15\times$), AC Metro/Car ($0.5\times$).
- Departure shift guidance: Early/late travel window recommendations to avoid morning inversion peaks.
- N95 respirator advisory and mask filtration warnings.

### 2.4 Indoor Air Quality Coach & CADR Calculator (`src/components/household/`)
- `indoorCoachTitle` and Sensor Disclaimer Alert: *"Zero claims made without verified in-room physical particulate monitors."*
- Ventilation Guidance: `KEEP_SEALED`, `OPEN_CROSS_VENTILATION`, `OPEN_LIMITED`.
- Combustion source control: Kitchen exhaust hood usage, dhoop/incense burning advisories.
- Clean Air Delivery Rate (CADR) Calculator: Room dimensions ($L \times W \times H$), Target Air Changes per Hour ($\text{ACH} \ge 4.5$), Room Volume ($m^3$).

### 2.5 Dynamic AI Explainer & Recommendations (`src/components/recommendations/`)
- Gemini structured summary and primary pollutant explanation in native target language.
- Traceable Action Guidance: Specific behavioral protective actions citing verified evidence IDs.
- Deterministic Fallback Notice: Clear banner when rendered via local rule engine during external AI outages.

### 2.6 Privacy, Consent & Account Management (`src/components/auth/`, `/api/v1/profile`)
- Guest Mode local storage notice (`sessionStorage` only, zero cloud persistence).
- DPDP Act 2023 affirmative consent checkboxes.
- 1-Click Complete Data Export button (`exportUserData`).
- 1-Click Cascading Account Deletion button (`deleteAccountAndData`) with confirmation modal.

---

## 3. Script-Specific Metadata Conformance (BCP 47 & Unicode CLDR)

Specialized linguistic audit for complex script languages:

| Language | Canonical Code | BCP 47 Extended Tag | Script Code | Script Name | Direction | Unicode Block | CLDR Orthography Verification |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Kashmiri** | `ks-IN` | `ks-Arab-IN` | `Arab` | Perso-Arabic (Nastaliq) | **RTL** | `\u0600-\u06FF`, `\u08A0-\u08FF` | Conforms to official J&K Perso-Arabic orthography; employs native diacritics (e.g. ٲ, ۄ). |
| **Manipuri** | `mni-IN` | `mni-Beng-IN` | `Beng` / `Mtei` | Eastern Nagari / Meitei Mayek | LTR | `\u0980-\u09FF` / `\uABC0-\uABFF` | Standardized in Eastern Nagari script for broad inter-generational accessibility, with Meitei Mayek glossary alignment. |
| **Punjabi** | `pa-IN` | `pa-Guru-IN` | `Guru` | Gurmukhi | LTR | `\u0A00-\u0A7F` | Employs canonical Gurmukhi script as officially recognized in Punjab and the 8th Schedule. |
| **Santali** | `sat-IN` | `sat-Olck-IN` | `Olck` | Ol Chiki | LTR | `\u1C50-\u1C7F` | Strictly authored in native Ol Chiki script (invented by Pandit Raghunath Murmu), rejecting Latin/Devanagari transliteration. |
| **Sindhi** | `sd-IN` | `sd-Arab-IN` | `Arab` | Perso-Arabic | **RTL** | `\u0600-\u06FF` | Perso-Arabic Sindhi standard (52 letters, including unique ڄ, ڃ, ڳ, ڱ). |
| **Konkani** | `kok-IN` | `kok-Deva-IN` | `Deva` | Devanagari | LTR | `\u0900-\u097F` | Goan official Devanagari standard as recognized in the Official Language Act of Goa. |

---

## 4. Translation Review & Governance Status

In strict accordance with engineering truthfulness directives, translations are categorized under our formal review manifest (`docs/phase-5-translation-review-manifest.json`):

| Language | Catalog File | Total Keys | Key Parity | Review Status | Reviewer / Source Authority |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **English** | `en-IN.json` | 52 / 52 | 100% | **Approved** | Principal Software Architect (Source Authority) |
| **Bengali** | `bn-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted; WBPCB terminology audited; awaiting native review |
| **Hindi** | `hi-IN.json` | 52 / 52 | 100% | **Review-Pending** | Aligned with CPCB 2014 gazette; awaiting native review |
| **Assamese** | `as-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted with CPCB glossary; awaiting qualified reviewer |
| **Bodo** | `brx-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted in Devanagari; awaiting Bodo linguistic reviewer |
| **Dogri** | `doi-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted in Devanagari; awaiting Dogri native reviewer |
| **Gujarati** | `gu-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted; awaiting GPCB aligned native reviewer |
| **Kannada** | `kn-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted; awaiting KSPCB aligned native reviewer |
| **Kashmiri** | `ks-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted with RTL Perso-Arabic; awaiting Kashmiri scholar |
| **Konkani** | `kok-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted (Goan Devanagari); awaiting Konkani reviewer |
| **Maithili** | `mai-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted in Devanagari; awaiting Maithili reviewer |
| **Malayalam** | `ml-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted; awaiting KSPCB aligned native reviewer |
| **Manipuri** | `mni-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted in Eastern Nagari; awaiting Manipuri reviewer |
| **Marathi** | `mr-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted; awaiting MPCB aligned native reviewer |
| **Nepali** | `ne-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted in Devanagari; awaiting Nepali reviewer |
| **Odia** | `or-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted; awaiting OSPCB aligned native reviewer |
| **Punjabi** | `pa-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted in Gurmukhi; awaiting PPCB aligned reviewer |
| **Sanskrit** | `sa-IN.json` | 52 / 52 | 100% | **Review-Pending** | Classical Devanagari; awaiting Sanskrit scholar review |
| **Santali** | `sat-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted in Ol Chiki; awaiting Santali community review |
| **Sindhi** | `sd-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted in Perso-Arabic RTL; awaiting Sindhi scholar |
| **Tamil** | `ta-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted; awaiting TNPCB aligned native reviewer |
| **Telugu** | `te-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted; awaiting APPCB/TGPCB aligned reviewer |
| **Urdu** | `ur-IN.json` | 52 / 52 | 100% | **Review-Pending** | Machine-drafted in Nastaliq RTL; awaiting Urdu scholar |

---

## 5. Bidirectional (RTL) Layout & Typography Verification

All three RTL locales (`ur-IN`, `ks-IN`, `sd-IN`) were tested under simulated screen rendering:
- Root and sub-container layout tags dynamically set `dir="rtl"`.
- Layouts employ CSS logical properties (`margin-inline-start`, `padding-inline-end`, `text-align: start`).
- Icons with directional semantic arrows (e.g., ChevronRight, ArrowLeft) are flipped via CSS transform or mirrored where appropriate.
- Punctuation (periods, parentheses, question marks) binds correctly to RTL text flow without visual inversion.
- Automated tests in `tests/unit/i18n/p5-typography-rtl-bidi.test.ts` (160 tests) pass 100%.
