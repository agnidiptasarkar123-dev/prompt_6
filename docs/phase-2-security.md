<!-- SPDX-License-Identifier: Apache-2.0 -->
# HawaSaathi Phase 2 Application Security Specification

> **Document ID:** HS-SEC-P2-001  
> **Status:** Phase 2 Complete  
> **Standard:** OWASP ASVS 5.0.0 Level 2  
> **Regulatory Baseline:** DPDP Act 2023 / GDPR Privacy-by-Design  

---

## 1. Security Architecture & Threat Vectors

HawaSaathi enforces defense-in-depth across the entire stack, adhering to OWASP Application Security Verification Standard (ASVS) 5.0.0 Level 2.

```
       [Public Internet Traffic]
                   │
                   ▼
       [Cloudflare / Edge Proxy]
        ├─ DDoS Mitigation
        └─ TLS 1.3 Termination
                   │
                   ▼
     [Next.js BFF Ingress Boundary]
        ├─ Sliding Window Rate Limiting (IP & User Quotas)
        ├─ Session Cookie Validation (HttpOnly, Secure, SameSite=Lax)
        ├─ Zod Schema Boundary Parsing & Type Coercion
        └─ SSRF & Input Coordinate Sanitization
                   │
                   ▼
     [Domain & Application Boundary]
        ├─ UID Ownership Enforcement (IDOR Defense)
        ├─ Gemini Prompt Injection Defenses
        └─ Non-Forgeable Evidence Citations
                   │
                   ▼
       [Data & Credential Store]
        ├─ Firestore Rule Lockdown (allow read, write: if false;)
        └─ Server-Only Secrets Isolation
```

---

## 2. Key ASVS 5.0.0 Level 2 Controls

### 2.1 Ingress Sanitization & SSRF Defense (ASVS V5)
- All coordinates (`latitude`, `longitude`) are strictly validated against geographic ranges ($-90 \le \text{lat} \le 90$, $-180 \le \text{lon} \le 180$).
- URL inputs or external endpoints cannot be injected by client parameters; all upstream HTTP targets are hardcoded to verified provider endpoints.

### 2.2 Mass Assignment & Payload Stripping (ASVS V5.1)
- User profile updates flow through `UpdateProfileRequestSchema`.
- Unwhitelisted properties (`isAdmin`, `role`, `permissions`, `uid`) are stripped or rejected, preventing privilege escalation.

### 2.3 Direct Object Reference (IDOR) Prevention (ASVS V4.1)
- The backend derives the user ID (`uid`) exclusively from verified Firebase session cookies (`verifySessionCookie`).
- Users cannot access, modify, or delete another user's profile or household records.

### 2.4 Prompt Injection Defenses (ASVS V5.3 / LLM Top 10)
- User inputs (household notes, custom routine schedules) are validated against strict character length and schema constraints.
- System prompts explicitly instruct Gemini:
  1. AQI calculation is strictly forbidden; values are immutable.
  2. Medical diagnosis or pharmaceutical prescription is strictly forbidden.
  3. All guidance must cite verified evidence IDs provided in the immutable evidence list.
  4. User prompt injections attempting to override instructions are neutralized by strict JSON output parsing.

### 2.5 Secret Isolation (ASVS V14.2)
- Zero secrets in frontend bundles.
- `NEXT_PUBLIC_` variables are restricted strictly to public client configuration (`FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`).
- API keys (`GEMINI_API_KEY`, `DATA_GOV_IN_API_KEY`, `OPENAQ_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_KEY`) are accessible solely within the Node.js server runtime.

### 2.6 Privacy & Data Minimization (DPDP Act 2023)
- Health data is strictly minimized: zero medical records, diagnostic histories, or clinical identifiers are collected.
- Optional sensitivity checkboxes (e.g. self-reported respiratory sensitivity) are non-diagnostic and stored exclusively under user consent.
- **1-Click Machine-Readable Data Export:** Users can download their complete profile and household data as JSON at any time.
- **1-Click Account Erasure:** Hard delete cascades across all Firestore profile records, immediately invalidating session cookies and tokens.
