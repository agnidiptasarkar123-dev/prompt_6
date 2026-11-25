// SPDX-License-Identifier: Apache-2.0
/**
 * scripts/verify-firebase-live.ts
 * Rigorous Firebase Remote Verification.
 * Distinguishes local ADC credential loading from an authenticated remote Firebase service request.
 * Performs a safe, non-destructive, read-only operation to a dedicated test resource.
 * DOES NOT enumerate personal users.
 * DOES NOT create, modify, or delete production accounts or data.
 * DOES NOT print tokens or private credentials.
 */

import fs from "node:fs";
import path from "node:path";
import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleAuth } from "google-auth-library";

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
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        process.env[k] = v;
      }
    }
  }
}

loadEnv();

async function run() {
  console.log("================================================================================");
  console.log("             HAWASAATHI FIREBASE REMOTE AUTHENTICATION AUDIT                    ");
  console.log("================================================================================\n");

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  console.log(`[CONFIG] Configured Project ID: ${projectId}`);
  console.log(`[CONFIG] Service Account Path: ${saPath}`);

  // Step 1: Credential Loading
  console.log("\n--- STEP 1: CREDENTIAL FILE LOADING ---");
  if (!saPath || !fs.existsSync(saPath)) {
    console.log(`[FAIL] Service account credentials file not found at: ${saPath}`);
    return;
  }

  let saJson: ServiceAccount & { project_id?: string; client_email?: string };
  try {
    saJson = JSON.parse(fs.readFileSync(saPath, "utf8")) as ServiceAccount & { project_id?: string; client_email?: string };
    console.log(`[PASS] Service account JSON successfully parsed.`);
    console.log(`[PASS] JSON project_id: ${saJson.project_id}`);
    console.log(`[PASS] JSON client_email: ${saJson.client_email ? saJson.client_email.replace(/^([^@]{3})[^@]+/, "$1***") : "missing"}`);
    if (saJson.project_id !== projectId) {
      console.log(`[WARN] Configured project ID '${projectId}' does not match service account '${saJson.project_id}'!`);
    }
  } catch (err) {
    console.log(`[FAIL] Failed to read/parse service account: ${err}`);
    return;
  }

  // Step 2: Access Token Acquisition via Google OAuth2
  console.log("\n--- STEP 2: OAUTH2 ACCESS TOKEN ACQUISITION ---");
  let tokenExpiryDate: Date | null = null;
  try {
    const auth = new GoogleAuth({
      keyFilename: saPath,
      scopes: [
        "https://www.googleapis.com/auth/cloud-platform",
        "https://www.googleapis.com/auth/firebase",
        "https://www.googleapis.com/auth/datastore"
      ]
    });
    const client = await auth.getClient();
    const accessTokenResponse = await client.getAccessToken();
    const token = accessTokenResponse.token;
    if (token && typeof token === "string" && token.length > 20) {
      tokenExpiryDate = accessTokenResponse.res && "data" in accessTokenResponse.res
        ? new Date((accessTokenResponse.res.data as { expires_in?: number }).expires_in ? Date.now() + ((accessTokenResponse.res.data as { expires_in: number }).expires_in * 1000) : Date.now() + 3600000)
        : new Date(Date.now() + 3600000);
      console.log(`[PASS] Remote OAuth2 Access Token successfully acquired from Google OAuth2 token endpoint!`);
      console.log(`[PASS] Access token format: Bearer token acquired (length: ${token.length} bytes, secret value withheld)`);
      console.log(`[PASS] Token expiration estimated: ${tokenExpiryDate.toISOString()}`);
    } else {
      console.log(`[FAIL] Token response did not contain a valid token string.`);
    }
  } catch (err) {
    console.log(`[FAIL] Access token acquisition failed: ${err}`);
  }

  // Step 3: Remote Firebase Service Authentication & Safe Read-Only Request
  console.log("\n--- STEP 3: REMOTE FIREBASE SERVICE AUTHENTICATION ---");
  const app = !getApps().length ? initializeApp({ credential: cert(saJson), projectId }) : getApps()[0]!;
\
  // Safe Read-only Firestore Query to a dedicated non-existent probe doc: _healthcheck/ping
  console.log("\n[TEST A: CLOUD FIRESTORE REMOTE READ-ONLY QUERY]");
  console.log("Querying dedicated test document: collection('_healthcheck').doc('probe_audit')");
  try {
    const firestore = getFirestore(app);
    const start = Date.now();
    const probeDoc = await firestore.collection("_healthcheck").doc("probe_audit").get();
    const latency = Date.now() - start;
    console.log(`[PASS] Firestore remote query succeeded in ${latency}ms!`);
    console.log(`[PASS] Document exists: ${probeDoc.exists} (expected false for unwritten probe document)`);
    console.log(`[PASS] Server readTime: ${probeDoc.readTime.toDate().toISOString()}`);
    console.log(`[VERDICT] Cloud Firestore remote service authentication: FULLY VERIFIED`);
  } catch (err: unknown) {
    console.log(`[FAIL] Firestore remote read query failed: ${err}`);
  }

  // Safe Read-only Auth Query
  console.log("\n[TEST B: FIREBASE AUTH SERVICE AUTHENTICATION]");
  console.log("Safe read-only check: querying non-existent sentinel user ID '__hs_healthcheck_probe__'");
  try {
    const auth = getAuth(app);
    const start = Date.now();
    try {
      await auth.getUser("__hs_healthcheck_probe__");
      console.log(`[WARN] Unexpected: sentinel user found.`);
    } catch (authErr: unknown) {
      const latency = Date.now() - start;
      const code = (authErr as { code?: string }).code;
      if (code === "auth/user-not-found") {
        console.log(`[PASS] Firebase Auth service authenticated in ${latency}ms.`);
        console.log(`[PASS] Remote service returned 'auth/user-not-found' for probe UID, confirming live API access and search execution.`);
        console.log(`[VERDICT] Firebase Auth remote service authentication: FULLY VERIFIED`);
      } else {
        console.log(`[FAIL] Auth query returned error: ${authErr}`);
      }
    }
  } catch (err) {
    console.log(`[FAIL] Auth check failed: ${err}`);
  }

  console.log("\n================================================================================");
}

run();
