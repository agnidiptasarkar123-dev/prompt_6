# HawaSaathi — Empirical Evidence Register

> **Index of Verifiable Test Results, Coverage Summaries, and Production Artifacts**

---

## 1. Verifiable Test & Coverage Evidence

| Evidence Item | Source Artifact | Verified Value | Verification Method |
|:---|:---|:---:|:---|
| **Total Passing Tests** | `test-results.json` | **10,077 tests** | `npx vitest run --reporter=json` |
| **Failed / Skipped Tests** | `test-results.json` | **0 failed, 0 skipped** | Automated assertion audit |
| **Total Test Suites** | `test-results.json` | **288 suites** | Full suite execution |
| **Statement Coverage** | `coverage/coverage-summary.json` | **100.00% (2,110 / 2,110)** | Vitest V8 Coverage Engine |
| **Branch Coverage** | `coverage/coverage-summary.json` | **100.00% (1,828 / 1,828)** | Vitest V8 Coverage Engine |
| **Function Coverage** | `coverage/coverage-summary.json` | **100.00% (318 / 318)** | Vitest V8 Coverage Engine |
| **Line Coverage** | `coverage/coverage-summary.json` | **100.00% (2,015 / 2,015)** | Vitest V8 Coverage Engine |
| **Synthetic Pragmas** | Source inspection | **0 ignore directives** | `grep -rn "c8 ignore" src/` |
| **TypeScript Typecheck** | Build runner | **0 errors** | `npx tsc --noEmit` |
| **ESLint Analysis** | Linter runner | **0 errors, 0 warnings** | `npm run lint` |
| **Next.js Standalone Build** | Next.js Turbopack | **Compiled in 424ms** | `npm run build` |
| **Repository Size** | Git database | **4.49 MiB** | `git count-objects -vH` |
| **Single Branch Invariant** | Git reference log | **`main` only** | `git branch -avv` |

---

## 2. Infrastructure & Deployment Artifacts

| Infrastructure Artifact | File Path | Invariant Enforced |
|:---|:---|:---|
| **Cloud Run Service Definition** | `docs/phase-6-cloud-run-deployment.md` | Non-root execution, 512MiB RAM, 1 vCPU, asia-south1. |
| **Dockerfile Standalone Runner** | `Dockerfile` | Multi-stage Alpine container, non-root user `nextjs:nodejs` UID 1001. |
| **Docker Ignore Rules** | `.dockerignore` | Excludes `.git`, `node_modules`, `coverage`, secrets, tests, docs. |
| **Firestore Security Rules** | `docs/phase-6-firebase-security-verification.md` | `allow read, write: if false;` locked client access. |
| **GCP IAM Service Account** | `docs/phase-6-iam-and-service-identity.md` | Least-privilege IAM identity without long-lived keys. |
| **Rollback Runbook** | `docs/phase-6-rollback-runbook.md` | Sub-minute Cloud Run revision rollback protocol. |
| **Observability & Alerting** | `docs/phase-6-observability-and-incident-response.md` | Cloud Monitoring SLO metrics, latency alerts, and runbooks. |
| **Real-World Pilot Protocol** | `docs/phase-6-real-world-pilot-plan.md` | 4-week urban pilot plan across Delhi-NCR, Kolkata, and Mumbai. |
