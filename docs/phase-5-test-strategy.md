# Phase 5 — Quality Assurance & Comprehensive Test Strategy
## Architecture of the 6,243 Automated Test Battery

> **Document ID:** `HS-P5-STRAT-001`\
> **Timestamp:** `2026-11-24T15:05:00+05:30`\
> **Platform:** HawaSaathi (हवासाथी / হাওয়াসাথী)\
> **Author:** Quality Engineering Lead & Principal Software Architect\
> **Total Test Count:** 6,243 Passing Tests Across 64 Test Suites\
> **Status:** RATIFIED & ENFORCED\

---

## 1. Testing Philosophy & Guiding Principles

HawaSaathi's quality engineering framework enforces zero-tolerance for untested assumptions:
1. **Mathematical Purity:** CPCB sub-index formulas, linear interpolation equations, and data sufficiency rules are tested against exact official gazette tables with zero mocking of math logic.
2. **Defensive Boundary Validation:** Every external network response, user input, and database record passes through strict Zod schemas with adversarial fuzzing.
3. **No Mocking in Security Tests:** Security assertions evaluate real cryptographic token decoders, HTTP request dispatchers, and rate limiters.
4. **Zero Flakiness:** All 6,243 tests execute deterministically in single-digit seconds without timer delays or unhandled asynchronous race conditions.

---

## 2. Test Pyramid & Distribution

```
                                  ▲
                                 / \
                                / E2E\        10 Browser E2E Workflows (Desktop & Mobile)
                               /------\
                              /  Int   \      450 Cross-Locale, Workflow & Lifecycle Tests
                             /----------\
                            /  Security  \    3,200+ ASVS 5.0.0 L2, Fuzzing & Boundary Tests
                           /--------------\
                          /   Domain &     \  2,583 CPCB Formula, Adapters, AI Grounding,
                         /     Unit Tests   \       i18n Catalogs, Typography & Redis Tests
                        /--------------------\
```

---

## 3. Specialized Test Categories

### 3.1 CPCB Scientific & Domain Correctness Tests
- Linear piecewise interpolation across all 8 pollutants ($PM_{10}, PM_{2.5}, NO_2, SO_2, CO, O_3, NH_3, Pb$).
- 16-hour sufficiency rule for 24-hour parameters; 6-hour sufficiency rule for 8-hour parameters.
- Station AQI invalidation when $<3$ valid pollutants or missing particulates.
- Breakpoint boundary testing ($C_p$ exactly on breakpoint, slightly below, slightly above).

### 3.2 Multilingual i18n & Typography Tests
- Catalog completeness (52/52 keys across all 23 languages).
- Environmental glossary terminology compliance.
- RTL layout direction validation (Urdu, Kashmiri, Sindhi).
- Unicode script validation (Devanagari, Gurmukhi, Bengali, Ol Chiki, Tamil, etc.).

### 3.3 OWASP ASVS 5.0.0 Level 2 Security Tests
- Cryptographic session verification and cookie attributes (`HttpOnly`, `SameSite=Strict`, `Secure`).
- IDOR prevention and UID spoofing rejection.
- Firestore client access lockout (`allow read, write: if false;`).
- Ingress input fuzzing, prototype pollution, and prompt injection defense.
- In-memory and Upstash Redis rate limiting.

### 3.4 DPDP Act 2023 / GDPR Privacy Tests
- 1-Click machine-readable JSON data export (`exportUserData`).
- 1-Click cascading account hard deletion (`deleteAccountAndData`).
- Ephemeral guest mode zero-cloud persistence in `sessionStorage`.

---

## 4. Test Execution & Quality Gates

The continuous integration pipeline enforces three unbreakable gates:
1. `npm run typecheck` $\to$ Exit code 0, zero TypeScript errors (`strict: true`).
2. `npm run lint` $\to$ Exit code 0, zero ESLint warnings or errors.
3. `npm test` $\to$ Exit code 0, 100% of 6,243 tests passing.
