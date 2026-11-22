<!-- SPDX-License-Identifier: Apache-2.0 -->
# HawaSaathi Dependency License Inventory & Transitive SBOM

> **Document ID:** HS-LIC-004  
> **Status:** Empirical Audit from `package-lock.json` (Phase 1 Closure)  
> **Total Packages in Dependency Graph:** 507 packages  
> **License Policy:** Strict tracking of direct, transitive, weak-copyleft, and conditional licenses.

---

## 1. Direct Dependencies Inventory (18 Packages)

### 1.1 Production Runtime Dependencies (7 Packages)
| Package | Version | License | SPDX Identifier | Repository | Role in HawaSaathi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `next` | 16.4.6 | MIT | `MIT` | `github.com/vercel/next.js` | Web framework, App Router & BFF server runtime |
| `react` | 19.3.1 | MIT | `MIT` | `github.com/facebook/react` | Component rendering engine |
| `react-dom` | 19.3.1 | MIT | `MIT` | `github.com/facebook/react` | DOM rendering adapter |
| `zod` | 4.6.7 | MIT | `MIT` | `github.com/colinhacks/zod` | Strict runtime boundary schema validation |
| `clsx` | 2.1.1 | MIT | `MIT` | `github.com/lukeed/clsx` | Classname concatenation utility |
| `tailwind-merge` | 2.6.2 | MIT | `MIT` | `github.com/dcastilho/tailwind-merge` | Tailwind utility class deduplication |
| `lucide-react` | 0.460.0 | ISC | `ISC` | `github.com/lucide-icons/lucide` | SVG icon components |

### 1.2 Development & Build Tooling (11 Packages)
| Package | Version | License | SPDX Identifier | Repository | Role in HawaSaathi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `typescript` | 5.9.3 | Apache-2.0 | `Apache-2.0` | `github.com/microsoft/TypeScript` | Strict static typechecker |
| `vitest` | 5.1.1 | MIT | `MIT` | `github.com/vitest-dev/vitest` | Test execution runner |
| `@vitest/coverage-v8` | 5.1.1 | MIT | `MIT` | `github.com/vitest-dev/vitest` | V8 native code coverage instrumentation |
| `eslint` | 9.39.5 | MIT | `MIT` | `github.com/eslint/eslint` | Static code analysis linter |
| `eslint-config-next` | 16.4.6 | MIT | `MIT` | `github.com/vercel/next.js` | ESLint rules for Next.js 16 |
| `tailwindcss` | 3.4.19 | MIT | `MIT` | `github.com/tailwindlabs/tailwindcss` | CSS utility engine |
| `postcss` | 8.5.33 | MIT | `MIT` | `github.com/postcss/postcss` | CSS transformation pipeline |
| `autoprefixer` | 10.7.0 | MIT | `MIT` | `github.com/postcss/autoprefixer` | CSS vendor prefix generation |
| `@types/node` | 22.20.5 | MIT | `MIT` | `github.com/DefinitelyTyped/DefinitelyTyped` | Node.js runtime type definitions |
| `@types/react` | 19.3.0 | MIT | `MIT` | `github.com/DefinitelyTyped/DefinitelyTyped` | React core type definitions |
| `@types/react-dom` | 19.3.0 | MIT | `MIT` | `github.com/DefinitelyTyped/DefinitelyTyped` | React DOM type definitions |

---

## 2. Transitive Dependency Graph License Distribution (507 Total Packages)

An empirical scan of `package-lock.json` across all 507 direct and transitive dependency nodes reveals the following license distribution:

