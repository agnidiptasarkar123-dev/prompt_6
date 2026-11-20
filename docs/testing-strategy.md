# Comprehensive Testing Strategy & Verification Blueprint

> **Document ID:** HS-TST-001  
> **Status:** Approved Baseline  
> **Target:** Unit, Integration, E2E, Accessibility (WCAG 2.1 AA), and Automated Security Testing ($\ge 3,000$ test cases).

---

## 1. Testing Pyramid & Verification Frameworks

```
                      / \
                     / E2E \       Playwright (Critical user journeys)
                    /-------\
                   /  A11y   \     Axe-Core & Keyboard Nav
                  /-----------\
                 /  Security   \   3,000+ Automated ASVS 5.0.0 Assertions
                /---------------\
               /   Integration   \ Mocked API Contracts & BFF Routes
              /-------------------\
             /        Unit         \ Pure Domain Logic (CPCB, Zod, Routine)
            /-----------------------\
```

### 1.1 Tooling & Runners
- **Test Runner & Engine:** `vitest` (fast ESM-native test runner with coverage via v8).
- **Property-Based Testing:** `fast-check` (generative fuzzing for CPCB breakpoints, routine timelines, and schema boundaries).
- **Security Test Generator:** Custom parameter-driven test suite iterating through OWASP ASVS and injection vectors.
- **Accessibility Testing:** `@axe-core/playwright` and `vitest-axe`.
- **E2E Automation:** `@playwright/test` running across Chromium, WebKit, and Firefox engines.

---

## 2. Test Suites & Coverage Requirements

### 2.1 Unit Testing (Domain Core)
- **CPCB NAQI Engine (`src/domain/cpcb`):**
  - Linear interpolation across all 6 categories (Good, Satisfactory, Moderate, Poor, Very Poor, Severe) for all 8 pollutants.
  - Verification of data sufficiency:
    - 2 pollutants $\to$ return `null` AQI with `INSUFFICIENT_DATA`.
    - 3 pollutants without $PM_{2.5}$ or $PM_{10}$ $\to$ return `null` AQI with `INSUFFICIENT_DATA`.
    - 3 pollutants including $PM_{2.5}$ $\to$ calculate valid AQI.
  - Dominant pollutant selection rules.
- **Dynamic User Context (`src/domain/user-context`):**
  - Validation of valid and malformed household compositions.
  - Vulnerability risk scoring matrix.
- **Daily Routine Planner (`src/domain/routine`):**
  - Timeline boundary calculations (midnight rollover, overlapping intervals).
  - Exposure minimization algorithms vs emission reduction trade-offs.
  - Safety guardrail: Never recommend cycling or jogging when AQI is Severe ($>400$) or Very Poor ($>300$).
- **Indoor Coach (`src/domain/indoor`):**
  - Air changes per hour (ACH) formulas based on room volume and CADR.
  - Cooking hazard penalties based on fuel type and exhaust ventilation.

### 2.2 Integration Testing (API Contracts & External Providers)
- **CPCB / data.gov.in Provider:**
  - Mocked HTTP responses matching actual OGD response schemas.
  - Error recovery: HTTP 429 (rate limited), HTTP 500, socket timeout $\to$ seamless failover to secondary provider.
- **OpenAQ v3 Provider:**
  - Header authentication verification (`X-API-Key`).
  - Coordinate radius query parsing and bounding box tests.
- **Open-Meteo CAMS Forecast Provider:**
  - Parsing 5-day 3-hourly time series.
  - Explicit assertion that output is tagged `MODEL_FORECAST`.
- **AI Inference Pipeline & Fallback:**
  - Mocked Gemini responses parsing through `RecommendationResponseSchema`.
  - Fault injection: Simulate malformed JSON, timeout ($>5000\text{ ms}$), or empty response $\to$ assertion that `DeterministicRecommender` executes and returns valid payload.

### 2.3 Automated Security Test Suite ($\ge 3,000$ Cases)
The security test suite is generated programmatically across 6 distinct categories:

