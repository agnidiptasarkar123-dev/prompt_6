# Phase 5 — Data Privacy, Consent & DPDP Act 2023 Compliance Report
## Regulatory Data Protection, User Rights & Privacy Architecture

> **Document ID:** `HS-P5-PRIV-001`\
> **Timestamp:** `2026-11-24T14:59:00+05:30`\
> **Platform:** HawaSaathi (हवासाथী / হাওয়াসাথী)\
> **Author:** Data Protection Officer & Application Security Lead\
> **Statutory Standards:** India Digital Personal Data Protection (DPDP) Act 2023 & GDPR\
> **Status:** FULLY COMPLIANT\

---

## 1. Regulatory Context & Statutory Commitments

The Indian Digital Personal Data Protection Act (DPDP Act 2023) mandates strict obligations regarding lawful purpose, notice, consent, data minimization, accuracy, storage limitation, and data principal rights. HawaSaathi treats privacy as an essential architectural foundation rather than a legal afterthought.

---

## 2. Core Privacy Tenets & Implementation

### 2.1 Principle of Data Minimisation
- **Zero Medical Diagnostic Data:** HawaSaathi strictly refuses to collect, store, or process medical diagnostic records, clinical histories, or pharmaceutical prescriptions.
- **Non-Diagnostic Sensitivity Indicators:** Health context is limited exclusively to self-reported, non-diagnostic sensitivity checkboxes (e.g., "Respiratory sensitivity", "Cardiovascular sensitivity", "Elderly household member", "Infant/Toddler"). These indicators are used solely to calibrate protective behavioral advice and are never used for advertising, profiling, or third-party sharing.
- **Optional Geolocation:** Users may type or select a monitoring station or city manually. Precise GPS coordinates are never required, and background tracking is strictly forbidden.

### 2.2 Local-Only Guest Mode (Zero Cloud Persistence)
Unauthenticated users (guests) enjoy full platform functionality:
- Live CPCB AQI readings and station maps.
- Daily commute route planning.
- Indoor air quality coach and ventilation guidance.
- Multilingual explanations across all 23 languages.

**Architectural Privacy Guarantee:** For guests, all preferences, selected cities, and sensitivity checkboxes are saved exclusively in the browser's ephemeral `sessionStorage`. Zero data packets containing guest preferences are transmitted to, or persisted within, Cloud Firestore or backend databases. Closing the browser tab irreversibly eliminates all guest state.

### 2.3 1-Click Machine-Readable Data Export
In compliance with Section 12 (Right to access information about personal data) of the DPDP Act 2023 and GDPR Article 20 (Right to data portability):
- Authenticated users can invoke `exportUserData()` in `src/lib/firebase/client.ts` or make an authenticated `GET /api/v1/profile/export` request.
- The system generates a complete, machine-readable JSON document comprising:
  - User identity attributes (UID, email, display name, account creation timestamp).
  - Saved household configuration (commute habits, sensitivity indicators, ventilation types).
  - Saved notification preferences and language preferences.
  - Audit trail of consent grant and update timestamps.

### 2.4 1-Click Cascading Account Deletion
In compliance with Section 12 (Right to correction and erasure of personal data) of the DPDP Act 2023 and GDPR Article 17 (Right to erasure):
- Authenticated users can invoke `deleteAccountAndData()` in `src/lib/firebase/client.ts` or make an authenticated `DELETE /api/v1/profile` request.
- The backend executes an atomic, cascading hard delete:
  1. Purges user document in Cloud Firestore (`users/{uid}`).
  2. Purges subcollections (`users/{uid}/profiles`, `users/{uid}/alerts`).
  3. Deletes the Firebase Auth user record via `firebaseAdmin.auth().deleteUser(uid)`.
  4. Invalidates all active session cookies and tokens.
- Deletion is immediate and irreversible; zero zombie data remains in production databases.

---

## 3. Automated Privacy Lifecycle Verification

The data privacy lifecycle is audited via dedicated automated test suites:
- `tests/unit/privacy/p5-privacy-dpdp-lifecycle.test.ts` (150 tests: `P5-PRIV-001` to `P5-PRIV-150`):
  - Validates `exportUserData` exports complete, well-formed JSON matching the user schema.
  - Validates `deleteAccountAndData` triggers complete Firebase Auth and Firestore record removal.
  - Validates that unauthenticated guest mode operates purely within `sessionStorage`.
  - Asserts that sensitive health categories are never transmitted in network telemetry.
