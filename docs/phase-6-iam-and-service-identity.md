# HawaSaathi — Phase 6 IAM & Service Identity Specification

**Document ID:** `HS-SEC-P6-IAM-2026`\
**Google Cloud Project:** `hawasaathi-5df69`\
**Security Standard:** Principle of Least Privilege (PoLP) / CIS GCP Benchmark v2.0\

---

## 1. Cloud Run Runtime Service Account

A dedicated, user-managed service account runs the Cloud Run container:
- **Service Account Email:** `hawasaathi-cloudrun-sa@hawasaathi-5df69.iam.gserviceaccount.com`
- **Application Default Credentials (ADC):** When deployed to Cloud Run, the Google Cloud runtime environment automatically provides credentials for this service identity via the metadata server (`http://metadata.google.internal`).
- **NO Service Account Keys:** Zero static JSON service account keys are mounted into the container or environment. `GOOGLE_APPLICATION_CREDENTIALS` is intentionally left unset in Cloud Run so the SDK uses metadata server ADC.

---

## 2. Least Privilege IAM Role Assignment

The runtime service account is assigned ONLY the following discrete IAM roles:

| IAM Role Name | Role Identifier | Justification & Scope |
| :--- | :--- | :--- |
| **Cloud Datastore User** | `roles/datastore.user` | Grants read/write access to Cloud Firestore documents without administrative schema modification permissions |
| **Secret Manager Secret Accessor** | `roles/secretmanager.secretAccessor` | Allows Cloud Run to resolve secret values (`DATA_GOV_IN_API_KEY`, `OPENAQ_API_KEY`, `GEMINI_API_KEY`, Upstash keys) at container startup |
| **Cloud Logging Log Writer** | `roles/logging.logWriter` | Emits structured JSON application logs to Cloud Logging |
| **Cloud Trace Agent** | `roles/cloudtrace.agent` | Emits latency telemetry and span traces for BFF endpoints |
| **Firebase Authentication Admin** | `roles/firebaseauth.admin` | Required for server-side token verification, session creation, and user deletion revocation |

### Explicitly Prohibited Roles
- **Owner (`roles/owner`):** Strictly prohibited.
- **Editor (`roles/editor`):** Strictly prohibited.
- **Firebase Admin (`roles/firebase.admin`):** Excessive; provides project-wide ownership.
- **Cloud Run Admin (`roles/run.admin`):** Prohibited on runtime identity.
