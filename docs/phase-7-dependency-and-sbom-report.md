# Phase 7 — Software Bill of Materials (SBOM) & Dependency Audit

> **Project:** HawaSaathi (হাওয়াসাথী / हवा साथी) — Pan-India Urban Air Quality Intelligence Platform\
> **Milestone:** Phase 7 Release Readiness\
> **Audit Tool:** `npm audit` & Dependency Tree Verification\
> **Audit Status:** 0 Vulnerabilities (0 High, 0 Moderate, 0 Low)

---

## 1. Production Dependency Inventory

| Package Name | Installed Version | License | Direct / Transitive | Purpose |
|:---|:---|:---:|:---:|:---|
| `next` | `16.4.6` | MIT | Direct | Full-stack React framework (App Router, Turbopack, standalone output). |
| `react` | `19.2.4` | MIT | Direct | UI component library runtime. |
| `react-dom` | `19.2.4` | MIT | Direct | React DOM renderer & static markup engine. |
| `@google/genai` | `^0.1.2` | Apache-2.0 | Direct | Official Google GenAI SDK for Gemini multi-model routing. |
| `firebase` | `^11.4.0` | Apache-2.0 | Direct | Client-side Firebase Authentication SDK. |
| `firebase-admin` | `^13.2.0` | Apache-2.0 | Direct | Server-side Firebase Admin SDK for token verification & Firestore. |
| `@upstash/redis` | `^1.34.4` | Apache-2.0 | Direct | Serverless HTTP Redis client for distributed rate limiting & caching. |
| `zod` | `^3.24.2` | MIT | Direct | Schema validation for all external inputs and domain boundaries. |
| `lucide-react` | `^1.16.0` | ISC | Direct | Accessible, lightweight SVG icon system. |

---

## 2. Development & Tooling Dependencies

| Package Name | Installed Version | License | Purpose |
|:---|:---|:---:|:---|
| `typescript` | `^5` | Apache-2.0 | Strict type checker (`strict: true`, `noImplicitAny: true`). |
| `vitest` | `^2.1.8` | MIT | Blazing fast unit and integration test runner. |
| `@vitest/coverage-v8`| `^2.1.8` | MIT | V8 code coverage provider. |
| `eslint` | `^9` | MIT | Static code analysis & code quality linter. |
| `eslint-config-next` | `16.4.6` | MIT | Next.js recommended ESLint configurations. |
| `tailwindcss` | `^4` | MIT | Utility-first CSS engine. |

---

## 3. Dependency Security Verification

Running `npm audit` confirms:
```
found 0 vulnerabilities
```
All production and development dependencies are up to date and verified free of known CVEs.
