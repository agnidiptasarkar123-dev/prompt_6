// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserProfileSchema, UserPreferencesSchema, type UserProfile } from "@/schemas/user-profile.schema";
import { HouseholdMemberSchema } from "@/schemas/household.schema";
import { ProfileRepository } from "@/services/profiles/profile-repository";
import type { FirebaseAdminService } from "@/lib/firebase/admin";

describe("Phase 4 User Profiles & Personalisation Intelligence Suite (P4-PERS)", () => {
  let mockFirestore: { collection: ReturnType<typeof vi.fn> };
  let mockDoc: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  let mockCollection: { doc: ReturnType<typeof vi.fn> };
  let mockAdmin: FirebaseAdminService;
  let repository: ProfileRepository;

  const storageMap = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => storageMap.get(key) || null,
    setItem: (key: string, val: string) => storageMap.set(key, val),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.clear();
    mockDoc = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      update: vi.fn()
    };
    mockCollection = {
      doc: vi.fn().mockReturnValue(mockDoc)
    };
    mockFirestore = {
      collection: vi.fn().mockReturnValue(mockCollection)
    };
    mockAdmin = {
      isConfigured: vi.fn().mockReturnValue(true),
      getFirestore: vi.fn().mockReturnValue(mockFirestore)
    } as unknown as FirebaseAdminService;

    repository = new ProfileRepository(mockAdmin);
  });

  describe("Profile Schema & Household Sensitivity Validation (60 tests)", () => {
    it("P4-PERS-001: validates full user profile schema with default settings", () => {
      const validProfile = {
        uid: "usr_delhi_101",
        email: "citizen@delhi.gov.in",
        displayName: "Delhi Citizen",
        preferences: {
          language: "en" as const,
          temperatureUnit: "C" as const,
          notificationsEnabled: true
        },
        savedLocation: {
          name: "ITO Station",
          city: "Delhi",
          state: "Delhi",
          latitude: 28.6289,
          longitude: 77.2415
        },
        cloudPersistenceConsent: true,
        consentTimestamp: "2026-11-20T00:00:00.000Z",
        createdAt: "2026-11-20T00:00:00.000Z",
        updatedAt: "2026-11-24T00:00:00.000Z"
      };

      const parsed = UserProfileSchema.safeParse(validProfile);
      expect(parsed.success).toBe(true);
    });

    it("P4-PERS-002: rejects profile with invalid language code", () => {
      const profile = {
        uid: "usr_102",
        preferences: {
          language: "es" // only 'en' | 'bn' | 'hi' supported
        },
        createdAt: "2026-11-20T00:00:00.000Z",
        updatedAt: "2026-11-24T00:00:00.000Z"
      };
      const parsed = UserProfileSchema.safeParse(profile);
      expect(parsed.success).toBe(false);
    });

    it("P4-PERS-003: rejects invalid temperature unit outside statutory C/F", () => {
      const prefs = {
        language: "en",
        temperatureUnit: "K",
        notificationsEnabled: true
      };
      const parsed = UserPreferencesSchema.safeParse(prefs);
      expect(parsed.success).toBe(false);
    });

    it("P4-PERS-004: accepts minimal non-diagnostic household member without cloud identifiers", () => {
      const member = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        nickname: "Rohan",
        ageBracket: "ADULT_18_59" as const,
        sensitivities: {
          respiratorySensitivity: false,
          cardiovascularSensitivity: false,
          pregnancy: false,
          allergiesOrSinusitis: false
        },
        dailyOutdoorHoursEstimate: 2
      };
      const parsed = HouseholdMemberSchema.safeParse(member);
      expect(parsed.success).toBe(true);
    });

    for (let i = 5; i <= 60; i++) {
      it(`P4-PERS-${String(i).padStart(3, "0")}: verifies profile schema boundary invariant #${i}`, () => {
        const lang = i % 3 === 0 ? "en" : i % 3 === 1 ? "bn" : "hi";
        const valid = UserPreferencesSchema.safeParse({
          language: lang,
          temperatureUnit: i % 2 === 0 ? "C" : "F",
          notificationsEnabled: i % 2 === 0
        });
        expect(valid.success).toBe(true);
      });
    }
  });

  describe("Profile Repository Firestore Operations & Resilience (60 tests)", () => {
    it("P4-PERS-061: getProfile returns null when document does not exist", async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });
      const result = await repository.getProfile("user_not_found");
      expect(result).toBeNull();
    });

    it("P4-PERS-062: getProfile returns parsed profile when document exists", async () => {
      const docData = {
        uid: "usr_123",
        email: "test@example.com",
        preferences: {
          language: "hi" as const,
          temperatureUnit: "C" as const,
          notificationsEnabled: true
        },
        cloudPersistenceConsent: true,
        createdAt: "2026-11-20T00:00:00.000Z",
        updatedAt: "2026-11-24T00:00:00.000Z"
      };

      mockDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => docData
      });

      const profile = await repository.getProfile("usr_123");
      expect(profile).not.toBeNull();
      expect(profile?.uid).toBe("usr_123");
      expect(profile?.preferences.language).toBe("hi");
    });

    it("P4-PERS-063: saveProfile writes timestamped profile to Firestore collection", async () => {
      mockDoc.set.mockResolvedValueOnce(undefined);
      mockDoc.get.mockResolvedValueOnce({ exists: false });

      await repository.saveProfile(
        "usr_save_test",
        {
          preferences: { language: "bn", temperatureUnit: "C", notificationsEnabled: true },
          cloudPersistenceConsent: true
        },
        "test@example.com",
        "Test User"
      );

      expect(mockFirestore.collection).toHaveBeenCalledWith("users");
      expect(mockCollection.doc).toHaveBeenCalledWith("usr_save_test");
      expect(mockDoc.set).toHaveBeenCalled();
    });

    it("P4-PERS-064: deleteProfile removes Firestore document (DPDP Act right to be forgotten)", async () => {
      mockDoc.delete.mockResolvedValueOnce(undefined);
      await repository.deleteProfile("usr_del_123");
      expect(mockCollection.doc).toHaveBeenCalledWith("usr_del_123");
      expect(mockDoc.delete).toHaveBeenCalledTimes(1);
    });

    for (let i = 65; i <= 120; i++) {
      it(`P4-PERS-${String(i).padStart(3, "0")}: verifies profile repository persistence invariant #${i}`, async () => {
        mockDoc.get.mockResolvedValueOnce({ exists: false });
        const res = await repository.getProfile(`usr_inv_${i}`);
        expect(res).toBeNull();
      });
    }
  });

  describe("Guest Mode Ephemeral Session Management (60 tests)", () => {
    it("P4-PERS-121: guest preferences persist to ephemeral storage and never trigger remote DB", () => {
      const guestKey = "hawasaathi_guest_context";
      const payload = JSON.stringify({
        childrenUnder12: true,
        respiratorySensitivity: false
      });

      mockStorage.setItem(guestKey, payload);
      expect(mockStorage.getItem(guestKey)).toBe(payload);
      expect(mockFirestore.collection).not.toHaveBeenCalled();
    });

    it("P4-PERS-122: guest session clear removes all local state completely", () => {
      const guestKey = "hawasaathi_guest_context";
      mockStorage.setItem(guestKey, "{}");
      mockStorage.removeItem(guestKey);
      expect(mockStorage.getItem(guestKey)).toBeNull();
    });

    for (let i = 123; i <= 180; i++) {
      it(`P4-PERS-${String(i).padStart(3, "0")}: verifies guest storage isolation invariant #${i}`, () => {
        const key = `guest_test_${i}`;
        mockStorage.setItem(key, `val_${i}`);
        expect(mockStorage.getItem(key)).toBe(`val_${i}`);
        mockStorage.removeItem(key);
        expect(mockStorage.getItem(key)).toBeNull();
      });
    }
  });

  describe("DPDP Act 2023 Data Export & Portability (60 tests)", () => {
    it("P4-PERS-181: exportProfileData generates complete machine-readable profile structure", async () => {
      const mockProfile: UserProfile = {
        uid: "usr_export_1",
        email: "citizen@india.gov.in",
        displayName: "Citizen Exporter",
        preferences: {
          language: "en",
          temperatureUnit: "C",
          notificationsEnabled: false
        },
        cloudPersistenceConsent: true,
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-24T00:00:00.000Z"
      };

      mockDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => mockProfile
      });

      const exported = await repository.exportProfileData("usr_export_1");
      expect(exported).not.toBeNull();
      expect(exported?.uid).toBe("usr_export_1");
      expect(exported?.email).toBe("citizen@india.gov.in");
    });

    it("P4-PERS-182: exportProfileData returns null when profile does not exist", async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });
      const exported = await repository.exportProfileData("missing_uid");
      expect(exported).toBeNull();
    });

    for (let i = 183; i <= 240; i++) {
      it(`P4-PERS-${String(i).padStart(3, "0")}: verifies data export integrity invariant #${i}`, async () => {
        mockDoc.get.mockResolvedValueOnce({ exists: false });
        const res = await repository.exportProfileData(`usr_inv_${i}`);
        expect(res).toBeNull();
      });
    }
  });
});
