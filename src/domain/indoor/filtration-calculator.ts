// SPDX-License-Identifier: Apache-2.0
export interface FiltrationCalculationInput {
  roomLengthMeters: number;
  roomWidthMeters: number;
  roomHeightMeters: number;
  targetAirChangesPerHour?: number; // Configurable engineering assumption: 4.0 - 5.0 ACH
}

export interface FiltrationRecommendation {
  roomVolumeM3: number;
  recommendedAch: number;
  requiredCadrM3H: number; // Clean Air Delivery Rate in m³/h
  requiredCadrCfm: number;  // Clean Air Delivery Rate in CFM (cubic feet per minute)
  diyCorsiRosenthalFeasible: boolean;
  filterTypeGuidance: string;
  engineeringAssumptionNote: string;
}

/**
 * Calculates Clean Air Delivery Rate (CADR) required for a room:
 * CADR (m³/h) = Room Volume (m³) * Target ACH
 *
 * Engineering Standards:
 * - 4.0 to 5.0 Air Changes per Hour (ACH) is an engineering sizing heuristic adapted
 *   from Harvard T.H. Chan School of Public Health and ASHRAE Epidemic Task Force guidance
 *   for effective particulate removal. It is NOT a statutory CPCB regulatory mandate.
 * - Units conversion: 1 CFM = 1.69901 m³/h (exact: 60 * 0.0283168 m³).
 */
export function calculateRoomFiltrationRequirements(
  input: FiltrationCalculationInput
): FiltrationRecommendation {
  // Input validation: Room dimensions must be positive finite numbers within physical dwelling bounds
  if (
    !isFinite(input.roomLengthMeters) ||
    !isFinite(input.roomWidthMeters) ||
    !isFinite(input.roomHeightMeters) ||
    input.roomLengthMeters <= 0 ||
    input.roomWidthMeters <= 0 ||
    input.roomHeightMeters <= 0
  ) {
    throw new RangeError(
      `Room dimensions must be positive finite numbers. Received length=${input.roomLengthMeters}, width=${input.roomWidthMeters}, height=${input.roomHeightMeters}.`
    );
  }

  if (
    input.targetAirChangesPerHour !== undefined &&
    (!isFinite(input.targetAirChangesPerHour) || input.targetAirChangesPerHour <= 0)
  ) {
    throw new RangeError(
      `Target ACH must be a positive number. Received targetAirChangesPerHour=${input.targetAirChangesPerHour}.`
    );
  }

  const targetAch = input.targetAirChangesPerHour ?? 4.5;
  const volumeM3 = input.roomLengthMeters * input.roomWidthMeters * input.roomHeightMeters;
  const requiredCadrM3H = Math.round(volumeM3 * targetAch);
  const requiredCadrCfm = Math.round(requiredCadrM3H / 1.69901); // 1 CFM = 1.69901 m³/h

  return {
    roomVolumeM3: Math.round(volumeM3 * 100) / 100,
    recommendedAch: targetAch,
    requiredCadrM3H,
    requiredCadrCfm,
    diyCorsiRosenthalFeasible: volumeM3 >= 20 && volumeM3 <= 150,
    filterTypeGuidance:
      "True HEPA (H13 grade) is recommended for capturing 99.97% of particles down to 0.3 microns. Avoid ozone-generating electronic ionizers.",
    engineeringAssumptionNote:
      "Target 4.5 ACH is an engineering sizing recommendation based on Harvard Healthy Buildings / ASHRAE 62.2 guidance for indoor particulate reduction, not a statutory CPCB requirement."
  };
}
