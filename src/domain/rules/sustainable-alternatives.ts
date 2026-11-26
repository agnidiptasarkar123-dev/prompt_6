// SPDX-License-Identifier: Apache-2.0
import type { EvidenceBasisLabel } from "../impact/impact-calculator";

export type ActionImpactType =
  | "EXPOSURE_REDUCTION"
  | "EMISSIONS_REDUCTION"
  | "BOTH"
  | "GENERAL_PRECAUTION";

export interface SustainableAlternativeOption {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly impactType: ActionImpactType;
  readonly basis: EvidenceBasisLabel;
  readonly assumptions: string;
  readonly uncertainty: string;
}

export interface SustainableAlternativePlan {
  readonly primaryActionId: string;
  readonly impactType: ActionImpactType;
  readonly basis: EvidenceBasisLabel;
  readonly whySuggested: string;
  readonly realisticAlternatives: readonly SustainableAlternativeOption[];
}

export function generateSustainableAlternatives(params: {
  readonly aqi: number | null;
  readonly hasTransitAccess?: boolean;
}): SustainableAlternativePlan[] {
  let isSevere = false;
  let isPoor = false;
  if (typeof params.aqi === "number") {
    if (!Number.isFinite(params.aqi) || params.aqi < 0) {
      throw new RangeError("AQI must be null or a non-negative finite number.");
    }
    isSevere = params.aqi >= 301;
    isPoor = params.aqi >= 201;
  }

  return [
    {
      primaryActionId: "alt-errand-bundling",
      impactType: "BOTH",
      basis: "Qualitative",
      whySuggested: isPoor
        ? "Combining multiple errands into one off-peak trip reduces both ambient traffic exposure and tailpipe CO2 emissions."
        : "Combining errands reduces avoidable vehicle trips and local CO2 emissions.",
      realisticAlternatives: [
        {
          id: "opt-bundle-midday",
          title: "Bundle errands into one midday trip",
          description: "Combine grocery, school, and pharmacy stops into a single 12:00-15:00 trip.",
          impactType: "BOTH",
          basis: "Qualitative",
          assumptions: "Assumes flexible daytime scheduling and safe midday travel.",
          uncertainty: "Midday dispersion varies by local meteorology.",
        },
        {
          id: "opt-carpool",
          title: "Share a ride / carpool with neighbours",
          description: "Split a single car trip across N>=2 passengers so per-passenger CO2 scales by 1/N (India GHG Program v1.0 2015).",
          impactType: "EMISSIONS_REDUCTION",
          basis: "Estimated",
          assumptions: "Per-passenger tailpipe CO2 (kg CO2, not CO2e) scales inversely with occupancy.",
          uncertainty: "Historical 2015 hatchback factors vary +/-30% and do not reduce neighbourhood AQI alone.",
        },
        {
          id: "opt-delivery-consolidate",
          title: "Consolidate local deliveries",
          description: "Group household supply orders to avoid multiple last-mile two-wheeler trips.",
          impactType: "EMISSIONS_REDUCTION",
          basis: "Qualitative",
          assumptions: "Qualitative CO2 benefit when combined with existing route dispatches.",
          uncertainty: "Exact CO2 savings depend on carrier consolidation.",
        },
      ],
    },
    {
      primaryActionId: "alt-commute-exposure",
      impactType: "EXPOSURE_REDUCTION",
      basis: isSevere ? "Estimated" : "Qualitative",
      whySuggested: isSevere
        ? "During high/severe smog, walking or cycling along busy corridors can increase exertion near traffic; shifting route or timing can be safer."
        : "Choosing lower-traffic routes or off-peak windows helps lower kerbside traffic exposure.",
      realisticAlternatives: [
        {
          id: "opt-side-street",
          title: "Shift to quieter side-streets or off-peak hours",
          description: "Avoid peak-hour arterial roads where kerbside exhaust concentrates.",
          impactType: "EXPOSURE_REDUCTION",
          basis: "Qualitative",
          assumptions: "Side-street concentrations are typically lower than arterial kerbsides, though unmeasured.",
          uncertainty: "Localized street-canyon plumes remain unmeasured without hyperlocal sensors.",
        },
        ...(params.hasTransitAccess
          ? [
            {
              id: "opt-metro-bus",
              title: "Use intracity bus / enclosed Metro where verified",
              description: "Intracity bus benchmark is ~0.015161 kg CO2/pax-km (India GHG Program v1.0 2015); Metro CO2 depends on local grid intensity.",
              impactType: "BOTH" as const,
              basis: "Qualitative" as const,
              assumptions: "Assumes verified local transit access; bus figure covers CO2 only, while Metro requires city electricity intensity.",
              uncertainty: "Platform/bus PM2.5 concentrations vary; single commutes do not measurably alter citywide AQI.",
            },
          ]
          : []),
        {
          id: "opt-no-idling",
          title: "Switch off engine at signals > 30 seconds",
          description: "Eliminates stationary idling exhaust near schools and residential gates.",
          impactType: "EMISSIONS_REDUCTION",
          basis: "Qualitative",
          assumptions: "Applies to private vehicles without automatic start-stop.",
          uncertainty: "Savings depend on idle duration and traffic signal cycle.",
        },
      ],
    },
  ];
}
