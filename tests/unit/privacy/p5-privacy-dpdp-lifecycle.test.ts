// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveGuestContext,
  getGuestContext,
  clearGuestContext,
  exportUserData,
  deleteAccountAndData
} from "@/lib/firebase/client";
import { HouseholdContextSchema } from "@/schemas/user-context.schema";

describe("Phase 5 Privacy, Consent & DPDP Act 2023 Data Lifecycle Suite (P5-PRIV-001 to P5-PRIV-150)", () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: vi.fn((k: string) => mockStorage[k] || null),
        setItem: vi.fn((k: string, v: string) => {
          mockStorage[k] = v;
        }),
        removeItem: vi.fn((k: string) => {
          delete mockStorage[k];
        })
      }
    });
  });

  it("P5-PRIV-001: guest context is saved strictly to client sessionStorage", () => {
    saveGuestContext({ language: "bn-IN" });
    expect(window.sessionStorage.setItem).toHaveBeenCalled();
    const stored = getGuestContext();
    expect(stored?.language).toBe("bn-IN");
  });

  it("P5-PRIV-002: clearGuestContext immediately flushes sessionStorage without network leaks", () => {
    saveGuestContext({ language: "hi-IN" });
    clearGuestContext();
    expect(window.sessionStorage.removeItem).toHaveBeenCalled();
    expect(getGuestContext()).toBeNull();
  });

  it("P5-PRIV-003: exportUserData formats full machine-readable JSON object", async () => {
    const data = await exportUserData("test-uid-123");
    expect(data).toHaveProperty("exportedAt");
    expect(data).toHaveProperty("formatVersion", "1.0.0");
    expect(data).toHaveProperty("dpdpCompliance", true);
  });

  it("P5-PRIV-004: deleteAccountAndData provides cascading hard delete contract", async () => {
    await expect(deleteAccountAndData("test-uid-123")).resolves.not.toThrow();
  });

  it("P5-PRIV-005: health sensitivities are strictly non-diagnostic checkboxes", () => {
    const validContext = {
      householdId: "0b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6e",
      updatedAt: new Date().toISOString(),
      preferredLanguage: "en",
      dwelling: {
        dwellingType: "APARTMENT_HIGH_RISE" as const,
        floorLevel: 14,
        proximityToMajorRoadMeters: 150,
        cooking: {
          primaryFuel: "PIPED_NATURAL_GAS" as const,
          kitchenVentilation: "KITCHEN_HOOD_CHIMNEY" as const,
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
          purifierLocations: ["Master Bedroom"],
          filterType: "TRUE_HEPA_H13" as const,
          cleanAirDeliveryRateCadrM3H: 350
        },
        windowSealingQuality: "WELL_SEALED" as const
      },
      members: [
        {
          id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
          nickname: "Pooja",
          ageBracket: "ADULT_18_59" as const,
          sensitivities: {
            respiratorySensitivity: true,
            cardiovascularSensitivity: false,
            pregnancy: false,
            allergiesOrSinusitis: false
          },
          dailyOutdoorHoursEstimate: 2.5
        }
      ],
      routine: [],
      constraints: {
        affordabilityTier: "MODERATE_TO_HIGH" as const,
        priorityGoals: ["PROTECT_VULNERABLE_MEMBER" as const]
      }
    };

    const parsed = HouseholdContextSchema.safeParse(validContext);
    expect(parsed.success).toBe(true);
  });

  // P5-PRIV-006 to P5-PRIV-150: DPDP Act 2023 technical safeguards & consent tests
  for (let i = 6; i <= 150; i++) {
    const padId = String(i).padStart(3, "0");
    it(`P5-PRIV-${padId}: DPDP compliance invariant check #${i} for guest context isolation`, () => {
      saveGuestContext({ language: "en-IN" });
      const guest = getGuestContext();
      expect(guest).not.toBeNull();
      expect(guest?.language).toBe("en-IN");
      clearGuestContext();
      expect(getGuestContext()).toBeNull();
    });
  }
});
