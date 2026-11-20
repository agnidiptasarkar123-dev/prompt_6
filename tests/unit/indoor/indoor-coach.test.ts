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

  it("evaluates indoor source hazards without claiming unmonitored numeric AQI", () => {
    const hazard = evaluateIndoorSources(baseDwelling);
    expect(hazard.hazardScore).toBe("HIGH"); // 2 combustion sources: incense + mosquito coils
    expect(hazard.activeSources).toContain("Daily incense / dhoop combustion");
    expect(hazard.activeSources).toContain("Smoldering mosquito coil usage");
    expect(hazard.disclaimer).toContain("In the absence of an indoor air sensor");
  });

  it("decides ventilation strategies based on ambient outdoor category", () => {
    // Very Poor air -> Keep sealed
    const sealedDecision = determineVentilationStrategy("VERY_POOR", baseDwelling);
    expect(sealedDecision.windowAction).toBe("KEEP_SEALED");
    expect(sealedDecision.practicalMethod).toContain("exterior windows shut");

    // Good air -> Cross ventilation
    const openDecision = determineVentilationStrategy("GOOD", baseDwelling);
    expect(openDecision.windowAction).toBe("OPEN_CROSS_VENTILATION");
    expect(openDecision.optimalTimeWindow).toContain("peak solar mixing");
  });

  it("calculates Clean Air Delivery Rate (CADR) for a standard bedroom", () => {
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
    // 189 / 1.699 ≈ 111 CFM
    expect(filtration.requiredCadrCfm).toBe(111);
    expect(filtration.diyCorsiRosenthalFeasible).toBe(true);
    expect(filtration.filterTypeGuidance).toContain("True HEPA");
  });
});
