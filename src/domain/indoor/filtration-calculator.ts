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
 * Engineering Standards & HEPA Testing Distinctions:
 * 1. Filter-Media Efficiency Standards (Tested on flat media in laboratory test ducts):
 *    - European EN 1822 / ISO 29463 Class H13: Specifies >= 99.95% minimum collection efficiency
 *      at the Most Penetrating Particle Size (MPPS, typically 0.1 to 0.2 µm).
 *    - US Military / IEST RP-CC001 Type A ("True HEPA"): Specifies >= 99.97% collection efficiency
 *      at 0.3 µm test aerosol (DOP/PAO).
 *    - These are distinct testing classifications with different test aerosols and particle sizes.
 * 2. Installed-System Performance:
 *    - Real-world air cleaner efficiency is lower than flat media test ratings due to housing bypass,
 *      filter frame gasket leakage, and internal air turbulence.
 * 3. Room-Level Clean-Air Delivery (CADR & ACH):
 *    - Actual indoor particulate clearance is determined by clean air delivery volume (CADR in m³/h or CFM)
 *      and effective Air Changes per Hour (ACH = CADR / Room Volume).
 *    - 4.0 to 5.0 ACH is an engineering sizing heuristic adapted from Harvard T.H. Chan School of Public
 *      Health and ASHRAE Epidemic Task Force guidance. It is NOT a statutory CPCB regulatory mandate.
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
      "True HEPA filtration is recommended: US IEST RP-CC001 Type A certifies >=99.97% media efficiency at 0.3 µm, while European EN 1822 H13 certifies >=99.95% at MPPS (~0.1-0.2 µm). Real-world particulate reduction depends on room CADR (achieving 4-5 ACH) and airtight casing seals. Avoid ozone-generating electronic ionizers.",
    engineeringAssumptionNote:
      "Target 4.5 ACH is an engineering sizing recommendation based on Harvard Healthy Buildings / ASHRAE 62.2 guidance for indoor particulate reduction, not a statutory CPCB requirement."
  };
}
