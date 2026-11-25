# Phase 5 — Localisation Architecture Specification
## Complete Linguistic Infrastructure for English and the 22 Eighth Schedule Indian Languages

> **Document ID:** `HS-P5-LOC-001`\
> **Timestamp:** `2026-11-24T14:46:00+05:30`\
> **Platform:** HawaSaathi (हवासाथी / হাওয়াসাথী)\
> **Author:** Principal Software Architect, Internationalisation Systems Engineer & UX Lead\
> **Status:** APPROVED & DEPLOYED\

---

## 1. Localisation Mission & Overview

India's environmental crisis directly impacts hundreds of millions of citizens whose primary language is not English or Hindi. Delivering critical, actionable air quality health guidance in a citizen's native mother tongue is not merely an aesthetic feature—it is a vital public health imperative.

Phase 5 establishes a **first-class national localisation architecture** supporting **English (`en-IN`) plus all 22 official languages listed in the Eighth Schedule of the Constitution of India**:
1. Assamese (`as-IN`)
2. Bengali (`bn-IN`)
3. Bodo (`brx-IN`)
4. Dogri (`doi-IN`)
5. Gujarati (`gu-IN`)
6. Hindi (`hi-IN`)
7. Kannada (`kn-IN`)
8. Kashmiri (`ks-IN`)
9. Konkani (`kok-IN`)
10. Maithili (`mai-IN`)
11. Malayalam (`ml-IN`)
12. Manipuri / Meitei (`mni-IN`)
13. Marathi (`mr-IN`)
14. Nepali (`ne-IN`)
15. Odia (`or-IN`)
16. Punjabi (`pa-IN`)
17. Sanskrit (`sa-IN`)
18. Santali (`sat-IN`)
19. Sindhi (`sd-IN`)
20. Tamil (`ta-IN`)
21. Telugu (`te-IN`)
22. Urdu (`ur-IN`)
23. English (`en-IN`)

---

## 2. Architectural Design & Directory Hierarchy

The localisation subsystem is intentionally engineered without heavy third-party framework dependencies to maximize client performance, prevent hydration mismatches, and enable seamless, zero-state headless testing.

```
src/i18n/
├── glossary.ts             # Authoritative environmental technical terminology mapping across all 23 languages
├── locale-registry.ts      # Canonical BCP 47 metadata, scripts, typography, and writing directions
├── translations.ts         # Runtime translator functions, legacy compatibility mappings, and ICU formatters
└── locales/
    ├── index.ts            # Strongly typed index exporting all compiled locale catalogs
    ├── en-IN.json          # Canonical English dictionary (52 keys)
    ├── as-IN.json          # Assamese catalog (52 keys)
    ├── bn-IN.json          # Bengali catalog (52 keys)
    ├── brx-IN.json         # Bodo catalog (52 keys)
    ├── doi-IN.json         # Dogri catalog (52 keys)
    ├── gu-IN.json          # Gujarati catalog (52 keys)
    ├── hi-IN.json          # Hindi catalog (52 keys)
    ├── kn-IN.json          # Kannada catalog (52 keys)
    ├── ks-IN.json          # Kashmiri catalog (52 keys)
    ├── kok-IN.json         # Konkani catalog (52 keys)
    ├── mai-IN.json         # Maithili catalog (52 keys)
    ├── ml-IN.json          # Malayalam catalog (52 keys)
    ├── mni-IN.json         # Manipuri catalog (52 keys)
    ├── mr-IN.json          # Marathi catalog (52 keys)
    ├── ne-IN.json          # Nepali catalog (52 keys)
    ├── or-IN.json          # Odia catalog (52 keys)
    ├── pa-IN.json          # Punjabi catalog (52 keys)
    ├── sa-IN.json          # Sanskrit catalog (52 keys)
    ├── sat-IN.json         # Santali catalog (52 keys)
    ├── sd-IN.json          # Sindhi catalog (52 keys)
    ├── ta-IN.json          # Tamil catalog (52 keys)
    ├── te-IN.json          # Telugu catalog (52 keys)
    └── ur-IN.json          # Urdu catalog (52 keys)
```