| Test Suite Category | Generator Implementation | Assertion Goal | Case Count Target |
| :--- | :--- | :--- | :--- |
| **Input Fuzzing & Malicious Payloads** | `tests/security/fuzzers/input-fuzzer.test.ts` | Reject SQLi, XSS, command injection, path traversal, and null-byte payloads | 600 |
| **Prompt Injection & LLM Safety** | `tests/security/injection/prompt-injection.test.ts` | Verify prompts cannot be overridden to recommend unsafe physical activity | 550 |
| **Authentication & Token Tampering** | `tests/security/auth/token-tamper.test.ts` | Verify rejection of unsigned, expired, forged, and mutated JWT tokens | 500 |
| **Access Control & IDOR Matrix** | `tests/security/idor/tenant-isolation.test.ts` | Permutate user A attempting to read, update, or delete user B's resources | 500 |
| **CPCB Calculation Edge Cases** | `tests/security/cpcb/boundary-fuzzer.test.ts` | Test exact boundary transitions, float NaN/Infinity, negative concentrations | 500 |
| **Secret Scanning & Bundle Hygiene** | `tests/security/secrets/bundle-scanner.test.ts` | Verify zero leaked env variables or private keys in static assets | 400 |
| **Total Security Assertions** | | | **3,050** |

### 2.4 Accessibility (a11y) Verification
- **Automated Scanning:** Run `axe-core` across all 5 core routes (`/`, `/routine`, `/indoor`, `/settings`, `/auth`).
- **Keyboard Navigation Test Protocol:**
  - All interactive elements must be focusable via `Tab` / `Shift+Tab`.
  - Focus order must match logical reading flow.
  - Modals and slide-overs must trap focus and close on `Escape`.
- **Screen Reader Verification:**
  - Dynamic live AQI updates use `aria-live="polite"`.
  - Color-coded AQI badges include textual severity descriptions (e.g., *"Air Quality: 342, Very Poor"* rather than color alone).
- **Contrast Check:** Minimum contrast ratio of 4.5:1 for standard text and 3:1 for graphical UI elements.

### 2.5 End-to-End System Testing (Playwright)
- **Flow 1: Guest User Journey:** Open app $\to$ select city / station $\to$ view live AQI + CAMS forecast $\to$ plan guest routine $\to$ inspect recommendations $\to$ verify zero cookies stored.
- **Flow 2: Authenticated Household Flow:** Sign in via magic link $\to$ configure multi-gen household (infant + asthmatic adult) $\to$ configure morning commute $\to$ receive tailored schedule shift recommendation $\to$ export data $\to$ delete account.
- **Flow 3: Offline / Stale Data Graceful Degradation:** Simulate network drop $\to$ verify cached station badge displays `STALE` status indicator with precise observation timestamp.

---

## 3. Repository Safeguards & Single-Branch Enforcement

### 3.1 Repository Size Safeguard (<10 MB)
- Script: `scripts/check-repo-size.sh`
- Logic:
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  MAX_SIZE_KB=10240 # 10 MB in KB
  REPO_SIZE_KB=$(git count-objects -v | grep 'size-pack' | awk '{print $2}')
  LOOSE_SIZE_KB=$(git count-objects -v | grep 'size:' | awk '{print $2}')
  TOTAL_SIZE_KB=$((REPO_SIZE_KB + LOOSE_SIZE_KB))

  echo "Current repository size: ${TOTAL_SIZE_KB} KB (Max allowed: ${MAX_SIZE_KB} KB)"

  if [ "${TOTAL_SIZE_KB}" -gt "${MAX_SIZE_KB}" ]; then
    echo "ERROR: Repository size exceeds 10 MB limit!"
    exit 1
  fi
  echo "Repository size check PASSED."
  ```

### 3.2 Single-Branch Enforcement (`main` Only)
- Script: `scripts/verify-single-branch.sh`
- Logic:
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  CURRENT_BRANCH=$(git branch --show-current)
  if [ "${CURRENT_BRANCH}" != "main" ]; then
    echo "ERROR: Working on branch '${CURRENT_BRANCH}'. The project allows exactly one branch: 'main'."
    exit 1
  fi

  # Verify no other remote branches exist
  REMOTE_BRANCHES=$(git branch -r | grep -v 'origin/main' | grep -v 'origin/HEAD' || true)
  if [ -n "${REMOTE_BRANCHES}" ]; then
    echo "ERROR: Remote branches detected other than main: ${REMOTE_BRANCHES}"
    exit 1
  fi
  echo "Single-branch verification PASSED (main only)."
  ```

---

## 4. Quality Gates & Continuous Integration Pipeline

Every commit to `main` must pass the following pipeline in sequence:

```
[ Step 1: Branch & Size Checks ] -> [ Step 2: Linter & Types ] -> [ Step 3: Domain Unit Tests ]
                                                                             │
[ Step 5: Accessibility & E2E ]  <- [ Step 4: 3,000+ Security Assertions ] <-┘
```
Any failure in any step aborts the workflow immediately. No manual overrides allowed.
