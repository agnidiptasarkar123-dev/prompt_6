// SPDX-License-Identifier: Apache-2.0
import { FirebaseAdminService, globalFirebaseAuth } from "@/lib/firebase/admin";
import {
  UserProfileSchema,
  type UserProfile,
  type UpdateProfileRequest
} from "@/schemas/user-profile.schema";

export class ProfileRepository {
  private readonly firebaseAdmin: FirebaseAdminService;
  private readonly memoryStore = new Map<string, UserProfile>();

  constructor(firebaseAdmin: FirebaseAdminService = globalFirebaseAuth) {
    this.firebaseAdmin = firebaseAdmin;
  }

  public async getProfile(uid: string): Promise<UserProfile | null> {
    if (this.firebaseAdmin.isConfigured()) {
      try {
        const db = this.firebaseAdmin.getFirestore();
        const doc = await db.collection("users").doc(uid).get();
        if (!doc.exists) return null;
        return UserProfileSchema.parse(doc.data());
      } catch {
        // Fall back to memory store on network error
      }
    }

    return this.memoryStore.get(uid) || null;
  }

  public async saveProfile(
    uid: string,
    updates: UpdateProfileRequest,
    email?: string,
    displayName?: string
  ): Promise<UserProfile> {
    const existing = await this.getProfile(uid);
    const now = new Date().toISOString();

    const consentGiven = updates.cloudPersistenceConsent ?? existing?.cloudPersistenceConsent ?? false;

    // DPDP Act 2023 safeguard: Sensitive household context requires consent
    if (updates.householdContext && !consentGiven) {
      throw new Error(
        "DPDP Act Consent Required: Cannot persist sensitive household context without explicit cloudPersistenceConsent."
      );
    }

    const merged: UserProfile = {
      uid,
      email: email || existing?.email,
      displayName: displayName || existing?.displayName,
      preferences: updates.preferences || existing?.preferences || {
        language: "en",
        temperatureUnit: "C",
        notificationsEnabled: false
      },
      savedLocation: updates.savedLocation || existing?.savedLocation,
      householdContext: updates.householdContext !== undefined ? updates.householdContext : existing?.householdContext,
      routine: updates.routine !== undefined ? updates.routine : existing?.routine,
      cloudPersistenceConsent: consentGiven,
      consentTimestamp: consentGiven ? (existing?.consentTimestamp || now) : undefined,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    const validated = UserProfileSchema.parse(merged);

    if (this.firebaseAdmin.isConfigured()) {
      try {
        const db = this.firebaseAdmin.getFirestore();
        await db.collection("users").doc(uid).set(validated, { merge: true });
        return validated;
      } catch {
        // Store in memory if firestore fails
      }
    }

    this.memoryStore.set(uid, validated);
    return validated;
  }

  public async deleteProfile(uid: string): Promise<boolean> {
    let deleted = false;
    if (this.firebaseAdmin.isConfigured()) {
      try {
        const db = this.firebaseAdmin.getFirestore();
        await db.collection("users").doc(uid).delete();
        deleted = true;
      } catch {
        // ignore
      }
    }
    const memDeleted = this.memoryStore.delete(uid);
    return deleted || memDeleted;
  }

  public async exportProfileData(uid: string): Promise<UserProfile | null> {
    return this.getProfile(uid);
  }
}

export const globalProfileRepository = new ProfileRepository();
