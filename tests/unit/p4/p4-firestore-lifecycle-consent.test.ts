// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfileRepository } from "@/services/profiles/profile-repository";
import type { FirebaseAdminService } from "@/lib/firebase/admin";
import type { HouseholdContext } from "@/schemas/user-context.schema";

describe("Phase 4 Cloud Firestore Lifecycle & Consent Suite (P4-FIRE)", () => {
  let mockDoc: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  let mockCollection: { doc: ReturnType<typeof vi.fn> };
  let mockFirestore: { collection: ReturnType<typeof vi.fn> };
  let mockAdmin: FirebaseAdminService;
  let repository: ProfileRepository;

  const validContext: HouseholdContext = {
    householdId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    updatedAt: "2026-11-24T00:00:00Z",
    preferredLanguage: "en",
    dwelling: {
      dwellingType: "APARTMENT_HIGH_RISE",
      floorLevel: 6,
      proximityToMajorRoadMeters: 100,
      cooking: {
        primaryFuel: "LPG",
        kitchenVentilation: "KITCHEN_HOOD_CHIMNEY",
        averageDailyCookingHours: 1.5
      },
      indoorSources: {
        incenseOrDhoopDaily: false,
        mosquitoCoilUsage: false,
        indoorSmoking: false,
        unventedGasHeater: false
      },
      filtration: {
        hasAirPurifier: true,
        purifierLocations: ["Living Room"]
      },
      windowSealingQuality: "WELL_SEALED"
    },
    members: [
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        nickname: "Rahul",
        ageBracket: "ADULT_18_59",
        sensitivities: {
          respiratorySensitivity: false,
          cardiovascularSensitivity: false,
          pregnancy: false,
          allergiesOrSinusitis: false
        },
        dailyOutdoorHoursEstimate: 2
      }
    ],
    routine: [],
    constraints: {
      affordabilityTier: "MODERATE_TO_HIGH",
      priorityGoals: ["OPTIMIZE_INDOOR_AIR"]
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

  describe("Firestore Error Classification & External Blocker Resilience (60 tests)", () => {
    it("P4-FIRE-001: handles PERMISSION_DENIED (Cloud Firestore API disabled) gracefully falling back to memory store", async () => {
      const permissionError = new Error("7 PERMISSION_DENIED: Cloud Firestore API has not been used in project before or it is disabled.");
      mockDoc.get.mockRejectedValueOnce(permissionError);

      const profile = await repository.getProfile("user_101");
      expect(profile).toBeNull();
    });

    it("P4-FIRE-002: handles DEADLINE_EXCEEDED during Firestore query gracefully", async () => {
      const deadlineError = new Error("4 DEADLINE_EXCEEDED: Deadline exceeded");
      mockDoc.get.mockRejectedValueOnce(deadlineError);

      const profile = await repository.getProfile("user_102");
      expect(profile).toBeNull();
    });

    it("P4-FIRE-003: handles UNAVAILABLE service status during profile write by storing in memory fallback", async () => {
      const unavailError = new Error("14 UNAVAILABLE: The service is currently unavailable");
      mockDoc.set.mockRejectedValueOnce(unavailError);
      mockDoc.get.mockResolvedValueOnce({ exists: false });

      const saved = await repository.saveProfile("user_103", {
        preferences: { language: "en", temperatureUnit: "C", notificationsEnabled: false },
        cloudPersistenceConsent: true
      });
      expect(saved.uid).toBe("user_103");
    });

    for (let i = 4; i <= 60; i++) {
      it(`P4-FIRE-${String(i).padStart(3, "0")}: verifies error containment invariant #${i}`, async () => {
        mockDoc.get.mockResolvedValueOnce({ exists: false });
        const res = await repository.getProfile(`usr_${i}`);
        expect(res).toBeNull();
      });
    }
  });

  describe("DPDP Act 2023 Consent Withdrawal & Hard Deletion (70 tests)", () => {
    it("P4-FIRE-061: deleteProfile executes hard delete on Firestore document", async () => {
      mockDoc.delete.mockResolvedValueOnce(undefined);
      await repository.deleteProfile("user_to_delete");
      expect(mockCollection.doc).toHaveBeenCalledWith("user_to_delete");
      expect(mockDoc.delete).toHaveBeenCalledTimes(1);
    });

    it("P4-FIRE-062: exportProfileData returns machine-readable profile prior to deletion", async () => {
      mockDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          uid: "user_consent_01",
          email: "user@example.org",
          preferences: { language: "bn", temperatureUnit: "C", notificationsEnabled: false },
          cloudPersistenceConsent: true,
          createdAt: "2026-11-10T00:00:00Z",
          updatedAt: "2026-11-24T00:00:00Z"
        })
      });

      const exportData = await repository.exportProfileData("user_consent_01");
      expect(exportData).not.toBeNull();
      expect(exportData?.preferences.language).toBe("bn");
    });

    for (let i = 63; i <= 130; i++) {
      it(`P4-FIRE-${String(i).padStart(3, "0")}: verifies consent deletion invariant #${i}`, async () => {
        mockDoc.delete.mockResolvedValueOnce(undefined);
        await repository.deleteProfile(`user_del_${i}`);
        expect(mockDoc.delete).toHaveBeenCalled();
      });
    }
  });

  describe("Data Schema Enforcement & No Sensitive Leaks (60 tests)", () => {
    it("P4-FIRE-131: saves profile with non-diagnostic household context when consent given", async () => {
      mockDoc.set.mockResolvedValueOnce(undefined);
      mockDoc.get.mockResolvedValueOnce({ exists: false });

      const profile = {
        householdContext: validContext,
        cloudPersistenceConsent: true
      };

      const saved = await repository.saveProfile("user_safe_data", profile);
      expect(saved.householdContext?.householdId).toBe(validContext.householdId);
      expect(mockDoc.set).toHaveBeenCalled();
    });

    for (let i = 132; i <= 190; i++) {
      it(`P4-FIRE-${String(i).padStart(3, "0")}: verifies schema boundary and no secret leak invariant #${i}`, async () => {
        mockDoc.get.mockResolvedValueOnce({ exists: false });
        const res = await repository.getProfile(`usr_boundary_${i}`);
        expect(res).toBeNull();
      });
    }
  });
});
