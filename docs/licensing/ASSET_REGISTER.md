<!-- SPDX-License-Identifier: Apache-2.0 -->
# HawaSaathi Asset & Reference Material Register

> **Document ID:** HS-LIC-005  
> **Status:** Audited Baseline (Phase 1 Closure)

---

## 1. Reference Workbooks & Regulatory Calculations

### 1.1 CPCB AQI Calculation Workbook (`AQI-Calculator.xls`)
- **Asset Name:** `AQI-Calculator.xls`
- **Originating Entity:** Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change (MoEFCC), Government of India.
- **Official Download URL:** `https://cpcb.gov.in/upload/national-air-quality-index/AQI-Calculator.xls`
- **Local Path:** `docs/references/AQI-Calculator.xls`
- **File Format:** Microsoft Excel 97-2004 Compound Binary Document (BIFF8 OLE2)
- **File Size:** 46,080 bytes (45.0 KB)
- **SHA-256 Checksum:** `92eb788f7f61bd46edea1814a9e1b8f5dd75d05dfb88f34a460905bc07bd151a`
- **Verification Timestamp:** `2026-11-20T18:44:00Z UTC`
- **Legal & Redistribution Status:**
  - This workbook is an official government reference tool published by CPCB for calculating AQI.
  - It is **NOT** authored by HawaSaathi contributors and is **NOT** licensed under the project's Apache License 2.0.
  - The repository does not assert blanket fair-dealing or automatic redistribution rights. The binary file is retained in the local development repository strictly as an empirical reference asset for independent formula verification during architectural and domain audits.
  - **Zero Binary Dependency:** All mathematical formulas, cell coordinates, and conditional branches have been fully transcribed and verified in [cpcb-calculator-verification.md](file:///Users/agnidiptasarkar/Desktop/prompt_6/docs/references/cpcb-calculator-verification.md). HawaSaathi's TypeScript calculation engine operates independently of this binary file.
  - In the event of public repository publication, if explicit redistribution permission cannot be confirmed from CPCB, this binary file will be removed from Git tracking and replaced with automated download instructions pointing to the official CPCB URL.

---

## 2. Regulatory Technical Reports & Public Health Advisories

### 2.1 CPCB National Air Quality Index Final Report
- **Asset Name:** *National Air Quality Index* (Publication No. CUPS/82/2014-15)
- **Originating Entity:** Central Pollution Control Board, MoEFCC, New Delhi (October 2014).
- **Official URL:** `https://cpcb.gov.in/upload/national-air-quality-index/Report-on-National-Air-Quality-Index.pdf`
- **Legal Status:** Statutory government technical report establishing the National Air Quality Index. Referenced as the authoritative specification for Breakpoints Table 3.11, sub-index formulas, and 16-hour data completeness rules. Not licensed under Apache-2.0.

### 2.2 NCDC Health Advisory on Air Pollution
- **Asset Name:** *National Programme on Climate Change and Human Health (NPCCHH)* Guidelines on Air Pollution
- **Originating Entity:** National Centre for Disease Control (NCDC), Directorate General of Health Services, Ministry of Health & Family Welfare, Government of India (October 2025 Advisory).
- **Legal Status:** Official public health guidance. Referenced for medical safety thresholds, vulnerable population categories, diurnal pollution peak timing, and combustion avoidance rules. Not licensed under Apache-2.0.

---

## 3. UI Icons & Graphical Assets

### 3.1 Lucide Icon Components
- **Provider:** Lucide Project (`lucide-react` npm package)
- **License:** ISC License (`ISC`), permissive open source
- **Scope:** SVG icon primitives rendered in UI scaffolding

### 3.2 Typography & Fonts
- **Font Stack:** Native system font stack (`Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`) configured through Tailwind CSS.
- **Repository Invariant:** Zero binary font files (`.ttf`, `.woff`, `.woff2`) are committed to the repository, preserving the strict $<10\text{ MB}$ repository limit.
