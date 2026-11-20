export interface FiltrationCalculationInput {
  roomLengthMeters: number;
  roomWidthMeters: number;
  roomHeightMeters: number;
  targetAirChangesPerHour?: number; // Standard: 4 - 5 ACH for air cleaning
}

export interface FiltrationRecommendation {
  roomVolumeM3: number;
  recommendedAch: number;
  requiredCadrM3H: number; // Clean Air Delivery Rate in m³/h
  requiredCadrCfm: number;  // Clean Air Delivery Rate in CFM (cubic feet per minute)
  diyCorsiRosenthalFeasible: boolean;
  filterTypeGuidance: string;
}

/**
 * Calculates Clean Air Delivery Rate (CADR) required for a room:
 * CADR (m³/h) = Room Volume (m³) * Target ACH
 * Standard: 4 to 5 Air Changes per Hour (ACH) for effective particulate removal (ASHRAE / Harvard Healthy Buildings).
 */
export function calculateRoomFiltrationRequirements(
  input: FiltrationCalculationInput
): FiltrationRecommendation {
  const targetAch = input.targetAirChangesPerHour ?? 4.5;
  const volumeM3 = input.roomLengthMeters * input.roomWidthMeters * input.roomHeightMeters;
  const requiredCadrM3H = Math.round(volumeM3 * targetAch);
  const requiredCadrCfm = Math.round(requiredCadrM3H / 1.699); // 1 CFM = 1.699 m³/h

  return {
    roomVolumeM3: Math.round(volumeM3 * 100) / 100,
    recommendedAch: targetAch,
    requiredCadrM3H,
    requiredCadrCfm,
    diyCorsiRosenthalFeasible: volumeM3 >= 20 && volumeM3 <= 150,
    filterTypeGuidance: "True HEPA (H13 grade) is recommended for capturing 99.97% of particles down to 0.3 microns. Avoid ozone-generating ionizers."
  };
}
