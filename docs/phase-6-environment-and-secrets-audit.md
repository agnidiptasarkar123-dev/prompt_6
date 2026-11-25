# HawaSaathi — Phase 6 Environment & Secrets Audit

**Document ID:** `HS-SEC-P6-ENV-2026`\
**Classification:** Internal Engineering Audit\
**Scope:** Client Bundles, Server Runtime, CI/CD, Container Images\

---

## 1. Environment Variable Classification Matrix

All runtime configuration parameters are classified according to sensitivity, execution boundary, and production requirement:

| Variable Name | Boundary | Sensitivity | Required in Prod? | Startup Failure if Missing? | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Server | Public | Yes (`production`) | No (defaults to dev) | Runtime environment selector |
| `PORT` | Server | Public | Yes (defaults to 8080) | No | Cloud Run container ingress port |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client / Browser | Public Non-Secret | Yes | Yes (BFF validation) | Firebase Web Client API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Client / Browser | Public Non-Secret | Yes | Yes | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Client / Browser | Public Non-Secret | Yes | Yes | Firebase project ID (`hawasaathi-5df69`) |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`| Client / Browser | Public Non-Secret | Yes | Yes | Firebase storage bucket domain |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| Client / Browser | Public Non-Secret | Yes | Yes | FCM sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Client / Browser | Public Non-Secret | Yes | Yes | Firebase client application ID |
| `DATA_GOV_IN_API_KEY` | Server-Only | **SECRET** | Yes | Yes | CPCB CAAQMS API key on data.gov.in |
| `OPENAQ_API_KEY` | Server-Only | **SECRET** | Yes | Yes | OpenAQ v3 API access key |
| `GEMINI_API_KEY` | Server-Only | **SECRET** | Yes | Yes | Google Gemini Generative AI key |
| `GEMINI_MODEL` | Server-Only | Config | No | No (defaults to `gemini-3.5-flash-lite`) | Primary LLM model identifier |
| `UPSTASH_REDIS_REST_URL` | Server-Only | **SECRET** | Yes | Yes (in production) | Upstash Redis REST endpoint URL |
| `UPSTASH_REDIS_REST_TOKEN` | Server-Only | **SECRET** | Yes | Yes (in production) | Upstash Redis REST authorization token |
| `FIREBASE_PROJECT_ID` | Server-Only | Config | Yes | Yes | Firebase Admin project ID |
| `FIREBASE_CLIENT_EMAIL` | Server-Only | Config | Optional in Cloud Run | No (uses ADC in Cloud Run) | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Server-Only | **SECRET** | Optional in Cloud Run | No (uses ADC in Cloud Run) | Service account PEM private key |

---

## 2. Server Startup Validation & Secret Leak Prevention

### 2.1 Startup Validation Rules
- In production (`NODE_ENV === "production"`), missing mandatory secrets (`DATA_GOV_IN_API_KEY`, `OPENAQ_API_KEY`, `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) trigger an immediate fail-secure startup abort with a structured error log.
- Secret values are never printed, interpolated, or displayed in error traces. Diagnostic logs state only whether the secret is `CONFIGURED` or `MISSING`.
- No placeholder keys (e.g. `mock-key`, `dummy-token`, `YOUR_KEY_HERE`) are accepted as valid in production runtime.

### 2.2 Client-Side Bundle Screening
- Automated build screening verifies that zero server-side secret variables are bundled into `.next/static` JavaScript chunks.
- Git audit confirms that `.env`, `.env*.local`, and `/secrets/` are strictly ignored by Git and never committed to version control.
