# Phase 7 — National Localisation Release Audit (23 Indian Languages)

> **Project:** HawaSaathi (হাওয়াসাথী / हवा साथी) — Pan-India Urban Air Quality Intelligence Platform\
> **Milestone:** Phase 7 Multilingual Release Audit\
> **Language Coverage:** English (Associate Official) + All 22 Eighth Schedule Indian Languages\
> **Automated Test Evidence:** 425 Dedicated Localisation Tests (`tests/unit/p7/p7-localisation-scripts.test.ts` + `tests/unit/i18n/`)

---

## 1. Statutory Linguistic Coverage & Script Registry

HawaSaathi provides comprehensive localization across English and all 22 Eighth Schedule languages recognized by the Constitution of India:

| Canonical Locale | Language Name | Native Script | Text Direction | Recommended Typographic Font | Review Status |
|:---|:---|:---|:---:|:---|:---:|
| `en-IN` | English (India) | Latin | LTR | `Inter, system-ui, sans-serif` | Verified |
| `as-IN` | Assamese (অসমীয়া) | Bengali-Assamese | LTR | `'Noto Sans Bengali', system-ui` | Verified |
| `bn-IN` | Bengali (বাংলা) | Bengali | LTR | `'Noto Sans Bengali', system-ui` | Verified |
| `brx-IN` | Bodo (बड़ो) | Devanagari | LTR | `'Noto Sans Devanagari', system-ui` | Verified |
| `doi-IN` | Dogri (डोगरी) | Devanagari | LTR | `'Noto Sans Devanagari', system-ui` | Verified |
| `gu-IN` | Gujarati (ગુજરાતી) | Gujarati | LTR | `'Noto Sans Gujarati', system-ui` | Verified |
| `hi-IN` | Hindi (हिन्दी) | Devanagari | LTR | `'Noto Sans Devanagari', system-ui` | Verified |
| `kn-IN` | Kannada (ಕನ್ನಡ) | Kannada | LTR | `'Noto Sans Kannada', system-ui` | Verified |
| `ks-IN` | Kashmiri (کٲشُر) | Perso-Arabic | **RTL** | `'Noto Nastaliq Urdu', system-ui` | Verified |
| `kok-IN` | Konkani (कोंकणी) | Devanagari | LTR | `'Noto Sans Devanagari', system-ui` | Verified |
| `mai-IN` | Maithili (मैथिली) | Devanagari | LTR | `'Noto Sans Devanagari', system-ui` | Verified |
| `ml-IN` | Malayalam (മലയാളം) | Malayalam | LTR | `'Noto Sans Malayalam', system-ui` | Verified |
| `mni-IN` | Manipuri (মৈতৈলোন্) | Bengali | LTR | `'Noto Sans Bengali', system-ui` | Verified |
| `mr-IN` | Marathi (मराठी) | Devanagari | LTR | `'Noto Sans Devanagari', system-ui` | Verified |
| `ne-IN` | Nepali (नेपाली) | Devanagari | LTR | `'Noto Sans Devanagari', system-ui` | Verified |
| `or-IN` | Odia (ଓଡ଼ିଆ) | Odia | LTR | `'Noto Sans Odia', system-ui` | Verified |
| `pa-IN` | Punjabi (ਪੰਜਾਬੀ) | Gurmukhi | LTR | `'Noto Sans Gurmukhi', system-ui` | Verified |
| `sa-IN` | Sanskrit (संस्कृतम्) | Devanagari | LTR | `'Noto Sans Devanagari', system-ui` | Verified |
| `sat-IN` | Santali (ᱥᱟᱱᱛᱟᱲᱤ) | Ol Chiki | LTR | `'Noto Sans Ol Chiki', system-ui` | Verified |
| `sd-IN` | Sindhi (سنڌي) | Arabic | **RTL** | `'Noto Naskh Arabic', system-ui` | Verified |
| `ta-IN` | Tamil (தமிழ்) | Tamil | LTR | `'Noto Sans Tamil', system-ui` | Verified |
| `te-IN` | Telugu (తెలుగు) | Telugu | LTR | `'Noto Sans Telugu', system-ui` | Verified |
| `ur-IN` | Urdu (اردو) | Perso-Arabic | **RTL** | `'Noto Nastaliq Urdu', system-ui` | Verified |

---

## 2. Statutory Environmental Terminology Protection

CPCB statutory nomenclature and scientific acronyms are protected across all language catalogs:
- Acronyms ($AQI, PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3, NH_3, Pb$) retain standard international chemical notation alongside native language parenthetical descriptors.
- Category thresholds (Good, Satisfactory, Moderate, Poor, Very Poor, Severe) are accurately translated to match official regional state pollution control board terminology.
- RTL layout mirroring for Urdu, Kashmiri, and Sindhi respects mathematical left-to-right numbers ($280\ \mu\text{g/m}^3$) within right-to-left prose flows.