| License Classification | SPDX Identifier | Count | Package Category & Notes |
| :--- | :--- | :---: | :--- |
| **MIT License** | `MIT` | 406 | Permissive; dominant across Next.js, React, and Babel AST ecosystem |
| **Apache License 2.0** | `Apache-2.0` | 37 | Permissive with patent grant; includes TypeScript, SWC core utilities |
| **ISC License** | `ISC` | 22 | Permissive BSD-simplified equivalent; includes Lucide, glob |
| **BSD 2-Clause** | `BSD-2-Clause` | 7 | Permissive; includes web-streams, source-map utilities |
| **BSD 3-Clause** | `BSD-3-Clause` | 2 | Permissive; includes color and selector utilities |
| **0BSD / CC0 1.0** | `0BSD` / `CC0-1.0` | 2 | Public domain equivalents; includes `language-subtag-registry` |
| **Blue Oak Model 1.0.0** | `BlueOak-1.0.0` | 2 | Permissive model license; `@isaacs/nonrecursive-glob-match`, `minimatch` |
| **Python Software Foundation** | `Python-2.0` | 1 | Permissive; `argparse` |
| **Creative Commons Attribution** | `CC-BY-4.0` | 1 | Dataset attribution; `caniuse-lite` (used by Autoprefixer) |
| **Mozilla Public License 2.0** | `MPL-2.0` | 13 | Weak file-level copyleft; `lightningcss` build binaries and `axe-core` |
| **GNU Lesser General Public License** | `LGPL-3.0-or-later` | 10 | Weak copyleft; prebuilt platform shared libraries `@img/sharp-libvips-*` |
| **Dual/Multi-Licensed (LGPL/Apache/MIT)** | Various | 4 | `@img/sharp-win32-*`, `@img/sharp-wasm32` |
| **Unknown / Custom** | `UNKNOWN` | 0 | Zero packages with undefined or missing license metadata |
| **Total Packages** | | **507** | **100% of lockfile dependencies audited** |

---

## 3. Analysis of Non-Permissive & Conditional Licenses

HawaSaathi does NOT claim universal permissive licensing across the transitive tree. The following packages carry conditional or weak-copyleft obligations:

### 3.1 GNU Lesser General Public License (LGPL-3.0-or-later) — 10 Packages
- **Affected Packages:** `@img/sharp-libvips-darwin-arm64`, `@img/sharp-libvips-darwin-x64`, `@img/sharp-libvips-linux-arm64`, `@img/sharp-libvips-linux-x64`, and related platform prebuilt binaries (version `1.3.4`).
- **Nature of Dependency:** Transitive optional platform binaries utilized by Next.js's native image optimization pipeline (via `sharp`).
- **Legal Compliance Analysis:**
  - LGPL-3.0 permits linking with proprietary or Apache-2.0 applications provided the library is dynamically linked as a shared library and users are permitted to replace the LGPL library with a modified version.
  - In Next.js, `sharp-libvips` is bundled as pre-compiled platform binaries outside the application bundle. The HawaSaathi first-party code is NOT a derivative work of libvips and is NOT subjected to reciprocal copyleft.
  - If a static single-binary distribution is created in future phases, compliance with Section 4 of LGPL-3.0 (providing relinking mechanism) must be observed.

### 3.2 Mozilla Public License 2.0 (MPL-2.0) — 13 Packages
- **Affected Packages:** `lightningcss` (version `1.33.0`) and its 11 platform-specific architecture binaries; and `axe-core` (version `4.14.1`).
- **Nature of Dependency:** Development build-time tooling (lightningcss for CSS minification; axe-core for planned accessibility testing).
- **Legal Compliance Analysis:**
  - MPL-2.0 is a file-level copyleft license. It requires that modifications to MPL-licensed source files must be made available under MPL-2.0.
  - HawaSaathi does not modify any source code of `lightningcss` or `axe-core`. None of their code is included in the production client bundle. Therefore, MPL-2.0 imposes zero copyleft obligations on HawaSaathi first-party code.

### 3.3 Creative Commons Attribution 4.0 (CC-BY-4.0) — 1 Package
- **Affected Package:** `caniuse-lite` (version `1.0.30001826`).
- **Nature of Dependency:** Transitive data package consumed by `autoprefixer` / `browserslist` to determine CSS prefixing rules during `next build`.
- **Legal Compliance Analysis:** Requires attribution for the dataset. Satisfied by inclusion in this dependency inventory.

---

## 4. Verification & Audit Summary
- **Strong Copyleft (GPL / AGPL / SSPL):** **0 packages** (Zero viral copyleft dependencies).
- **Vulnerability Status:** `npm audit` confirms **0 vulnerabilities** (0 critical, 0 high, 0 moderate, 0 low).
