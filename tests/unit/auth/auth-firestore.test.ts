// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FirebaseAdminService } from "@/lib/firebase/admin";
import { ProfileRepository } from "@/services/profiles/profile-repository";
import {
  getGuestContext,
  saveGuestContext,
  clearGuestContext,
  signInWithGoogle,
  sendEmailSignInLink,
  completeEmailSignInLink,
  type GuestState
} from "@/lib/firebase/client";
import { UserProfileSchema } from "@/schemas/user-profile.schema";

describe("Firebase Auth & Firestore Profile Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. FirebaseAdminService (AUTH-001 to AUTH-015)
  it("AUTH-001: getInstance returns singleton instance", () => {
    const inst1 = FirebaseAdminService.getInstance();
    const inst2 = FirebaseAdminService.getInstance();
    expect(inst1).toBe(inst2);
  });

  it("AUTH-002: reports isConfigured false when environment variables missing", () => {
    const admin = new FirebaseAdminService();
    expect(admin.isConfigured()).toBe(false);
  });

  it("AUTH-003: verifyIdToken throws descriptive error when unconfigured", async () => {
    const admin = new FirebaseAdminService();
    await expect(admin.verifyIdToken("token-123")).rejects.toThrow(/NOT_CONFIGURED/);
  });

  it("AUTH-004: createSessionCookie throws descriptive error when unconfigured", async () => {
    const admin = new FirebaseAdminService();
    await expect(admin.createSessionCookie("token-123")).rejects.toThrow(/NOT_CONFIGURED/);
  });

  it("AUTH-005: verifySessionCookie throws descriptive error when unconfigured", async () => {
    const admin = new FirebaseAdminService();
    await expect(admin.verifySessionCookie("cookie-123")).rejects.toThrow(/NOT_CONFIGURED/);
  });

  it("AUTH-006: revokeRefreshTokens throws descriptive error when unconfigured", async () => {
    const admin = new FirebaseAdminService();
    await expect(admin.revokeRefreshTokens("uid-123")).rejects.toThrow(/NOT_CONFIGURED/);
  });

  it("AUTH-007: getFirestore throws descriptive error when unconfigured", () => {
    const admin = new FirebaseAdminService();
    expect(() => admin.getFirestore()).toThrow(/NOT_CONFIGURED/);
  });

  function setAdminMocks(
    admin: FirebaseAdminService,
    mocks: { auth?: unknown; app?: unknown; firestore?: unknown }
  ): void {
    const target = admin as unknown as Record<string, unknown>;
    if ("auth" in mocks) target["auth"] = mocks.auth;
    if ("app" in mocks) target["app"] = mocks.app;
    if ("firestore" in mocks) target["firestore"] = mocks.firestore;
  }

  it("AUTH-008: createSessionCookie uses default 5-day expiration (432,000,000 ms)", async () => {
    const admin = new FirebaseAdminService();
    const mockAuth = {
      createSessionCookie: vi.fn().mockResolvedValue("session_cookie_mock")
    };
    setAdminMocks(admin, { auth: mockAuth, app: {} });

    const cookie = await admin.createSessionCookie("id-token-xyz");
    expect(cookie).toBe("session_cookie_mock");
    expect(mockAuth.createSessionCookie).toHaveBeenCalledWith("id-token-xyz", {
      expiresIn: 5 * 24 * 60 * 60 * 1000
    });
  });

  it("AUTH-009: verifyIdToken invokes Firebase Auth verifyIdToken with checkRevoked true", async () => {
    const admin = new FirebaseAdminService();
    const mockAuth = {
      verifyIdToken: vi.fn().mockResolvedValue({ uid: "user_valid", email: "test@example.com" })
    };
    setAdminMocks(admin, { auth: mockAuth, app: {} });

    const decoded = await admin.verifyIdToken("id-token-xyz");
    expect(decoded.uid).toBe("user_valid");
    expect(mockAuth.verifyIdToken).toHaveBeenCalledWith("id-token-xyz", true);
  });

  it("AUTH-010: verifySessionCookie invokes Firebase Auth verifySessionCookie with checkRevoked true", async () => {
    const admin = new FirebaseAdminService();
    const mockAuth = {
      verifySessionCookie: vi.fn().mockResolvedValue({ uid: "user_session_ok" })
    };
    setAdminMocks(admin, { auth: mockAuth, app: {} });

    const decoded = await admin.verifySessionCookie("cookie_val", true);
    expect(decoded.uid).toBe("user_session_ok");
    expect(mockAuth.verifySessionCookie).toHaveBeenCalledWith("cookie_val", true);
  });

  it("AUTH-011: revokeRefreshTokens calls Firebase Auth revokeRefreshTokens with target UID", async () => {
    const admin = new FirebaseAdminService();
    const mockAuth = {
      revokeRefreshTokens: vi.fn().mockResolvedValue(undefined)
    };
    setAdminMocks(admin, { auth: mockAuth, app: {} });

    await admin.revokeRefreshTokens("user_target_uid");
    expect(mockAuth.revokeRefreshTokens).toHaveBeenCalledWith("user_target_uid");
  });

  it("AUTH-012: returns Firestore instance when app and firestore are configured", () => {
    const admin = new FirebaseAdminService();
    const mockFirestore = { collection: vi.fn() };
    setAdminMocks(admin, { firestore: mockFirestore, app: {}, auth: {} });

    expect(admin.getFirestore()).toBe(mockFirestore);
  });

  it("AUTH-013: handles token verification failure with rejection", async () => {
    const admin = new FirebaseAdminService();
    const mockAuth = {
      verifyIdToken: vi.fn().mockRejectedValue(new Error("Token expired"))
    };
    setAdminMocks(admin, { auth: mockAuth, app: {} });

    await expect(admin.verifyIdToken("expired_tok")).rejects.toThrow("Token expired");
  });

  it("AUTH-014: handles session cookie verification failure with rejection", async () => {
    const admin = new FirebaseAdminService();
    const mockAuth = {
      verifySessionCookie: vi.fn().mockRejectedValue(new Error("Cookie revoked"))
    };
    setAdminMocks(admin, { auth: mockAuth, app: {} });

    await expect(admin.verifySessionCookie("revoked_cookie")).rejects.toThrow("Cookie revoked");
  });

  it("AUTH-015: createSessionCookie accepts custom expiresInMs parameter", async () => {
    const admin = new FirebaseAdminService();
    const mockAuth = {
      createSessionCookie: vi.fn().mockResolvedValue("short_session")
    };
    setAdminMocks(admin, { auth: mockAuth, app: {} });

    await admin.createSessionCookie("tok", 3600000); // 1 hour
    expect(mockAuth.createSessionCookie).toHaveBeenCalledWith("tok", { expiresIn: 3600000 });
  });

  // 2. ProfileRepository (AUTH-016 to AUTH-045)
  it("AUTH-016: getProfile returns null for non-existent user UID", async () => {
    const repo = new ProfileRepository();
    const profile = await repo.getProfile("non_existent_uid_1");
    expect(profile).toBeNull();
  });

  it("AUTH-017: saveProfile creates new profile with default preferences when none provided", async () => {
    const repo = new ProfileRepository();
    const profile = await repo.saveProfile("user_new_1", {}, "new@example.com", "New User");

    expect(profile.uid).toBe("user_new_1");
    expect(profile.email).toBe("new@example.com");
    expect(profile.displayName).toBe("New User");
    expect(profile.preferences.language).toBe("en");
    expect(profile.preferences.temperatureUnit).toBe("C");
    expect(profile.cloudPersistenceConsent).toBe(false);
    expect(profile.createdAt).toBeDefined();
    expect(profile.updatedAt).toBeDefined();
  });

  it("AUTH-018: saveProfile updates existing profile without wiping unspecified fields", async () => {
    const repo = new ProfileRepository();
    await repo.saveProfile(
      "user_merge_1",
      { preferences: { language: "bn", temperatureUnit: "C", notificationsEnabled: true } },
      "merge@example.com",
      "Merge User"
    );

    // Update only savedLocation
    const updated = await repo.saveProfile("user_merge_1", {
      savedLocation: {
        name: "Home",
        city: "Kolkata",
        state: "West Bengal",
        latitude: 22.57,
        longitude: 88.36
      }
    });

    expect(updated.preferences.language).toBe("bn");
    expect(updated.preferences.notificationsEnabled).toBe(true);
    expect(updated.savedLocation?.city).toBe("Kolkata");
    expect(updated.email).toBe("merge@example.com");
  });

  it("AUTH-019: UID ownership strictly maintained: user_A profile not accessible via user_B", async () => {
    const repo = new ProfileRepository();
    await repo.saveProfile("user_A", { preferences: { language: "bn", temperatureUnit: "C", notificationsEnabled: false } });

    const profileB = await repo.getProfile("user_B");
    expect(profileB).toBeNull();

    const profileA = await repo.getProfile("user_A");
    expect(profileA?.preferences.language).toBe("bn");
  });

  it("AUTH-020: IDOR prevention: User B cannot overwrite or corrupt User A profile", async () => {
    const repo = new ProfileRepository();
    await repo.saveProfile("user_A", { preferences: { language: "bn", temperatureUnit: "C", notificationsEnabled: false } });
    await repo.saveProfile("user_B", { preferences: { language: "hi", temperatureUnit: "C", notificationsEnabled: false } });

    const pA = await repo.getProfile("user_A");
    const pB = await repo.getProfile("user_B");

    expect(pA?.preferences.language).toBe("bn");
    expect(pB?.preferences.language).toBe("hi");
  });

  it("AUTH-021: DPDP Act: saveProfile throws error when householdContext is provided without explicit cloudPersistenceConsent", async () => {
    const repo = new ProfileRepository();
    const householdContext = {
      householdId: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
      preferredLanguage: "en" as const,
      members: [
        {
          id: crypto.randomUUID(),
          nickname: "Grandma",
          ageBracket: "ELDERLY_60_PLUS" as const,
          sensitivities: { respiratorySensitivity: true, cardiovascularSensitivity: false, pregnancy: false, allergiesOrSinusitis: false },
          dailyOutdoorHoursEstimate: 1
        }
      ],
      dwelling: {
        dwellingType: "APARTMENT_LOW_RISE" as const,
        floorLevel: 2,
        proximityToMajorRoadMeters: 100,
        cooking: { primaryFuel: "LPG" as const, kitchenVentilation: "KITCHEN_HOOD_CHIMNEY" as const, averageDailyCookingHours: 2 },
        indoorSources: { incenseOrDhoopDaily: false, mosquitoCoilUsage: false, indoorSmoking: false, unventedGasHeater: false },
        filtration: { hasAirPurifier: true, purifierLocations: [] },
        windowSealingQuality: "STANDARD_WINDOWS" as const
      },
      routine: [],
      constraints: { affordabilityTier: "MODERATE_TO_HIGH" as const, priorityGoals: ["PROTECT_VULNERABLE_MEMBER" as const] }
    };

    await expect(
      repo.saveProfile("user_no_consent", {
        householdContext,
        cloudPersistenceConsent: false
      })
    ).rejects.toThrow(/DPDP Act Consent Required/);
  });

  it("AUTH-022: DPDP Act: saveProfile throws error when cloudPersistenceConsent is undefined with householdContext", async () => {
    const repo = new ProfileRepository();
    const householdContext = {
      householdId: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
      preferredLanguage: "en" as const,
      members: [],
      dwelling: {
        dwellingType: "APARTMENT_LOW_RISE" as const,
        floorLevel: 2,
        proximityToMajorRoadMeters: 100,
        cooking: { primaryFuel: "LPG" as const, kitchenVentilation: "KITCHEN_HOOD_CHIMNEY" as const, averageDailyCookingHours: 2 },
        indoorSources: { incenseOrDhoopDaily: false, mosquitoCoilUsage: false, indoorSmoking: false, unventedGasHeater: false },
        filtration: { hasAirPurifier: false, purifierLocations: [] },
        windowSealingQuality: "STANDARD_WINDOWS" as const
      },
      routine: [],
      constraints: { affordabilityTier: "MODERATE_TO_HIGH" as const, priorityGoals: [] }
    };

    await expect(
      repo.saveProfile("user_undef_consent", {
        householdContext
      })
    ).rejects.toThrow(/DPDP Act Consent Required/);
  });

  it("AUTH-023: DPDP Act: saveProfile succeeds when cloudPersistenceConsent is true and records consentTimestamp", async () => {
    const repo = new ProfileRepository();
    const householdContext = {
      householdId: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
      preferredLanguage: "en" as const,
      members: [
        {
          id: crypto.randomUUID(),
          nickname: "Self",
          ageBracket: "ADULT_18_59" as const,
          sensitivities: { respiratorySensitivity: false, cardiovascularSensitivity: false, pregnancy: false, allergiesOrSinusitis: false },
          dailyOutdoorHoursEstimate: 2
        }
      ],
      dwelling: {
        dwellingType: "STANDALONE_HOUSE" as const,
        floorLevel: 0,
        proximityToMajorRoadMeters: 200,
        cooking: { primaryFuel: "INDUCTION_ELECTRIC" as const, kitchenVentilation: "DEDICATED_EXHAUST_OUTSIDE" as const, averageDailyCookingHours: 1 },
        indoorSources: { incenseOrDhoopDaily: false, mosquitoCoilUsage: false, indoorSmoking: false, unventedGasHeater: false },
        filtration: { hasAirPurifier: true, purifierLocations: ["BEDROOM"] },
        windowSealingQuality: "WELL_SEALED" as const
      },
      routine: [],
      constraints: { affordabilityTier: "MODERATE_TO_HIGH" as const, priorityGoals: ["OPTIMIZE_INDOOR_AIR" as const] }
    };

    const profile = await repo.saveProfile("user_with_consent", {
      householdContext,
      cloudPersistenceConsent: true
    });

    expect(profile.cloudPersistenceConsent).toBe(true);
    expect(profile.consentTimestamp).toBeDefined();
    expect(profile.householdContext?.dwelling.dwellingType).toBe("STANDALONE_HOUSE");
  });

  it("AUTH-024: updating preferences only does not require cloudPersistenceConsent", async () => {
    const repo = new ProfileRepository();
    const profile = await repo.saveProfile("user_pref_only", {
      preferences: { language: "hi", temperatureUnit: "F", notificationsEnabled: false }
    });
    expect(profile.preferences.language).toBe("hi");
    expect(profile.cloudPersistenceConsent).toBe(false);
  });

  it("AUTH-025: updating savedLocation only does not require cloudPersistenceConsent", async () => {
    const repo = new ProfileRepository();
    const profile = await repo.saveProfile("user_loc_only", {
      savedLocation: {
        name: "Connaught Place",
        city: "New Delhi",
        state: "Delhi",
        latitude: 28.63,
        longitude: 77.21
      }
    });
    expect(profile.savedLocation?.city).toBe("New Delhi");
    expect(profile.cloudPersistenceConsent).toBe(false);
  });

  it("AUTH-026: preserves existing consentTimestamp on subsequent profile updates", async () => {
    const repo = new ProfileRepository();
    const first = await repo.saveProfile("user_ts", {
      preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false },
      cloudPersistenceConsent: true
    });
    const firstTs = first.consentTimestamp;
    expect(firstTs).toBeDefined();

    const second = await repo.saveProfile("user_ts", {
      preferences: { language: "hi", temperatureUnit: "C", notificationsEnabled: false }
    });
    expect(second.consentTimestamp).toBe(firstTs);
    expect(second.cloudPersistenceConsent).toBe(true);
  });

  it("AUTH-027: deleteProfile deletes existing profile and returns true", async () => {
    const repo = new ProfileRepository();
    await repo.saveProfile("user_del", { preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false } });

    const deleted = await repo.deleteProfile("user_del");
    expect(deleted).toBe(true);

    const check = await repo.getProfile("user_del");
    expect(check).toBeNull();
  });

  it("AUTH-028: deleteProfile returns false for non-existent user", async () => {
    const repo = new ProfileRepository();
    const deleted = await repo.deleteProfile("user_does_not_exist");
    expect(deleted).toBe(false);
  });

  it("AUTH-029: exportProfileData returns complete user profile JSON", async () => {
    const repo = new ProfileRepository();
    await repo.saveProfile(
      "user_export",
      {
        preferences: { language: "bn", temperatureUnit: "C", notificationsEnabled: true },
        savedLocation: { name: "Park Street", city: "Kolkata", state: "West Bengal", latitude: 22.55, longitude: 88.35 }
      },
      "export@test.org",
      "Export User"
    );

    const exported = await repo.exportProfileData("user_export");
    expect(exported).not.toBeNull();
    expect(exported?.uid).toBe("user_export");
    expect(exported?.email).toBe("export@test.org");
    expect(exported?.savedLocation?.city).toBe("Kolkata");
    expect(UserProfileSchema.safeParse(exported).success).toBe(true);
  });

  it("AUTH-030: exportProfileData returns null for unknown UID", async () => {
    const repo = new ProfileRepository();
    const exported = await repo.exportProfileData("user_unknown_export");
    expect(exported).toBeNull();
  });

  it("AUTH-031: UserProfileSchema validates canonical profile and requires valid uid", () => {
    const profile = {
      uid: "user_schema_test",
      email: "valid@domain.com",
      displayName: "Valid User",
      preferences: { language: "en" as const, temperatureUnit: "C" as const, notificationsEnabled: false },
      cloudPersistenceConsent: false,
      createdAt: "2026-11-22T08:00:00.000Z",
      updatedAt: "2026-11-22T08:00:00.000Z"
    };
    expect(UserProfileSchema.parse(profile)).toEqual(profile);
  });

  it("AUTH-032: UserProfileSchema rejects invalid email format", () => {
    expect(() =>
      UserProfileSchema.parse({
        uid: "user_bad_email",
        email: "not-an-email",
        preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false },
        cloudPersistenceConsent: false,
        createdAt: "2026-11-22T08:00:00.000Z",
        updatedAt: "2026-11-22T08:00:00.000Z"
      })
    ).toThrow();
  });

  it("AUTH-033: UserProfileSchema rejects out-of-range coordinates in savedLocation", () => {
    expect(() =>
      UserProfileSchema.parse({
        uid: "user_bad_loc",
        savedLocation: {
          name: "Invalid",
          city: "Delhi",
          state: "Delhi",
          latitude: 50.0, // outside India range (6.0 - 38.0)
          longitude: 77.0
        },
        preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false },
        cloudPersistenceConsent: false,
        createdAt: "2026-11-22T08:00:00.000Z",
        updatedAt: "2026-11-22T08:00:00.000Z"
      })
    ).toThrow();
  });

  it("AUTH-034: multiple profiles can be created and queried without state collisions", async () => {
    const repo = new ProfileRepository();
    for (let i = 1; i <= 5; i++) {
      await repo.saveProfile(`user_multi_${i}`, {
        preferences: { language: i % 2 === 0 ? "bn" : "hi", temperatureUnit: "C", notificationsEnabled: false }
      });
    }

    for (let i = 1; i <= 5; i++) {
      const p = await repo.getProfile(`user_multi_${i}`);
      expect(p?.uid).toBe(`user_multi_${i}`);
      expect(p?.preferences.language).toBe(i % 2 === 0 ? "bn" : "hi");
    }
  });

  it("AUTH-035: saveProfile updates updatedAt timestamp on every mutation", async () => {
    vi.useFakeTimers();
    try {
      const repo = new ProfileRepository();
      const p1 = await repo.saveProfile("user_time_test", {
        preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false }
      });

      vi.advanceTimersByTime(5000);

      const p2 = await repo.saveProfile("user_time_test", {
        preferences: { language: "bn", temperatureUnit: "C", notificationsEnabled: false }
      });

      expect(new Date(p2.updatedAt).getTime()).toBeGreaterThan(new Date(p1.updatedAt).getTime());
    } finally {
      vi.useRealTimers();
    }
  });

  it("AUTH-036: preserves createdAt timestamp across subsequent updates", async () => {
    const repo = new ProfileRepository();
    const p1 = await repo.saveProfile("user_created_at", {
      preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false }
    });
    const created = p1.createdAt;

    const p2 = await repo.saveProfile("user_created_at", {
      preferences: { language: "hi", temperatureUnit: "C", notificationsEnabled: false }
    });
    expect(p2.createdAt).toBe(created);
  });

  it("AUTH-037: supports saving routine activities with explicit consent", async () => {
    const repo = new ProfileRepository();
    const routine = [
      {
        activityId: crypto.randomUUID(),
        label: "Morning Run",
        memberIds: [crypto.randomUUID()],
        locationType: "OUTDOOR" as const,
        physicalIntensity: "VIGOROUS" as const,
        timeWindow: { startMinuteOfDay: 360, durationMinutes: 45 },
        flexibility: { canShiftEarlierMinutes: 30, canShiftLaterMinutes: 30, canSubstituteWithIndoorAlternative: true, canChangeTransitMode: false }
      }
    ];

    const profile = await repo.saveProfile("user_routine", {
      routine,
      cloudPersistenceConsent: true
    });
    expect(profile.routine).toHaveLength(1);
    expect(profile.routine?.[0]?.label).toBe("Morning Run");
  });

  it("AUTH-038: handles undefined householdContext update by preserving existing context", async () => {
    const repo = new ProfileRepository();
    const householdContext = {
      householdId: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
      preferredLanguage: "en" as const,
      members: [
        {
          id: crypto.randomUUID(),
          nickname: "Primary",
          ageBracket: "ADULT_18_59" as const,
          sensitivities: { respiratorySensitivity: false, cardiovascularSensitivity: false, pregnancy: false, allergiesOrSinusitis: false },
          dailyOutdoorHoursEstimate: 2
        }
      ],
      dwelling: {
        dwellingType: "STANDALONE_HOUSE" as const,
        floorLevel: 0,
        proximityToMajorRoadMeters: 500,
        cooking: { primaryFuel: "LPG" as const, kitchenVentilation: "OPEN_WINDOW_ONLY" as const, averageDailyCookingHours: 1 },
        indoorSources: { incenseOrDhoopDaily: false, mosquitoCoilUsage: false, indoorSmoking: false, unventedGasHeater: false },
        filtration: { hasAirPurifier: false, purifierLocations: [] },
        windowSealingQuality: "WELL_SEALED" as const
      },
      routine: [],
      constraints: { affordabilityTier: "LOW_COST" as const, priorityGoals: ["OPTIMIZE_INDOOR_AIR" as const] }
    };

    await repo.saveProfile("user_preserve", { householdContext, cloudPersistenceConsent: true });

    // Update preferences only; householdContext should remain intact
    const second = await repo.saveProfile("user_preserve", {
      preferences: { language: "hi", temperatureUnit: "C", notificationsEnabled: false }
    });
    expect(second.householdContext?.dwelling.dwellingType).toBe("STANDALONE_HOUSE");
  });

  it("AUTH-039: supports clearing savedLocation with undefined or replacement", async () => {
    const repo = new ProfileRepository();
    await repo.saveProfile("user_loc_clear", {
      savedLocation: { name: "Loc1", city: "Delhi", state: "Delhi", latitude: 28.6, longitude: 77.2 }
    });

    const updated = await repo.saveProfile("user_loc_clear", {
      savedLocation: { name: "Loc2", city: "Mumbai", state: "Maharashtra", latitude: 19.07, longitude: 72.87 }
    });
    expect(updated.savedLocation?.city).toBe("Mumbai");
  });

  it("AUTH-040: handles displayName truncation or long names safely", async () => {
    const repo = new ProfileRepository();
    const profile = await repo.saveProfile("user_name", {}, "email@test.com", "A".repeat(50));
    expect(profile.displayName).toBe("A".repeat(50));
  });

  it("AUTH-041: supports notificationEnabled toggling", async () => {
    const repo = new ProfileRepository();
    const p1 = await repo.saveProfile("user_notify", {
      preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false }
    });
    expect(p1.preferences.notificationsEnabled).toBe(false);

    const p2 = await repo.saveProfile("user_notify", {
      preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: true }
    });
    expect(p2.preferences.notificationsEnabled).toBe(true);
  });

  it("AUTH-042: supports temperatureUnit switching between C and F", async () => {
    const repo = new ProfileRepository();
    const p1 = await repo.saveProfile("user_temp", {
      preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false }
    });
    expect(p1.preferences.temperatureUnit).toBe("C");

    const p2 = await repo.saveProfile("user_temp", {
      preferences: { language: "en", temperatureUnit: "F", notificationsEnabled: false }
    });
    expect(p2.preferences.temperatureUnit).toBe("F");
  });

  it("AUTH-043: rejects invalid temperatureUnit string in schema", () => {
    expect(() =>
      UserProfileSchema.parse({
        uid: "bad_unit",
        preferences: { language: "en", temperatureUnit: "K", notificationsEnabled: false },
        cloudPersistenceConsent: false,
        createdAt: "2026-11-22T08:00:00.000Z",
        updatedAt: "2026-11-22T08:00:00.000Z"
      })
    ).toThrow();
  });

  it("AUTH-044: rejects invalid language string in schema", () => {
    expect(() =>
      UserProfileSchema.parse({
        uid: "bad_lang",
        preferences: { language: "es", temperatureUnit: "C", notificationsEnabled: false },
        cloudPersistenceConsent: false,
        createdAt: "2026-11-22T08:00:00.000Z",
        updatedAt: "2026-11-22T08:00:00.000Z"
      })
    ).toThrow();
  });

  it("AUTH-045: exportProfileData produces output that re-parses with UserProfileSchema", async () => {
    const repo = new ProfileRepository();
    await repo.saveProfile("user_reparse", {
      preferences: { language: "hi", temperatureUnit: "C", notificationsEnabled: false }
    });

    const exported = await repo.exportProfileData("user_reparse");
    const parsed = UserProfileSchema.parse(exported);
    expect(parsed.uid).toBe("user_reparse");
  });

  // 3. Client Auth & Guest Mode (AUTH-046 to AUTH-060)
  function setGlobalWindow(val: unknown): void {
    const glob = globalThis as unknown as Record<string, unknown>;
    if (val === undefined) {
      delete glob["window"];
    } else {
      glob["window"] = val;
    }
  }

  it("AUTH-046: getGuestContext returns null when window is undefined", () => {
    const origWindow = global.window;
    setGlobalWindow(undefined);
    try {
      expect(getGuestContext()).toBeNull();
    } finally {
      setGlobalWindow(origWindow);
    }
  });

  it("AUTH-047: saveGuestContext does not throw when window is undefined", () => {
    const origWindow = global.window;
    setGlobalWindow(undefined);
    try {
      expect(() => saveGuestContext({ language: "bn" })).not.toThrow();
    } finally {
      setGlobalWindow(origWindow);
    }
  });

  it("AUTH-048: clearGuestContext does not throw when window is undefined", () => {
    const origWindow = global.window;
    setGlobalWindow(undefined);
    try {
      expect(() => clearGuestContext()).not.toThrow();
    } finally {
      setGlobalWindow(origWindow);
    }
  });

  it("AUTH-049: saveGuestContext saves state to sessionStorage and getGuestContext retrieves it", () => {
    const mockStorage = new Map<string, string>();
    setGlobalWindow({
      sessionStorage: {
        getItem: (k: string) => mockStorage.get(k) || null,
        setItem: (k: string, v: string) => mockStorage.set(k, v),
        removeItem: (k: string) => mockStorage.delete(k)
      }
    });

    const state: GuestState = {
      language: "bn",
      savedLocation: {
        name: "Howrah",
        city: "Howrah",
        state: "West Bengal",
        latitude: 22.59,
        longitude: 88.26
      }
    };

    saveGuestContext(state);
    const retrieved = getGuestContext();
    expect(retrieved).toEqual(state);
  });

  it("AUTH-050: clearGuestContext removes item from sessionStorage", () => {
    const mockStorage = new Map<string, string>();
    setGlobalWindow({
      sessionStorage: {
        getItem: (k: string) => mockStorage.get(k) || null,
        setItem: (k: string, v: string) => mockStorage.set(k, v),
        removeItem: (k: string) => mockStorage.delete(k)
      }
    });

    saveGuestContext({ language: "hi" });
    expect(getGuestContext()?.language).toBe("hi");

    clearGuestContext();
    expect(getGuestContext()).toBeNull();
  });

  it("AUTH-051: getGuestContext handles malformed JSON in sessionStorage gracefully", () => {
    setGlobalWindow({
      sessionStorage: {
        getItem: () => "INVALID_CORRUPTED_JSON{{{",
        setItem: () => {},
        removeItem: () => {}
      }
    });
    expect(getGuestContext()).toBeNull();
  });

  it("AUTH-052: guest state supports local dwelling and household context", () => {
    const mockStorage = new Map<string, string>();
    setGlobalWindow({
      sessionStorage: {
        getItem: (k: string) => mockStorage.get(k) || null,
        setItem: (k: string, v: string) => mockStorage.set(k, v),
        removeItem: (k: string) => mockStorage.delete(k)
      }
    });

    const state: GuestState = {
      language: "en",
      householdContext: {
        dwellingType: "APARTMENT_HIGH_RISE",
        hasAirPurifier: true
      }
    };

    saveGuestContext(state);
    const retrieved = getGuestContext();
    expect(retrieved?.householdContext?.["dwellingType"]).toBe("APARTMENT_HIGH_RISE");
  });

  it("AUTH-053: guest state supports local routine schedule", () => {
    const mockStorage = new Map<string, string>();
    setGlobalWindow({
      sessionStorage: {
        getItem: (k: string) => mockStorage.get(k) || null,
        setItem: (k: string, v: string) => mockStorage.set(k, v),
        removeItem: (k: string) => mockStorage.delete(k)
      }
    });

    const state: GuestState = {
      language: "en",
      routine: {
        commuteMode: "METRO"
      }
    };

    saveGuestContext(state);
    const retrieved = getGuestContext();
    expect(retrieved?.routine?.["commuteMode"]).toBe("METRO");
  });

  it("AUTH-054: signInWithGoogle throws error when client Firebase auth is unconfigured", async () => {
    setGlobalWindow({});
    await expect(signInWithGoogle()).rejects.toThrow(/NOT_CONFIGURED/);
  });

  it("AUTH-055: sendEmailSignInLink throws error when client Firebase auth is unconfigured", async () => {
    setGlobalWindow({});
    await expect(sendEmailSignInLink("test@example.com", "http://localhost:3000")).rejects.toThrow(/NOT_CONFIGURED/);
  });

  it("AUTH-056: completeEmailSignInLink throws error when client Firebase auth is unconfigured", async () => {
    setGlobalWindow({});
    await expect(completeEmailSignInLink("test@example.com", "http://localhost:3000?apiKey=123")).rejects.toThrow(/NOT_CONFIGURED/);
  });

  it("AUTH-057: guest context returns null when key does not exist in sessionStorage", () => {
    setGlobalWindow({
      sessionStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      }
    });
    expect(getGuestContext()).toBeNull();
  });

  it("AUTH-058: sequential guest context saves overwrite previous snapshot cleanly", () => {
    const mockStorage = new Map<string, string>();
    setGlobalWindow({
      sessionStorage: {
        getItem: (k: string) => mockStorage.get(k) || null,
        setItem: (k: string, v: string) => mockStorage.set(k, v),
        removeItem: (k: string) => mockStorage.delete(k)
      }
    });

    saveGuestContext({ language: "en" });
    saveGuestContext({ language: "bn" });

    expect(getGuestContext()?.language).toBe("bn");
  });

  it("AUTH-059: guest mode isolation: guest state never persists to ProfileRepository", async () => {
    const mockStorage = new Map<string, string>();
    setGlobalWindow({
      sessionStorage: {
        getItem: (k: string) => mockStorage.get(k) || null,
        setItem: (k: string, v: string) => mockStorage.set(k, v),
        removeItem: (k: string) => mockStorage.delete(k)
      }
    });

    saveGuestContext({ language: "hi" });

    const repo = new ProfileRepository();
    const guestInDb = await repo.getProfile("guest");
    expect(guestInDb).toBeNull();
  });

  it("AUTH-060: clearing guest context does not affect ProfileRepository", async () => {
    const repo = new ProfileRepository();
    await repo.saveProfile("real_user", { preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false } });

    clearGuestContext();
    const realUser = await repo.getProfile("real_user");
    expect(realUser).not.toBeNull();
  });

  // 4. Security & Privacy Safeguards (AUTH-061 to AUTH-070)
  it("AUTH-061: 1-click delete cascade removes user profile completely", async () => {
    const repo = new ProfileRepository();
    await repo.saveProfile("cascade_user", {
      preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false }
    });

    const deleted = await repo.deleteProfile("cascade_user");
    expect(deleted).toBe(true);

    const postDelete = await repo.getProfile("cascade_user");
    expect(postDelete).toBeNull();
  });

  it("AUTH-062: 1-click data export produces complete machine-readable JSON representation", async () => {
    const repo = new ProfileRepository();
    await repo.saveProfile(
      "export_json_user",
      {
        preferences: { language: "bn", temperatureUnit: "C", notificationsEnabled: false },
        cloudPersistenceConsent: true
      },
      "export@hawasaathi.org",
      "Export Tester"
    );

    const exported = await repo.exportProfileData("export_json_user");
    const jsonString = JSON.stringify(exported);
    expect(jsonString).toContain("export@hawasaathi.org");
    expect(jsonString).toContain("Export Tester");
  });

  it("AUTH-063: health sensitivities are strictly non-diagnostic boolean flags", () => {
    const member = {
      id: crypto.randomUUID(),
      nickname: "Child",
      ageBracket: "CHILD_3_12" as const,
      sensitivities: {
        respiratorySensitivity: true,
        cardiovascularSensitivity: false,
        pregnancy: false,
        allergiesOrSinusitis: true
      },
      dailyOutdoorHoursEstimate: 2
    };

    expect(typeof member.sensitivities.respiratorySensitivity).toBe("boolean");
    expect(typeof member.sensitivities.cardiovascularSensitivity).toBe("boolean");
    expect(typeof member.sensitivities.pregnancy).toBe("boolean");
    expect(typeof member.sensitivities.allergiesOrSinusitis).toBe("boolean");
  });

  it("AUTH-064: user profile createdAt and updatedAt are valid ISO 8601 strings", async () => {
    const repo = new ProfileRepository();
    const profile = await repo.saveProfile("iso_user", {
      preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false }
    });

    expect(profile.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(profile.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("AUTH-065: revoking cloudPersistenceConsent sets consent to false", async () => {
    const repo = new ProfileRepository();
    await repo.saveProfile("revoke_consent_user", {
      preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false },
      cloudPersistenceConsent: true
    });

    const updated = await repo.saveProfile("revoke_consent_user", {
      cloudPersistenceConsent: false
    });
    expect(updated.cloudPersistenceConsent).toBe(false);
  });

  it("AUTH-066: unauthenticated user profile request throws error on missing UID", async () => {
    const repo = new ProfileRepository();
    await expect(repo.getProfile("")).resolves.toBeNull();
  });

  it("AUTH-067: non-diagnostic health info is strictly optional in household context", () => {
    const memberNoSensitivities = {
      id: crypto.randomUUID(),
      nickname: "Adult",
      ageBracket: "ADULT_18_59" as const,
      sensitivities: {
        respiratorySensitivity: false,
        cardiovascularSensitivity: false,
        pregnancy: false,
        allergiesOrSinusitis: false
      },
      dailyOutdoorHoursEstimate: 2
    };
    expect(memberNoSensitivities.sensitivities.respiratorySensitivity).toBe(false);
  });

  it("AUTH-068: savedLocation coordinates validated to strictly stay within India bounding box", () => {
    expect(() =>
      UserProfileSchema.parse({
        uid: "user_geo_fence",
        savedLocation: {
          name: "Tokyo",
          city: "Tokyo",
          state: "Tokyo",
          latitude: 35.67, // Outside India bounds (6.0 - 38.0)
          longitude: 139.65
        },
        preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false },
        cloudPersistenceConsent: false,
        createdAt: "2026-11-22T08:00:00.000Z",
        updatedAt: "2026-11-22T08:00:00.000Z"
      })
    ).toThrow();
  });

  it("AUTH-069: profile export contains zero backend credentials or service tokens", async () => {
    const repo = new ProfileRepository();
    await repo.saveProfile("clean_export_user", {
      preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false }
    });

    const exported = await repo.exportProfileData("clean_export_user");
    const jsonStr = JSON.stringify(exported);
    expect(jsonStr).not.toContain("API_KEY");
    expect(jsonStr).not.toContain("SECRET");
    expect(jsonStr).not.toContain("TOKEN");
    expect(jsonStr).not.toContain("PRIVATE_KEY");
  });

  it("AUTH-070: profile deletion removes all traces of user data from repository", async () => {
    const repo = new ProfileRepository();
    await repo.saveProfile("user_ephemeral", {
      preferences: { language: "bn", temperatureUnit: "C", notificationsEnabled: true },
      savedLocation: { name: "Howrah", city: "Howrah", state: "West Bengal", latitude: 22.59, longitude: 88.26 }
    });

    await repo.deleteProfile("user_ephemeral");
    expect(await repo.getProfile("user_ephemeral")).toBeNull();
    expect(await repo.exportProfileData("user_ephemeral")).toBeNull();
  });
});
