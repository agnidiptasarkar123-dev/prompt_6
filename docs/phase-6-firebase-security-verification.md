# HawaSaathi — Phase 6 Firebase & Firestore Security Verification

**Document ID:** `HS-SEC-P6-FIREBASE-2026`\
**Classification:** Security Architecture & Penetration Testing Audit\
**Target:** Firebase Authentication, Cloud Firestore (`hawasaathi-5df69`), Next.js BFF Endpoints\

---

## 1. Multi-Tenant Authorization & IDOR Verification

All profile endpoints (`/api/v1/profile`, `/api/v1/profile?export=json`) enforce authoritative ownership derived exclusively from verified cryptographic Firebase ID tokens or session cookies.

### 1.1 Insecure Direct Object Reference (IDOR) Test Matrix

| Attack Scenario | Injected Payload | Expected Behavior | Observed Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **IDOR Profile Read** | User A authenticated; requests `uid=user-B` | BFF derives `uid` strictly from verified token; ignores client `uid` param | Returns User A data only | **PASSED** |
| **IDOR Profile Update** | User A authenticated; PUT body contains `uid: "user-B"` | Repository forces document write to `/users/<verified_uid>` | Modifies User A only | **PASSED** |
| **IDOR Account Delete** | User A authenticated; sends DELETE request targeting User B | Controller extracts `uid` from token, deletes User A only | User A deleted; User B untouched | **PASSED** |
| **Expired Session Token** | Token issued 2 hours prior with `exp < now` | Token verification throws `auth/id-token-expired` | HTTP 401 Unauthorized | **PASSED** |
| **Tampered JWT Signature**| Valid payload with modified HMAC signature | Verification fails `auth/argument-error` | HTTP 401 Unauthorized | **PASSED** |
| **Revoked Refresh Token** | User signs out or deletes account; token revoked | `verifyIdToken(token, true)` checks revocation list | HTTP 401 Unauthorized | **PASSED** |

---

## 2. Cloud Firestore Production Rules Lockdown

Cloud Firestore rules remain locked in production mode:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false; // Defense-in-depth: Zero direct client mutations
    }
  }
}
```
All read/write operations flow through server-side routes verified by the Firebase Admin SDK.

---

## 3. Data Privacy Lifecycle Verification (DPDP Act 2023)

1. **Guest Mode (Local Only):** Unauthenticated users operate completely within `sessionStorage`. Zero records are persisted to Cloud Firestore.
2. **1-Click Machine-Readable JSON Export:** Tested via `GET /api/v1/profile?export=json`, returning a structured JSON payload with headers:
   - `Content-Type: application/json`
   - `Content-Disposition: attachment; filename="hawasaathi-profile-<uid>.json"`
3. **1-Click Hard Account Deletion:** Tested via `DELETE /api/v1/profile`. Automatically cascades:
   - Deletes `/users/<uid>` Firestore document.
   - Revokes Firebase Authentication user refresh tokens.
   - Clears HTTP-only session cookies.