---

## 3. Canonical Locale Registry (`locale-registry.ts`)

Every supported locale is defined by strict TypeScript interfaces specifying script classification, writing direction, typography fallback stacks, and CPCB category labels.

```typescript
export interface LocaleMetadata {
  code: SupportedLocale;
  bcp47: string;
  name: string;
  nativeName: string;
  script: string;
  direction: 'ltr' | 'rtl';
  fontFamily: string;
  cpcbCategories: {
    good: string;
    satisfactory: string;
    moderate: string;
    poor: string;
    veryPoor: string;
    severe: string;
  };
}
```

### 3.1 Script & Direction Categorization
- **Right-to-Left (RTL):**
  - **Urdu (`ur-IN`):** Arabic / Nastaliq script (`direction: "rtl"`)
  - **Kashmiri (`ks-IN`):** Perso-Arabic script (`direction: "rtl"`)
  - **Sindhi (`sd-IN`):** Perso-Arabic script (`direction: "rtl"`)
- **Left-to-Right (LTR):**
  - **Devanagari:** Hindi, Marathi, Sanskrit, Maithili, Dogri, Bodo, Konkani, Nepali
  - **Bengali-Assamese:** Bengali, Assamese, Manipuri
  - **Dravidian:** Tamil, Telugu, Kannada, Malayalam
  - **Gurmukhi:** Punjabi
  - **Gujarati:** Gujarati
  - **Odia:** Odia
  - **Ol Chiki:** Santali
  - **Latin:** English

---

## 4. Key Parity & Catalog Integrity Contract

1. **52 Mandatory Translation Keys:**
   Every single catalog implements the exact same 52 keys across 6 distinct functional domains:
   - `common.*` (brand, loading, error, refresh, language selector)
   - `nav.*` (live AQI, routine planner, indoor coach, alerts, profile, sign in, sign out)
   - `aqi.*` (index title, prominent pollutant, updated at, CPCB categories)
   - `indoor.*` (air coach, ventilation advice, purifier CADR, cooking guidance)
   - `routine.*` (commute planner, outdoor exercise windows, mask recommendations)
   - `privacy.*` (export data, delete account, guest mode, DPDP consent)
2. **Zero Synthetic Stubs:** No catalog contains placeholder text (`"TODO"`, `"[MISSING]"`) or falls back to English without explicit configuration.
3. **Automated Key Parity Verification:** Unit test `P5-CAT-001` to `P5-CAT-250` mathematically asserts that for every locale $L$ and key $K \in \text{Keys}(\text{en-IN})$, $K \in \text{Keys}(L)$ and $\text{length}(L[K]) > 0$.

---

## 5. Bidirectional (RTL) Layout & Typography Engineering

For RTL languages (Urdu, Kashmiri, Sindhi), the client layout automatically switches document and container writing directions:
1. **Dynamic HTML Tag Attributes:** `dir="rtl"` and `lang="ur-IN"` applied to root or sub-container.
2. **CSS Logical Properties:** Layouts utilize `margin-inline-start`, `padding-inline-end`, `inset-inline-start`, and `text-align: start` instead of legacy physical properties (`left`, `right`).
3. **Typography Stacks:** Tailored system font stacks ensure pristine rendering across complex Indic conjuncts and Nastaliq ligatures:
   - Urdu: `'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', sans-serif`
   - Bengali: `'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif`
   - Tamil: `'Noto Sans Tamil', 'Latha', 'Tamil Sangam MN', sans-serif`
   - Telugu: `'Noto Sans Telugu', 'Gautami', 'Vani', sans-serif`
   - Ol Chiki: `'Noto Sans Ol Chiki', sans-serif`

---

## 6. Build-Time Translation Pipeline (`scripts/i18n/generate-translations.ts`)

A dedicated build-time translation and validation script guarantees continuous linguistic synchronization:
- Validates structural schema of all `.json` files.
- Inspects against the authoritative environmental glossary (`src/i18n/glossary.ts`).
- Detects untranslated English leakage into regional catalogs.
- Can be triggered as a pre-commit or pre-build step via `npm run i18n:validate`.
