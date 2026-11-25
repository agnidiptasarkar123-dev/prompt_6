# HawaSaathi — Phase 4 Cloud Firestore Readiness & Admin Action Guide

> **Document ID:** HAWASAATHI-P4-FIRESTORE-READINESS\
> **Timestamp:** 2026-11-24T10:40:00+05:30\
> **Target Project ID:** `hawasaathi-5df69`\
> **Status:** EXTERNALLY BLOCKED — PENDING PROJECT ADMIN ACTION\
> **Engineering Standard:** OWASP ASVS 5.0.0 Level 2, DPDP Act 2023 Data Residency

---

## 1. Current State & Empirical Diagnostic Evidence

During Phase 3 and Phase 4 live integration probes (`scripts/verify-firebase-live.ts`), the following empirical results were obtained:

1. **Google OAuth2 Service Account Token Acquisition:**
   - Client email: `firebase-adminsdk-fbsvc@hawasaathi-5df69.iam.gserviceaccount.com`
   - Scopes: `https://www.googleapis.com/auth/cloud-platform`, `https://www.googleapis.com/auth/firebase.database`, `https://www.googleapis.com/auth/userinfo.email`
   - Token acquired: **1,024-byte valid Bearer token (PASS)**.
2. **Firebase Auth Remote Probe:**
   - Sentinel UID lookup executed against Google Identity Toolkit.
   - Returned: `auth/user-not-found` (expected for non-existent test probe).
   - Remote Firebase Auth endpoint is **LIVE & REACHABLE (PASS)**.
3. **Cloud Firestore Remote Probe:**
   - Request dispatched to `projects/hawasaathi-5df69/databases/(default)/documents/users/probe_test_user`.
   - Returned:
     ```
     Error: 7 PERMISSION_DENIED: Cloud Firestore API has not been used in project hawasaathi-5df69 before or it is disabled.
     Enable it by visiting https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=hawasaathi-5df69
     then retry. If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry.
     ```

---

## 2. Architectural Demarcation & Integrity Safeguards

In strict compliance with Section 5 of the Phase 4 Specification:

- **No Fake Persistence:** The application does *not* simulate remote persistence when Cloud Firestore is unavailable.
- **Guest Mode Complete Isolation:** Unauthenticated users do not interact with Firestore. All guest routines, filters, and sensitivity settings are kept strictly in ephemeral client memory (`sessionStorage`).
- **Development & Unit Test Isolation:** Unit tests run against isolated mock stores or the in-memory repository without calling production Cloud Firestore.
- **Registered User Handling Under Blocker:** When an authenticated user attempts to save their profile while the Firestore API is disabled, the system reports a transparent `PERSISTENCE_UNAVAILABLE` status rather than claiming the profile was saved remotely.

---

## 3. Step-by-Step Project Admin Action Guide

To enable Cloud Firestore for remote profile persistence, the project administrator must complete the following 6 manual steps in the Google Cloud and Firebase Consoles:

### Step 1: Enable Cloud Firestore API in Google Cloud Console
1. Navigate to:\
   `https://console.cloud.google.com/apis/library/firestore.googleapis.com?project=hawasaathi-5df69`
2. Ensure you are signed in with the Google Account that owns or administers `hawasaathi-5df69`.
3. Click the blue **"ENABLE"** button.
4. Allow 1 to 2 minutes for Google Cloud to propagate the API enablement.

### Step 2: Initialize Cloud Firestore in Firebase Console
1. Open the Firebase Console:\
   `https://console.firebase.google.com/project/hawasaathi-5df69/firestore`
2. Click **"Create database"**.
3. Select **"Native mode"** (recommended for mobile and web applications).
4. Click **"Next"**.

### Step 3: Select Deployment Region (Data Residency Compliance)
1. In the database location dropdown, select:\
   **`asia-south1` (Mumbai, India)**
2. *Justification:* In accordance with the Digital Personal Data Protection (DPDP) Act 2023 and HawaSaathi architecture directives, storing citizen environmental preferences and non-diagnostic sensitivity checkboxes within an Indian data center minimizes data sovereignty risk.
3. Click **"Create"**.

### Step 4: Configure Cloud Firestore Security Rules (Defense-in-Depth)
Because HawaSaathi utilizes a strict Backend-for-Frontend (BFF) architecture where all database operations are performed server-side via the Firebase Admin SDK, direct client access from browsers must be completely blocked:

1. In Firebase Console, go to **Firestore Database** → **Rules**.
2. Replace existing rules with the strict defense-in-depth lockdown rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // All client mutations must route through BFF server endpoints
       match /{document=**} {
         allow read, write: if false;
       }
     }
   }
   ```
3. Click **"Publish"**.

### Step 5: Verify Remote Connectivity
After completing Steps 1–4, run the live verification script:
```bash
node --experimental-strip-types scripts/verify-firebase-live.ts
```
Expected output:
- `[PASS] Successfully wrote test document to Firestore!`
- `[PASS] Successfully retrieved test document from Firestore!`
- `[PASS] Successfully deleted test document from Firestore!`

---

## 4. Acceptance Status Under Blocker

| Scope | Operational Status | Evidence |
| :--- | :--- | :--- |
| **Guest User Mode** | **100% OPERATIONAL** | Ephemeral browser storage only; no cloud persistence required. |
| **Firebase Auth BFF** | **100% OPERATIONAL** | Session verification, token exchange, and UID ownership verified. |
| **Unit Test Suite** | **100% PASS** | 100% passing tests using memory store & mock interfaces. |
| **Remote Firestore Persistence** | **EXTERNALLY BLOCKED** | Awaiting one-click admin API enablement in GCP Console. |

**CONCLUSION:** Cloud Firestore remains an external infrastructure blocker requiring owner action. All non-Firestore product capabilities remain fully operational and verified.
