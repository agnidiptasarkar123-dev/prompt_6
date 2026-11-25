// SPDX-License-Identifier: Apache-2.0
/**
 * scripts/verify-firestore-live.ts
 * Rigorous Live Firestore Remote Infrastructure Verification Suite
 *
 * Tests:
 * 1. Admin SDK Initialisation & ADC Credential Loading
 * 2. Remote Metadata Verification: hawasaathi-5df69, (default), asia-south1
 * 3. Remote CRUD Lifecycle on dedicated test namespace: _hawasaathi_system_verification
 * 4. Client Security Rules Denial: Unauthenticated Client SDK Read & Write Rejection
 * 5. Application ProfileRepository Integration with Synthetic Identity
 * 6. Try/Finally Cleanup Safety & Latency Benchmarks
 *
 * NEVER prints credentials, API keys, private keys, or tokens.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { GoogleAuth } from "google-auth-library";
import { FirebaseAdminService } from "../src/lib/firebase/admin";
import { ProfileRepository } from "../src/services/profiles/profile-repository";
import { initializeApp as initClientApp, deleteApp as deleteClientApp } from "firebase/app";
import { getFirestore as getClientFirestore, doc as clientDoc, getDoc as clientGetDoc, setDoc as clientSetDoc } from "firebase/firestore";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx > -1) {
        const k = trimmed.slice(0, idx).trim();
        let v = trimmed.slice(idx + 1).trim();
        if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("\x27") && v.endsWith("\x27"))) {
          v = v.slice(1, -1);
        }
        process.env[k] = v;
      }
    }
  }
}

loadEnv();

interface VerificationResult {
  step: string;
  status: "PASS" | "FAIL";
  durationMs: number;
  details: string;
}

const results: VerificationResult[] = [];

function recordResult(step: string, status: "PASS" | "FAIL", durationMs: number, details: string) {
  results.push({ step, status, durationMs, details });
  const badge = status === "PASS" ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[FAIL]\x1b[0m";
  console.log(`${badge} ${step} (${durationMs}ms): ${details}`);
}

async function main() {
  console.log("================================================================================");
  console.log("       HAWASAATHI FIREBASE FIRESTORE REMOTE INFRASTRUCTURE VERIFICATION        ");
  console.log("================================================================================\n");

  const projectId = process.env["FIREBASE_PROJECT_ID"] || "hawasaathi-5df69";
  const saPath = process.env["GOOGLE_APPLICATION_CREDENTIALS"] || "./secrets/firebase-service-account.json";

  console.log(`[CONFIG] Project ID: ${projectId}`);
  console.log(`[CONFIG] Target Database: (default)`);
  console.log(`[CONFIG] Target Region: asia-south1 (Mumbai, India)`);
  console.log(`[CONFIG] Service Account Path: ${saPath}\n`);

  // --------------------------------------------------------------------------
  // STEP 1: Admin SDK Initialisation & ADC Credential Loading
  // --------------------------------------------------------------------------
  console.log("--- 1. ADMIN SDK INITIALISATION & ADC CREDENTIAL LOADING ---");
  const t0 = Date.now();
  let adminService: FirebaseAdminService;
  try {
    adminService = FirebaseAdminService.getInstance();
    const isConfigured = adminService.isConfigured();
    if (!isConfigured) {
      throw new Error("FirebaseAdminService reports isConfigured === false");
    }
    recordResult("Admin SDK Initialisation", "PASS", Date.now() - t0, "FirebaseAdminService successfully initialised via ADC");
  } catch (err: unknown) {
    recordResult("Admin SDK Initialisation", "FAIL", Date.now() - t0, err instanceof Error ? err.message : String(err));
    return;
  }

  // --------------------------------------------------------------------------
  // STEP 2: Remote Metadata Verification via Firestore Admin API
  // --------------------------------------------------------------------------
  console.log("\n--- 2. REMOTE METADATA VERIFICATION ---");
  const t1 = Date.now();
  try {
    const auth = new GoogleAuth({
      keyFilename: saPath,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"]
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)`, {
      headers: { Authorization: `Bearer ${token.token}` }
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    const meta = await res.json() as {
      locationId?: string;
      databaseEdition?: string;
      freeTier?: boolean;
      type?: string;
    };
    const location = meta.locationId;
    const edition = meta.databaseEdition;
    const freeTier = meta.freeTier;
    const type = meta.type;
\
    if (location !== "asia-south1") {
      throw new Error(`Location mismatch: expected asia-south1, received ${location}`);
    }
    recordResult(
      "Remote Metadata Request",
      "PASS",
      Date.now() - t1,
      `Location: ${location}, Edition: ${edition}, FreeTier: ${freeTier}, Type: ${type}`
    );
  } catch (err: unknown) {
    recordResult("Remote Metadata Request", "FAIL", Date.now() - t1, err instanceof Error ? err.message : String(err));
  }

  // --------------------------------------------------------------------------
  // STEP 3: Real Remote CRUD Lifecycle on Dedicated Test Namespace
  // --------------------------------------------------------------------------
  console.log("\n--- 3. REMOTE CRUD ON _hawasaathi_system_verification ---");
  const db = adminService.getFirestore();
  const testId = `verify_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const testCollection = "_hawasaathi_system_verification";
  const testDocRef = db.collection(testCollection).doc(testId);

  const initialPayload = {
    testId,
    purpose: "Automated Remote Infrastructure Verification",
    createdAt: new Date().toISOString(),
    projectId,
    verificationVersion: "4.0.0"
  };

  try {
    // 3a. Read non-existent doc (Pre-create probe)
    const tRead0 = Date.now();
    const probe = await testDocRef.get();
    recordResult("Remote Pre-Create Probe", "PASS", Date.now() - tRead0, `Probe doc exists: ${probe.exists} (expected false)`);

    // 3b. Remote Create
    const tWrite = Date.now();
    await testDocRef.set(initialPayload);
    recordResult("Remote Create", "PASS", Date.now() - tWrite, `Created doc ${testCollection}/${testId}`);

    // 3c. Remote Read & Validate
    const tRead = Date.now();
    const readDoc = await testDocRef.get();
    if (!readDoc.exists) throw new Error("Document does not exist after creation");
    const data = readDoc.data();
    if (data?.testId !== testId || data?.projectId !== projectId) {
      throw new Error("Document payload validation mismatch");
    }
    recordResult("Remote Read & Validate", "PASS", Date.now() - tRead, `Retrieved valid document payload in ${Date.now() - tRead}ms`);

    // 3d. Remote Update
    const tUpdate = Date.now();
    await testDocRef.update({
      status: "FIELD_UPDATED_VERIFIED",
      updatedAt: new Date().toISOString()
    });
    recordResult("Remote Update", "PASS", Date.now() - tUpdate, `Updated test document field 'status'`);

    // 3e. Verify Update
    const tReadUpdate = Date.now();
    const updatedDoc = await testDocRef.get();
    if (updatedDoc.data()?.status !== "FIELD_UPDATED_VERIFIED") {
      throw new Error("Updated field did not persist");
    }
    recordResult("Remote Update Verification", "PASS", Date.now() - tReadUpdate, `Confirmed updated field value 'FIELD_UPDATED_VERIFIED'`);

    // 3f. Remote Delete
    const tDelete = Date.now();
    await testDocRef.delete();
    recordResult("Remote Delete", "PASS", Date.now() - tDelete, `Deleted test doc ${testCollection}/${testId}`);

    // 3g. Post-Delete Absence Verification
    const tPostDelete = Date.now();
    const postDeleteDoc = await testDocRef.get();
    if (postDeleteDoc.exists) {
      throw new Error("Document still exists after deletion!");
    }
    recordResult("Post-Delete Absence Verification", "PASS", Date.now() - tPostDelete, `Confirmed document exists === false`);
  } catch (err: unknown) {
    recordResult("CRUD Lifecycle", "FAIL", 0, err instanceof Error ? err.message : String(err));
  } finally {
    // Guaranteed cleanup
    try {
      const check = await testDocRef.get();
      if (check.exists) {
        await testDocRef.delete();
        console.log(`[CLEANUP] Safety cleanup: deleted leftover test doc ${testId}`);
      }
    } catch (cleanErr) {
      console.error(`[CLEANUP ERROR] Failed to clean test doc ${testId}:`, cleanErr);
    }
  }

  // --------------------------------------------------------------------------
  // STEP 4: Client Security Rules Verification (Default Deny All)
  // --------------------------------------------------------------------------
  console.log("\n--- 4. CLIENT SECURITY RULES DENIAL VERIFICATION ---");
  const clientAppId = `client_test_${Date.now()}`;
  let clientApp = null;
  const clientTestId = `rule_probe_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const adminTestDocRef = db.collection(testCollection).doc(clientTestId);

  try {
    // Step 4a: Admin creates document for client read test
    await adminTestDocRef.set({
      testId: clientTestId,
      purpose: "Client Security Rules Denial Test",
      createdAt: new Date().toISOString()
    });

    // Step 4b: Initialise unauthenticated client-side Web SDK
    clientApp = initClientApp({
      apiKey: process.env["NEXT_PUBLIC_FIREBASE_API_KEY"],
      authDomain: process.env["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"],
      projectId: process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"]
    }, clientAppId);

    const clientFirestore = getClientFirestore(clientApp);
    const clientDocRef = clientDoc(clientFirestore, testCollection, clientTestId);

    // Step 4c: Attempt unauthenticated read -> Expect permission-denied
    const tClientRead = Date.now();
    let clientReadDenied = false;
    let readErrorCode = "";
    try {
      await clientGetDoc(clientDocRef);
    } catch (err: unknown) {
      readErrorCode = (err as { code?: string }).code || String(err);
      if (readErrorCode.includes("permission-denied") || readErrorCode.includes("PERMISSION_DENIED")) {
        clientReadDenied = true;
      }
    }

    if (clientReadDenied) {
      recordResult(
        "Client Unauthenticated Read Denial",
        "PASS",
        Date.now() - tClientRead,
        `Unauthenticated client read rejected with '${readErrorCode}' as required by Default Deny All`
      );
    } else {
      recordResult(
        "Client Unauthenticated Read Denial",
        "FAIL",
        Date.now() - tClientRead,
        `CRITICAL SECURITY FINDING: Client read was NOT rejected! Code: ${readErrorCode}`
      );
    }

    // Step 4d: Attempt unauthenticated write -> Expect permission-denied
    const unauthorizedWriteId = `unauth_write_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const unauthClientDocRef = clientDoc(clientFirestore, testCollection, unauthorizedWriteId);
    const tClientWrite = Date.now();
    let clientWriteDenied = false;
    let writeErrorCode = "";
    try {
      await clientSetDoc(unauthClientDocRef, { malicious: true });
    } catch (err: unknown) {
      writeErrorCode = (err as { code?: string }).code || String(err);
      if (writeErrorCode.includes("permission-denied") || writeErrorCode.includes("PERMISSION_DENIED")) {
        clientWriteDenied = true;
      }
    }

    if (clientWriteDenied) {
      recordResult(
        "Client Unauthenticated Write Denial",
        "PASS",
        Date.now() - tClientWrite,
        `Unauthenticated client write rejected with '${writeErrorCode}' as required by Default Deny All`
      );
    } else {
      recordResult(
        "Client Unauthenticated Write Denial",
        "FAIL",
        Date.now() - tClientWrite,
        `CRITICAL SECURITY FINDING: Client write was NOT rejected! Code: ${writeErrorCode}`
      );
    }

    // Step 4e: Verify via Admin SDK that unauthorized document was never created
    const tCheckWrite = Date.now();
    const adminCheck = await db.collection(testCollection).doc(unauthorizedWriteId).get();
    if (!adminCheck.exists) {
      recordResult(
        "Client Write Rejection Verification",
        "PASS",
        Date.now() - tCheckWrite,
        `Admin SDK confirmed rejected write created 0 documents in Firestore`
      );
    } else {
      recordResult(
        "Client Write Rejection Verification",
        "FAIL",
        Date.now() - tCheckWrite,
        `CRITICAL: Unauthorized write document exists in Firestore!`
      );
    }
  } catch (err: unknown) {
    recordResult("Client Security Rules Verification", "FAIL", 0, err instanceof Error ? err.message : String(err));
  } finally {
    // Cleanup admin doc
    try {
      await adminTestDocRef.delete();
    } catch (err) {
      console.error("[CLEANUP] Failed to delete client rule test doc:", err);
    }
    if (clientApp) {
      try {
        await deleteClientApp(clientApp);
      } catch {
        // ignore
      }
    }
  }

  // --------------------------------------------------------------------------
  // STEP 5: Application ProfileRepository Integration with Synthetic Identity
  // --------------------------------------------------------------------------
  console.log("\n--- 5. APPLICATION PROFILE REPOSITORY INTEGRATION ---");
  const synthUid = `synth_verify_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  const repo = new ProfileRepository(adminService);

  try {
    // 5a. Create synthetic profile in Firestore with DPDP consent
    const tRepoCreate = Date.now();
    await repo.saveProfile(
      synthUid,
      {
        preferences: {
          language: "en",
          temperatureUnit: "C",
          notificationsEnabled: true
        },
        savedLocation: {
          name: "Ballygunge CAAQMS",
          city: "Kolkata",
          state: "West Bengal",
          latitude: 22.528,
          longitude: 88.365
        },
        cloudPersistenceConsent: true
      },
      `${synthUid}@verification.internal`
    );
    recordResult(
      "ProfileRepository Create",
      "PASS",
      Date.now() - tRepoCreate,
      `Profile saved to Firestore for UID ${synthUid}`
    );

    // 5b. Retrieve profile from Firestore
    const tRepoGet = Date.now();
    const retrieved = await repo.getProfile(synthUid);
    if (!retrieved || retrieved.uid !== synthUid || retrieved.preferences.notificationsEnabled !== true) {
      throw new Error("Retrieved profile data mismatch or not found in Firestore");
    }
    recordResult(
      "ProfileRepository Retrieve",
      "PASS",
      Date.now() - tRepoGet,
      `Retrieved profile from Firestore (language: ${retrieved.preferences.language}, consent: ${retrieved.cloudPersistenceConsent})`
    );

    // 5c. Update allowed field
    const tRepoUpdate = Date.now();
    const updated = await repo.saveProfile(synthUid, {
      preferences: {
        language: "bn",
        temperatureUnit: "C",
        notificationsEnabled: true
      }
    });
    if (updated.preferences.language !== "bn") {
      throw new Error("Updated field 'language' did not persist");
    }
    recordResult(
      "ProfileRepository Update",
      "PASS",
      Date.now() - tRepoUpdate,
      `Successfully updated profile preference to 'bn' (Bengali)`
    );

    // 5d. Test DPDP Act Consent Guardrail
    const tConsent = Date.now();
    let consentBlocked = false;
    try {
      // Create temporary synthetic user without consent attempting to save household context
      const noConsentUid = `noconsent_${Date.now()}`;
      await repo.saveProfile(noConsentUid, {
        cloudPersistenceConsent: false,
        householdContext: {
          householdId: crypto.randomUUID(),
          updatedAt: new Date().toISOString(),
          preferredLanguage: "en",
          dwelling: {
            dwellingType: "APARTMENT_LOW_RISE",
            floorLevel: 2,
            proximityToMajorRoadMeters: 50,
            cooking: {
              primaryFuel: "LPG",
              kitchenVentilation: "DEDICATED_EXHAUST_OUTSIDE",
              averageDailyCookingHours: 2
            },
            indoorSources: {
              incenseOrDhoopDaily: false,
              mosquitoCoilUsage: false,
              indoorSmoking: false,
              unventedGasHeater: false
            },
            filtration: {
              hasAirPurifier: false,
              purifierLocations: []
            },
            windowSealingQuality: "STANDARD_WINDOWS"
          },
          members: [
            {
              id: "m1",
              nickname: "Adult",
              ageBracket: "ADULT_18_59",
              sensitivities: {
                respiratorySensitivity: true,
                cardiovascularSensitivity: false,
                pregnancy: false,
                allergiesOrSinusitis: false
              },
              dailyOutdoorHoursEstimate: 2
            }
          ],
          routine: [],
          constraints: {
            affordabilityTier: "LOW_COST",
            priorityGoals: ["OPTIMIZE_INDOOR_AIR"]
          }
        }
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("DPDP Act Consent Required")) {
        consentBlocked = true;
      }
    }
    if (consentBlocked) {
      recordResult(
        "DPDP Act Consent Enforcement",
        "PASS",
        Date.now() - tConsent,
        "ProfileRepository rejected household context persistence when cloudPersistenceConsent: false"
      );
    } else {
      recordResult(
        "DPDP Act Consent Enforcement",
        "FAIL",
        Date.now() - tConsent,
        "Failed to enforce DPDP Act consent requirement on sensitive household context"
      );
    }

    // 5e. Delete Profile (Right to be Forgotten)
    const tRepoDelete = Date.now();
    const deleted = await repo.deleteProfile(synthUid);
    if (!deleted) throw new Error("deleteProfile returned false");
\
    // Direct Firestore check to confirm physical document removal
    const docCheck = await db.collection("users").doc(synthUid).get();
    if (docCheck.exists) {
      throw new Error("User document still physically exists in Firestore after deletion!");
    }
    recordResult(
      "ProfileRepository Delete & Deletion Verification",
      "PASS",
      Date.now() - tRepoDelete,
      `Deleted profile and confirmed physical Firestore document absence`
    );
  } catch (err: unknown) {
    recordResult("ProfileRepository Integration", "FAIL", 0, err instanceof Error ? err.message : String(err));
  } finally {
    // Safety cleanup
    try {
      await db.collection("users").doc(synthUid).delete();
    } catch {
      // ignore
    }
  }

  // --------------------------------------------------------------------------
  // STEP 6: Firebase Auth Service Live Verification
  // --------------------------------------------------------------------------
  console.log("\n--- 6. FIREBASE AUTH SERVICE LIVE VERIFICATION ---");
  try {
    const { getAuth } = await import("firebase-admin/auth");
    const adminApp = (adminService as unknown as { app: unknown }).app;
    const auth = getAuth(adminApp as never);
    const tAuth = Date.now();
    try {
      await auth.getUser("__hs_healthcheck_probe__");
      recordResult("Firebase Auth Sentinel Probe", "PASS", Date.now() - tAuth, "Sentinel user found");
    } catch (authErr: unknown) {
      const code = (authErr as { code?: string }).code;
      if (code === "auth/user-not-found") {
        recordResult(
          "Firebase Auth Service Verification",
          "PASS",
          Date.now() - tAuth,
          "Remote service confirmed responsive with auth/user-not-found for sentinel identity"
        );
      } else {
        throw authErr;
      }
    }
  } catch (err: unknown) {
    recordResult("Firebase Auth Service Verification", "FAIL", 0, err instanceof Error ? err.message : String(err));
  }

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("             FIRESTORE VERIFICATION AUDIT SUMMARY MATRIX                        ");
  console.log("================================================================================");
  console.log(
    "| " + "Test Step".padEnd(42) + " | Status | " + "Duration".padStart(9) + " | Details"
  );
  console.log("|-" + "".padEnd(42, "-") + "-|--------|-" + "".padEnd(9, "-") + "-|-" + "".padEnd(30, "-"));
\
  let allPassed = true;
  for (const r of results) {
    if (r.status !== "PASS") allPassed = false;
    const badge = r.status === "PASS" ? "PASS  " : "FAIL  ";
    console.log(
      `| ${r.step.padEnd(42)} | ${badge} | ${(r.durationMs + "ms").padStart(9)} | ${r.details.slice(0, 50)}`
    );
  }
  console.log("================================================================================");

  if (allPassed) {
    console.log("\x1b[32m\nFINAL VERDICT: FIREBASE FULLY VERIFIED\x1b[0m");
    console.log("All remote database, metadata, CRUD, security rules, and profile repository checks PASSED.\n");
  } else {
    console.log("\x1b[31m\nFINAL VERDICT: FIREBASE PARTIALLY VERIFIED OR FAILED\x1b[0m\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL UNCAUGHT ERROR IN VERIFICATION SCRIPT:", err);
  process.exit(1);
});
