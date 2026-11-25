# HawaSaathi — Application Security & Privacy Architecture

> **Focus:** OWASP ASVS 5.0.0 Level 2 Compliance, DPDP Act 2023 Implementation, and Defense-in-Depth

---

## 1. Security Architecture & Identity Protocol

HawaSaathi enforces strict separation of client presentation and authoritative server logic.

### 1.1 Token Verification via Firebase Admin SDK
- The client authenticates using Firebase Auth (Google Sign-In or Passwordless Email Link) to obtain a short-lived Firebase ID token.
- The client exchanges this token via POST `/api/v1/auth/session` for a server-side HttpOnly, Secure, SameSite=Lax session cookie.
- Every protected API route verifies the session cookie using `FirebaseAdminService.verifySessionCookie()`, deriving the caller's `uid` directly from the cryptographic token payload.
- Insecure Direct Object References (IDOR) are impossible: client-supplied query parameters like `targetUid` cannot override the verified token `uid`.

### 1.2 Firestore Defense-in-Depth Access Policy
Cloud Firestore client access rules in `firestore.rules` are configured to:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```
All database queries and mutations flow exclusively through our server-side Next.js BFF routes using the Firebase Admin SDK, ensuring complete authorization enforcement.

---

## 2. Digital Personal Data Protection (DPDP) Act 2023 Compliance

HawaSaathi treats privacy as a fundamental human right:

1. **Local-Only Ephemeral Guest Mode:**
   Visitors can search locations, inspect air quality, run commute exposure scenarios, and use the indoor air coach without authenticating. In guest mode, context is stored strictly in client `sessionStorage` with zero cloud persistence.
2. **Data Minimization:**
   Zero diagnostic medical data is collected. Health context is strictly limited to self-reported, non-diagnostic sensitivity checkboxes (e.g. respiratory sensitivity).
3. **1-Click Machine-Readable Data Export:**
   Authenticated users can download their complete profile, commute preferences, and saved household settings as a structured JSON file at any time (`GET /api/v1/profile?export=json`).
4. **1-Click Cascading Hard Account Deletion:**
   Users can permanently delete their account and associated profile data with a single action (`DELETE /api/v1/profile`). This executes an immediate, irreversible cascading hard delete from Firestore and revokes active Firebase session tokens.
