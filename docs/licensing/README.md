<!-- SPDX-License-Identifier: Apache-2.0 -->
# HawaSaathi Licensing & Legal Compliance Framework

> **Document ID:** HS-LIC-001  
> **Status:** Audited Baseline (Phase 1 Closure)

---

## 1. First-Party Application Code
- **License:** Apache License 2.0 (`Apache-2.0`).
- **SPDX Identifier:** `Apache-2.0`.
- **License File:** Full verbatim official text is tracked in the repository root at [LICENSE](file:///Users/agnidiptasarkar/Desktop/prompt_6/LICENSE).
- **Scope:** Covers all first-party TypeScript application software, domain calculation engines, schema definitions, recommendation rules, test suites, and documentation authored by HawaSaathi contributors.
- **Source Headers:** Every first-party source file in `src/` and test file in `tests/` carries the standard identifier:
  ```typescript
  // SPDX-License-Identifier: Apache-2.0
  ```
- **Copyright Integrity:** No placeholder copyright owners or simulated corporate entities have been invented.
- **Third-Party Exclusions:** The Apache-2.0 license applies strictly to original first-party code; it does NOT grant rights to third-party datasets, external API feeds, official government reports, map cartography, or bundled libraries.

---

## 2. Licensing Documentation Architecture

The HawaSaathi legal compliance framework is partitioned into four dedicated registers:

1. [DATA_SOURCE_REGISTER.md](file:///Users/agnidiptasarkar/Desktop/prompt_6/docs/licensing/DATA_SOURCE_REGISTER.md):  
   Exhaustive legal status, data license terms, mandatory attribution strings, commercial usage restrictions, and caching requirements for all external ambient data providers (CPCB, data.gov.in, OpenAQ, Open-Meteo, OSM, Stadia Maps, CARTO, and WAQI).
2. [THIRD_PARTY_NOTICES.md](file:///Users/agnidiptasarkar/Desktop/prompt_6/docs/licensing/THIRD_PARTY_NOTICES.md):  
   Mandatory copyright notices, statutory citations, and public attributions for government standards and third-party services.
3. [DEPENDENCY_LICENSES.md](file:///Users/agnidiptasarkar/Desktop/prompt_6/docs/licensing/DEPENDENCY_LICENSES.md):  
   Complete empirical Software Bill of Materials (SBOM) covering all 18 direct packages and 507 transitive packages in the dependency tree, including analysis of LGPL-3.0 and MPL-2.0 components.
4. [ASSET_REGISTER.md](file:///Users/agnidiptasarkar/Desktop/prompt_6/docs/licensing/ASSET_REGISTER.md):  
   Provenance, checksums, and redistribution status of reference workbooks (`AQI-Calculator.xls`), government technical reports, guidelines, and graphical assets.
