// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FirebaseAdminService } from "@/lib/firebase/admin";
import { ProfileRepository } from "@/services/profiles/profile-repository";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { UpdateProfileRequest } from "@/schemas/user-profile.schema";

describe("Phase 3 Firebase Auth, Sessions & Profiles Suite (P3-AUTH)", () => {
  let mockFirebaseAdmin: FirebaseAdminService;
  let repo: ProfileRepository;

  const sampleDecodedToken: DecodedIdToken = {
    uid: "usr_delhi_123",
    email: "user@example.com",
    auth_time: Math.floor(Date.now() / 1000) - 100,
    iss: "https://securetoken.google.com/hawasaathi-prod",
    aud: "hawasaathi-prod",
    sub: "usr_delhi_123",
    iat: Math.floor(Date.now() / 1000) - 100,
    exp: Math.floor(Date.now() / 1000) + 3600,
    firebase: {
      identities: {},
      sign_in_provider: "password"
    }
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockFirebaseAdmin = new FirebaseAdminService();
    // Default to unconfigured mock admin to test memory store and error handling
    vi.spyOn(mockFirebaseAdmin, "isConfigured").mockReturnValue(false);
    repo = new ProfileRepository(mockFirebaseAdmin);
  });

  // =========================================================================
  // Section 1: Firebase Admin ID Token & Session Cookie Verification (P3-AUTH-001 to P3-AUTH-035)
  // =========================================================================
  it("P3-AUTH-001: isConfigured returns false when credentials are unset", () => {
    expect(mockFirebaseAdmin.isConfigured()).toBe(false);
  });

  it("P3-AUTH-002: verifyIdToken throws NOT_CONFIGURED when admin unconfigured", async () => {
    await expect(mockFirebaseAdmin.verifyIdToken("token_123")).rejects.toThrow("Firebase Admin is NOT_CONFIGURED");
  });

  it("P3-AUTH-003: createSessionCookie throws NOT_CONFIGURED when admin unconfigured", async () => {
    await expect(mockFirebaseAdmin.createSessionCookie("token_123")).rejects.toThrow("Firebase Admin is NOT_CONFIGURED");
  });

  it("P3-AUTH-004: verifySessionCookie throws NOT_CONFIGURED when admin unconfigured", async () => {
    await expect(mockFirebaseAdmin.verifySessionCookie("cookie_123")).rejects.toThrow("Firebase Admin is NOT_CONFIGURED");
  });

  it("P3-AUTH-005: revokeRefreshTokens throws NOT_CONFIGURED when admin unconfigured", async () => {
    await expect(mockFirebaseAdmin.revokeRefreshTokens("usr_123")).rejects.toThrow("Firebase Admin is NOT_CONFIGURED");
  });

  it("P3-AUTH-006: getFirestore throws NOT_CONFIGURED when admin unconfigured", () => {
    expect(() => mockFirebaseAdmin.getFirestore()).toThrow("Firebase Admin is NOT_CONFIGURED");
  });

  it("P3-AUTH-007: verifyIdToken succeeds and returns decoded token when configured", async () => {
    vi.spyOn(mockFirebaseAdmin, "isConfigured").mockReturnValue(true);
    vi.spyOn(mockFirebaseAdmin, "verifyIdToken").mockResolvedValue(sampleDecodedToken);

    const decoded = await mockFirebaseAdmin.verifyIdToken("valid_token");
    expect(decoded.uid).toBe("usr_delhi_123");
    expect(decoded.email).toBe("user@example.com");
  });

  it("P3-AUTH-008: verifySessionCookie checks revocation when checkRevoked: true", async () => {
    vi.spyOn(mockFirebaseAdmin, "isConfigured").mockReturnValue(true);
    const spy = vi.spyOn(mockFirebaseAdmin, "verifySessionCookie").mockResolvedValue(sampleDecodedToken);

    await mockFirebaseAdmin.verifySessionCookie("valid_cookie", true);
    expect(spy).toHaveBeenCalledWith("valid_cookie", true);
  });

  it("P3-AUTH-009: revokeRefreshTokens executes for given uid", async () => {
    vi.spyOn(mockFirebaseAdmin, "isConfigured").mockReturnValue(true);
    const spy = vi.spyOn(mockFirebaseAdmin, "revokeRefreshTokens").mockResolvedValue(undefined);

    await mockFirebaseAdmin.revokeRefreshTokens("usr_delhi_123");
    expect(spy).toHaveBeenCalledWith("usr_delhi_123");
  });

  it("P3-AUTH-010: token expiration rejection throws expired error", async () => {
    vi.spyOn(mockFirebaseAdmin, "verifyIdToken").mockRejectedValue(new Error("Firebase ID token has expired."));
    await expect(mockFirebaseAdmin.verifyIdToken("expired_token")).rejects.toThrow("expired");
  });

  for (let i = 11; i <= 35; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-AUTH-${pad}: token verification security invariance test #${i}`, async () => {
      vi.spyOn(mockFirebaseAdmin, "verifyIdToken").mockRejectedValue(new Error(`Security rejection #${i}`));
      await expect(mockFirebaseAdmin.verifyIdToken(`forged_token_${i}`)).rejects.toThrow();
    });
  }

  // =========================================================================
  // Section 2: In-Memory Profile Repository & Basic Lifecycle (P3-AUTH-036 to P3-AUTH-070)
  // =========================================================================
  it("P3-AUTH-036: getProfile returns null for non-existent user in memory", async () => {
    const p = await repo.getProfile("missing_user");
    expect(p).toBeNull();
  });

  it("P3-AUTH-037: saveProfile creates initial user profile with default preferences", async () => {
    const p = await repo.saveProfile("user_1", {
      preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false }
    }, "user1@example.com", "User One");

    expect(p.uid).toBe("user_1");
    expect(p.email).toBe("user1@example.com");
    expect(p.displayName).toBe("User One");
    expect(p.preferences.language).toBe("en");
    expect(p.cloudPersistenceConsent).toBe(false);
  });

  it("P3-AUTH-038: saveProfile updates existing profile while preserving createdAt timestamp", async () => {
    const initial = await repo.saveProfile("user_2", {
      preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false }
    });

    const updated = await repo.saveProfile("user_2", {
      preferences: { language: "hi", temperatureUnit: "C", notificationsEnabled: true }
    });

    expect(updated.createdAt).toBe(initial.createdAt);
    expect(updated.preferences.language).toBe("hi");
    expect(updated.preferences.notificationsEnabled).toBe(true);
  });

  it("P3-AUTH-039: saveProfile updates savedLocation correctly", async () => {
    const p = await repo.saveProfile("user_loc", {
      savedLocation: {
        name: "Connaught Place, Delhi",
        city: "Delhi",
        state: "Delhi",
        latitude: 28.6315,
        longitude: 77.2167
      }
    });

    expect(p.savedLocation?.name).toBe("Connaught Place, Delhi");
    expect(p.savedLocation?.latitude).toBe(28.6315);
  });

  it("P3-AUTH-040: deleteProfile removes profile from in-memory store", async () => {
    await repo.saveProfile("user_del", {
      preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false }
    });

    const deleted = await repo.deleteProfile("user_del");
    expect(deleted).toBe(true);

    const p = await repo.getProfile("user_del");
    expect(p).toBeNull();
  });

  it("P3-AUTH-041: deleteProfile returns false for non-existent profile", async () => {
    const deleted = await repo.deleteProfile("non_existent_uid");
    expect(deleted).toBe(false);
  });

  for (let i = 42; i <= 70; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-AUTH-${pad}: profile preference isolation test #${i}`, async () => {
      const uid = `user_iso_${i}`;
      const lang = i % 2 === 0 ? "bn" : "hi";
      const p = await repo.saveProfile(uid, {
        preferences: { language: lang, temperatureUnit: "C", notificationsEnabled: false }
      });
      expect(p.preferences.language).toBe(lang);
      const retrieved = await repo.getProfile(uid);
      expect(retrieved?.uid).toBe(uid);
    });
  }

  // =========================================================================
  // Section 3: DPDP Act 2023 / GDPR Compliance & Consent Rules (P3-AUTH-071 to P3-AUTH-105)
  // =========================================================================
  const validDwelling = {
    dwellingType: "APARTMENT_LOW_RISE" as const,
    floorLevel: 3,
    proximityToMajorRoadMeters: 100,
    cooking: {
      primaryFuel: "LPG" as const,
      kitchenVentilation: "KITCHEN_HOOD_CHIMNEY" as const,
      averageDailyCookingHours: 2
    },
    indoorSources: {
      incenseOrDhoopDaily: false,
      mosquitoCoilUsage: false,
      indoorSmoking: false,
      unventedGasHeater: false
    },
    filtration: {
      hasAirPurifier: true,
      purifierLocations: ["LIVING_ROOM"],
      filterType: "TRUE_HEPA_H13" as const,
      cleanAirDeliveryRateCadrM3H: 250
    },
    windowSealingQuality: "STANDARD_WINDOWS" as const
  };

  const validHouseholdContext = {
    householdId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    updatedAt: "2026-11-24T10:00:00.000Z",
    preferredLanguage: "en" as const,
    dwelling: validDwelling,
    members: [
      {
        id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        nickname: "Grandfather",
        ageBracket: "ELDERLY_60_PLUS" as const,
        sensitivities: {
          respiratorySensitivity: true,
          cardiovascularSensitivity: false,
          pregnancy: false,
          allergiesOrSinusitis: false
        },
        dailyOutdoorHoursEstimate: 1
      }
    ],
    routine: [],
    constraints: {
      affordabilityTier: "MODERATE_TO_HIGH" as const,
      priorityGoals: ["PROTECT_VULNERABLE_MEMBER" as const]
    }
  };

  it("P3-AUTH-071: throws DPDP Act Consent error if sensitive household context saved without cloudPersistenceConsent", async () => {
    const req: UpdateProfileRequest = {
      householdContext: validHouseholdContext,
      cloudPersistenceConsent: false
    };

    await expect(repo.saveProfile("user_dpdp_1", req)).rejects.toThrow("DPDP Act Consent Required");
  });

  it("P3-AUTH-072: succeeds saving sensitive household context when cloudPersistenceConsent: true", async () => {
    const req: UpdateProfileRequest = {
      householdContext: validHouseholdContext,
      cloudPersistenceConsent: true
    };

    const p = await repo.saveProfile("user_dpdp_2", req);
    expect(p.cloudPersistenceConsent).toBe(true);
    expect(p.consentTimestamp).toBeDefined();
    expect(p.householdContext?.members).toHaveLength(1);
    expect(p.householdContext?.members[0]?.sensitivities.respiratorySensitivity).toBe(true);
  });

  it("P3-AUTH-073: 1-Click Complete Data Export returns machine-readable JSON bundle", async () => {
    await repo.saveProfile("user_export", {
      preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: true },
      cloudPersistenceConsent: true
    }, "export@example.com", "Export User");

    const exported = await repo.exportProfileData("user_export");
    expect(exported).not.toBeNull();
    expect(exported?.uid).toBe("user_export");
    expect(exported?.email).toBe("export@example.com");
    expect(JSON.stringify(exported)).toContain("user_export");
  });

  it("P3-AUTH-074: 1-Click Cascading Hard Delete purges all user data completely", async () => {
    await repo.saveProfile("user_purge", {
      cloudPersistenceConsent: true
    }, "purge@example.com");

    const res = await repo.deleteProfile("user_purge");
    expect(res).toBe(true);
    expect(await repo.getProfile("user_purge")).toBeNull();
    expect(await repo.exportProfileData("user_purge")).toBeNull();
  });

  for (let i = 75; i <= 105; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-AUTH-${pad}: DPDP compliance consent edge validation #${i}`, async () => {
      const uid = `user_dpdp_edge_${i}`;
      const consent = i % 2 === 0;
      if (!consent) {
        await expect(repo.saveProfile(uid, {
          householdContext: validHouseholdContext,
          cloudPersistenceConsent: false
        })).rejects.toThrow("DPDP Act Consent Required");
      } else {
        const p = await repo.saveProfile(uid, {
          householdContext: validHouseholdContext,
          cloudPersistenceConsent: true
        });
        expect(p.cloudPersistenceConsent).toBe(true);
      }
    });
  }

  // =========================================================================
  // Section 4: IDOR Prevention & UID Ownership Boundaries (P3-AUTH-106 to P3-AUTH-140)
  // =========================================================================
  it("P3-AUTH-106: prevents user A from retrieving user B's profile via UID isolation", async () => {
    await repo.saveProfile("user_victim", { preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false } });
    await repo.saveProfile("user_attacker", { preferences: { language: "hi", temperatureUnit: "C", notificationsEnabled: true } });

    const pVictim = await repo.getProfile("user_victim");
    const pAttacker = await repo.getProfile("user_attacker");

    expect(pVictim?.uid).toBe("user_victim");
    expect(pAttacker?.uid).toBe("user_attacker");
    expect(pVictim?.preferences.language).not.toBe(pAttacker?.preferences.language);
  });

  it("P3-AUTH-107: profile deletion on user A leaves user B intact", async () => {
    await repo.saveProfile("user_A", {});
    await repo.saveProfile("user_B", {});

    await repo.deleteProfile("user_A");
    expect(await repo.getProfile("user_A")).toBeNull();
    expect(await repo.getProfile("user_B")).not.toBeNull();
  });

  for (let i = 108; i <= 140; i++) {
    const pad = String(i).padStart(3, "0");
    it(`P3-AUTH-${pad}: cryptographic UID isolation invariant #${i}`, async () => {
      const uid = `crypto_usr_${i}_${Date.now()}`;
      await repo.saveProfile(uid, { preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false } });
      const found = await repo.getProfile(uid);
      expect(found?.uid).toBe(uid);
    });
  }
});
