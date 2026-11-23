<!-- SPDX-License-Identifier: Apache-2.0 -->
# HawaSaathi Phase 2 Authentication & Session Architecture

> **Document ID:** HS-AUTH-P2-001  
> **Status:** Phase 2 Complete  
> **Technologies:** Firebase Auth (Client & Admin SDK), HttpOnly Session Cookies  
> **Compliance:** OWASP ASVS 5.0.0 Level 2, DPDP Act 2023  

---

## 1. Authentication Strategy

HawaSaathi adopts a hybrid **Guest-First / BFF-Secured Session Cookie** architecture:

```
[Unauthenticated User (Guest)] ───────────► Client-Side Ephemeral Storage (sessionStorage)
                                             └─ Zero Cloud DB Writes
                                             └─ Real-time AQI, Maps, Forecast, Indoor Coach

[Authenticated User] ─────────────────────► Firebase Client SDK (Google Sign-In / Magic Link)
                                             │  Returns ID Token
                                             ▼
                                      POST /api/v1/auth/session
                                             │  Verifies ID Token via Firebase Admin
                                             │  Issues 5-Day HttpOnly Session Cookie (hs_session)
                                             ▼
                                      BFF API Routes (/api/v1/profile, /api/v1/recommendations)
                                             └─ verifySessionCookie(checkRevoked=true)
                                             └─ Server-Side Firestore Access (allow read, write: if false;)
```

---

## 2. Session Lifecycle & Security Attributes

### 2.1 Session Cookie Specification
- **Cookie Name:** `hs_session`
- **Lifetime:** 5 days ($432,000,000\text{ ms}$).
- **Security Flags:**
  - `httpOnly: true` (prevents XSS access to authentication token).
  - `secure: true` (enforced in production HTTPS).
  - `sameSite: "lax"` (mitigates Cross-Site Request Forgery - CSRF).
  - `path: "/"` (scoped to entire application domain).

### 2.2 Token Verification & Revocation
- In every authenticated request, the BFF route verifies the session cookie using `verifySessionCookie(cookie, true)`.
- Setting `checkRevoked: true` ensures that if a user changes passwords, logs out, or deletes their account, all issued session cookies are immediately invalidated across all devices.
- On logout (`DELETE /api/v1/auth/session`), `revokeRefreshTokens(uid)` is invoked before clearing the cookie with `maxAge: 0`.

---

## 3. Defense-in-Depth Cloud Firestore Security Rules

To ensure zero unauthorized client writes or data leakage:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Defense-in-depth: All client reads and writes are strictly forbidden.
    // All profile mutations and queries flow exclusively through verified BFF API routes.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 4. Guest Mode Architecture

1. **Storage Mechanism:** Client `sessionStorage`.
2. **Data Scope:** Selected language (`en`, `bn`, `hi`), temporary saved coordinates, optional dwelling notes.
3. **Isolation Guarantee:** Unauthenticated requests never invoke Firestore repositories or mutate server-side state.
4. **Transition to Authenticated:** Upon successful login, the frontend can migrate client `sessionStorage` context to the server profile via `PUT /api/v1/profile`.
