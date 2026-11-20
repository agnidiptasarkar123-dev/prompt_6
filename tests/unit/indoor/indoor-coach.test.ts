import { describe, it, expect } from "vitest";
import { evaluateIndoorSources } from "@/domain/indoor/source-control";
import { determineVentilationStrategy } from "@/domain/indoor/ventilation-decision";
import { calculateRoomFiltrationRequirements } from "@/domain/indoor/filtration-calculator";
import { DwellingContext } from "@/schemas/user-context.schema";

describe("Indoor Air Quality Coach Domain", () => {
  const baseDwelling: DwellingContext = {
    dwellingType: "APARTMENT_LOW_RISE",
    floorLevel: 1,
    proximityToMajorRoadMeters: 30,
    cooking: {
      primaryFuel: "LPG",
      kitchenVentilation: "OPEN_WINDOW_ONLY",
      averageDailyCookingHours: 2
    },
    indoorSources: {
      incenseOrDhoopDaily: true,
      mosquitoCoilUsage: true,
      indoorSmoking: false,
      unventedGasHeater: false
    },
    filtration: {
      hasAirPurifier: false,
      purifierLocations: []
    },
    windowSealingQuality: "LEAKY_OPEN_SLATS"
  };

  describe("evaluateIndoorSources", () => {
    it("evaluates indoor source hazards without claiming unmonitored numeric AQI", () => {
      const hazard = evaluateIndoorSources(baseDwelling);
      expect(hazard.hazardScore).toBe("HIGH"); // 2 combustion sources: incense + mosquito coils
      expect(hazard.activeSources).toContain("Daily incense / dhoop combustion");
      expect(hazard.activeSources).toContain("Smoldering mosquito coil usage");
      expect(hazard.disclaimer).toContain("In the absence of an indoor air sensor");
    });

    it("evaluates single source (MODERATE), 3+ sources (CRITICAL), and biomass (CRITICAL)", () => {
      // 1 source: incense only
      const singleSourceDwelling: DwellingContext = {
        ...baseDwelling,
        indoorSources: {
          incenseOrDhoopDaily: true,
          mosquitoCoilUsage: false,
          indoorSmoking: false,
          unventedGasHeater: false
        }
      };
      expect(evaluateIndoorSources(singleSourceDwelling).hazardScore).toBe("MODERATE");

      // 3 sources: incense + coils + smoking
      const threeSourcesDwelling: DwellingContext = {
        ...baseDwelling,
        indoorSources: {
          incenseOrDhoopDaily: true,
          mosquitoCoilUsage: true,
          indoorSmoking: true,
          unventedGasHeater: false
        }
      };
      expect(evaluateIndoorSources(threeSourcesDwelling).hazardScore).toBe("CRITICAL");

      // Biomass cooking -> CRITICAL
      const biomassDwelling: DwellingContext = {
        ...baseDwelling,
        cooking: {
          primaryFuel: "BIOMASS_KEROSENE",
          kitchenVentilation: "OPEN_WINDOW_ONLY",
          averageDailyCookingHours: 2
        },
        indoorSources: {
          incenseOrDhoopDaily: false,
          mosquitoCoilUsage: false,
          indoorSmoking: false,
          unventedGasHeater: false
        }
      };
      expect(evaluateIndoorSources(biomassDwelling).hazardScore).toBe("CRITICAL");

      // Unvented LPG kitchen
      const unventedLpgDwelling: DwellingContext = {
        ...baseDwelling,
        cooking: {
          primaryFuel: "LPG",
          kitchenVentilation: "UNVENTED_INDOOR",
          averageDailyCookingHours: 2
        },
        indoorSources: {
          incenseOrDhoopDaily: false,
          mosquitoCoilUsage: false,
          indoorSmoking: false,
          unventedGasHeater: false
        }
      };
      const resUnvented = evaluateIndoorSources(unventedLpgDwelling);
      expect(resUnvented.activeSources).toContain("Unvented gas combustion in kitchen");

      // Clean dwelling -> LOW
      const cleanDwelling: DwellingContext = {
        ...baseDwelling,
        cooking: {
          primaryFuel: "INDUCTION_ELECTRIC",
          kitchenVentilation: "KITCHEN_HOOD_CHIMNEY",
          averageDailyCookingHours: 1
        },
        indoorSources: {
          incenseOrDhoopDaily: false,
          mosquitoCoilUsage: false,
          indoorSmoking: false,
          unventedGasHeater: false
        }
      };
      expect(evaluateIndoorSources(cleanDwelling).hazardScore).toBe("LOW");
    });
  });

  describe("determineVentilationStrategy", () => {
    it("overrides sealed-room advice when indoor combustion is active", () => {
      // In SEVERE ambient air, if combustion is active, MUST override to EXHAUST_LOCALIZED_BURST
      const severeWithCombustion = determineVentilationStrategy("SEVERE", baseDwelling);
      expect(severeWithCombustion.windowAction).toBe("EXHAUST_LOCALIZED_BURST");
      expect(severeWithCombustion.indoorCombustionOverrideActive).toBe(true);
      expect(severeWithCombustion.cautions[0]).toContain("CRITICAL LIFE-SAFETY RULE");
    });

    it("advises KEEP_SEALED during VERY_POOR and SEVERE air quality when no indoor combustion is active", () => {
      const cleanDwelling: DwellingContext = {
        ...baseDwelling,
        cooking: {
          primaryFuel: "INDUCTION_ELECTRIC",
          kitchenVentilation: "KITCHEN_HOOD_CHIMNEY",
          averageDailyCookingHours: 1
        },
        indoorSources: {
          incenseOrDhoopDaily: false,
          mosquitoCoilUsage: false,
          indoorSmoking: false,
          unventedGasHeater: false
        }
      };

      const sealedVeryPoor = determineVentilationStrategy("VERY_POOR", cleanDwelling);
      expect(sealedVeryPoor.windowAction).toBe("KEEP_SEALED");
      expect(sealedVeryPoor.indoorCombustionOverrideActive).toBe(false);

      const sealedSevere = determineVentilationStrategy("SEVERE", cleanDwelling);
      expect(sealedSevere.windowAction).toBe("KEEP_SEALED");
    });

    it("promotes OPEN_CROSS_VENTILATION during GOOD and SATISFACTORY air", () => {
      const cleanDwelling: DwellingContext = {
        ...baseDwelling,
        cooking: {
          primaryFuel: "INDUCTION_ELECTRIC",
          kitchenVentilation: "KITCHEN_HOOD_CHIMNEY",
          averageDailyCookingHours: 1
        },
        indoorSources: {
          incenseOrDhoopDaily: false,
          mosquitoCoilUsage: false,
          indoorSmoking: false,
          unventedGasHeater: false
        }
      };

      const openGood = determineVentilationStrategy("GOOD", cleanDwelling);
      expect(openGood.windowAction).toBe("OPEN_CROSS_VENTILATION");

      const openSat = determineVentilationStrategy("SATISFACTORY", cleanDwelling);
      expect(openSat.windowAction).toBe("OPEN_CROSS_VENTILATION");
    });

    it("advises EXHAUST_ONLY during MODERATE and POOR air", () => {
      const cleanDwelling: DwellingContext = {
        ...baseDwelling,
        cooking: {
          primaryFuel: "INDUCTION_ELECTRIC",
          kitchenVentilation: "KITCHEN_HOOD_CHIMNEY",
          averageDailyCookingHours: 1
        },
        indoorSources: {
          incenseOrDhoopDaily: false,
          mosquitoCoilUsage: false,
          indoorSmoking: false,
          unventedGasHeater: false
        }
      };

      const exhaustMod = determineVentilationStrategy("MODERATE", cleanDwelling);
      expect(exhaustMod.windowAction).toBe("EXHAUST_ONLY");

      const exhaustPoor = determineVentilationStrategy("POOR", cleanDwelling);
      expect(exhaustPoor.windowAction).toBe("EXHAUST_ONLY");
    });
  });

  describe("calculateRoomFiltrationRequirements", () => {
    it("calculates Clean Air Delivery Rate (CADR) for standard dimensions and custom ACH", () => {
      // 4m length, 3.5m width, 3m height = 42 m³ volume
      const filtration = calculateRoomFiltrationRequirements({
        roomLengthMeters: 4,
        roomWidthMeters: 3.5,
        roomHeightMeters: 3,
        targetAirChangesPerHour: 4.5
      });

      expect(filtration.roomVolumeM3).toBe(42);
      // CADR = 42 * 4.5 = 189 m³/h
      expect(filtration.requiredCadrM3H).toBe(189);
      // 189 / 1.69901 ≈ 111 CFM
      expect(filtration.requiredCadrCfm).toBe(111);
      expect(filtration.diyCorsiRosenthalFeasible).toBe(true);
      expect(filtration.filterTypeGuidance).toContain("True HEPA");

      // Custom ACH default (when omitted, defaults to 4.5)
      const defaultAch = calculateRoomFiltrationRequirements({
        roomLengthMeters: 5,
        roomWidthMeters: 4,
        roomHeightMeters: 3
      });
      expect(defaultAch.recommendedAch).toBe(4.5);
    });

    it("throws RangeError on negative, zero, or non-finite room dimensions", () => {
      expect(() =>
        calculateRoomFiltrationRequirements({ roomLengthMeters: -4, roomWidthMeters: 3, roomHeightMeters: 3 })
      ).toThrow(RangeError);

      expect(() =>
        calculateRoomFiltrationRequirements({ roomLengthMeters: 4, roomWidthMeters: 0, roomHeightMeters: 3 })
      ).toThrow(RangeError);

      expect(() =>
        calculateRoomFiltrationRequirements({ roomLengthMeters: 4, roomWidthMeters: 3, roomHeightMeters: NaN })
      ).toThrow(RangeError);

      expect(() =>
        calculateRoomFiltrationRequirements({ roomLengthMeters: 4, roomWidthMeters: 3, roomHeightMeters: 3, targetAirChangesPerHour: -1 })
      ).toThrow(RangeError);
    });
  });
});
